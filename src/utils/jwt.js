const jwt = require("jsonwebtoken");
const env = require("../config/env");

const userPayload = (user) => ({
  sub: user.id || user._id.toString(),
  role: user.role,
  email: user.email,
});

const signAccessToken = (user) =>
  jwt.sign(userPayload(user), env.accessTokenSecret, {
    expiresIn: env.accessTokenTtl,
  });

const signRefreshToken = (user) =>
  jwt.sign(userPayload(user), env.refreshTokenSecret, {
    expiresIn: env.refreshTokenTtl,
  });

const verifyAccessToken = (token) => jwt.verify(token, env.accessTokenSecret);

const verifyRefreshToken = (token) => jwt.verify(token, env.refreshTokenSecret);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
