const mongoose = require("mongoose");
const { schemaOptions, objectId } = require("./helpers");

const expenseSchema = new mongoose.Schema(
  {
    category_id: objectId("ExpenseCategory"),
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    payment_method: { type: String, enum: ["cash", "bank"], required: true, index: true },
    bank_account_id: objectId("BankAccount", false),
    date: { type: Date, required: true, default: Date.now, index: true },
  },
  schemaOptions()
);

expenseSchema.index({ category_id: 1, date: -1 });

module.exports = mongoose.models.Expense || mongoose.model("Expense", expenseSchema);
