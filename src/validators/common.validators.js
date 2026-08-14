const mongoose = require("mongoose");
const { z } = require("zod");

const objectId = z
  .string()
  .trim()
  .refine((value) => mongoose.Types.ObjectId.isValid(value), "Invalid MongoDB ObjectId.");

const idParams = z.object({
  id: objectId,
});

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const dateRangeQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const money = z.coerce.number().finite().min(0);
const positiveMoney = z.coerce.number().finite().positive();
const quantity = z.coerce.number().finite().positive();

const status = z.enum(["active", "inactive"]);
const userRole = z.enum(["admin", "manager", "cashier"]);
const paymentMethod = z.enum(["cash", "bank", "credit", "mixed", "adjustment", "none"]);

const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return value;
}, z.boolean().optional());

const nonEmptyString = z.string().trim().min(1);

module.exports = {
  z,
  objectId,
  idParams,
  paginationQuery,
  dateRangeQuery,
  money,
  positiveMoney,
  quantity,
  status,
  userRole,
  paymentMethod,
  optionalBoolean,
  nonEmptyString,
};
