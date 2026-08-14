const mongoose = require("mongoose");
const { schemaOptions, objectId } = require("./helpers");

const purchaseSchema = new mongoose.Schema(
  {
    invoice_no: { type: String, required: true, unique: true, index: true },
    supplier_id: objectId("Supplier"),
    total_amount: { type: Number, required: true, min: 0 },
    paid_amount: { type: Number, required: true, min: 0 },
    remaining_amount: { type: Number, required: true, min: 0 },
    payment_method: {
      type: String,
      enum: ["cash", "bank"],
      required: true,
      index: true,
    },
    bank_account_id: objectId("BankAccount", false),
    date: { type: Date, required: true, default: Date.now, index: true },
  },
  schemaOptions()
);

purchaseSchema.index({ supplier_id: 1, date: -1 });

module.exports = mongoose.models.Purchase || mongoose.model("Purchase", purchaseSchema);
