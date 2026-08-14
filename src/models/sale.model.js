const mongoose = require("mongoose");
const { schemaOptions, objectId } = require("./helpers");

const saleSchema = new mongoose.Schema(
  {
    invoice_no: { type: String, required: true, unique: true, index: true },
    customer_id: objectId("Customer"),
    total_amount: { type: Number, required: true, min: 0 },
    paid_amount: { type: Number, required: true, min: 0 },
    remaining_amount: { type: Number, required: true, min: 0 },
    payment_method: {
      type: String,
      enum: ["cash", "bank", "credit", "mixed"],
      required: true,
      index: true,
    },
    bank_account_id: objectId("BankAccount", false),
    status: {
      type: String,
      enum: ["paid", "partial", "unpaid", "cancelled"],
      default: "unpaid",
      index: true,
    },
    date: { type: Date, required: true, default: Date.now, index: true },
  },
  schemaOptions()
);

saleSchema.index({ customer_id: 1, date: -1 });

module.exports = mongoose.models.Sale || mongoose.model("Sale", saleSchema);
