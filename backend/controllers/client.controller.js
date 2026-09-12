const logger = require("../logger");
const Client = require("../models/client.model");
const CallLog = require("../models/call.model");
const Counter = require("../models/counter.model");
const mongoose = require("mongoose");
const { recordAudit } = require("../utils/audit");

const sanitizeNumber = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, "");

const createClient = async (req, res) => {
  if (!req.body) {
    return res.status(400).send({ error: "Empty request body." });
  }

  const { name, email_id, phone_number, conversion_probability, call_details } = req.body;

  if (!name || !email_id || !phone_number || conversion_probability === undefined) {
    return res.status(400).send({ error: "Name, email_id, phone_number, and conversion_probability are required." });
  }

  const probability = Number(conversion_probability);
  if (Number.isNaN(probability) || probability < 0 || probability > 100) {
    return res.status(400).send({ error: "conversionProbability must be a number between 0 and 100." });
  }

  try {
    const normalizedEmail = String(email_id).trim().toLowerCase();
    const normalizedPhone = sanitizeNumber(phone_number);
    if (String(name).trim().length > 100) {
      return res.status(400).send({ error: "Name cannot exceed 100 characters." });
    }
    if (normalizedEmail.length > 254) {
      return res.status(400).send({ error: "Email cannot exceed 254 characters." });
    }
    if (normalizedPhone.length > 10) {
      return res.status(400).send({ error: "Phone number cannot exceed 10 characters." });
    }
    const exists = await Client.findOne({
      $or: [{ email_id: normalizedEmail }, { phone_number: normalizedPhone }],
    });
    if (exists) {
      const duplicateField = exists.email_id === normalizedEmail ? "email" : "phone number";
      return res.status(409).send({ error: `A client with this ${duplicateField} already exists.` });
    }

    const sequence = await Counter.findOneAndUpdate({ key: "client_id" }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    const clientId = `CLIENT_${String(sequence.value).padStart(7, "0")}`;

    const client = await Client.create({
      client_id: clientId,
      name: String(name).trim(),
      email_id: normalizedEmail,
      phone_number: normalizedPhone,
      current_state: "NEW",
      conversion_probability: probability,
      call_details: Array.isArray(call_details) ? call_details : [],
    });

    logger.info(`CLIENT | CREATE | New client created: ${client.email_id}`);
    await recordAudit({
      action: "CREATE",
      entityType: "CLIENT",
      entityId: client.client_id,
      performedBy: req.user?._id,
      changes: [
        { attribute: "client_id", newValue: client.client_id },
        { attribute: "name", newValue: client.name },
        { attribute: "email_id", newValue: client.email_id },
        { attribute: "phone_number", newValue: client.phone_number },
        { attribute: "current_state", newValue: client.current_state },
        { attribute: "conversion_probability", newValue: client.conversion_probability },
      ],
    });
    return res.status(201).send({ client });
  } catch (err) {
    logger.error(`CLIENT | CREATE | Failed to create client: ${err}`);
    if (err?.code === 11000) {
      const duplicateField = Object.keys(err.keyPattern || {})[0];
      const fieldLabel = duplicateField === "phone_number" ? "phone number" : "email";
      return res.status(409).send({ error: `A client with this ${fieldLabel} already exists.` });
    }
    return res.status(500).send({ error: "Failed to create client. Please try again." });
  }
};

const getClients = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const filter = {};
    const search = String(req.query.search || "").trim();
    const currentState = String(req.query.current_state || "").trim();
    const minProbability = req.query.minProbability;
    const maxProbability = req.query.maxProbability;

    if (search) {
      filter.$or = [{ client_id: { $regex: search, $options: "i" } }, { name: { $regex: search, $options: "i" } }, { email_id: { $regex: search, $options: "i" } }, { phone_number: { $regex: search, $options: "i" } }];
    }

    if (currentState) {
      filter.current_state = currentState;
    }

    if (minProbability !== undefined && minProbability !== "") {
      const numericMin = Number(minProbability);
      if (!Number.isNaN(numericMin)) {
        filter.conversion_probability = { ...(filter.conversion_probability || {}), $gte: numericMin };
      }
    }

    if (maxProbability !== undefined && maxProbability !== "") {
      const numericMax = Number(maxProbability);
      if (!Number.isNaN(numericMax)) {
        filter.conversion_probability = { ...(filter.conversion_probability || {}), $lte: numericMax };
      }
    }

    const [totalCount, totalClients, totalCalls, stateCounts, clients] = await Promise.all([
      Client.countDocuments(filter),
      Client.countDocuments(),
      CallLog.countDocuments(),
      Client.aggregate([{ $group: { _id: "$current_state", count: { $sum: 1 } } }]),
      Client.find(filter)
      .populate({
        path: "call_details",
        select: "call_id notes created_at updated_at created_by",
        populate: { path: "created_by", select: "name email" },
        options: { sort: { created_at: -1 } },
      })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ]);
    const stateCountMap = Object.fromEntries(stateCounts.map((state) => [state._id, state.count]));

    const formattedClients = clients.map((client) => ({
      _id: client._id,
      client_id: client.client_id,
      name: client.name,
      email_id: client.email_id,
      phone_number: client.phone_number,
      current_state: client.current_state,
      conversion_probability: client.conversion_probability,
      call_details: client.call_details || [],
      callCount: Array.isArray(client.call_details) ? client.call_details.length : 0,
      created_at: client.created_at,
      updated_at: client.updated_at,
    }));

    return res.status(200).send({
      clients: formattedClients,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        total_clients: totalClients,
        total_calls: totalCalls,
        states: {
          NEW: stateCountMap.NEW || 0,
          IN_PROGRESS: stateCountMap.IN_PROGRESS || 0,
          CONVERTED: stateCountMap.CONVERTED || 0,
          LOST: stateCountMap.LOST || 0,
        },
      },
    });
  } catch (err) {
    logger.error(`CLIENT | GET ALL | Failed to fetch clients: ${err}`);
    return res.status(500).send({ error: "Failed to fetch clients. Please try again." });
  }
};

