const {
  z,
  objectId,
  idParams,
  paginationQuery,
  dateRangeQuery,
  positiveMoney,
  nonEmptyString,
} = require("./common.validators");

// const cashBookList = {
//   query: paginationQuery.merge(dateRangeQuery),
// };
const cashBookList = {
  query: paginationQuery
    .merge(dateRangeQuery)
    .extend({
      search: z.string().trim().optional(),
    }),
};

const manualCash = {
  body: z.object({
    date: z.coerce.date().optional(),
    description: nonEmptyString.max(300),
    cash_in: z.coerce.number().finite().min(0).optional().default(0),
    cash_out: z.coerce.number().finite().min(0).optional().default(0),
  }).superRefine((data, ctx) => {
    if (data.cash_in === 0 && data.cash_out === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["cash_in"],
        message: "Cash in or cash out amount is required.",
      });
    }

    if (data.cash_in > 0 && data.cash_out > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["cash_out"],
        message: "Use either cash in or cash out for one manual entry.",
      });
    }
  }),
};

const createBankAccount = {
  body: z.object({
    bank_name: nonEmptyString.max(120),
    title: nonEmptyString.max(120), 
    account_number: nonEmptyString.max(80),
    current_balance: z.coerce.number().finite().min(0).optional().default(0),
    status: z.enum(["active", "inactive"]).optional().default("active"),
  }),
};

const deleteBankAccount = {
  params: idParams,
};

const transfer = {
  body: z
    .object({
      from_type: z.enum(["cash", "bank"]),
      to_type: z.enum(["cash", "bank"]),
      from_bank_account_id: objectId.optional(),
      to_bank_account_id: objectId.optional(),
      amount: positiveMoney,
      description: nonEmptyString.max(300).optional().default("Funds transfer"),
      date: z.coerce.date().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.from_type === data.to_type && data.from_type === "cash") {
        ctx.addIssue({
          code: "custom",
          path: ["to_type"],
          message: "Cash-to-cash transfer is not valid.",
        });
      }

      if (data.from_type === "bank" && !data.from_bank_account_id) {
        ctx.addIssue({
          code: "custom",
          path: ["from_bank_account_id"],
          message: "Source bank account is required.",
        });
      }

      if (data.to_type === "bank" && !data.to_bank_account_id) {
        ctx.addIssue({
          code: "custom",
          path: ["to_bank_account_id"],
          message: "Destination bank account is required.",
        });
      }

      if (
        data.from_bank_account_id &&
        data.to_bank_account_id &&
        data.from_bank_account_id === data.to_bank_account_id
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["to_bank_account_id"],
          message: "Source and destination bank accounts must be different.",
        });
      }
    }),
};

const bankLedger = {
  params: idParams,
  query: paginationQuery.merge(dateRangeQuery),
};

const updateBankAccountStatus = {
  params: idParams,
  body: z.object({
    status: z.enum(["active", "inactive"]),
  }),
};

module.exports = {
  cashBookList,
  manualCash,
  createBankAccount,
  deleteBankAccount,
  updateBankAccountStatus,
  transfer,
  bankLedger,
};
