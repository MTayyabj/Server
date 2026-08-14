const { Supplier, Product, Purchase, PurchaseItem, SupplierLedger } = require("../models");
const { withTransaction } = require("../utils/transactions");
const { nextInvoiceNumber } = require("../utils/invoice");
const { BadRequestError, NotFoundError } = require("../utils/appError");
const { toMoney, addMoney, subtractMoney } = require("../utils/money");
const { getPagination, buildPaginationMeta } = require("../utils/pagination");
const { getDateRange } = require("../utils/dateRange");
const accounting = require("./accounting.service");

const resolvePurchaseItems = async (items, session) => {
  const resolved = [];

  for (const item of items) {
    const product = await Product.findById(item.product_id).session(session);

    if (!product || product.status !== "active") {
      throw new NotFoundError("Active product not found.");
    }

    const unitPrice = toMoney(item.unit_price);
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



const deletePurchase = async (id) =>
  withTransaction(async (session) => {
    const purchase = await Purchase.findById(id).session(session);

    if (!purchase) {
      throw new NotFoundError("Purchase not found.");
    }

    const items = await PurchaseItem.find({
      purchase_id: purchase._id,
    }).session(session);

    const supplier = await Supplier.findById(purchase.supplier_id).session(session);

    if (!supplier) {
      throw new NotFoundError("Supplier not found.");
    }

    /*
     * 1. Reverse product stock
     */
    for (const item of items) {
      const product = await Product.findById(item.product_id).session(session);

      if (!product) {
        throw new NotFoundError(
          `Product for purchase item ${item.product_id} not found.`
        );
      }

      const newStock = subtractMoney(
        product.stock_quantity,
        item.quantity
      );

      if (newStock < 0) {
        throw new BadRequestError(
          `Cannot delete purchase because stock for ${product.name} would become negative.`
        );
      }

      product.stock_quantity = newStock;

      await product.save({ session });
    }

    /*
     * 2. Reverse supplier balance
     *
     * Purchase creation:
     *
     * supplier.current_balance += remainingAmount
     *
     * Therefore deletion:
     *
     * supplier.current_balance -= remainingAmount
     */
    const newSupplierBalance = subtractMoney(
      supplier.current_balance,
      purchase.remaining_amount
    );

    if (newSupplierBalance < 0) {
      throw new BadRequestError(
        "Cannot delete purchase because supplier balance would become negative."
      );
    }

    supplier.current_balance = newSupplierBalance;

    await supplier.save({ session });

    /*
     * 3. Reverse Supplier Ledger
     *
     * Original purchase ledger:
     *
     * debit  = paidAmount
     * credit = totalAmount
     *
     * Reversal:
     *
     * debit  = totalAmount
     * credit = paidAmount
     */
    await SupplierLedger.create(
      [
        {
          supplier_id: supplier._id,
          date: new Date(),
          description: `Reversal of deleted purchase ${purchase.invoice_no}`,
          debit: purchase.total_amount,
          credit: purchase.paid_amount,
          balance: supplier.current_balance,
          payment_method: purchase.payment_method,
          ref_type: "PURCHASE_DELETE",
          ref_id: purchase._id,
          bank_account_id: purchase.bank_account_id,
        },
      ],
      { session }
    );

    /*
     * 4. Reverse cash/bank payments
     *
     * Purchase payment was an OUT movement.
     *
     * Therefore deletion creates an IN movement.
     */
    if (purchase.paid_amount > 0) {
      let paymentEntries = [];

      if (purchase.payment_method === "cash") {
        paymentEntries = [
          {
            method: "cash",
            amount: purchase.paid_amount,
          },
        ];
      } else if (purchase.payment_method === "bank") {
        paymentEntries = [
          {
            method: "bank",
            amount: purchase.paid_amount,
            bank_account_id: purchase.bank_account_id,
          },
        ];
      }

      if (paymentEntries.length > 0) {
        await accounting.postPayments({
          payments: paymentEntries,
          direction: "in",
          date: new Date(),
          description: `Reversal of deleted purchase ${purchase.invoice_no}`,
          ref_type: "PURCHASE_DELETE",
          ref_id: purchase._id,
          session,
        });
      }
    }

    /*
     * 5. Reverse Daily Book
     *
     * Original:
     *
     * debit  = 0
     * credit = totalAmount
     *
     * Reversal:
     *
     * debit  = totalAmount
     * credit = 0
     */
    await accounting.postDailyBook({
      date: new Date(),
      description: `Reversal of deleted purchase ${purchase.invoice_no}`,
      debit: purchase.total_amount,
      credit: 0,
      ref_type: "PURCHASE_DELETE",
      ref_id: purchase._id,
      session,
    });

    /*
     * 6. Delete purchase items
     */
    await PurchaseItem.deleteMany(
      { purchase_id: purchase._id },
      { session }
    );

    /*
     * 7. Finally delete the purchase
     */
    await Purchase.deleteOne(
      { _id: purchase._id },
      { session }
    );

    return {
      id: purchase._id,
      invoice_no: purchase.invoice_no,
    };
  });



const getPurchaseDetails = async (id, session) => {
  let purchaseQuery = Purchase.findById(id)
    .populate("supplier_id", "name phone address")
    .populate("bank_account_id", "bank_name account_number");
  if (session) purchaseQuery = purchaseQuery.session(session);

  const purchase = await purchaseQuery;

  if (!purchase) {
    throw new NotFoundError("Purchase not found.");
  }

  let itemsQuery = PurchaseItem.find({ purchase_id: id }).populate("product_id", "name sku");
  if (session) itemsQuery = itemsQuery.session(session);
  const items = await itemsQuery;

  return {
    ...purchase.toJSON(),
    items,
  };
};



const listPurchases = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const filter = {};
  const dateRange = getDateRange(query);

  if (dateRange) filter.date = dateRange;

  if (query.payment_method) {
    filter.payment_method = query.payment_method;
  }

  if (query.supplier_id) {
    filter.supplier_id = query.supplier_id;
  }

  // Search by invoice number
  if (query.search) {
    filter.invoice_no = {
      $regex: query.search,
      $options: "i",
    };
  }

  const [purchases, total] = await Promise.all([
    Purchase.find(filter)
      .populate("supplier_id", "name phone")
      .sort({ date: -1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Purchase.countDocuments(filter),
  ]);

  // Get purchase items and populate product information
  const purchaseIds = purchases.map((purchase) => purchase._id);

  const items = await PurchaseItem.find({
    purchase_id: { $in: purchaseIds },
  })
    .populate("product_id", "name sku")
    .lean();

  // Group items by purchase
  const itemsByPurchase = {};

  for (const item of items) {
    const purchaseId = item.purchase_id.toString();

    if (!itemsByPurchase[purchaseId]) {
      itemsByPurchase[purchaseId] = [];
    }

    itemsByPurchase[purchaseId].push(item);
  }

  // Attach items and expose MongoDB _id as id
  const data = purchases.map((purchase) => ({
    ...purchase,

    // Frontend expects `id`
    id: purchase._id.toString(),

    // Attach purchase items
    items: itemsByPurchase[purchase._id.toString()] ?? [],
  }));

  return {
    data,
    meta: buildPaginationMeta({
      page,
      limit,
      total,
    }),
  };
};


const getPurchase = async (id) => getPurchaseDetails(id);

const createPurchase = async (payload) =>
  withTransaction(async (session) => {
    const date = payload.date || new Date();
    const supplier = await Supplier.findById(payload.supplier_id).session(session);

    if (!supplier || supplier.status !== "active") {
      throw new NotFoundError("Active supplier not found.");
    }

    const resolvedItems = await resolvePurchaseItems(payload.items, session);
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
      throw new BadRequestError("Paid amount cannot exceed purchase total.");
    }

    const remainingAmount = subtractMoney(totalAmount, paidAmount);
    const invoiceNo = await nextInvoiceNumber("PUR", session);
    const [purchase] = await Purchase.create(
      [
        {
          invoice_no: invoiceNo,
          supplier_id: supplier._id,
          total_amount: totalAmount,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          payment_method: payload.payment_method,
          bank_account_id: payload.bank_account_id,
          date,
        },
      ],
      { session }
    );

    for (const item of resolvedItems) {
      await Product.findByIdAndUpdate(
        item.product_id,
        {
          $inc: { stock_quantity: item.quantity },
          $set: { purchase_price: item.unit_price },
        },
        { new: true, runValidators: true, session }
      );
    }

    await PurchaseItem.create(
      resolvedItems.map((item) => ({
        purchase_id: purchase._id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
      { session }
    );

    supplier.current_balance = addMoney(supplier.current_balance, remainingAmount);
    await supplier.save({ session });

    await SupplierLedger.create(
      [
        {
          supplier_id: supplier._id,
          date,
          description: `Purchase invoice ${invoiceNo}`,
          debit: paidAmount,
          credit: totalAmount,
          balance: supplier.current_balance,
          payment_method: payload.payment_method,
          ref_type: "PURCHASE",
          ref_id: purchase._id,
          bank_account_id: payload.bank_account_id,
        },
      ],
      { session,
        ordered: true,
       }
    );

    if (paidAmount > 0) {
      await accounting.postPayments({
        payments,
        direction: "out",
        date,
        description: `Purchase payment ${invoiceNo}`,
        ref_type: "PURCHASE",
        ref_id: purchase._id,
        session,
      });
    }

    await accounting.postDailyBook({
      date,
      description: `Purchase invoice ${invoiceNo}`,
      debit: 0,
      credit: totalAmount,
      ref_type: "PURCHASE",
      ref_id: purchase._id,
      session,
    });

    return getPurchaseDetails(purchase._id, session);
  });

module.exports = {
  listPurchases,
  getPurchase,
  deletePurchase,
  createPurchase,
};
