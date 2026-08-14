const mongoose = require("mongoose");
const validator = require("validator");
const { schemaOptions } = require("./helpers");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: "Email is invalid.",
      },
    },
    password_hash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "cashier"],
      default: "cashier",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
    last_login_at: Date,
  },
  schemaOptions({
    transform(doc, ret) {
      delete ret.password_hash;
    },
  })
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
