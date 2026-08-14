const dayjs = require("dayjs");
const {
  Sale,
  Expense,
  CashBook,
  BankAccount,
  Customer,
  Supplier,
  DailyBook,
} = require("../models");
const { todayRange } = require("../utils/dateRange");

const sumField = async (model, match, field) => {
  const rows = await model.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);

  return rows[0]?.total || 0;
};

const sumBalances = async (model) => {
  const rows = await model.aggregate([
    { $match: { status: "active", current_balance: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$current_balance" } } },
  ]);

  return rows[0]?.total || 0;
};

const getSummary = async () => {
  const today = todayRange();
  const [
    todaysSales,
    todaysExpenses,
    latestCash,
    bankAccounts,
    totalReceivables,
    totalPayables,
    recentTransactions,
  ] = await Promise.all([
    sumField(Sale, { date: today, status: { $ne: "cancelled" } }, "total_amount"),
    sumField(Expense, { date: today }, "amount"),
    CashBook.findOne().sort({ date: -1, created_at: -1 }),
    BankAccount.find({ status: "active" }).sort({ bank_name: 1 }),
    sumBalances(Customer),
    sumBalances(Supplier),
    DailyBook.find().sort({ date: -1, created_at: -1 }).limit(10),
  ]);

  return {
    todays_sales: todaysSales,
    todays_expenses: todaysExpenses,
    cash_in_hand: latestCash?.running_balance || 0,
    bank_balances: bankAccounts,
    total_bank_balance: bankAccounts.reduce(
      (sum, account) => sum + Number(account.current_balance || 0),
      0
    ),
    total_receivables: totalReceivables,
    total_payables: totalPayables,
    recent_transactions: recentTransactions,
  };
};

const aggregateMonthly = async (model, match, amountField) =>
  model.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
        total: { $sum: `$${amountField}` },
      },
    },
    { $sort: { _id: 1 } },
  ]);

const getCharts = async () => {
  const start = dayjs().subtract(11, "month").startOf("month").toDate();
  const dateMatch = { date: { $gte: start } };

  const [sales, expenses, cashFlow] = await Promise.all([
    aggregateMonthly(Sale, { ...dateMatch, status: { $ne: "cancelled" } }, "total_amount"),
    aggregateMonthly(Expense, dateMatch, "amount"),
    CashBook.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          cash_in: { $sum: "$cash_in" },
          cash_out: { $sum: "$cash_out" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const monthKeys = Array.from({ length: 12 }).map((_, index) =>
    dayjs(start).add(index, "month").format("YYYY-MM")
  );

  const asMap = (rows, field = "total") =>
    rows.reduce((map, row) => {
      map[row._id] = row[field];
      return map;
    }, {});

  const salesMap = asMap(sales);
  const expenseMap = asMap(expenses);
  const cashMap = cashFlow.reduce((map, row) => {
    map[row._id] = row;
    return map;
  }, {});

  return {
    monthly_sales: monthKeys.map((month) => ({
      month,
      sales: salesMap[month] || 0,
    })),
    monthly_expenses: monthKeys.map((month) => ({
      month,
      expenses: expenseMap[month] || 0,
    })),
    cash_flow: monthKeys.map((month) => ({
      month,
      cash_in: cashMap[month]?.cash_in || 0,
      cash_out: cashMap[month]?.cash_out || 0,
      net: (cashMap[month]?.cash_in || 0) - (cashMap[month]?.cash_out || 0),
    })),
  };
};

module.exports = {
  getSummary,
  getCharts,
};
