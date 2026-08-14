const {
  z,
  objectId,
  idParams,
  paginationQuery,
  money,
  quantity,
  status,
  optionalBoolean,
  nonEmptyString,
} = require("./common.validators");

const list = {
  query: paginationQuery.extend({
    search: z.string().trim().optional(),
    category_id: objectId.optional(),
    low_stock: optionalBoolean,
    status: status.optional(),
  }),
};

const create = {
  body: z.object({
    name: nonEmptyString.max(150),
    category_id: objectId.optional(),
    sku: nonEmptyString.max(60),
    purchase_price: money,
    sale_price: money,
    stock_quantity: money.optional().default(0),
    low_stock_threshold: money.optional().default(10),
    status: status.optional().default("active"),
  }),
};

const update = {
  params: idParams,
  body: create.body.partial().refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required.",
  }),
};

const adjustStock = {
  params: idParams,
  body: z.object({
    quantity: quantity,
    direction: z.enum(["in", "out"]),
    reason: nonEmptyString.max(300),
  }),
};

const createCategory = {
  body: z.object({
    name: nonEmptyString.max(100),
    description: z.string().trim().max(300).optional().default(""),
  }),
};

module.exports = {
  list,
  create,
  update,
  adjustStock,
  createCategory,
};
