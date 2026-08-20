const { Customer, Product, Sale, SaleItem, CustomerLedger } = require("../models");
const { withTransaction } = require("../utils/transactions");
const { nextInvoiceNumber } = require("../utils/invoice");
const { BadRequestError, NotFoundError } = require("../utils/appError");
const { toMoney, addMoney, subtractMoney } = require("../utils/money");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { getDateRange } = require("../utils/dateRange");
const accounting = require("./accounting.service");

const buildStatus = (total, paid) => {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
};

const resolveSaleItems = async (items, session) => {
  const resolved = [];

  for (const item of items) {
    const product = await Product.findById(item.product_id).session(session);

    if (!product || product.status !== "active") {
      throw new NotFoundError("Active product not found.");
    }

    const unitPrice = toMoney(item.unit_price ?? product.sale_price);
    const quantity = toMoney(item.quantity);
    const totalPrice = toMoney(quantity * unitPrice);

    resolved.push({
      product,
      product_id: product._id,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
    });
  }

  return resolved;
};


const listSales = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  const dateRange = getDateRange(query);

  if (dateRange) filter.date = dateRange;

  if (query.payment_method) {
    filter.payment_method = query.payment_method;
  }

  if (query.customer_id) {
    filter.customer_id = query.customer_id;
  }

  // Search by invoice number only
  if (query.search?.trim()) {
    filter.invoice_no = {
      $regex: query.search.trim(),
      $options: "i",
    };
  }

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate("customer_id", "name phone")
      .sort({ date: -1, created_at: -1 })
      .skip(skip)
      .limit(limit),

    Sale.countDocuments(filter),
  ]);

  return {
    data: sales,
    meta: buildPaginationMeta({ page, limit, total }),
  };
};

const getSaleDetails = async (id, session) => {
  let saleQuery = Sale.findById(id)
    .populate("customer_id", "name phone address")
    .populate("bank_account_id", "bank_name account_number");
  if (session) saleQuery = saleQuery.session(session);

  const sale = await saleQuery;

  if (!sale) {
    throw new NotFoundError("Sale not found.");
  }

  let itemsQuery = SaleItem.find({ sale_id: id }).populate("product_id", "name sku");
  if (session) itemsQuery = itemsQuery.session(session);
  const items = await itemsQuery;

  return {
    ...sale.toJSON(),
    items,
  };
};

const getSale = async (id) => getSaleDetails(id);

