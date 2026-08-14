const { ZodError } = require("zod");
const { BadRequestError } = require("../utils/appError");

const formatIssues = (issues) =>
  issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

const validate = (schema) => (req, res, next) => {
  try {
    if (schema.params) req.params = schema.params.parse(req.params);
    if (schema.query) req.query = schema.query.parse(req.query);
    if (schema.body) req.body = schema.body.parse(req.body);
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      return next(new BadRequestError("Request validation failed", formatIssues(err.issues)));
    }

    return next(err);
  }
};

module.exports = validate;
