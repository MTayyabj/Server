const express = require("express");
const settingsController = require("../controllers/settings.controller");
const validate = require("../middlewares/validate.middleware");
const { authorize } = require("../middlewares/auth.middleware");
const settingsValidators = require("../validators/settings.validators");

const router = express.Router();

router
  .route("/")
  .get(settingsController.get)
  .put(authorize("admin"), validate(settingsValidators.update), settingsController.update);

module.exports = router;
