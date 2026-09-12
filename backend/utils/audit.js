const Audit = require("../models/audit.model");

const recordAudit = async ({ action, entityType, entityId, changes, performedBy = null }) => {
  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error("Audit changes must be a non-empty array.");
  }

  return Audit.create({
    action,
    entity_type: entityType,
    entity_id: String(entityId),
    change: changes.map(({ attribute, oldValue = null, newValue = null }) => ({ attribute, oldValue, newValue })),
    performed_by: performedBy || null,
  });
};

module.exports = { recordAudit };
