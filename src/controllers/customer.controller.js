
const customerService = require("../services/customer.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const list = asyncHandler(async (req, res) => {
  const result = await customerService.listCustomers(req.query);
  return sendSuccess(res, {
    message: "Customers fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const create = asyncHandler(async (req, res) => {
  const data = await customerService.createCustomer(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Customer created successfully",
    data,
  });
});

const get = asyncHandler(async (req, res) => {
  const data = await customerService.getCustomer(req.params.id);
  return sendSuccess(res, {
    message: "Customer fetched successfully",
    data,
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await customerService.updateCustomer(req.params.id, req.body);
  return sendSuccess(res, {
    message: "Customer updated successfully",
    data,
  });
});

const remove = asyncHandler(async (req, res) => {
  const data = await customerService.deleteCustomer(req.params.id);
  return sendSuccess(res, {
    message: "Customer deactivated successfully",
    data,
  });
});

const ledger = asyncHandler(async (req, res) => {
  const result = await customerService.getLedger(req.params.id, req.query);
  return sendSuccess(res, {
    message: "Customer ledger fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const addLedgerEntry = asyncHandler(async (req, res) => {
  const data = await customerService.addLedgerEntry(req.params.id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Customer ledger entry created successfully",
    data,
  });
});

const updateLedgerEntry = asyncHandler(async (req, res) => {
  const data = await customerService.updateLedgerEntry(
    req.params.id,
    req.params.entryId,
    req.body
  );
  return sendSuccess(res, {
    message: "Customer ledger entry updated successfully",
    data,
  });
});

module.exports = {
  list,
  create,
  get,
  update,
  remove,
  ledger,
  addLedgerEntry,
  updateLedgerEntry,
};
