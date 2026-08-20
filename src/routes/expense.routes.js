const express = require("express");
const expenseController = require("../controllers/expense.controller");
const validate = require("../middlewares/validate.middleware");
const { authorize } = require("../middlewares/auth.middleware");
const expenseValidators = require("../validators/expense.validators");

const router = express.Router();
const staff = ["admin", "manager", "cashier"];

router
  .route("/categories")
  .get(expenseController.listCategories)
  .post(authorize("admin", "manager"), validate(expenseValidators.createCategory), expenseController.createCategory);

router
  .route("/")
  .get(validate(expenseValidators.list), expenseController.list)
  .post(authorize(...staff), validate(expenseValidators.create), expenseController.create);

router
  .route("/:id")
  .put(authorize(...staff), validate(expenseValidators.update), expenseController.update)
  .delete(
    authorize(...staff),
    validate(expenseValidators.deleteExpense),
    expenseController.deleteExpense
  );

module.exports = router;
