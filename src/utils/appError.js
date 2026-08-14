class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Bad request", details = null) {
    super(message, 400, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details = null) {
    super(message, 401, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details = null) {
    super(message, 403, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found", details = null) {
    super(message, 404, details);
  }
}

class ConflictError extends AppError {
  constructor(message = "Resource conflict", details = null) {
    super(message, 409, details);
  }
}

class InternalServerError extends AppError {
  constructor(message = "Internal server error", details = null) {
    super(message, 500, details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
};
