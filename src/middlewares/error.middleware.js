const mongoose = require("mongoose");
const { AppError, NotFoundError } = require("../utils/appError");

const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
};

const normalizeError = (err) => {
  if (err instanceof AppError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    return new AppError("Validation failed", 400, err.errors);
  }

  if (err instanceof mongoose.Error.CastError) {
    return new AppError("Invalid identifier supplied", 400, err.message);
  }

  if (err?.code === 11000) {
    return new AppError("Duplicate value violates a unique constraint", 409, err.keyValue);
  }

  if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
    return new AppError("Invalid or expired token", 401);
  }

  return err;
};

const errorHandler = (err, req, res, next) => {
  const normalized = normalizeError(err);
  const statusCode = normalized.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  if (statusCode >= 500) {
    console.error(normalized);
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500 && isProduction
        ? "Internal server error"
        : normalized.message || "Internal server error",
    error: normalized.name || "Error",
    details: normalized.details || undefined,
    stack: !isProduction ? normalized.stack : undefined,
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
