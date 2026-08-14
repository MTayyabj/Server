const mongoose = require("mongoose");
const { schemaOptions, objectId } = require("./helpers");

const purchaseItemSchema = new mongoose.Schema(
  {
    purchase_id: objectId("Purchase"),
    product_id: objectId("Product"),
    quantity: { type: Number, required: true, min: 0.01 },
    unit_price: { type: Number, required: true, min: 0 },
    total_price: { type: Number, required: true, min: 0 },
  },
  schemaOptions()
);

purchaseItemSchema.index({ purchase_id: 1, product_id: 1 });

module.exports =
  mongoose.models.PurchaseItem || mongoose.model("PurchaseItem", purchaseItemSchema);
