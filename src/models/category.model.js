const mongoose = require("mongoose");
const { schemaOptions } = require("./helpers");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true, default: "" },
  },
  schemaOptions()
);

module.exports = mongoose.models.Category || mongoose.model("Category", categorySchema);
