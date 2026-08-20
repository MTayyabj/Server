const {
  CashBook,
  BankAccount,
  BankTransaction,
  DailyBook,
} = require("../models");
const { BadRequestError, NotFoundError } = require("../utils/appError");
const { toMoney, addMoney, subtractMoney } = require("../utils/money");

const sortLatest = { date: -1, created_at: -1 };
const sortChronological = { date: 1, created_at: 1 };

const getLatestCashBalance = async (session) => {
  const latest = await CashBook.findOne().sort(sortLatest).session(session);
  return latest?.running_balance || 0;
};

const getLatestDailyBalance = async (session) => {
  const latest = await DailyBook.findOne().sort(sortLatest).session(session);
  return latest?.running_balance || 0;
};

const postCash = async ({
  date = new Date(),
  description,
  cash_in = 0,
  cash_out = 0,
  ref_type,
  ref_id,
  session,
}) => {
  const cashIn = toMoney(cash_in);
  const cashOut = toMoney(cash_out);

  if (cashIn === 0 && cashOut === 0) {
    throw new BadRequestError("Cash movement amount is required.");
  }

  const previousBalance = await getLatestCashBalance(session);
  const runningBalance = subtractMoney(addMoney(previousBalance, cashIn), cashOut);

  if (runningBalance < 0) {
    throw new BadRequestError("Cash balance cannot become negative.");
  }

  const [entry] = await CashBook.create(
    [
      {
        date,
        description,
        cash_in: cashIn,
        cash_out: cashOut,
        running_balance: runningBalance,
        ref_type,
        ref_id,
      },
    ],
    { session }
  );

  return entry;
};

const postBank = async ({
  bank_account_id,
  date = new Date(),
  description,
  deposit = 0,
  withdrawal = 0,
  ref_type,
  ref_id,
  session,
}) => {
  const depositAmount = toMoney(deposit);
  const withdrawalAmount = toMoney(withdrawal);

  if (depositAmount === 0 && withdrawalAmount === 0) {
    throw new BadRequestError("Bank movement amount is required.");
  }

  const account = await BankAccount.findById(bank_account_id).session(session);

  if (!account || account.status !== "active") {
    throw new NotFoundError("Active bank account not found.");
  }

  const runningBalance = subtractMoney(
    addMoney(account.current_balance, depositAmount),
    withdrawalAmount
  );

  if (runningBalance < 0) {
    throw new BadRequestError("Bank balance cannot become negative.");
  }

  account.current_balance = runningBalance;
  await account.save({ session });

  const [entry] = await BankTransaction.create(
    [
      {
        bank_account_id,
        date,
        description,
        deposit: depositAmount,
        withdrawal: withdrawalAmount,
        running_balance: runningBalance,
        ref_type,
        ref_id,
      },
    ],
    { session }
  );

  return entry;
};

const postDailyBook = async ({
  date = new Date(),
  description,
  debit = 0,
  credit = 0,
  ref_type,
  ref_id,
  session,
}) => {
  const debitAmount = toMoney(debit);
  const creditAmount = toMoney(credit);

  if (debitAmount === 0 && creditAmount === 0) {
    throw new BadRequestError("Daily book movement amount is required.");
  }

  const previousBalance = await getLatestDailyBalance(session);
  const runningBalance = subtractMoney(addMoney(previousBalance, debitAmount), creditAmount);

  const [entry] = await DailyBook.create(
    [
      {
        date,
        description,
        debit: debitAmount,
        credit: creditAmount,
        running_balance: runningBalance,
        ref_type,
        ref_id,
      },
    ],
    { session }
  );

  return entry;
};

