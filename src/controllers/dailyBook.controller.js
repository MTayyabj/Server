const dailyBookService = require("../services/dailyBook.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const list = asyncHandler(async (req, res) => {
  const result = await dailyBookService.listDailyBook(req.query);
  return sendSuccess(res, {
    message: "Daily book fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

module.exports = {
  list,
};
