const User = require("../models/user.model");
const env = require("../config/env");
const { UnauthorizedError } = require("../utils/appError");
const { comparePassword } = require("../utils/password");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt");

const tokenResponse = (user) => ({
  user: user.toJSON(),
  tokens: {
    access_token: signAccessToken(user),
    refresh_token: signRefreshToken(user),
    token_type: "Bearer",
  },
});

const login = async ({ email, password }) => {
  const user = await User.findOne({ email, status: "active" }).select("+password_hash");

  if (!user) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  const isMatch = await comparePassword(password, user.password_hash);

  if (!isMatch) {
    throw new UnauthorizedError("Invalid email or password.");
  }

  user.last_login_at = new Date();
  await user.save();

  return tokenResponse(user);
};

const refreshToken = async (token) => {
  if (!token) {
    throw new UnauthorizedError("Refresh token is required.");
  }

  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.sub);

  if (!user || user.status !== "active") {
    throw new UnauthorizedError("User is not active or no longer exists.");
  }

  return tokenResponse(user);
};

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

module.exports = {
  login,
  refreshToken,
  getRefreshCookieOptions,
};
