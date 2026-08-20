const supplierService = require("../services/supplier.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const list = asyncHandler(async (req, res) => {
  const result = await supplierService.listSuppliers(req.query);
  return sendSuccess(res, {
    message: "Suppliers fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const create = asyncHandler(async (req, res) => {
  const data = await supplierService.createSupplier(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Supplier created successfully",
    data,
  });
});

const get = asyncHandler(async (req, res) => {
  const data = await supplierService.getSupplier(req.params.id);
  return sendSuccess(res, {
    message: "Supplier fetched successfully",
    data,
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await supplierService.updateSupplier(req.params.id, req.body);
  return sendSuccess(res, {
    message: "Supplier updated successfully",
    data,
  });
});

const remove = asyncHandler(async (req, res) => {
  const data = await supplierService.deleteSupplier(req.params.id);
  return sendSuccess(res, {
    message: "Supplier deactivated successfully",
    data,
  });
});

const ledger = asyncHandler(async (req, res) => {
  const result = await supplierService.getLedger(req.params.id, req.query);
  return sendSuccess(res, {
    message: "Supplier ledger fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const addLedgerEntry = asyncHandler(async (req, res) => {
  const data = await supplierService.addLedgerEntry(req.params.id, req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Supplier ledger entry created successfully",
    data,
  });
});

const updateLedgerEntry = asyncHandler(async (req, res) => {
  const data = await supplierService.updateLedgerEntry(
    req.params.id,
    req.params.entryId,
    req.body
  );
  return sendSuccess(res, {
    message: "Supplier ledger entry updated successfully",
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
