const dayjs = require("dayjs");
const Counter = require("../models/counter.model");

const nextInvoiceNumber = async (prefix, session) => {
  const datePart = dayjs().format("YYYYMMDD");
  const key = `${prefix}-${datePart}`;
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );

  return `${prefix}-${datePart}-${String(counter.seq).padStart(5, "0")}`;
};

module.exports = {
  nextInvoiceNumber,
};
