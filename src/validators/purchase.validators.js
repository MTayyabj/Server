const {
  z,
  objectId,
  idParams,
  paginationQuery,
  dateRangeQuery,
  money,
  positiveMoney,
  quantity,
} = require("./common.validators");

const purchaseItem = z.object({
  product_id: objectId,
  quantity,
  unit_price: money,
});

const paymentSplit = z.object({
  method: z.enum(["cash", "bank"]),
  amount: positiveMoney,
  bank_account_id: objectId.optional(),
});

// const list = {
//   query: paginationQuery.merge(dateRangeQuery).extend({
//     payment_method: z.enum(["cash", "bank", "credit", "mixed"]).optional(),
//     supplier_id: objectId.optional(),
//   }),
// };

const list = {
  query: paginationQuery.extend({
    search: z.string().trim().optional(),
    supplier_id: objectId.optional(),
    payment_method: z
      .enum(["cash", "bank", ])
      .optional(),
  }),
};

const create = {
  body: z
    .object({
      supplier_id: objectId,
      paid_amount: money.optional().default(0),
      payment_method: z.enum(["cash", "bank"]),
      bank_account_id: objectId.optional(),
      payments: z.array(paymentSplit).optional().default([]),
      date: z.coerce.date().optional(),
      items: z.array(purchaseItem).min(1),
    })
    .superRefine((data, ctx) => {
      if (data.payment_method === "bank" && data.paid_amount > 0 && !data.bank_account_id) {
        ctx.addIssue({
          code: "custom",
          path: ["bank_account_id"],
          message: "Bank account is required for bank purchase payments.",
        });
      }

      if (data.payment_method === "credit" && data.paid_amount > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["paid_amount"],
          message: "Credit purchases cannot include an immediate paid amount.",
        });
      }

      if (data.payment_method === "mixed" && data.payments.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["payments"],
          message: "Mixed purchases require at least one payment split.",
        });
      }

      data.payments.forEach((payment, index) => {
        if (payment.method === "bank" && !payment.bank_account_id) {
          ctx.addIssue({
            code: "custom",
            path: ["payments", index, "bank_account_id"],
            message: "Bank account is required for bank payment splits.",
          });
        }
      });
    }),
};

module.exports = {
  list,
  create,
  id: { params: idParams },
};
