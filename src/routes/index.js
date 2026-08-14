const express = require("express");
const authRoutes = require("./auth.routes");
const dashboardRoutes = require("./dashboard.routes");
const customerRoutes = require("./customer.routes");
const supplierRoutes = require("./supplier.routes");
const productRoutes = require("./product.routes");
const saleRoutes = require("./sale.routes");
const purchaseRoutes = require("./purchase.routes");
const expenseRoutes = require("./expense.routes");
const cashBankRoutes = require("./cashBank.routes");
const dailyBookRoutes = require("./dailyBook.routes");
const reportRoutes = require("./report.routes");
const settingsRoutes = require("./settings.routes");
const { authenticate } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use("/auth", authRoutes);

router.use(authenticate);

router.use("/dashboard", dashboardRoutes);
router.use("/customers", customerRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/products", productRoutes);
router.use("/sales", saleRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/expenses", expenseRoutes);
router.use(cashBankRoutes);
router.use("/daily-book", dailyBookRoutes);
router.use("/reports", reportRoutes);
router.use("/settings", settingsRoutes);

module.exports = router;
