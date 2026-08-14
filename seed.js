const { connectDatabase, disconnectDatabase } = require("./src/config/database");
const models = require("./src/models");
const { hashPassword } = require("./src/utils/password");
const customerService = require("./src/services/customer.service");
const supplierService = require("./src/services/supplier.service");
const productService = require("./src/services/product.service");
const purchaseService = require("./src/services/purchase.service");
const saleService = require("./src/services/sale.service");
const expenseService = require("./src/services/expense.service");
const cashBankService = require("./src/services/cashBank.service");
const settingsService = require("./src/services/settings.service");

const clearDatabase = async () => {
  const collections = [
    models.User,
    models.ShopSettings,
    models.Customer,
    models.CustomerLedger,
    models.Supplier,
    models.SupplierLedger,
    models.Category,
    models.Product,
    models.Sale,
    models.SaleItem,
    models.Purchase,
    models.PurchaseItem,
    models.ExpenseCategory,
    models.Expense,
    models.CashBook,
    models.BankAccount,
    models.BankTransaction,
    models.DailyBook,
    models.Counter,
  ];

  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

const seed = async () => {
  await connectDatabase();
  await clearDatabase();

  await models.User.create([
    {
      name: "Admin User",
      email: "admin@fertilizershop.local",
      password_hash: await hashPassword("Admin@12345"),
      role: "admin",
      status: "active",
    },
    {
      name: "Store Manager",
      email: "manager@fertilizershop.local",
      password_hash: await hashPassword("Manager@12345"),
      role: "manager",
      status: "active",
    },
    {
      name: "POS Cashier",
      email: "cashier@fertilizershop.local",
      password_hash: await hashPassword("Cashier@12345"),
      role: "cashier",
      status: "active",
    },
  ]);

  await settingsService.updateSettings({
    shop_name: "Tayya Fertilizer & Seeds",
    phone: "+92 300 1234567",
    address: "Main Bazaar, Multan Road",
    currency: "PKR",
    language: "en",
  });

  const [fertilizerCategory, seedCategory, pesticideCategory] =
    await models.Category.insertMany([
      { name: "Fertilizers", description: "Urea, DAP, potash, and micronutrients" },
      { name: "Seeds", description: "Seasonal crop seeds" },
      { name: "Pesticides", description: "Crop protection products" },
    ]);

  const [rentCategory, utilitiesCategory] = await models.ExpenseCategory.insertMany([
    { name: "Rent" },
    { name: "Utilities" },
    { name: "Transport" },
  ]);

  const bank = await cashBankService.createBankAccount({
    bank_name: "Meezan Bank",
    account_number: "PK55-MEEZ-00012345",
    current_balance: 350000,
  });

  await cashBankService.createManualCashEntry({
    description: "Opening cash in hand",
    cash_in: 75000,
  });

  const customerAli = await customerService.createCustomer({
    name: "Ali Traders",
    phone: "03001234567",
    address: "Grain Market",
    opening_balance: 25000,
  });

  await customerService.createCustomer({
    name: "Green Fields Farm",
    phone: "03009876543",
    address: "Village Chak 12",
    opening_balance: 0,
  });

  const supplierAgro = await supplierService.createSupplier({
    name: "Agro Chemicals Pvt Ltd",
    phone: "042111222333",
    address: "Industrial Estate Lahore",
    opening_balance: 60000,
  });

  await supplierService.createSupplier({
    name: "Punjab Seed Corporation",
    phone: "0615558844",
    address: "Seed Market Multan",
    opening_balance: 0,
  });

  const urea = await productService.createProduct({
    name: "Sona Urea 50kg",
    category_id: fertilizerCategory._id,
    sku: "UREA-50KG",
    purchase_price: 8500,
    sale_price: 9500,
    stock_quantity: 0,
    low_stock_threshold: 15,
  });

  const dap = await productService.createProduct({
    name: "DAP Fertilizer 50kg",
    category_id: fertilizerCategory._id,
    sku: "DAP-50KG",
    purchase_price: 13000,
    sale_price: 14500,
    stock_quantity: 0,
    low_stock_threshold: 10,
  });

  await productService.createProduct({
    name: "Wheat Seed Premium 40kg",
    category_id: seedCategory._id,
    sku: "WHEAT-SEED-40KG",
    purchase_price: 7200,
    sale_price: 8200,
    stock_quantity: 30,
    low_stock_threshold: 8,
  });

  await productService.createProduct({
    name: "Crop Shield Pesticide 1L",
    category_id: pesticideCategory._id,
    sku: "PEST-SHIELD-1L",
    purchase_price: 1800,
    sale_price: 2400,
    stock_quantity: 45,
    low_stock_threshold: 12,
  });

  await purchaseService.createPurchase({
    supplier_id: supplierAgro._id,
    payment_method: "bank",
    paid_amount: 200000,
    bank_account_id: bank._id,
    items: [
      { product_id: urea._id, quantity: 50, unit_price: 8500 },
      { product_id: dap._id, quantity: 20, unit_price: 13000 },
    ],
  });

  await saleService.createSale({
    customer_id: customerAli._id,
    payment_method: "mixed",
    paid_amount: 100000,
    payments: [
      { method: "cash", amount: 40000 },
      { method: "bank", amount: 60000, bank_account_id: bank._id },
    ],
    items: [
      { product_id: urea._id, quantity: 10, unit_price: 9500 },
      { product_id: dap._id, quantity: 5, unit_price: 14500 },
    ],
  });

  await expenseService.createExpense({
    category_id: rentCategory._id,
    description: "Monthly shop rent",
    amount: 35000,
    payment_method: "cash",
  });

  await expenseService.createExpense({
    category_id: utilitiesCategory._id,
    description: "Electricity bill",
    amount: 12000,
    payment_method: "bank",
    bank_account_id: bank._id,
  });
};

seed()
  .then(async () => {
    console.log("Seed data inserted successfully.");
    await disconnectDatabase();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await disconnectDatabase();
    process.exit(1);
  });
