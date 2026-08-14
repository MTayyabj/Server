const mongoose = require("mongoose");
const { schemaOptions } = require("./helpers");

const dailyBookSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now, index: true },
    description: { type: String, required: true, trim: true },
    ref_type: { type: String, trim: true, index: true },
    ref_id: { type: mongoose.Schema.Types.ObjectId, index: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    running_balance: { type: Number, required: true },
  },
  schemaOptions()
);

dailyBookSchema.index({ date: -1, created_at: -1 });

module.exports = mongoose.models.DailyBook || mongoose.model("DailyBook", dailyBookSchema);
