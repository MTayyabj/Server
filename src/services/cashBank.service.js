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

module.exports = {
  listCashBook,
  createManualCashEntry,
  listBankAccounts,
  createBankAccount,
  deleteBankAccount,
  updateBankAccountStatus,
  transfer,
  getBankLedger,
};
