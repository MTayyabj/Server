const productService = require("../services/product.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const list = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  return sendSuccess(res, {
    message: "Products fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const create = asyncHandler(async (req, res) => {
  const data = await productService.createProduct(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Product created successfully",
    data,
  });
});

const get = asyncHandler(async (req, res) => {
  const data = await productService.getProduct(req.params.id);
  return sendSuccess(res, {
    message: "Product fetched successfully",
    data,
  });
});

const update = asyncHandler(async (req, res) => {
  const data = await productService.updateProduct(req.params.id, req.body);
  return sendSuccess(res, {
    message: "Product updated successfully",
    data,
  });
});

const remove = asyncHandler(async (req, res) => {
  const data = await productService.deleteProduct(req.params.id);
  return sendSuccess(res, {
    message: "Product deactivated successfully",
    data,
  });
});

const adjustStock = asyncHandler(async (req, res) => {
  const data = await productService.adjustStock(req.params.id, req.body);
  return sendSuccess(res, {
    message: "Product stock adjusted successfully",
    data,
  });
});

const listCategories = asyncHandler(async (req, res) => {
  const data = await productService.listCategories();
  return sendSuccess(res, {
    message: "Categories fetched successfully",
    data,
  });
});

const createCategory = asyncHandler(async (req, res) => {
  const data = await productService.createCategory(req.body);
  return sendSuccess(res, {
    statusCode: 201,
    message: "Category created successfully",
    data,
  });
});

module.exports = {
  list,
  create,
  get,
  update,
  remove,
  adjustStock,
  listCategories,
  createCategory,
};
