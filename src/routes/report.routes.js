const express = require("express");
const reportController = require("../controllers/report.controller");
const validate = require("../middlewares/validate.middleware");
const { authorize } = require("../middlewares/auth.middleware");
const reportValidators = require("../validators/report.validators");

const router = express.Router();

router.use(authorize("admin", "manager"));

router.get("/sales", validate(reportValidators.reportQuery), reportController.sales);
router.get("/expenses", validate(reportValidators.reportQuery), reportController.expenses);
router.get(
  "/customer-summary",
  validate(reportValidators.reportQuery),
  reportController.customerSummary
);
router.get(
  "/supplier-summary",
  validate(reportValidators.reportQuery),
  reportController.supplierSummary
);
router.get("/cash-flow", validate(reportValidators.reportQuery), reportController.cashFlow);

module.exports = router;
