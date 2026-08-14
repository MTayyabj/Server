const mongoose = require("mongoose");
const { schemaOptions } = require("./helpers");

const cashBookSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now, index: true },
    description: { type: String, required: true, trim: true },
    cash_in: { type: Number, default: 0, min: 0 },
    cash_out: { type: Number, default: 0, min: 0 },
    running_balance: { type: Number, required: true },
    ref_type: { type: String, trim: true, index: true },
    ref_id: { type: mongoose.Schema.Types.ObjectId, index: true },
  },
  schemaOptions()
);

cashBookSchema.index({ date: -1, created_at: -1 });

module.exports = mongoose.models.CashBook || mongoose.model("CashBook", cashBookSchema);
