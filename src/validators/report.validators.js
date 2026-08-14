const { z, objectId, dateRangeQuery } = require("./common.validators");

const reportQuery = {
  query: dateRangeQuery.extend({
    format: z.enum(["json", "pdf"]).optional().default("json"),
    customer_id: objectId.optional(),
    supplier_id: objectId.optional(),
    payment_method: z.string().trim().optional(),
  }),
};

module.exports = {
  reportQuery,
};
