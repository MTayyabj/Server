const { z, nonEmptyString } = require("./common.validators");

const update = {
  body: z
    .object({
      shop_name: nonEmptyString.max(150).optional(),
      logo_url: z.string().trim().url().or(z.literal("")).optional(),
      phone: z.string().trim().max(40).optional(),
      address: z.string().trim().max(400).optional(),
      currency: z.string().trim().max(10).optional(),
      language: z.string().trim().max(20).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, "At least one field is required."),
};

module.exports = {
  update,
};
