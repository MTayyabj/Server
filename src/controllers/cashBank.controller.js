const cashBankService = require("../services/cashBank.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const listCashBook = asyncHandler(async (req, res) => {
  const result = await cashBankService.listCashBook(req.query);
  return sendSuccess(res, {
    message: "Cash book fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const createManualCashEntry = asyncHandler(async (req, res) => {
  const data = await cashBankService.createManualCashEntry(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Cash book entry created successfully",
    data,
  });
});

const listBankAccounts = asyncHandler(async (req, res) => {
  const data = await cashBankService.listBankAccounts();
  return sendSuccess(res, {
    message: "Bank accounts fetched successfully",
    data,
  });
});

const createBankAccount = asyncHandler(async (req, res) => {
  const data = await cashBankService.createBankAccount(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Bank account created successfully",
    data,
  });
});

const deleteBankAccount = asyncHandler(async (req, res) => {
  const data = await cashBankService.deleteBankAccount(req.params.id);
  
  return sendSuccess(res, {
    statusCode: 200,
    message: "Bank account deleted successfully",
    data,
  });
});

const updateBankAccountStatus = asyncHandler(async (req, res) => {
  const data = await cashBankService.updateBankAccountStatus(
    req.params.id,
    req.body.status
  );

  return sendSuccess(res, {
    statusCode: 200,
    message: `Bank account ${data.status === "active" ? "activated" : "deactivated"} successfully`,
    data,
  });
});

const updateBankAccount = asyncHandler(async (req, res) => {
  const data = await cashBankService.updateBankAccount(req.params.id, req.body);
  return sendSuccess(res, {
    message: "Bank account updated successfully",
    data,
  });
});

const updateManualCashEntry = asyncHandler(async (req, res) => {
  const data = await cashBankService.updateManualCashEntry(req.params.id, req.body);
  return sendSuccess(res, {
    message: "Cash book entry updated successfully",
    data,
  });
});

const updateBankTransaction = asyncHandler(async (req, res) => {
  const data = await cashBankService.updateBankTransaction(
    req.params.id,
    req.params.transactionId,
    req.body
  );
  return sendSuccess(res, {
    message: "Bank transaction updated successfully",
    data,
  });
});

const transfer = asyncHandler(async (req, res) => {
  const data = await cashBankService.transfer(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Transfer completed successfully",
    data,
  });
});

const bankLedger = asyncHandler(async (req, res) => {
  const result = await cashBankService.getBankLedger(req.params.id, req.query);
  return sendSuccess(res, {
    message: "Bank ledger fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

module.exports = {
  listCashBook,
  createManualCashEntry,
  updateManualCashEntry,
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  updateBankAccountStatus,
  transfer,
  bankLedger,
  updateBankTransaction,
};
