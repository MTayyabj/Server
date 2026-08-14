const { Product, Category } = require("../models");
const { withTransaction } = require("../utils/transactions");
const { BadRequestError, NotFoundError } = require("../utils/appError");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { buildSearchRegex } = require("../utils/query");

const findProductOrFail = async (id, session) => {
  const product = await Product.findById(id).session(session);

  if (!product) {
    throw new NotFoundError("Product not found.");
  }

  return product;
};

const listProducts = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.category_id) filter.category_id = query.category_id;
  if (query.search) {
    const search = buildSearchRegex(query.search);
    filter.$or = [{ name: search }, { sku: search }];
  }

  if (query.low_stock) {
    filter.$expr = { $lte: ["$stock_quantity", "$low_stock_threshold"] };
  }

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category_id", "name description")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    data: products,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const createProduct = async (payload) => {
  if (payload.category_id) {
    const category = await Category.findById(payload.category_id);
    if (!category) throw new NotFoundError("Category not found.");
  }

  return Product.create(payload);
};

const getProduct = async (id) => {
  const product = await Product.findById(id).populate("category_id", "name description");
  if (!product) throw new NotFoundError("Product not found.");
  return product;
};

const updateProduct = async (id, payload) => {
  if (payload.category_id) {
    const category = await Category.findById(payload.category_id);
    if (!category) throw new NotFoundError("Category not found.");
  }

  const product = await Product.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate("category_id", "name description");

  if (!product) {
    throw new NotFoundError("Product not found.");
  }

  return product;
};

const deleteProduct = async (id) => {
  const product = await Product.findByIdAndUpdate(
    id,
    { status: "inactive" },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new NotFoundError("Product not found.");
  }

  return product;
};

const adjustStock = async (id, payload) =>
  withTransaction(async (session) => {
    const delta = payload.direction === "in" ? payload.quantity : -payload.quantity;
    const filter = { _id: id };

    if (delta < 0) {
      filter.stock_quantity = { $gte: Math.abs(delta) };
    }

    const product = await Product.findOneAndUpdate(
      filter,
      { $inc: { stock_quantity: delta } },
      { new: true, runValidators: true, session }
    );

    if (!product) {
      throw new BadRequestError("Product not found or insufficient stock.");
    }

    return product;
  });

const listCategories = async () => Category.find().sort({ name: 1 });

const createCategory = async (payload) => Category.create(payload);

module.exports = {
  listProducts,
  createProduct,
  getProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  listCategories,
  createCategory,
  findProductOrFail,
};
