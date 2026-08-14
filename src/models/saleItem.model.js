const mongoose = require("mongoose");
const { schemaOptions, objectId } = require("./helpers");

const saleItemSchema = new mongoose.Schema(
  {
    sale_id: objectId("Sale"),
    product_id: objectId("Product"),
    quantity: { type: Number, required: true, min: 0.01 },
    unit_price: { type: Number, required: true, min: 0 },
    total_price: { type: Number, required: true, min: 0 },
  },
  schemaOptions()
);

saleItemSchema.index({ sale_id: 1, product_id: 1 });

module.exports = mongoose.models.SaleItem || mongoose.model("SaleItem", saleItemSchema);
