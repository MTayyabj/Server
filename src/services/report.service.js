const {
  Sale,
  Expense,
  Customer,
  Supplier,
  CashBook,
  BankTransaction,
} = require("../models");
const { getDateRange } = require("../utils/dateRange");

const formatCurrency = (value) => Number(value || 0).toFixed(2);

const buildDateFilter = (query) => {
  const dateRange = getDateRange(query);
  return dateRange ? { date: dateRange } : {};
};

const salesReport = async (query) => {
  const filter = {
    ...buildDateFilter(query),
    status: { $ne: "cancelled" },
  };

  if (query.customer_id) filter.customer_id = query.customer_id;
  if (query.payment_method) filter.payment_method = query.payment_method;

  const sales = await Sale.find(filter)
    .populate("customer_id", "name phone")
    .sort({ date: -1, created_at: -1 });

  const summary = sales.reduce(
    (acc, sale) => {
      acc.total_amount += sale.total_amount;
      acc.paid_amount += sale.paid_amount;
      acc.remaining_amount += sale.remaining_amount;
      return acc;
    },
    { total_amount: 0, paid_amount: 0, remaining_amount: 0 }
  );

  return {
    title: "Sales Report",
    rows: sales,
    summary,
    lines: sales.map(
      (sale) =>
        `${sale.invoice_no} | ${sale.customer_id?.name || "Customer"} | ${formatCurrency(
          sale.total_amount
        )} | Paid ${formatCurrency(sale.paid_amount)}`
    ),
  };
};

const expensesReport = async (query) => {
  const filter = buildDateFilter(query);
  if (query.payment_method) filter.payment_method = query.payment_method;

  const expenses = await Expense.find(filter)
    .populate("category_id", "name")
    .sort({ date: -1, created_at: -1 });
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return {
    title: "Expenses Report",
    rows: expenses,
    summary: { total_amount: total },
    lines: expenses.map(
      (expense) =>
        `${expense.category_id?.name || "Expense"} | ${expense.description} | ${formatCurrency(
          expense.amount
        )}`
    ),
  };
};

const customerSummary = async () => {
  const customers = await Customer.find().sort({ name: 1 });
  const summary = customers.reduce(
    (acc, customer) => {
      acc.opening_balance += customer.opening_balance;
      acc.current_balance += customer.current_balance;
      return acc;
    },
    { opening_balance: 0, current_balance: 0 }
  );

  return {
    title: "Customer Summary",
    rows: customers,
    summary,
    lines: customers.map(
      (customer) => `${customer.name} | Balance ${formatCurrency(customer.current_balance)}`
    ),
  };
};

const supplierSummary = async () => {
  const suppliers = await Supplier.find().sort({ name: 1 });
  const summary = suppliers.reduce(
    (acc, supplier) => {
      acc.opening_balance += supplier.opening_balance;
      acc.current_balance += supplier.current_balance;
      return acc;
    },
    { opening_balance: 0, current_balance: 0 }
  );

  return {
    title: "Supplier Summary",
    rows: suppliers,
    summary,
    lines: suppliers.map(
      (supplier) => `${supplier.name} | Balance ${formatCurrency(supplier.current_balance)}`
    ),
  };
};

const cashFlow = async (query) => {
  const filter = buildDateFilter(query);
  const [cashEntries, bankEntries] = await Promise.all([
    CashBook.find(filter).sort({ date: -1, created_at: -1 }),
    BankTransaction.find(filter)
      .populate("bank_account_id", "bank_name account_number")
      .sort({ date: -1, created_at: -1 }),
  ]);

  const summary = {
    cash_in: cashEntries.reduce((sum, entry) => sum + entry.cash_in, 0),
    cash_out: cashEntries.reduce((sum, entry) => sum + entry.cash_out, 0),
    bank_deposit: bankEntries.reduce((sum, entry) => sum + entry.deposit, 0),
    bank_withdrawal: bankEntries.reduce((sum, entry) => sum + entry.withdrawal, 0),
  };

  return {
    title: "Cash Flow Report",
    rows: {
      cash_entries: cashEntries,
      bank_entries: bankEntries,
    },
    summary,
    lines: [
      ...cashEntries.map(
        (entry) =>
          `Cash | ${entry.description} | In ${formatCurrency(entry.cash_in)} | Out ${formatCurrency(
            entry.cash_out
          )}`
      ),
      ...bankEntries.map(
        (entry) =>
          `Bank ${entry.bank_account_id?.bank_name || ""} | ${
            entry.description
          } | Deposit ${formatCurrency(entry.deposit)} | Withdrawal ${formatCurrency(
            entry.withdrawal
          )}`
      ),
    ],
  };
};

module.exports = {
  salesReport,
  expensesReport,
  customerSummary,
  supplierSummary,
  cashFlow,
};
