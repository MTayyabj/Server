const expenseService = require("../services/expense.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const list = asyncHandler(async (req, res) => {
  const result = await expenseService.listExpenses(req.query);
  return sendSuccess(res, {
    message: "Expenses fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const create = asyncHandler(async (req, res) => {
  const data = await expenseService.createExpense(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Expense created successfully",
    data,
  });
});

const listCategories = asyncHandler(async (req, res) => {
  const data = await expenseService.listCategories();
  return sendSuccess(res, {
    message: "Expense categories fetched successfully",
    data,
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const data = await expenseService.createCategory(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Expense category created successfully",
    data,
  });
});

const deleteExpense = asyncHandler(async (req, res) => {
  const data = await expenseService.deleteExpense(req.params.id);

  return sendSuccess(res, {
    statusCode: 200,
    message: "Expense deleted successfully",
    data,
  });
});

module.exports = {
  list,
  create,
  listCategories,
  createCategory,
  deleteExpense,
};
