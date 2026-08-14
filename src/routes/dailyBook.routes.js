const express = require("express");
const dailyBookController = require("../controllers/dailyBook.controller");
const validate = require("../middlewares/validate.middleware");
const dailyBookValidators = require("../validators/dailyBook.validators");

const router = express.Router();

router.get("/", validate(dailyBookValidators.list), dailyBookController.list);

module.exports = router;
