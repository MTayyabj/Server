const toMoney = (value) => {
  const parsed = Number(value || 0);
  return Number(parsed.toFixed(2));
};

const addMoney = (...values) => toMoney(values.reduce((sum, value) => sum + Number(value || 0), 0));

const subtractMoney = (left, right) => toMoney(Number(left || 0) - Number(right || 0));

module.exports = {
  toMoney,
  addMoney,
  subtractMoney,
};
