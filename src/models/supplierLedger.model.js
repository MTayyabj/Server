const mongoose = require("mongoose");
const { schemaOptions, objectId } = require("./helpers");

const supplierLedgerSchema = new mongoose.Schema(
  {
    supplier_id: objectId("Supplier"),
    date: { type: Date, required: true, default: Date.now, index: true },
    description: { type: String, required: true, trim: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    balance: { type: Number, required: true },
    payment_method: {
      type: String,
      enum: ["cash", "bank", "credit", "mixed", "adjustment", "none"],
      default: "none",
    },
    ref_type: { type: String, trim: true, index: true },
    ref_id: { type: mongoose.Schema.Types.ObjectId, index: true },
    bank_account_id: objectId("BankAccount", false),
  },
  schemaOptions()
);

supplierLedgerSchema.index({ supplier_id: 1, date: -1, created_at: -1 });

module.exports =
  mongoose.models.SupplierLedger || mongoose.model("SupplierLedger", supplierLedgerSchema);
