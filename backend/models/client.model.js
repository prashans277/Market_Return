const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    client_id: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email_id: {
      type: String,
      required: true,
      trim: true,
      maxlength: 254,
      unique: true,
      index: true,
    },
    phone_number: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10,
      unique: true,
      index: true,
    },
    current_state: {
      type: String,
      required: true,
      enum: ["NEW", "IN_PROGRESS", "CONVERTED", "LOST"],
      default: "NEW",
      index: true,
    },
    conversion_probability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    call_details: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "CallLog",
      default: [],
    }],
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false }
);

module.exports = mongoose.model("Client", clientSchema);
