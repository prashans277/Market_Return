const mongoose = require("mongoose");
const Audit = require("../models/audit.model");
const Client = require("../models/client.model");

const getClientAudits = async (req, res) => {
  const { clientId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    return res.status(400).send({ error: "Invalid client ID." });
  }

  try {
    const client = await Client.findById(clientId).select("client_id call_details").lean();
    if (!client) return res.status(404).send({ error: "Client not found." });
    const callIds = await require("../models/call.model")
      .find({ _id: { $in: client.call_details || [] } })
      .select("call_id")
      .lean();
    const entityIds = [client.client_id, ...callIds.map((call) => call.call_id)];
    const audits = await Audit.find({
      $or: [
        { entity_type: "CLIENT", entity_id: client.client_id },
        { entity_type: "CALL", entity_id: { $in: entityIds.slice(1) } },
      ],
    })
      .populate("performed_by", "name email")
      .sort({ created_at: -1 })
      .lean();
    const fieldLabels = {
      client_id: "Client ID",
      name: "Name",
      email_id: "Email ID",
      emailId: "Email ID",
      phone_number: "Phone Number",
      phoneNumber: "Phone Number",
      current_state: "Current State",
      conversion_probability: "Conversion Probability",
      conversionProbability: "Conversion Probability",
      call_id: "Call ID",
      notes: "Call Notes",
      created_by: "Called By",
      createdBy: "Called By",
      is_active: "Active Status",
      isActive: "Active Status",
      user_type: "User Type",
      password: "Password",
    };
    const formattedAudits = audits.map((audit) => ({
      ...audit,
      change: audit.change.map((change) => ({
        ...change,
        attribute: fieldLabels[change.attribute] || change.attribute,
      })),
    }));
    return res.status(200).send({ audits: formattedAudits });
  } catch (error) {
    return res.status(500).send({ error: "Failed to fetch client audits." });
  }
};

module.exports = { getClientAudits };