const mongoose = require("mongoose");
const { schemaOptions } = require("./helpers");

const bankAccountSchema = new mongoose.Schema(
  {
    bank_name: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    account_number: { type: String, required: true, unique: true, trim: true },
    current_balance: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  schemaOptions()
);

module.exports =
  mongoose.models.BankAccount || mongoose.model("BankAccount", bankAccountSchema);
