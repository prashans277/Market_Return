const mongoose = require("mongoose");

const auditChangeSchema = new mongoose.Schema(
  {
    attribute: { type: String, required: true, trim: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const auditSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "DELETE"],
      index: true,
    },
    entity_type: {
      type: String,
      required: true,
      enum: ["USER", "CLIENT", "CALL"],
      index: true,
    },
    entity_id: { type: String, required: true, index: true },
    change: { type: [auditChangeSchema], required: true, validate: [(changes) => changes.length > 0, "At least one change is required."] },
    performed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false }
);

module.exports = mongoose.model("Audit", auditSchema);
