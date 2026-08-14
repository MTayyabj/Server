const express = require("express");
const purchaseController = require("../controllers/purchase.controller");
const validate = require("../middlewares/validate.middleware");
const { authorize } = require("../middlewares/auth.middleware");
const purchaseValidators = require("../validators/purchase.validators");

const router = express.Router();
const management = ["admin", "manager"];

router
  .route("/")
  .get(validate(purchaseValidators.list), purchaseController.list)
  .post(authorize(...management), validate(purchaseValidators.create), purchaseController.create);

// router.get("/:id", validate(purchaseValidators.id), purchaseController.get);
  router
  .route("/:id")
  .get(
    validate(purchaseValidators.id),
    purchaseController.get
  )
  .delete(
    authorize(...management),
    validate(purchaseValidators.id),
    purchaseController.remove
  );

module.exports = router;
