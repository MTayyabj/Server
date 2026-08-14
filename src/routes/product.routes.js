const express = require("express");
const productController = require("../controllers/product.controller");
const validate = require("../middlewares/validate.middleware");
const { authorize } = require("../middlewares/auth.middleware");
const productValidators = require("../validators/product.validators");
const { idParams } = require("../validators/common.validators");

const router = express.Router();
const management = ["admin", "manager"];

router
  .route("/categories")
  .get(productController.listCategories)
  .post(authorize(...management), validate(productValidators.createCategory), productController.createCategory);

router
  .route("/")
  .get(validate(productValidators.list), productController.list)
  .post(authorize(...management), validate(productValidators.create), productController.create);

router.patch(
  "/:id/adjust-stock",
  authorize(...management),
  validate(productValidators.adjustStock),
  productController.adjustStock
);

router
  .route("/:id")
  .get(validate({ params: idParams }), productController.get)
  .put(authorize(...management), validate(productValidators.update), productController.update)
  .delete(authorize("admin"), validate({ params: idParams }), productController.remove);

module.exports = router;
