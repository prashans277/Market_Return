const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    user_type: {
      type: String,
      default: "USER",
      enum: ["USER", "ADMIN", "SYSTEM_ADMIN"],
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false },
);

userSchema.pre("save", function (next) {
  if (!this.isNew && this.user_type === "SYSTEM_ADMIN" && this.isModified()) {
    const error = new Error("SYSTEM_ADMIN details are immutable and cannot be updated.");
    return next(error);
  }

  next();
});

userSchema.pre(["updateOne", "findOneAndUpdate", "updateMany"], async function (next) {
  try {
    const filter = this.getFilter ? this.getFilter() : {};
    const update = this.getUpdate ? this.getUpdate() : {};

    if (!filter || Object.keys(filter).length === 0) {
      return next();
    }

    const systemAdminDoc = await this.model.findOne(filter).select("user_type").lean();
    if (!systemAdminDoc || systemAdminDoc.user_type !== "SYSTEM_ADMIN") {
      return next();
    }

    const updateKeys = Object.keys(update);
    const hasMutation =
      updateKeys.some((key) => !key.startsWith("$")) ||
      Boolean(update.$set) ||
      Boolean(update.$unset) ||
      Boolean(update.$setOnInsert) ||
      Boolean(update.$inc) ||
      Boolean(update.$mul) ||
      Boolean(update.$rename) ||
      Boolean(update.$pull) ||
      Boolean(update.$push) ||
      Boolean(update.$pop) ||
      Boolean(update.$addToSet) ||
      Boolean(update.$currentDate) ||
      Boolean(update.$bit) ||
      Boolean(update.$min) ||
      Boolean(update.$max);

    if (hasMutation) {
      const error = new Error("SYSTEM_ADMIN details are immutable and cannot be updated.");
      return next(error);
    }

    return next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("User", userSchema);
