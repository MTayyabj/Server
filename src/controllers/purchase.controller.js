const purchaseService = require("../services/purchase.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const list = asyncHandler(async (req, res) => {
  const result = await purchaseService.listPurchases(req.query);
  return sendSuccess(res, {
    message: "Purchases fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});


const create = asyncHandler(async (req, res) => {
  const data = await purchaseService.createPurchase(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Purchase created successfully",
    data,
  });
});

const remove = asyncHandler(async (req, res) => {
  const data = await purchaseService.deletePurchase(req.params.id);

  return sendSuccess(res, {
    message: "Purchase deleted successfully",
    data,
  });
});

const get = asyncHandler(async (req, res) => {
  const data = await purchaseService.getPurchase(req.params.id);
  return sendSuccess(res, {
    message: "Purchase fetched successfully",
    data,
  });
});

module.exports = {
  list,
  create,
  remove,
  get,
};
