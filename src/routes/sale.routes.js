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
  .post(
    authorize(...staff),
    validate(saleValidators.create),
    saleController.create
  );

router
  .route("/:id")
  .get(
    validate(saleValidators.id),
    saleController.get
  )
  .put(
    authorize(...staff),
    validate(saleValidators.update),
    saleController.update
  );

router.patch(
  "/:id/cancel",
  authorize(...staff),
  validate(saleValidators.id),
  saleController.cancel
);

module.exports = router;
