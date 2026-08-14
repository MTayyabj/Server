const express = require("express");
const authController = require("../controllers/auth.controller");
const validate = require("../middlewares/validate.middleware");
const { authenticate } = require("../middlewares/auth.middleware");
const { authLimiter } = require("../middlewares/rateLimit.middleware");
const authValidators = require("../validators/auth.validators");

const router = express.Router();

router.post("/login", authLimiter, validate(authValidators.login), authController.login);
router.post(
  "/refresh-token",
  authLimiter,
  validate(authValidators.refreshToken),
  authController.refreshToken
);
router.get("/me", authenticate, authController.me);

module.exports = router;
