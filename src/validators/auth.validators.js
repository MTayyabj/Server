const { z } = require("./common.validators");

const login = {
  body: z.object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(6).max(128),
  }),
};

const refreshToken = {
  body: z
    .object({
      refresh_token: z.string().trim().min(20).optional(),
    })
    .optional()
    .default({}),
};

module.exports = {
  login,
  refreshToken,
};