const createSale = async (payload) =>
  withTransaction(async (session) => {
    const date = payload.date || new Date();
    const customer = await Customer.findById(payload.customer_id).session(session);

    if (!customer || customer.status !== "active") {
      throw new NotFoundError("Active customer not found.");
    }

    const resolvedItems = await resolveSaleItems(payload.items, session);
    const totalAmount = toMoney(
      resolvedItems.reduce((sum, item) => sum + item.total_price, 0)
    );
    const payments = accounting.normalizePayments(payload);
    const paidBySplits = toMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
    const paidAmount = payments.length > 0 ? paidBySplits : toMoney(payload.paid_amount);

    if (payload.paid_amount > 0 && payments.length > 0 && paidBySplits !== toMoney(payload.paid_amount)) {
      throw new BadRequestError("Payment splits must equal paid_amount.");
    }

    if (paidAmount > totalAmount) {
      throw new BadRequestError("Paid amount cannot exceed sale total.");
    }

    const remainingAmount = subtractMoney(totalAmount, paidAmount);
    const invoiceNo = await nextInvoiceNumber("SAL", session);
    const [sale] = await Sale.create(
      [
        {
          invoice_no: invoiceNo,
          customer_id: customer._id,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          payment_method: payload.payment_method,
          bank_account_id: payload.bank_account_id,
          status: buildStatus(totalAmount, paidAmount),
          date,
        },
      ],
      { session }
    );

    for (const item of resolvedItems) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.product_id,
          status: "active",
          stock_quantity: { $gte: item.quantity },
        },
        { $inc: { stock_quantity: -item.quantity } },
        { new: true, session }
      );

      if (!updated) {
        throw new BadRequestError(`Insufficient stock for ${item.product.name}.`);
      }
    }

    await SaleItem.create(
      resolvedItems.map((item) => ({
        sale_id: sale._id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
      { session,
        ordered: true,
       }
    );

    customer.current_balance = addMoney(customer.current_balance, remainingAmount);
    await customer.save({ session });

    await CustomerLedger.create(
      [
        {
          customer_id: customer._id,
          date,
          description: `Sale invoice ${invoiceNo}`,
          debit: totalAmount,
          credit: paidAmount,
          balance: customer.current_balance,
          payment_method: payload.payment_method,
          ref_type: "SALE",
          ref_id: sale._id,
          bank_account_id: payload.bank_account_id,
        },
      ],
      { session }
    );

    if (paidAmount > 0) {
      await accounting.postPayments({
        payments,
        direction: "in",
        date,
        description: `Sale receipt ${invoiceNo}`,
        ref_type: "SALE",
        ref_id: sale._id,
        session,
      });
    }

    await accounting.postDailyBook({
      date,
      description: `Sale invoice ${invoiceNo}`,
      debit: totalAmount,
      credit: 0,
      ref_type: "SALE",
      ref_id: sale._id,
      session,
    });

    return getSaleDetails(sale._id, session);
  });

const updateSale = async (id, payload) =>
  withTransaction(async (session) => {
    const sale = await Sale.findById(id).session(session);

    if (!sale) {
      throw new NotFoundError("Sale not found.");
    }

    if (sale.status === "cancelled") {
      throw new BadRequestError("Cancelled sales cannot be edited.");
    }

    const oldCustomerId = sale.customer_id.toString();
    const oldRemaining = toMoney(sale.remaining_amount);
    const oldItems = await SaleItem.find({ sale_id: id }).session(session);

    let resolvedItems = null;
    let totalAmount = toMoney(sale.total_amount);

    if (payload.items) {
      resolvedItems = await resolveSaleItems(payload.items, session);
      totalAmount = toMoney(resolvedItems.reduce((sum, item) => sum + item.total_price, 0));
    }

    const customerId = payload.customer_id ?? oldCustomerId;
    const customer = await Customer.findById(customerId).session(session);

    if (!customer || customer.status !== "active") {
      throw new NotFoundError("Active customer not found.");
    }

    const paymentInput = {
      payment_method: payload.payment_method ?? sale.payment_method,
      paid_amount: payload.paid_amount ?? sale.paid_amount,
      bank_account_id: payload.bank_account_id ?? sale.bank_account_id,
      payments: payload.payments ?? [],
    };
    const payments = accounting.normalizePayments(paymentInput);
    const paidBySplits = toMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
    const paidAmount =
      payments.length > 0 ? paidBySplits : toMoney(paymentInput.paid_amount);

    if (
      payload.paid_amount !== undefined &&
      payments.length > 0 &&
      paidBySplits !== toMoney(payload.paid_amount)
    ) {
      throw new BadRequestError("Payment splits must equal paid_amount.");
    }

    if (paidAmount > totalAmount) {
      throw new BadRequestError("Paid amount cannot exceed sale total.");
    }

    const remainingAmount = subtractMoney(totalAmount, paidAmount);

    if (resolvedItems) {
      for (const item of oldItems) {
        await Product.findByIdAndUpdate(
          item.product_id,
          { $inc: { stock_quantity: item.quantity } },
          { session }
        );
      }

      for (const item of resolvedItems) {
        const updated = await Product.findOneAndUpdate(
          {
            _id: item.product_id,
            status: "active",
            stock_quantity: { $gte: item.quantity },
          },
          { $inc: { stock_quantity: -item.quantity } },
          { new: true, session }
        );

        if (!updated) {
          throw new BadRequestError(`Insufficient stock for ${item.product.name}.`);
        }
      }

      await SaleItem.deleteMany({ sale_id: id }, { session });
      await SaleItem.create(
        resolvedItems.map((item) => ({
          sale_id: sale._id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
        { session, ordered: true }
      );
    }

    if (oldCustomerId !== customerId.toString()) {
      const oldCustomer = await Customer.findById(oldCustomerId).session(session);

      if (!oldCustomer) {
        throw new NotFoundError("Customer not found.");
      }

      oldCustomer.current_balance = subtractMoney(oldCustomer.current_balance, oldRemaining);
      await oldCustomer.save({ session });

      customer.current_balance = addMoney(customer.current_balance, remainingAmount);
      await customer.save({ session });
    } else {
      const delta = subtractMoney(remainingAmount, oldRemaining);
      customer.current_balance = addMoney(customer.current_balance, delta);
      await customer.save({ session });
    }

    const ledgerEntry = await CustomerLedger.findOne({
      ref_type: "SALE",
      ref_id: sale._id,
    }).session(session);

    if (ledgerEntry) {
      ledgerEntry.customer_id = customer._id;
      ledgerEntry.date = payload.date ?? sale.date;
      ledgerEntry.description = `Sale invoice ${sale.invoice_no}`;
      ledgerEntry.debit = totalAmount;
      ledgerEntry.credit = paidAmount;
      ledgerEntry.payment_method = paymentInput.payment_method;
      ledgerEntry.bank_account_id = paymentInput.bank_account_id;
      await ledgerEntry.save({ session });

      await accounting.recalculateCustomerLedgerBalances(oldCustomerId, session);

      if (oldCustomerId !== customerId.toString()) {
        await accounting.recalculateCustomerLedgerBalances(customerId, session);
        const latestCustomer = await Customer.findById(customerId).session(session);
        customer.current_balance = latestCustomer.current_balance;
      } else {
        customer.current_balance = await accounting.recalculateCustomerLedgerBalances(
          customerId,
          session
        );
      }

      await customer.save({ session });

      if (oldCustomerId !== customerId.toString()) {
        const oldCustomer = await Customer.findById(oldCustomerId).session(session);
        oldCustomer.current_balance = await accounting.recalculateCustomerLedgerBalances(
          oldCustomerId,
          session
        );
        await oldCustomer.save({ session });
      }
    }

    if (payload.date !== undefined) {
      sale.date = payload.date;
    }

    sale.customer_id = customer._id;
    sale.total_amount = totalAmount;
    sale.paid_amount = paidAmount;
    sale.remaining_amount = remainingAmount;
    sale.payment_method = paymentInput.payment_method;
    sale.bank_account_id = paymentInput.bank_account_id;
    sale.status = buildStatus(totalAmount, paidAmount);
    await sale.save({ session });

    const cashEntries = await accounting.findCashByRef("SALE", sale._id, session);
    const bankEntries = await accounting.findBankByRef("SALE", sale._id, session);
    await accounting.removeCashEntries(await cashEntries, session);
    await accounting.removeBankEntries(await bankEntries, session);

    if (paidAmount > 0) {
      await accounting.postPayments({
        payments,
        direction: "in",
        date: sale.date,
        description: `Sale receipt ${sale.invoice_no}`,
        ref_type: "SALE",
        ref_id: sale._id,
        session,
      });
    }

    await accounting.replaceDailyBookEntry({
      date: sale.date,
      description: `Sale invoice ${sale.invoice_no}`,
      debit: totalAmount,
      credit: 0,
      ref_type: "SALE",
      ref_id: sale._id,
      session,
    });

    return getSaleDetails(sale._id, session);
  });

  const cancelSale = async (id) =>
  withTransaction(async (session) => {
    const sale = await Sale.findById(id).session(session);

    if (!sale) {
      throw new NotFoundError("Sale not found.");
    }

    if (sale.status === "cancelled") {
      throw new BadRequestError("Sale is already cancelled.");
    }

    const saleItems = await SaleItem.find({
      sale_id: sale._id,
    }).session(session);

    // 1. Restore product stock
    for (const item of saleItems) {
      await Product.findByIdAndUpdate(
        item.product_id,
        {
          $inc: {
            stock_quantity: item.quantity,
          },
        },
        {
          session,
        }
      );
    }

    // 2. Reverse customer's outstanding balance
    const customer = await Customer.findById(
      sale.customer_id
    ).session(session);

    if (!customer) {
      throw new NotFoundError("Customer not found.");
    }

    customer.current_balance = subtractMoney(
      customer.current_balance,
      toMoney(sale.remaining_amount)
    );

    await customer.save({ session });

    // 3. Remove/reverse customer ledger entry
    const customerLedgerEntry = await CustomerLedger.findOne({
      ref_type: "SALE",
      ref_id: sale._id,
    }).session(session);

    if (customerLedgerEntry) {
      await CustomerLedger.deleteOne(
        { _id: customerLedgerEntry._id },
        { session }
      );
    }

    // Recalculate customer ledger balances
    customer.current_balance =
      await accounting.recalculateCustomerLedgerBalances(
        customer._id,
        session
      );

    await customer.save({ session });

    // 4. Remove Cash Book entries
    const cashEntries = await accounting.findCashByRef(
      "SALE",
      sale._id,
      session
    );

    await accounting.removeCashEntries(
      await cashEntries,
      session
    );

    // 5. Remove Bank Book entries
    const bankEntries = await accounting.findBankByRef(
      "SALE",
      sale._id,
      session
    );

    await accounting.removeBankEntries(
      await bankEntries,
      session
    );

    // 6. Remove Daily Book / Roznamcha entry
    const dailyBookEntries =
      await accounting.findDailyBookByRef(
        "SALE",
        sale._id,
        session
      );

    await accounting.removeDailyBookEntries(
      await dailyBookEntries,
      session
    );

    // 7. Mark sale as cancelled
    sale.status = "cancelled";

    await sale.save({ session });

    return getSaleDetails(sale._id, session);
  });

module.exports = {
  listSales,
  getSale,
  createSale,
  updateSale,
  cancelSale,
};
