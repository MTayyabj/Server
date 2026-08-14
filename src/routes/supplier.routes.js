const express = require("express");
const supplierController = require("../controllers/supplier.controller");
const validate = require("../middlewares/validate.middleware");
const { authorize } = require("../middlewares/auth.middleware");
const supplierValidators = require("../validators/supplier.validators");
const { idParams } = require("../validators/common.validators");

const router = express.Router();
const management = ["admin", "manager"];

router
  .route("/")
  .get(validate(supplierValidators.list), supplierController.list)
  .post(authorize(...management), validate(supplierValidators.create), supplierController.create);

router
  .route("/:id")
  .get(validate({ params: idParams }), supplierController.get)
  .put(authorize(...management), validate(supplierValidators.update), supplierController.update)
  .delete(authorize("admin"), validate({ params: idParams }), supplierController.remove);

router
  .route("/:id/ledger")
  .get(validate(supplierValidators.ledgerList), supplierController.ledger)
  .post(
    authorize(...management),
    validate(supplierValidators.ledgerEntry),
    supplierController.addLedgerEntry
  );

module.exports = router;
