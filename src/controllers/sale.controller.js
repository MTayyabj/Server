const saleService = require("../services/sale.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const list = asyncHandler(async (req, res) => {
  const result = await saleService.listSales(req.query);
  return sendSuccess(res, {
    message: "Sales fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const create = asyncHandler(async (req, res) => {
  const data = await saleService.createSale(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Sale created successfully",
    data,
  });
});

const get = asyncHandler(async (req, res) => {
  const data = await saleService.getSale(req.params.id);
  return sendSuccess(res, {
    message: "Sale fetched successfully",
    data,
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await saleService.updateSale(req.params.id, req.body);
  return sendSuccess(res, {
    message: "Sale updated successfully",
    data,
  });
});

const cancel = asyncHandler(async (req, res) => {
  const data = await saleService.cancelSale(req.params.id);

  return sendSuccess(res, {
    message: "Sale cancelled successfully",
    data,
  });
});

module.exports = {
  list,
  create,
  get,
  update,
  cancel,
};
