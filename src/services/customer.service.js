const { Customer, CustomerLedger } = require("../models");
const { withTransaction } = require("../utils/transactions");
const { BadRequestError, NotFoundError } = require("../utils/appError");
const { toMoney, addMoney, subtractMoney } = require("../utils/money");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { buildSearchRegex } = require("../utils/query");
const accounting = require("./accounting.service");

const findCustomerOrFail = async (id, session) => {
  const customer = await Customer.findById(id).session(session);

  if (!customer) {
    throw new NotFoundError("Customer not found.");
  }

  return customer;
};

const listCustomers = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.search) {
    const search = buildSearchRegex(query.search);
    filter.$or = [{ name: search }, { phone: search }];
  }

  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);

  return {
    data: customers,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const createCustomer = async (payload) =>
  withTransaction(async (session) => {
    const openingBalance = toMoney(payload.opening_balance);
    const [customer] = await Customer.create(
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
      const [ledger] = await CustomerLedger.create(
        [
          {
            customer_id: customer._id,
            date: new Date(),
            description: "Opening balance",
            debit: openingBalance,
            credit: 0,
            balance: openingBalance,
            payment_method: "adjustment",
            ref_type: "CUSTOMER_OPENING",
            ref_id: customer._id,
          },
        ],
        { session }
      );

      await accounting.postDailyBook({
        description: `Customer opening balance: ${customer.name}`,
        debit: openingBalance,
        credit: 0,
        ref_type: "CUSTOMER_LEDGER",
        ref_id: ledger._id,
        session,
      });
    }

    return customer;
  });

const getCustomer = async (id) => findCustomerOrFail(id);

const updateCustomer = async (id, payload) =>
  withTransaction(async (session) => {
    const customer = await findCustomerOrFail(id, session);
    const previousOpening = toMoney(customer.opening_balance);

    Object.assign(customer, payload);

    if (payload.opening_balance !== undefined) {
      const nextOpening = toMoney(payload.opening_balance);
      const delta = subtractMoney(nextOpening, previousOpening);

      if (delta !== 0) {
        customer.opening_balance = nextOpening;
        customer.current_balance = addMoney(customer.current_balance, delta);

        const [ledger] = await CustomerLedger.create(
          [
            {
              customer_id: customer._id,
              date: new Date(),
              description: "Opening balance adjustment",
              debit: delta > 0 ? delta : 0,
              credit: delta < 0 ? Math.abs(delta) : 0,
              balance: customer.current_balance,
              payment_method: "adjustment",
              ref_type: "CUSTOMER_OPENING_ADJUSTMENT",
              ref_id: customer._id,
            },
          ],
          { session }
        );

        await accounting.postDailyBook({
          description: `Customer opening adjustment: ${customer.name}`,
          debit: delta > 0 ? delta : 0,
          credit: delta < 0 ? Math.abs(delta) : 0,
          ref_type: "CUSTOMER_LEDGER",
          ref_id: ledger._id,
          session,
        });
      }
    }

    await customer.save({ session });
    return customer;
  });

const deleteCustomer = async (id) => {
  const customer = await Customer.findByIdAndUpdate(
    id,
    { status: "inactive" },
    { new: true, runValidators: true }
  );

  if (!customer) {
    throw new NotFoundError("Customer not found.");
  }

  return customer;
};

const getLedger = async (id, query) => {
  await findCustomerOrFail(id);
  const { page, limit, skip } = getPagination(query);
  const filter = { customer_id: id };

  const [entries, total] = await Promise.all([
    CustomerLedger.find(filter).sort({ date: -1, created_at: -1 }).skip(skip).limit(limit),
    CustomerLedger.countDocuments(filter),
  ]);

  return {
    data: entries,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const addLedgerEntry = async (id, payload) =>
  withTransaction(async (session) => {
    const customer = await findCustomerOrFail(id, session);
    const debit = toMoney(payload.debit);
    const credit = toMoney(payload.credit);
    const balance = subtractMoney(addMoney(customer.current_balance, debit), credit);

    customer.current_balance = balance;
    await customer.save({ session });

    const [ledger] = await CustomerLedger.create(
      [
        {
          customer_id: customer._id,
          date: payload.date || new Date(),
          description: payload.description,
          debit,
          credit,
          balance,
          payment_method: payload.payment_method,
          ref_type: "CUSTOMER_MANUAL",
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
        ref_type: "CUSTOMER_LEDGER",
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
        ref_type: "CUSTOMER_LEDGER",
        ref_id: ledger._id,
        session,
      });
    }

    await accounting.postDailyBook({
      date: payload.date || new Date(),
      description: payload.description,
      debit,
      credit,
      ref_type: "CUSTOMER_LEDGER",
      ref_id: ledger._id,
      session,
    });

    return ledger;
  });

const updateLedgerEntry = async (customerId, entryId, payload) =>
  withTransaction(async (session) => {
    const customer = await findCustomerOrFail(customerId, session);
    const entry = await CustomerLedger.findOne({
      _id: entryId,
      customer_id: customerId,
    }).session(session);

    if (!entry) {
      throw new NotFoundError("Ledger entry not found.");
    }

    if (entry.ref_type !== "CUSTOMER_MANUAL") {
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

    const balance = await accounting.recalculateCustomerLedgerBalances(customerId, session);
    customer.current_balance = balance;
    await customer.save({ session });

    if (paymentMethod === "cash") {
      await accounting.replaceCashPayment({
        date: entry.date,
        description: entry.description,
        cash_in: credit,
        cash_out: debit,
        ref_type: "CUSTOMER_LEDGER",
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
        ref_type: "CUSTOMER_LEDGER",
        ref_id: entry._id,
        session,
      });
    } else {
      const cashEntries = await accounting.findCashByRef("CUSTOMER_LEDGER", entry._id, session);
      const bankEntries = await accounting.findBankByRef("CUSTOMER_LEDGER", entry._id, session);
      await accounting.removeCashEntries(await cashEntries, session);
      await accounting.removeBankEntries(await bankEntries, session);
    }

    await accounting.replaceDailyBookEntry({
      date: entry.date,
      description: entry.description,
      debit,
      credit,
      ref_type: "CUSTOMER_LEDGER",
      ref_id: entry._id,
      session,
    });

    return entry;
  });

module.exports = {
  listCustomers,
  createCustomer,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getLedger,
  addLedgerEntry,
  updateLedgerEntry,
};
