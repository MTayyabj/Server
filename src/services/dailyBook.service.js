const { DailyBook } = require("../models");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { getDateRange } = require("../utils/dateRange");

const listDailyBook = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  const dateRange = getDateRange(query);
  if (dateRange) filter.date = dateRange;

  const [entries, total] = await Promise.all([
    DailyBook.find(filter).sort({ date: -1, created_at: -1 }).skip(skip).limit(limit),
    DailyBook.countDocuments(filter),
  ]);

  return {
    data: entries,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

module.exports = {
  listDailyBook,
};
