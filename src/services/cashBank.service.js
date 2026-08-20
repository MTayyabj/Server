const mongoose = require("mongoose");
const { CashBook, BankAccount, BankTransaction } = require("../models");
const { withTransaction } = require("../utils/transactions");
const { BadRequestError, NotFoundError } = require("../utils/appError");
const { toMoney } = require("../utils/money");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { getDateRange } = require("../utils/dateRange");
const accounting = require("./accounting.service");

// const listCashBook = async (query) => {
//   const { page, limit, skip } = getPagination(query);
//   const filter = {};
//   const dateRange = getDateRange(query);

//   if (dateRange) filter.date = dateRange;

//   const [entries, total, summaryRows, latest] = await Promise.all([
//     CashBook.find(filter).sort({ date: -1, created_at: -1 }).skip(skip).limit(limit),
//     CashBook.countDocuments(filter),
//     CashBook.aggregate([
//       { $match: filter },
//       {
//         $group: {
//           _id: null,
//           cash_in: { $sum: "$cash_in" },
//           cash_out: { $sum: "$cash_out" },
//         },
//       },
//     ]),
//     CashBook.findOne(filter).sort({ date: -1, created_at: -1 }),
//   ]);

//   return {
//     data: entries,
//     meta: {
//       ...buildPaginationMeta({ page, limit, total }),
//       summary: {
//         cash_in: summaryRows[0]?.cash_in || 0,
//         cash_out: summaryRows[0]?.cash_out || 0,
//         closing_balance: latest?.running_balance || 0,
//       },
//     },
//   };
// };

const listCashBook = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  const dateRange = getDateRange(query);

  if (dateRange) {
    filter.date = dateRange;
  }

  // Search by description
  if (query.search?.trim()) {
    filter.description = {
      $regex: query.search.trim(),
      $options: "i",
    };
  }

  const [entries, total, summaryRows, latest] = await Promise.all([
    CashBook.find(filter)
      .sort({ date: -1, created_at: -1 })
      .skip(skip)
      .limit(limit),

    CashBook.countDocuments(filter),

    CashBook.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          cash_in: { $sum: "$cash_in" },
          cash_out: { $sum: "$cash_out" },
        },
      },
    ]),

    CashBook.findOne(filter).sort({
      date: -1,
      created_at: -1,
    }),
  ]);

  return {
    data: entries,
    meta: {
      ...buildPaginationMeta({ page, limit, total }),
      summary: {
        cash_in: summaryRows[0]?.cash_in || 0,
        cash_out: summaryRows[0]?.cash_out || 0,
        closing_balance: latest?.running_balance || 0,
      },
    },
  };
};

const createManualCashEntry = async (payload) =>
  withTransaction(async (session) => {
    const date = payload.date || new Date();
    const cashIn = toMoney(payload.cash_in);
    const cashOut = toMoney(payload.cash_out);

    const entry = await accounting.postCash({
      date,
      description: payload.description,
      cash_in: cashIn,
      cash_out: cashOut,
      ref_type: "CASH_MANUAL",
      session,
    });

    entry.ref_id = entry._id;
    await entry.save({ session });

    await accounting.postDailyBook({
      date,
      description: payload.description,
      debit: cashIn,
      credit: cashOut,
      ref_type: "CASH_BOOK",
      ref_id: entry._id,
      session,
    });

    return entry;
  });

const listBankAccounts = async () => BankAccount.find().sort({ bank_name: 1 });

const createBankAccount = async (payload) =>
  withTransaction(async (session) => {
    const openingBalance = toMoney(payload.current_balance);
    const [account] = await BankAccount.create(
      [
        {
          ...payload,
          current_balance: 0,
        },
      ],
      { session }
    );

    if (openingBalance > 0) {
      await accounting.postBank({
        bank_account_id: account._id,
        description: "Bank opening balance",
        deposit: openingBalance,
        ref_type: "BANK_OPENING",
        ref_id: account._id,
        session,
      });

      await accounting.postDailyBook({
        description: `Bank opening balance: ${account.bank_name}`,
        debit: openingBalance,
        credit: 0,
        ref_type: "BANK_OPENING",
        ref_id: account._id,
        session,
      });
    }

    return BankAccount.findById(account._id).session(session);
  });

const transfer = async (payload) =>
  withTransaction(async (session) => {
    const date = payload.date || new Date();
    const amount = toMoney(payload.amount);
    const transferId = new mongoose.Types.ObjectId();

    if (payload.from_type === "cash") {
      await accounting.postCash({
        date,
        description: payload.description,
        cash_out: amount,
        ref_type: "TRANSFER",
        ref_id: transferId,
        session,
      });
    } else {
      await accounting.postBank({
        bank_account_id: payload.from_bank_account_id,
        date,
        description: payload.description,
        withdrawal: amount,
        ref_type: "TRANSFER",
        ref_id: transferId,
        session,
      });
    }

    if (payload.to_type === "cash") {
      await accounting.postCash({
        date,
        description: payload.description,
        cash_in: amount,
        ref_type: "TRANSFER",
        ref_id: transferId,
        session,
      });
    } else {
      await accounting.postBank({
        bank_account_id: payload.to_bank_account_id,
        date,
        description: payload.description,
        deposit: amount,
        ref_type: "TRANSFER",
        ref_id: transferId,
        session,
      });
    }

    await accounting.postDailyBook({
      date,
      description: payload.description,
      debit: amount,
      credit: amount,
      ref_type: "TRANSFER",
      ref_id: transferId,
      session,
    });

    return {
      transfer_id: transferId,
      amount,
      from_type: payload.from_type,
      to_type: payload.to_type,
      date,
    };
  });