const normalizePayments = ({ payment_method, paid_amount = 0, bank_account_id, payments = [] }) => {
  if (payments.length > 0) {
    return payments
      .filter((payment) => Number(payment.amount) > 0)
      .map((payment) => ({
        method: payment.method,
        amount: toMoney(payment.amount),
        bank_account_id: payment.bank_account_id,
      }));
  }

  const paidAmount = toMoney(paid_amount);
  if (paidAmount === 0) return [];

  if (payment_method === "cash") {
    return [{ method: "cash", amount: paidAmount }];
  }

  if (payment_method === "bank") {
    return [{ method: "bank", amount: paidAmount, bank_account_id }];
  }

  if (payment_method === "mixed") {
    throw new BadRequestError("Mixed payments require a payments array.");
  }

  if (payment_method === "credit") {
    throw new BadRequestError("Credit payment method cannot include paid amount.");
  }

  return [];
};

const postPayments = async ({
  payments,
  direction,
  date,
  description,
  ref_type,
  ref_id,
  session,
}) => {
  const entries = [];

  for (const payment of payments) {
    if (payment.method === "cash") {
      entries.push(
        await postCash({
          date,
          description,
          cash_in: direction === "in" ? payment.amount : 0,
          cash_out: direction === "out" ? payment.amount : 0,
          ref_type,
          ref_id,
          session,
        })
      );
    } else if (payment.method === "bank") {
      entries.push(
        await postBank({
          bank_account_id: payment.bank_account_id,
          date,
          description,
          deposit: direction === "in" ? payment.amount : 0,
          withdrawal: direction === "out" ? payment.amount : 0,
          ref_type,
          ref_id,
          session,
        })
      );
    } else {
      throw new BadRequestError("Unsupported payment method.");
    }
  }

  return entries;
};

const recalculateCashBalances = async (session) => {
  const entries = await CashBook.find().sort(sortChronological).session(session);
  let balance = 0;

  for (const entry of entries) {
    balance = subtractMoney(addMoney(balance, entry.cash_in), entry.cash_out);

    if (entry.running_balance !== balance) {
      entry.running_balance = balance;
      await entry.save({ session });
    }
  }

  return balance;
};

const recalculateBankBalances = async (bankAccountId, session) => {
  const account = await BankAccount.findById(bankAccountId).session(session);

  if (!account) {
    throw new NotFoundError("Bank account not found.");
  }

  const entries = await BankTransaction.find({ bank_account_id: bankAccountId })
    .sort(sortChronological)
    .session(session);
  let balance = 0;

  for (const entry of entries) {
    balance = subtractMoney(addMoney(balance, entry.deposit), entry.withdrawal);

    if (entry.running_balance !== balance) {
      entry.running_balance = balance;
      await entry.save({ session });
    }
  }

  account.current_balance = balance;
  await account.save({ session });

  return balance;
};

const recalculateDailyBookBalances = async (session) => {
  const entries = await DailyBook.find().sort(sortChronological).session(session);
  let balance = 0;

  for (const entry of entries) {
    balance = subtractMoney(addMoney(balance, entry.debit), entry.credit);

    if (entry.running_balance !== balance) {
      entry.running_balance = balance;
      await entry.save({ session });
    }
  }

  return balance;
};

const findCashByRef = (ref_type, ref_id, session) =>
  CashBook.find({ ref_type, ref_id }).sort(sortChronological).session(session);

const findBankByRef = (ref_type, ref_id, session) =>
  BankTransaction.find({ ref_type, ref_id }).sort(sortChronological).session(session);

const findDailyBookByRef = (ref_type, ref_id, session) =>
  DailyBook.find({ ref_type, ref_id }).sort(sortChronological).session(session);

const removeCashEntries = async (entries, session) => {
  if (!entries.length) return;

  await CashBook.deleteMany(
    { _id: { $in: entries.map((entry) => entry._id) } },
    { session }
  );
  await recalculateCashBalances(session);
};

const removeBankEntries = async (entries, session) => {
  const accountIds = [...new Set(entries.map((entry) => entry.bank_account_id.toString()))];

  await BankTransaction.deleteMany(
    { _id: { $in: entries.map((entry) => entry._id) } },
    { session }
  );

  for (const accountId of accountIds) {
    await recalculateBankBalances(accountId, session);
  }
};

