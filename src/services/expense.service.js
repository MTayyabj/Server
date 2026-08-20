const { Expense, ExpenseCategory } = require("../models");
const { withTransaction } = require("../utils/transactions");
const { BadRequestError, NotFoundError } = require("../utils/appError");
const { toMoney } = require("../utils/money");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { getDateRange } = require("../utils/dateRange");
const accounting = require("./accounting.service");

// const listExpenses = async (query) => {
//   const { page, limit, skip } = getPagination(query);
//   const filter = {};
//   const dateRange = getDateRange(query);

//   if (dateRange) filter.date = dateRange;
//   if (query.category_id) filter.category_id = query.category_id;
//   if (query.payment_method) filter.payment_method = query.payment_method;

//   const [expenses, total] = await Promise.all([
//     Expense.find(filter)
//       .populate("category_id", "name")
//       .populate("bank_account_id", "bank_name account_number")
//       .sort({ date: -1, created_at: -1 })
//       .skip(skip)
//       .limit(limit),
//     Expense.countDocuments(filter),
//   ]);

//   return {
//     data: expenses,
//     meta: buildPaginationMeta({ page, limit, total }),
//   };
// };

const listExpenses = async (query) => {
  const { page, limit, skip } = getPagination(query);

  const filter = {};
  const dateRange = getDateRange(query);

  if (dateRange) {
    filter.date = dateRange;
  }

  if (query.category_id) {
    filter.category_id = query.category_id;
  }

  if (query.payment_method) {
    filter.payment_method = query.payment_method;
  }

  if (query.search?.trim()) {
    filter.description = {
      $regex: query.search.trim(),
      $options: "i",
    };
  }

  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate("category_id", "name")
      .populate("bank_account_id", "bank_name account_number")
      .sort({ date: -1, created_at: -1 })
      .skip(skip)
      .limit(limit),

    Expense.countDocuments(filter),
  ]);

  return {
    data: expenses,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const createExpense = async (payload) =>
  withTransaction(async (session) => {
    const category = await ExpenseCategory.findById(payload.category_id).session(session);

    if (!category) {
      throw new NotFoundError("Expense category not found.");
    }

    const date = payload.date || new Date();
    const amount = toMoney(payload.amount);
    const [expense] = await Expense.create(
      [
        {
          ...payload,
          amount,
          date,
        },
      ],
      { session }
    );

    if (payload.payment_method === "cash") {
      await accounting.postCash({
        date,
        description: payload.description,
        cash_out: amount,
        ref_type: "EXPENSE",
        ref_id: expense._id,
        session,
      });
    } else {
      await accounting.postBank({
        bank_account_id: payload.bank_account_id,
        date,
        description: payload.description,
        withdrawal: amount,
        ref_type: "EXPENSE",
        ref_id: expense._id,
        session,
      });
    }

    await accounting.postDailyBook({
      date,
      description: payload.description,
      debit: 0,
      credit: amount,
      ref_type: "EXPENSE",
      ref_id: expense._id,
      session,
    });

    return Expense.findById(expense._id)
      .populate("category_id", "name")
      .populate("bank_account_id", "bank_name account_number")
      .session(session);
  });

const deleteExpense = async (id) =>
  withTransaction(async (session) => {
    const expense = await Expense.findById(id).session(session);

    if (!expense) {
      throw new NotFoundError("Expense not found.");
    }

    const amount = toMoney(expense.amount);

    // Reverse cash/bank accounting entry
    if (expense.payment_method === "cash") {
      await accounting.postCash({
        date: expense.date,
        description: `Reversal: ${expense.description}`,
        cash_in: amount,
        ref_type: "EXPENSE_REVERSAL",
        ref_id: expense._id,
        session,
      });
    } else {
      await accounting.postBank({
        bank_account_id: expense.bank_account_id,
        date: expense.date,
        description: `Reversal: ${expense.description}`,
        deposit: amount,
        ref_type: "EXPENSE_REVERSAL",
        ref_id: expense._id,
        session,
      });
    }

    // Reverse Daily Book entry
    await accounting.postDailyBook({
      date: expense.date,
      description: `Reversal: ${expense.description}`,
      debit: amount,
      credit: 0,
      ref_type: "EXPENSE_REVERSAL",
      ref_id: expense._id,
      session,
    });

    // Finally delete the expense
    await Expense.findByIdAndDelete(expense._id, { session });

    return expense;
  });

const updateExpense = async (id, payload) =>
  withTransaction(async (session) => {
    const expense = await Expense.findById(id).session(session);

    if (!expense) {
      throw new NotFoundError("Expense not found.");
    }

    if (payload.category_id) {
      const category = await ExpenseCategory.findById(payload.category_id).session(session);

      if (!category) {
        throw new NotFoundError("Expense category not found.");
      }

      expense.category_id = payload.category_id;
    }

    if (payload.description !== undefined) {
      expense.description = payload.description;
    }

    if (payload.date !== undefined) {
      expense.date = payload.date;
    }

    if (payload.amount !== undefined) {
      expense.amount = toMoney(payload.amount);
    }

    if (payload.payment_method !== undefined) {
      expense.payment_method = payload.payment_method;
    }

    if (payload.bank_account_id !== undefined) {
      expense.bank_account_id = payload.bank_account_id;
    }

    if (expense.payment_method === "bank" && !expense.bank_account_id) {
      throw new BadRequestError("Bank account is required for bank expenses.");
    }

    if (expense.payment_method === "cash") {
      expense.bank_account_id = undefined;
    }

    await expense.save({ session });

    if (expense.payment_method === "cash") {
      await accounting.replaceCashPayment({
        date: expense.date,
        description: expense.description,
        cash_out: expense.amount,
        ref_type: "EXPENSE",
        ref_id: expense._id,
        session,
      });
    } else {
      await accounting.replaceBankPayment({
        bank_account_id: expense.bank_account_id,
        date: expense.date,
        description: expense.description,
        withdrawal: expense.amount,
        ref_type: "EXPENSE",
        ref_id: expense._id,
        session,
      });
    }

    await accounting.replaceDailyBookEntry({
      date: expense.date,
      description: expense.description,
      debit: 0,
      credit: expense.amount,
      ref_type: "EXPENSE",
      ref_id: expense._id,
      session,
    });

    return Expense.findById(expense._id)
      .populate("category_id", "name")
      .populate("bank_account_id", "bank_name account_number")
      .session(session);
  });

const listCategories = async () => ExpenseCategory.find().sort({ name: 1 });

const createCategory = async (payload) => ExpenseCategory.create(payload);

module.exports = {
  listExpenses,
  createExpense,
  listCategories,
  createCategory,
  deleteExpense,
  updateExpense,
};
