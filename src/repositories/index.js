const BaseRepository = require("./base.repository");
const models = require("../models");

module.exports = {
  users: new BaseRepository(models.User),
  settings: new BaseRepository(models.ShopSettings),
  customers: new BaseRepository(models.Customer),
  customerLedgers: new BaseRepository(models.CustomerLedger),
  suppliers: new BaseRepository(models.Supplier),
  supplierLedgers: new BaseRepository(models.SupplierLedger),
  categories: new BaseRepository(models.Category),
  products: new BaseRepository(models.Product),
  sales: new BaseRepository(models.Sale),
  saleItems: new BaseRepository(models.SaleItem),
  purchases: new BaseRepository(models.Purchase),
  purchaseItems: new BaseRepository(models.PurchaseItem),
  expenseCategories: new BaseRepository(models.ExpenseCategory),
  expenses: new BaseRepository(models.Expense),
  cashBook: new BaseRepository(models.CashBook),
  bankAccounts: new BaseRepository(models.BankAccount),
  bankTransactions: new BaseRepository(models.BankTransaction),
  dailyBook: new BaseRepository(models.DailyBook),
  counters: new BaseRepository(models.Counter),
};
