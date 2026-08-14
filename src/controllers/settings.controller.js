const settingsService = require("../services/settings.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const get = asyncHandler(async (req, res) => {
  const data = await settingsService.getSettings();
  return sendSuccess(res, {
    message: "Settings fetched successfully",
    data,
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await settingsService.updateSettings(req.body);
  return sendSuccess(res, {
    message: "Settings updated successfully",
    data,
  });
});

module.exports = {
  get,
  update,
};
