const {
  z,
  objectId,
  idParams,
  paginationQuery,
  money,
  status,
  paymentMethod,
  nonEmptyString,
} = require("./common.validators");

const list = {
  query: paginationQuery.extend({
    search: z.string().trim().optional(),
    status: status.optional(),
  }),
};

const create = {
  body: z.object({
    name: nonEmptyString.max(100),
    phone: z.string().trim().max(30).optional().default(""),
    address: z.string().trim().max(300).optional().default(""),
    opening_balance: money.optional().default(0),
    status: status.optional().default("active"),
  }),
};

const update = {
  params: idParams,
  body: z
    .object({
      name: nonEmptyString.max(100).optional(),
      phone: z.string().trim().max(30).optional(),
      address: z.string().trim().max(300).optional(),
      opening_balance: money.optional(),
      status: status.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "At least one field is required."),
};

const ledgerList = {
  params: idParams,
  query: paginationQuery,
};

const ledgerEntry = {
  params: idParams,
  body: z
    .object({
      date: z.coerce.date().optional(),
      description: nonEmptyString.max(300),
      debit: money.optional().default(0),
      credit: money.optional().default(0),
      payment_method: paymentMethod.optional().default("adjustment"),
      bank_account_id: objectId.optional(),
    })
    .superRefine((data, ctx) => {
      if (data.debit === 0 && data.credit === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["debit"],
          message: "Debit or credit amount is required.",
        });
      }

      if (data.debit > 0 && data.credit > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["credit"],
          message: "Use either debit or credit for a manual ledger entry.",
        });
      }

      if (data.payment_method === "bank" && !data.bank_account_id) {
        ctx.addIssue({
          code: "custom",
          path: ["bank_account_id"],
          message: "Bank account is required for bank ledger entries.",
        });
      }
    }),
};

module.exports = {
  list,
  create,
  update,
  ledgerList,
  ledgerEntry,
};
