const express = require("express");
const customerController = require("../controllers/customer.controller");
const validate = require("../middlewares/validate.middleware");
const { authorize } = require("../middlewares/auth.middleware");
const customerValidators = require("../validators/customer.validators");
const { idParams } = require("../validators/common.validators");

const router = express.Router();
const staff = ["admin", "manager", "cashier"];
const management = ["admin", "manager"];

router
  .route("/")
  .get(validate(customerValidators.list), customerController.list)
  .post(authorize(...staff), validate(customerValidators.create), customerController.create);

router
  .route("/:id")
  .get(validate({ params: idParams }), customerController.get)
  .put(authorize(...management), validate(customerValidators.update), customerController.update)
  .delete(authorize("admin"), validate({ params: idParams }), customerController.remove);

router
  .route("/:id/ledger")
  .get(validate(customerValidators.ledgerList), customerController.ledger)
  .post(
    authorize(...staff),
    validate(customerValidators.ledgerEntry),
    customerController.addLedgerEntry
  );

module.exports = router;
