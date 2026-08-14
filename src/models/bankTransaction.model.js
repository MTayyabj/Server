const mongoose = require("mongoose");
const { schemaOptions, objectId } = require("./helpers");

const bankTransactionSchema = new mongoose.Schema(
  {
    bank_account_id: objectId("BankAccount"),
    date: { type: Date, required: true, default: Date.now, index: true },
    description: { type: String, required: true, trim: true },
    deposit: { type: Number, default: 0, min: 0 },
    withdrawal: { type: Number, default: 0, min: 0 },
    running_balance: { type: Number, required: true },
    ref_type: { type: String, trim: true, index: true },
    ref_id: { type: mongoose.Schema.Types.ObjectId, index: true },
  },
  schemaOptions()
);

bankTransactionSchema.index({ bank_account_id: 1, date: -1, created_at: -1 });

module.exports =
  mongoose.models.BankTransaction ||
  mongoose.model("BankTransaction", bankTransactionSchema);