const getBankLedger = async (id, query) => {
  const account = await BankAccount.findById(id);

  if (!account) {
    throw new NotFoundError("Bank account not found.");
  }

  const { page, limit, skip } = getPagination(query);
  const filter = { bank_account_id: id };
  const dateRange = getDateRange(query);
  if (dateRange) filter.date = dateRange;

  const [entries, total] = await Promise.all([
    BankTransaction.find(filter).sort({ date: -1, created_at: -1 }).skip(skip).limit(limit),
    BankTransaction.countDocuments(filter),
  ]);

  return {
    data: entries,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const deleteBankAccount = async (id) => {
  const account = await BankAccount.findById(id);

  if (!account) {
    throw new NotFoundError("Bank account not found.");
  }

  const transactionCount = await BankTransaction.countDocuments({
    bank_account_id: id,
  });

  if (transactionCount > 0) {
    throw new BadRequestError(
      "This bank account cannot be deleted because it has existing transactions. Please deactivate the account instead."
    );
  }

  await BankAccount.findByIdAndDelete(id);

  return account;
};

  const updateBankAccountStatus = async (id, status) => {
  const account = await BankAccount.findById(id);

  if (!account) {
    throw new NotFoundError("Bank account not found.");
  }

  account.status = status;
  await account.save();

  return account;
};

const updateBankAccount = async (id, payload) => {
  const account = await BankAccount.findById(id);

  if (!account) {
    throw new NotFoundError("Bank account not found.");
  }

  if (payload.bank_name !== undefined) {
    account.bank_name = payload.bank_name;
  }

  if (payload.title !== undefined) {
    account.title = payload.title;
  }

  if (payload.account_number !== undefined) {
    account.account_number = payload.account_number;
  }

  await account.save();
  return account;
};

const updateManualCashEntry = async (id, payload) =>
  withTransaction(async (session) => {
    const entry = await CashBook.findById(id).session(session);

    if (!entry) {
      throw new NotFoundError("Cash book entry not found.");
    }

    if (entry.ref_type !== "CASH_MANUAL") {
      throw new BadRequestError("Only manual cash entries can be edited.");
    }

    if (payload.description !== undefined) {
      entry.description = payload.description;
    }

    if (payload.date !== undefined) {
      entry.date = payload.date;
    }

    const cashIn = payload.cash_in !== undefined ? toMoney(payload.cash_in) : toMoney(entry.cash_in);
    const cashOut = payload.cash_out !== undefined ? toMoney(payload.cash_out) : toMoney(entry.cash_out);

    if (cashIn === 0 && cashOut === 0) {
      throw new BadRequestError("Cash in or cash out amount is required.");
    }

    if (cashIn > 0 && cashOut > 0) {
      throw new BadRequestError("Use either cash in or cash out for one manual entry.");
    }

    entry.cash_in = cashIn;
    entry.cash_out = cashOut;
    await entry.save({ session });

    await accounting.recalculateCashBalances(session);

    await accounting.replaceDailyBookEntry({
      date: entry.date,
      description: entry.description,
      debit: entry.cash_in,
      credit: entry.cash_out,
      ref_type: "CASH_BOOK",
      ref_id: entry._id,
      session,
    });

    return entry;
  });

const updateBankTransaction = async (accountId, transactionId, payload) =>
  withTransaction(async (session) => {
    const account = await BankAccount.findById(accountId).session(session);

    if (!account) {
      throw new NotFoundError("Bank account not found.");
    }

    const transaction = await BankTransaction.findOne({
      _id: transactionId,
      bank_account_id: accountId,
    }).session(session);

    if (!transaction) {
      throw new NotFoundError("Bank transaction not found.");
    }

    if (payload.description !== undefined) {
      transaction.description = payload.description;
    }

    if (payload.date !== undefined) {
      transaction.date = payload.date;
    }

    const deposit = payload.deposit !== undefined ? toMoney(payload.deposit) : toMoney(transaction.deposit);
    const withdrawal =
      payload.withdrawal !== undefined ? toMoney(payload.withdrawal) : toMoney(transaction.withdrawal);

    if (deposit === 0 && withdrawal === 0) {
      throw new BadRequestError("Deposit or withdrawal amount is required.");
    }

    if (deposit > 0 && withdrawal > 0) {
      throw new BadRequestError("Use either deposit or withdrawal for one transaction.");
    }

    transaction.deposit = deposit;
    transaction.withdrawal = withdrawal;
    await transaction.save({ session });

    await accounting.recalculateBankBalances(accountId, session);

    if (transaction.ref_type === "EXPENSE" && transaction.ref_id) {
      const { Expense } = require("../models");
      const expense = await Expense.findById(transaction.ref_id).session(session);

      if (expense) {
        expense.amount = deposit > 0 ? deposit : withdrawal;
        expense.description = transaction.description;
        expense.date = transaction.date;
        await expense.save({ session });

        await accounting.replaceDailyBookEntry({
          date: expense.date,
          description: expense.description,
          debit: 0,
          credit: expense.amount,
          ref_type: "EXPENSE",
          ref_id: expense._id,
          session,
        });
      }
    }

    return transaction;
  });

module.exports = {
  listCashBook,
  createManualCashEntry,
  updateManualCashEntry,
  listBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
  updateBankAccountStatus,
  transfer,
  getBankLedger,
  updateBankTransaction,
};
