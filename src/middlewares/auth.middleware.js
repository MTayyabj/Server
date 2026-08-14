const User = require("../models/user.model");
const { UnauthorizedError, ForbiddenError } = require("../utils/appError");
const { verifyAccessToken } = require("../utils/jwt");

const getBearerToken = (req) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7);
};

const authenticate = async (req, res, next) => {
  try {
    const token = getBearerToken(req) || req.cookies?.access_token;

    if (!token) {
      throw new UnauthorizedError("Authentication token is required.");
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub);

    if (!user || user.status !== "active") {
      throw new UnauthorizedError("User is not active or no longer exists.");
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError("Authentication is required."));
  }

  if (!roles.includes(req.user.role)) {
    return next(new ForbiddenError("You do not have permission to perform this action."));
  }

  return next();
};

module.exports = {
  authenticate,
  authorize,
};
