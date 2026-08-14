const express = require("express");
const saleController = require("../controllers/sale.controller");
const validate = require("../middlewares/validate.middleware");
const { authorize } = require("../middlewares/auth.middleware");
const saleValidators = require("../validators/sale.validators");

const router = express.Router();
const staff = ["admin", "manager", "cashier"];

router
  .route("/")
  .get(validate(saleValidators.list), saleController.list)
  .post(authorize(...staff), validate(saleValidators.create), saleController.create);

router.get("/:id", validate(saleValidators.id), saleController.get);

module.exports = router;
