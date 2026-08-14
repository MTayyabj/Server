const mongoose = require("mongoose");
const { schemaOptions } = require("./helpers");

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    seq: { type: Number, default: 0 },
  },
  schemaOptions()
);

module.exports = mongoose.models.Counter || mongoose.model("Counter", counterSchema);
