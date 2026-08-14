const mongoose = require("mongoose");
const { schemaOptions } = require("./helpers");

const expenseCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  schemaOptions()
);

module.exports =
  mongoose.models.ExpenseCategory ||
  mongoose.model("ExpenseCategory", expenseCategorySchema);
