const mongoose = require("mongoose");
const { schemaOptions } = require("./helpers");

const shopSettingsSchema = new mongoose.Schema(
  {
    shop_name: { type: String, required: true, trim: true, default: "Fertilizer Shop" },
    logo_url: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    currency: { type: String, trim: true, default: "PKR" },
    language: { type: String, trim: true, default: "en" },
  },
  schemaOptions()
);

module.exports =
  mongoose.models.ShopSettings || mongoose.model("ShopSettings", shopSettingsSchema);
