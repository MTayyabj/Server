const mongoose = require("mongoose");
const { schemaOptions } = require("./helpers");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, trim: true, index: true },
    address: { type: String, trim: true, default: "" },
    opening_balance: { type: Number, default: 0 },
    current_balance: { type: Number, default: 0, index: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  schemaOptions()
);

customerSchema.index({ name: "text", phone: "text" });

module.exports = mongoose.models.Customer || mongoose.model("Customer", customerSchema);
