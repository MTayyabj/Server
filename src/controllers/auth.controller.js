const env = require("../config/env");
const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/apiResponse");

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  res.cookie(
    env.refreshCookieName,
    result.tokens.refresh_token,
    authService.getRefreshCookieOptions()
  );

  return sendSuccess(res, {
    message: "Login successful",
    data: result,
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const token = req.body?.refresh_token || req.cookies?.[env.refreshCookieName];
  const result = await authService.refreshToken(token);

  res.cookie(
    env.refreshCookieName,
    result.tokens.refresh_token,
    authService.getRefreshCookieOptions()
  );

  return sendSuccess(res, {
    message: "Token refreshed successfully",
    data: result,
  });
});

const me = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    message: "Authenticated user fetched successfully",
    data: req.user,
  })
);

module.exports = {
  login,
  refreshToken,
  me,
};
