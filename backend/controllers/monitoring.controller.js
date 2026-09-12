const mongoose = require("mongoose");
const Audit = require("../models/audit.model");
const User = require("../models/user.model");
const Client = require("../models/client.model");
const CallLog = require("../models/call.model");

const roleHierarchy = { SYSTEM_ADMIN: 3, ADMIN: 2, USER: 1 };

const fieldLabels = {
  client_id: "Client ID",
  name: "Name",
  email_id: "Email ID",
  phone_number: "Phone Number",
  current_state: "Current State",
  conversion_probability: "Conversion Probability",
  call_id: "Call ID",
  notes: "Call Notes",
  created_by: "Called By",
  is_active: "Active Status",
  user_type: "User Type",
  password: "Password",
};

const formatValue = (value) => value === null || value === undefined || value === "" ? "-" : String(value);

const getStatement = (audit, clientById, callById) => {
  const changes = audit.change || [];
  if (audit.entity_type === "CALL") {
    const call = callById[audit.entity_id];
    if (audit.action === "CREATE") {
      const client = call?.client_id;
      const notes = formatValue(changes.find((change) => change.attribute === "notes")?.newValue || call?.notes);
      return `Called ${client?.name || "client"} ${client?.email_id || ""} ${client?.phone_number || ""} at ${call?.created_at ? new Date(call.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) : "the recorded time"}. Notes: ${notes}`.replace(/\s+/g, " ").trim();
    }
    const details = changes.map((change) => `${fieldLabels[change.attribute] || change.attribute} from ${formatValue(change.oldValue)} to ${formatValue(change.newValue)}`).join("; ");
    return `Updated Call Details: ${details}`;
  }

  const client = clientById[audit.entity_id];
  if (audit.action === "CREATE") {
    const values = changes.filter((change) => change.attribute !== "client_id").map((change) => formatValue(change.newValue)).join(", ");
    return `Added new client ${values}`;
  }
  const details = changes.map((change) => `${fieldLabels[change.attribute] || change.attribute} from ${formatValue(change.oldValue)} to ${formatValue(change.newValue)}`).join("; ");
  return `Updated client ${client?.name || audit.entity_id}: ${details}`;
};

const getAccessibleUsers = async (requestingUser) => {
  const level = roleHierarchy[requestingUser.user_type] || 0;
  const roles = Object.entries(roleHierarchy)
    .filter(([, roleLevel]) => roleLevel <= level)
    .map(([role]) => role);
  return User.find({ user_type: { $in: roles } }).select("name email user_type").sort({ name: 1 }).lean();
};

const getUserAudits = async (req, res) => {
  const { userId } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const startDate = req.query.start_date;
  const endDate = req.query.end_date;
  const auditType = String(req.query.audit_type || "").trim();
  const auditTypeParts = auditType.split("_");
  const allowedAuditTypes = ["CREATE_CALL", "UPDATE_CALL", "CREATE_CLIENT", "UPDATE_CLIENT"];

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).send({ error: "A valid user is required." });
  }

  try {
    const accessibleUsers = await getAccessibleUsers(req.user);
    const selectedUser = accessibleUsers.find((user) => String(user._id) === String(userId));
    if (!selectedUser) return res.status(403).send({ error: "You are not authorized to view this user's audits." });

    const filter = { performed_by: selectedUser._id };
    if (startDate || endDate) {
      filter.created_at = {};
      if (startDate) filter.created_at.$gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) filter.created_at.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }
    
    const activityFilter = { ...filter };
    if (auditType) {
      if (!allowedAuditTypes.includes(auditType)) return res.status(400).send({ error: "Invalid audit type." });
      filter.action = auditTypeParts[0];
      filter.entity_type = auditTypeParts[1];
    } else {
      filter.entity_type = { $ne: 'USER' };
    }

    const totalCount = await Audit.countDocuments(filter);
    const activityCounts = await Audit.aggregate([
      { $match: activityFilter },
      {
        $group: {
          _id: { action: "$action", entity_type: "$entity_type" },
          count: { $sum: 1 },
        },
      },
    ]);
    const countMap = Object.fromEntries(activityCounts.map((item) => [`${item._id.action}_${item._id.entity_type}`, item.count]));
    const audits = await Audit.find(filter)
      .sort({ created_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const clientIds = audits.filter((audit) => audit.entity_type === "CLIENT").map((audit) => audit.entity_id);
    const callIds = audits.filter((audit) => audit.entity_type === "CALL").map((audit) => audit.entity_id);
    const [clients, calls] = await Promise.all([
      Client.find({ client_id: { $in: clientIds } }).select("client_id name email_id phone_number").lean(),
      CallLog.find({ call_id: { $in: callIds } }).populate("client_id", "name email_id phone_number").select("call_id client_id created_at notes").lean(),
    ]);
    const clientById = Object.fromEntries(clients.map((client) => [client.client_id, client]));
    const callById = Object.fromEntries(calls.map((call) => [call.call_id, call]));

    const formattedAudits = audits.map((audit) => ({
      _id: audit._id,
      action: audit.action,
      entity_type: audit.entity_type,
      entity_id: audit.entity_id,
      created_at: audit.created_at,
      performed_by: audit.performed_by,
      statement: getStatement(audit, clientById, callById),
    }));

    return res.status(200).send({
      audits: formattedAudits,
      pagination: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) },
      activity_counts: {
        all: ["CREATE_CALL", "UPDATE_CALL", "CREATE_CLIENT", "UPDATE_CLIENT"].reduce((total, key) => total + (countMap[key] || 0), 0),
        calls_placed: countMap.CREATE_CALL || 0,
        call_details_updated: countMap.UPDATE_CALL || 0,
        clients_added: countMap.CREATE_CLIENT || 0,
        client_details_updated: countMap.UPDATE_CLIENT || 0,
      },
      user: selectedUser,
    });
  } catch (error) {
    return res.status(500).send({ error: "Failed to fetch user audits." });
  }
};

module.exports = { getUserAudits };