const getClient = async (req, res) => {
  const { clientId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    return res.status(400).send({ error: "Invalid client ID." });
  }

  try {
    const client = await Client.findById(clientId)
      .populate({
        path: "call_details",
        select: "call_id notes created_at updated_at created_by",
        populate: { path: "created_by", select: "name email" },
        options: { sort: { created_at: -1 } },
      })
      .lean();
    if (!client) return res.status(404).send({ error: "Client not found." });
    return res.status(200).send({ client });
  } catch (err) {
    logger.error(`CLIENT | GET | Failed to fetch client ${clientId}: ${err}`);
    return res.status(500).send({ error: "Failed to fetch client details. Please try again." });
  }
};

const updateClient = async (req, res) => {
  const { clientId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    return res.status(400).send({ error: "Invalid client ID." });
  }

  const { current_state, conversion_probability } = req.body || {};
  const updates = {};
  if (current_state !== undefined) {
    if (!["NEW", "IN_PROGRESS", "CONVERTED", "LOST"].includes(current_state)) {
      return res.status(400).send({ error: "Invalid current_state value." });
    }
    updates.current_state = current_state;
  }
  if (conversion_probability !== undefined) {
    const probability = Number(conversion_probability);
    if (Number.isNaN(probability) || probability < 0 || probability > 100) {
      return res.status(400).send({ error: "conversionProbability must be a number between 0 and 100." });
    }
    updates.conversion_probability = probability;
  }

  if (!Object.keys(updates).length) {
    return res.status(400).send({ error: "At least one editable field is required." });
  }

  try {
    const oldClient = await Client.findById(clientId).lean();
    const client = await Client.findByIdAndUpdate(clientId, { $set: updates }, { new: true, runValidators: true }).lean();
    if (!client) return res.status(404).send({ error: "Client not found." });

    const changedEntries = Object.entries(updates).filter(([attribute, value]) => {
      const oldVal = oldClient[attribute];
      // Handles primitives, Dates, MongoDB ObjectIDs, arrays, and objects
      return JSON.stringify(oldVal) !== JSON.stringify(value);
    });

    if (changedEntries.length > 0) {
      await recordAudit({
        action: "UPDATE",
        entityType: "CLIENT",
        entityId: client.client_id,
        performedBy: req.user?._id,
        changes: changedEntries.map(([attribute, value]) => ({
          attribute,
          oldValue: oldClient[attribute],
          newValue: value,
        })),
      });
    }
    return res.status(200).send({ client });
  } catch (err) {
    logger.error(`CLIENT | UPDATE | Failed to update client: ${err}`);
    return res.status(500).send({ error: "Failed to update client. Please try again." });
  }
};

const updateCall = async (req, res) => {
  const { clientId, callId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(callId)) {
    return res.status(400).send({ error: "Invalid client or call ID." });
  }

  const { notes } = req.body || {};
  const updates = {};
  if (notes !== undefined) {
    if (!String(notes).trim()) return res.status(400).send({ error: "Notes are required." });
    updates.notes = String(notes).trim();
  }
  if (!Object.keys(updates).length) return res.status(400).send({ error: "At least one call field is required." });

  try {
    const oldCall = await CallLog.findOne({ _id: callId, client_id: clientId }).lean();
    const call = await CallLog.findOneAndUpdate({ _id: callId, client_id: clientId }, { $set: updates }, { new: true, runValidators: true }).lean();
    if (!call) return res.status(404).send({ error: "Call details not found." });
    await recordAudit({
      action: "UPDATE",
      entityType: "CALL",
      entityId: call.call_id,
      performedBy: req.user?._id,
      changes: Object.entries(updates).map(([attribute, value]) => ({ attribute, oldValue: oldCall[attribute], newValue: value })),
    });
    return res.status(200).send({ call });
  } catch (err) {
    logger.error(`CLIENT | CALL UPDATE | Failed to update call ${callId}: ${err}`);
    return res.status(500).send({ error: "Failed to update call details. Please try again." });
  }
};

const addCall = async (req, res) => {
  const { clientId } = req.params;
  const { notes } = req.body || {};
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    return res.status(400).send({ error: "Invalid client ID." });
  }
  if (!String(notes || "").trim()) {
    return res.status(400).send({ error: "Notes are required." });
  }

  try {
    const client = await Client.findById(clientId);
    if (!client) return res.status(404).send({ error: "Client not found." });

    const callNumber = client.call_details.length + 1;
    const call = await CallLog.create({
      call_id: `${client.client_id}_CALL_${callNumber}`,
      client_id: clientId,
      notes: String(notes).trim(),
      created_by: req.user?._id || null,
    });
    client.call_details.push(call._id);
    await client.save();
    await recordAudit({
      action: "CREATE",
      entityType: "CALL",
      entityId: call.call_id,
      performedBy: req.user?._id,
      changes: [
        { attribute: "Call Id", newValue: call.call_id },
        { attribute: "Call Notes", newValue: call.notes },
      ],
    });
    return res.status(201).send({ call });
  } catch (err) {
    logger.error(`CLIENT | CALL | Failed to save call for client ${clientId}: ${err}`);
    return res.status(500).send({ error: "Failed to save call details. Please try again." });
  }
};

module.exports = { createClient, getClients, getClient, updateClient, addCall, updateCall };
