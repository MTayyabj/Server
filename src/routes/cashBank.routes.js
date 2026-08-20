const express = require("express");
const cashBankController = require("../controllers/cashBank.controller");
const validate = require("../middlewares/validate.middleware");
const { authorize } = require("../middlewares/auth.middleware");
const cashBankValidators = require("../validators/cashBank.validators");

const router = express.Router();
const staff = ["admin", "manager", "cashier"];
const management = ["admin", "manager"];

router
  .route("/cash-book")
  .get(validate(cashBankValidators.cashBookList), cashBankController.listCashBook)
  .post(
    authorize(...staff),
    validate(cashBankValidators.manualCash),
    cashBankController.createManualCashEntry
  );

router.put(
  "/cash-book/:id",
  authorize(...staff),
  validate(cashBankValidators.updateCashEntry),
  cashBankController.updateManualCashEntry
);

router
  .route("/bank-accounts")
  .get(cashBankController.listBankAccounts)
  .post(
    authorize(...management),
    validate(cashBankValidators.createBankAccount),
    cashBankController.createBankAccount
  );

router.put(
  "/bank-accounts/:id",
  authorize(...management),
  validate(cashBankValidators.updateBankAccount),
  cashBankController.updateBankAccount
);

router.post(
  "/bank-accounts/transfer",
  authorize(...management),
  validate(cashBankValidators.transfer),
  cashBankController.transfer
);

router.get(
  "/bank-accounts/:id/ledger",
  validate(cashBankValidators.bankLedger),
  cashBankController.bankLedger
);

router.put(
  "/bank-accounts/:id/ledger/:transactionId",
  authorize(...management),
  validate(cashBankValidators.updateBankTransaction),
  cashBankController.updateBankTransaction
);

router.delete(
  "/bank-accounts/:id",
  authorize(...management),
  validate(cashBankValidators.deleteBankAccount),
  cashBankController.deleteBankAccount
);

router.patch(
  "/bank-accounts/:id/status",
  authorize(...management),
  validate(cashBankValidators.updateBankAccountStatus),
  cashBankController.updateBankAccountStatus
);

module.exports = router;
