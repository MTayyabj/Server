const dayjs = require("dayjs");

const getDateRange = ({ from, to } = {}) => {
  const start = from ? dayjs(from).startOf("day").toDate() : null;
  const end = to ? dayjs(to).endOf("day").toDate() : null;

  if (start && end) return { $gte: start, $lte: end };
  if (start) return { $gte: start };
  if (end) return { $lte: end };
  return null;
};

const todayRange = () => ({
  $gte: dayjs().startOf("day").toDate(),
  $lte: dayjs().endOf("day").toDate(),
});

module.exports = {
  getDateRange,
  todayRange,
};
