const dashboardService = require("../services/dashboard.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const summary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSummary();
  return sendSuccess(res, {
    message: "Dashboard summary fetched successfully",
    data,
  });
});

const charts = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCharts();
  return sendSuccess(res, {
    message: "Dashboard charts fetched successfully",
    data,
  });
});

module.exports = {
  summary,
  charts,
};
