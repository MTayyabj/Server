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

module.exports = {
  list,
  create,
  get,
};
