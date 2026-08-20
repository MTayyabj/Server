const { Supplier, SupplierLedger } = require("../models");
const { withTransaction } = require("../utils/transactions");
const { BadRequestError, NotFoundError } = require("../utils/appError");
const { toMoney, addMoney, subtractMoney } = require("../utils/money");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { buildSearchRegex } = require("../utils/query");
const accounting = require("./accounting.service");

const findSupplierOrFail = async (id, session) => {
  const supplier = await Supplier.findById(id).session(session);

  if (!supplier) {
    throw new NotFoundError("Supplier not found.");
  }

  return supplier;
};

const listSuppliers = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.search) {
    const search = buildSearchRegex(query.search);
    filter.$or = [{ name: search }, { phone: search }];
  }

  const [suppliers, total] = await Promise.all([
    Supplier.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Supplier.countDocuments(filter),
  ]);

  return {
    data: suppliers,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const createSupplier = async (payload) =>
  withTransaction(async (session) => {
    const openingBalance = toMoney(payload.opening_balance);
    const [supplier] = await Supplier.create(
      [
        {
          ...payload,
          opening_balance: openingBalance,
          current_balance: openingBalance,
        },
      ],
      { session }
    );

    if (openingBalance > 0) {
      const [ledger] = await SupplierLedger.create(
        [
          {
            supplier_id: supplier._id,
            date: new Date(),
            description: "Opening balance",
            debit: 0,
            credit: openingBalance,
            balance: openingBalance,
            payment_method: "adjustment",
            ref_type: "SUPPLIER_OPENING",
            ref_id: supplier._id,
          },
        ],
        { session }
      );

      await accounting.postDailyBook({
        description: `Supplier opening balance: ${supplier.name}`,
        debit: 0,
        credit: openingBalance,
        ref_type: "SUPPLIER_LEDGER",
        ref_id: ledger._id,
        session,
      });
    }

    return supplier;
  });

const getSupplier = async (id) => findSupplierOrFail(id);

const updateSupplier = async (id, payload) =>
  withTransaction(async (session) => {
    const supplier = await findSupplierOrFail(id, session);
    const previousOpening = toMoney(supplier.opening_balance);

    Object.assign(supplier, payload);

    if (payload.opening_balance !== undefined) {
      const nextOpening = toMoney(payload.opening_balance);
      const delta = subtractMoney(nextOpening, previousOpening);

      if (delta !== 0) {
        supplier.opening_balance = nextOpening;
        supplier.current_balance = addMoney(supplier.current_balance, delta);

        const [ledger] = await SupplierLedger.create(
          [
            {
              supplier_id: supplier._id,
              date: new Date(),
              description: "Opening balance adjustment",
              debit: delta < 0 ? Math.abs(delta) : 0,
              credit: delta > 0 ? delta : 0,
              balance: supplier.current_balance,
              payment_method: "adjustment",
              ref_type: "SUPPLIER_OPENING_ADJUSTMENT",
              ref_id: supplier._id,
            },
          ],
          { session }
        );

        await accounting.postDailyBook({
          description: `Supplier opening adjustment: ${supplier.name}`,
          debit: delta < 0 ? Math.abs(delta) : 0,
          credit: delta > 0 ? delta : 0,
          ref_type: "SUPPLIER_LEDGER",
          ref_id: ledger._id,
          session,
        });
      }
    }

    await supplier.save({ session });
    return supplier;
  });

const deleteSupplier = async (id) => {
  const supplier = await Supplier.findByIdAndUpdate(
    id,
    { status: "inactive" },
    { new: true, runValidators: true }
  );

  if (!supplier) {
    throw new NotFoundError("Supplier not found.");
  }

  return supplier;
};

const getLedger = async (id, query) => {
  await findSupplierOrFail(id);
  const { page, limit, skip } = getPagination(query);
  const filter = { supplier_id: id };

  const [entries, total] = await Promise.all([
    SupplierLedger.find(filter).sort({ date: -1, created_at: -1 }).skip(skip).limit(limit),
    SupplierLedger.countDocuments(filter),
  ]);

  return {
    data: entries,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const addLedgerEntry = async (id, payload) =>
  withTransaction(async (session) => {
    const supplier = await findSupplierOrFail(id, session);
    const debit = toMoney(payload.debit);
    const credit = toMoney(payload.credit);
    const balance = subtractMoney(addMoney(supplier.current_balance, credit), debit);

    supplier.current_balance = balance;
    await supplier.save({ session });

    const [ledger] = await SupplierLedger.create(
      [
        {
          supplier_id: supplier._id,
          date: payload.date || new Date(),
          description: payload.description,
          debit,
          credit,
          balance,
          payment_method: payload.payment_method,
          ref_type: "SUPPLIER_MANUAL",
          bank_account_id: payload.bank_account_id,
        },
      ],
      { session }
    );

    ledger.ref_id = ledger._id;
    await ledger.save({ session });

    if (payload.payment_method === "cash") {
      await accounting.postCash({
        date: payload.date || new Date(),
        description: payload.description,
        cash_in: credit,
        cash_out: debit,
        ref_type: "SUPPLIER_LEDGER",
        ref_id: ledger._id,
        session,
      });
    }

    if (payload.payment_method === "bank") {
      await accounting.postBank({
        bank_account_id: payload.bank_account_id,
        date: payload.date || new Date(),
        description: payload.description,
        deposit: credit,
        withdrawal: debit,
        ref_type: "SUPPLIER_LEDGER",
        ref_id: ledger._id,
        session,
      });
    }

    await accounting.postDailyBook({
      date: payload.date || new Date(),
      description: payload.description,
      debit,
      credit,
      ref_type: "SUPPLIER_LEDGER",
      ref_id: ledger._id,
      session,
    });

    return ledger;
  });

const updateLedgerEntry = async (supplierId, entryId, payload) =>
  withTransaction(async (session) => {
    const supplier = await findSupplierOrFail(supplierId, session);
    const entry = await SupplierLedger.findOne({
      _id: entryId,
      supplier_id: supplierId,
    }).session(session);

    if (!entry) {
      throw new NotFoundError("Ledger entry not found.");
    }

    if (entry.ref_type !== "SUPPLIER_MANUAL") {
      throw new BadRequestError("Only manual ledger entries can be edited.");
    }

    if (payload.date !== undefined) {
      entry.date = payload.date;
    }

    if (payload.description !== undefined) {
      entry.description = payload.description;
    }

    const debit = payload.debit !== undefined ? toMoney(payload.debit) : toMoney(entry.debit);
    const credit = payload.credit !== undefined ? toMoney(payload.credit) : toMoney(entry.credit);
    const paymentMethod = payload.payment_method ?? entry.payment_method;
    const bankAccountId = payload.bank_account_id ?? entry.bank_account_id;

    if (debit === 0 && credit === 0) {
      throw new BadRequestError("Debit or credit amount is required.");
    }

    if (debit > 0 && credit > 0) {
      throw new BadRequestError("Use either debit or credit for a manual ledger entry.");
    }

    if (paymentMethod === "bank" && !bankAccountId) {
      throw new BadRequestError("Bank account is required for bank ledger entries.");
    }

    entry.debit = debit;
    entry.credit = credit;
    entry.payment_method = paymentMethod;
    entry.bank_account_id = paymentMethod === "bank" ? bankAccountId : undefined;
    await entry.save({ session });

    const balance = await accounting.recalculateSupplierLedgerBalances(supplierId, session);
    supplier.current_balance = balance;
    await supplier.save({ session });

    if (paymentMethod === "cash") {
      await accounting.replaceCashPayment({
        date: entry.date,
        description: entry.description,
        cash_in: credit,
        cash_out: debit,
        ref_type: "SUPPLIER_LEDGER",
        ref_id: entry._id,
        session,
      });
    } else if (paymentMethod === "bank") {
      await accounting.replaceBankPayment({
        bank_account_id: bankAccountId,
        date: entry.date,
        description: entry.description,
        deposit: credit,
        withdrawal: debit,
        ref_type: "SUPPLIER_LEDGER",
        ref_id: entry._id,
        session,
      });
    } else {
      const cashEntries = await accounting.findCashByRef("SUPPLIER_LEDGER", entry._id, session);
      const bankEntries = await accounting.findBankByRef("SUPPLIER_LEDGER", entry._id, session);
      await accounting.removeCashEntries(await cashEntries, session);
      await accounting.removeBankEntries(await bankEntries, session);
    }

    await accounting.replaceDailyBookEntry({
      date: entry.date,
      description: entry.description,
      debit,
      credit,
      ref_type: "SUPPLIER_LEDGER",
      ref_id: entry._id,
      session,
    });

    return entry;
  });

module.exports = {
  listSuppliers,
  createSupplier,
  getSupplier,
  updateSupplier,
  deleteSupplier,
  getLedger,
  addLedgerEntry,
  updateLedgerEntry,
};
