const mongoose = require("mongoose");
const { schemaOptions, objectId } = require("./helpers");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    category_id: objectId("Category", false),
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    purchase_price: { type: Number, required: true, min: 0 },
    sale_price: { type: Number, required: true, min: 0 },
    stock_quantity: { type: Number, required: true, min: 0, default: 0, index: true },
    low_stock_threshold: { type: Number, default: 10, min: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  schemaOptions()
);

productSchema.index({ name: "text", sku: "text" });

module.exports = mongoose.models.Product || mongoose.model("Product", productSchema);