const removeDailyBookEntries = async (entries, session) => {
  if (!entries.length) return;

  await DailyBook.deleteMany(
    { _id: { $in: entries.map((entry) => entry._id) } },
    { session }
  );
  await recalculateDailyBookBalances(session);
};

const replaceCashPayment = async ({
  ref_type,
  ref_id,
  date,
  description,
  cash_in = 0,
  cash_out = 0,
  session,
}) => {
  const existing = await findCashByRef(ref_type, ref_id, session);
  await removeCashEntries(existing, session);

  const cashIn = toMoney(cash_in);
  const cashOut = toMoney(cash_out);

  if (cashIn === 0 && cashOut === 0) {
    return null;
  }

  return postCash({
    date,
    description,
    cash_in: cashIn,
    cash_out: cashOut,
    ref_type,
    ref_id,
    session,
  });
};

const replaceBankPayment = async ({
  ref_type,
  ref_id,
  bank_account_id,
  date,
  description,
  deposit = 0,
  withdrawal = 0,
  session,
}) => {
  const existing = await findBankByRef(ref_type, ref_id, session);
  await removeBankEntries(existing, session);

  const depositAmount = toMoney(deposit);
  const withdrawalAmount = toMoney(withdrawal);

  if (depositAmount === 0 && withdrawalAmount === 0) {
    return null;
  }

  return postBank({
    bank_account_id,
    date,
    description,
    deposit: depositAmount,
    withdrawal: withdrawalAmount,
    ref_type,
    ref_id,
    session,
  });
};

const replaceDailyBookEntry = async ({
  ref_type,
  ref_id,
  date,
  description,
  debit = 0,
  credit = 0,
  session,
}) => {
  const existing = await findDailyBookByRef(ref_type, ref_id, session);
  await removeDailyBookEntries(existing, session);

  const debitAmount = toMoney(debit);
  const creditAmount = toMoney(credit);

  if (debitAmount === 0 && creditAmount === 0) {
    return null;
  }

  return postDailyBook({
    date,
    description,
    debit: debitAmount,
    credit: creditAmount,
    ref_type,
    ref_id,
    session,
  });
};

const recalculateCustomerLedgerBalances = async (customerId, session) => {
  const { CustomerLedger } = require("../models");
  const entries = await CustomerLedger.find({ customer_id: customerId })
    .sort(sortChronological)
    .session(session);
  let balance = 0;

  for (const entry of entries) {
    balance = subtractMoney(addMoney(balance, entry.debit), entry.credit);

    if (entry.balance !== balance) {
      entry.balance = balance;
      await entry.save({ session });
    }
  }

  return balance;
};

const recalculateSupplierLedgerBalances = async (supplierId, session) => {
  const { SupplierLedger } = require("../models");
  const entries = await SupplierLedger.find({ supplier_id: supplierId })
    .sort(sortChronological)
    .session(session);
  let balance = 0;

  for (const entry of entries) {
    balance = subtractMoney(addMoney(balance, entry.credit), entry.debit);

    if (entry.balance !== balance) {
      entry.balance = balance;
      await entry.save({ session });
    }
  }

  return balance;
};

module.exports = {
  getLatestCashBalance,
  postCash,
  postBank,
  postDailyBook,
  normalizePayments,
  postPayments,
  recalculateCashBalances,
  recalculateBankBalances,
  recalculateDailyBookBalances,
  recalculateCustomerLedgerBalances,
  recalculateSupplierLedgerBalances,
  findCashByRef,
  findBankByRef,
  findDailyBookByRef,
  removeCashEntries,
  removeBankEntries,
  removeDailyBookEntries,
  replaceCashPayment,
  replaceBankPayment,
  replaceDailyBookEntry,
};
