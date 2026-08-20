const {
  z,
  objectId,
  idParams,
  paginationQuery,
  dateRangeQuery,
  positiveMoney,
  nonEmptyString,
} = require("./common.validators");

// const list = {
//   query: paginationQuery.merge(dateRangeQuery).extend({
//     category_id: objectId.optional(),
//     payment_method: z.enum(["cash", "bank"]).optional(),
//   }),
// };

const list = {
  query: paginationQuery
    .merge(dateRangeQuery)
    .extend({
      search: z.string().trim().optional(),
      category_id: objectId.optional(),
      payment_method: z.enum(["cash", "bank"]).optional(),
    }),
};

const create = {
  body: z
    .object({
      category_id: objectId,
      description: nonEmptyString.max(300),
      amount: positiveMoney,
      payment_method: z.enum(["cash", "bank"]),
      bank_account_id: objectId.optional(),
      date: z.coerce.date().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.payment_method === "bank" && !data.bank_account_id) {
        ctx.addIssue({
          code: "custom",
          path: ["bank_account_id"],
          message: "Bank account is required for bank expenses.",
        });
      }
    }),
};

const createCategory = {
  body: z.object({
    name: nonEmptyString.max(100),
  }),
};

const deleteExpense = {
  params: idParams,
};

const update = {
  params: idParams,
  body: z
    .object({
      category_id: objectId.optional(),
      description: nonEmptyString.max(300).optional(),
      amount: positiveMoney.optional(),
      payment_method: z.enum(["cash", "bank"]).optional(),
      bank_account_id: objectId.optional(),
      date: z.coerce.date().optional(),
    })
    .superRefine((data, ctx) => {
      if (Object.keys(data).length === 0) {
        ctx.addIssue({
          code: "custom",
          path: [],
          message: "At least one field is required.",
        });
      }

      if (data.payment_method === "bank" && !data.bank_account_id) {
        ctx.addIssue({
          code: "custom",
          path: ["bank_account_id"],
          message: "Bank account is required for bank expenses.",
        });
      }
    }),
};

module.exports = {
  list,
  create,
  createCategory,
  deleteExpense,
  update,
  id: { params: idParams },
};
