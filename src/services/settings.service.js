const ShopSettings = require("../models/shopSettings.model");

const getSettings = async () => {
  let settings = await ShopSettings.findOne().sort({ created_at: 1 });

  if (!settings) {
    settings = await ShopSettings.create({});
  }

  return settings;
};

const updateSettings = async (payload) => {
  const current = await getSettings();
  Object.assign(current, payload);
  await current.save();
  return current;
};

module.exports = {
  getSettings,
  updateSettings,
};
