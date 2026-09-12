const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    call_id: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      required: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false }
);

module.exports = mongoose.model("CallLog", callLogSchema);
