const ApiError = require('../../utils/ApiError');
const { decimal, toMoney } = require('../../utils/money');
const { createDocumentNumber } = require('../../utils/documentNumber');
const { assertRowInScope, assertSameStore, scopedData, scopedQuery } = require('../../utils/storeScope');
const { withTransaction } = require('../../utils/transaction');
const accountingModel = require('../accounting/accounting.model');
const customerModel = require('../customers/customers.model');
const locationModel = require('../locations/locations.model');
const model = require('./payments.model');

async function validateCashAccount(cashAccountId, storeId) {
  if (!cashAccountId) {
    throw ApiError.badRequest('Validation failed', [{ field: 'cash_account_id', message: 'Cash account is required' }]);
  }
  const cashAccount = await accountingModel.findCashAccountById(cashAccountId);
  if (!cashAccount) throw ApiError.badRequest('Validation failed', [{ field: 'cash_account_id', message: 'Cash account not found' }]);
  assertSameStore(cashAccount, storeId, 'cash_account_id', 'Cash account does not belong to this store');
  if (cashAccount.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [{ field: 'cash_account_id', message: 'Cash account must be active' }]);
  }
  if (!['incoming', 'both'].includes(cashAccount.cash_flow_permission || 'both')) {
    throw ApiError.badRequest('Validation failed', [{
      field: 'cash_account_id',
      message: 'Cash account does not allow incoming payments'
    }]);
  }
  return cashAccount;
}

async function validateSalesman(salesmanId, storeId, field = 'collected_by_salesman_id') {
  if (!salesmanId) return null;
  const salesman = await locationModel.findSalesmanById(salesmanId);
  if (!salesman) throw ApiError.badRequest('Validation failed', [{ field, message: 'Salesman not found' }]);
  assertSameStore(salesman, storeId, field, 'Salesman does not belong to this store');
  if (salesman.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [{ field, message: 'Salesman must be active' }]);
  }
  return salesman;
}

async function getDebt(id, actor = {}) {
  const debt = await model.findDebtById(id);
  return assertRowInScope(debt, actor, 'Customer debt not found');
}

async function getReceipt(id, actor = {}) {
  const receipt = await model.findReceiptById(id);
  return assertRowInScope(receipt, actor, 'Customer receipt not found');
}

async function createCustomerPayment(data, userId, actor = {}) {
  const scoped = scopedData(data, actor);
  let preferredDebt = null;
  const customer = await customerModel.findCustomerById(scoped.customer_id);
  if (!customer) throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: 'Customer not found' }]);
  assertSameStore(customer, scoped.store_id, 'customer_id', 'Customer does not belong to this store');
  if (customer.status !== 'active') {
    throw ApiError.badRequest('Validation failed', [{ field: 'customer_id', message: 'Customer must be active' }]);
  }
  if (scoped.customer_debt_id) {
    preferredDebt = await model.findDebtById(scoped.customer_debt_id);
    if (!preferredDebt || Number(preferredDebt.customer_id) !== Number(scoped.customer_id)) {
      throw ApiError.badRequest('Validation failed', [{ field: 'customer_debt_id', message: 'Debt does not belong to this customer' }]);
    }
    assertSameStore(preferredDebt, scoped.store_id, 'customer_debt_id', 'Debt does not belong to this store');
    if (!['pending', 'partially_paid'].includes(preferredDebt.status) || decimal(preferredDebt.remaining_amount).lte(0)) {
      throw ApiError.conflict('Customer debt must be pending or partially paid');
    }
  }

  await validateCashAccount(scoped.cash_account_id, scoped.store_id);
  await validateSalesman(scoped.collected_by_salesman_id, scoped.store_id);

  let paymentId;
  let receiptId;
  let allocations = [];
  let unallocatedAmount = toMoney(scoped.amount);
  let creditAmount = toMoney(0);

  await withTransaction(async (connection) => {
    paymentId = await model.createPayment(connection, {
      ...scoped,
      payment_number: createDocumentNumber('PAY'),
      created_by: userId
    });

    let remainingPayment = decimal(scoped.amount);
    const openDebts = await model.findOpenDebtsForCustomer(
      connection,
      scoped.customer_id,
      scoped.store_id,
      scoped.customer_debt_id
    );
    for (const debt of openDebts) {
      if (remainingPayment.lte(0)) break;
      const debtRemaining = decimal(debt.remaining_amount);
      const allocationAmount = remainingPayment.lt(debtRemaining) ? remainingPayment : debtRemaining;
      const nextRemaining = decimal(debt.remaining_amount).minus(allocationAmount);
      const nextPaid = decimal(debt.paid_amount).plus(allocationAmount);
      const nextStatus = nextRemaining.eq(0) ? 'paid' : 'partially_paid';
      await model.createPaymentAllocation(connection, {
        customer_payment_id: paymentId,
        customer_debt_id: debt.id,
        allocated_amount: toMoney(allocationAmount)
      });
      await model.updateDebt(debt.id, {
        paid_amount: toMoney(nextPaid),
        remaining_amount: toMoney(nextRemaining),
        status: nextStatus
      }, connection);
      allocations.push({
        customer_debt_id: debt.id,
        allocated_amount: toMoney(allocationAmount)
      });
      remainingPayment = remainingPayment.minus(allocationAmount);
    }
    creditAmount = toMoney(remainingPayment);
    if (remainingPayment.gt(0)) {
      await model.createCustomerCredit(connection, {
        store_id: scoped.store_id,
        customer_id: scoped.customer_id,
        credit_number: createDocumentNumber('CRD'),
        credit_date: scoped.payment_date,
        original_amount: creditAmount,
        used_amount: 0,
        remaining_amount: creditAmount,
        status: 'available',
        reference_type: 'customer_payment',
        reference_id: paymentId,
        notes: scoped.notes,
        created_by: userId
      });
    }
    unallocatedAmount = toMoney(0);

    receiptId = await model.createReceipt(connection, {
      store_id: scoped.store_id,
      receipt_number: createDocumentNumber('RCP'),
      customer_id: scoped.customer_id,
      dispatch_request_id: preferredDebt?.dispatch_request_id || null,
      dispatch_customer_id: preferredDebt?.dispatch_customer_id || null,
      customer_payment_id: paymentId,
      receipt_date: scoped.payment_date,
      total_amount: scoped.amount,
      paid_amount: scoped.amount,
      remaining_amount: creditAmount,
      receipt_type: 'payment',
      created_by: userId
    });

    await accountingModel.createFinancialTransaction(connection, {
      store_id: scoped.store_id,
      cash_account_id: scoped.cash_account_id,
      transaction_type: 'sale_collection',
      direction: 'in',
      amount: scoped.amount,
      reference_type: 'customer_payment',
      reference_id: paymentId,
      description: scoped.notes,
      created_by: userId
    });
  });

  return { payment_id: paymentId, receipt_id: receiptId, allocations, unallocated_amount: unallocatedAmount, credit_amount: creditAmount };
}

async function payDebt(debtId, data, userId, actor = {}) {
  let paymentId;
  let receiptId;

  await withTransaction(async (connection) => {
    const debt = await model.lockDebtById(connection, debtId);
    assertRowInScope(debt, actor, 'Customer debt not found');
    await validateCashAccount(data.cash_account_id, debt.store_id);
    await validateSalesman(data.collected_by_salesman_id || debt.salesman_id, debt.store_id);

    if (!['pending', 'partially_paid'].includes(debt.status)) {
      throw ApiError.conflict('Only pending or partially paid debts can be paid');
    }

    if (decimal(data.amount).gt(debt.remaining_amount)) {
      throw ApiError.conflict('Payment amount cannot exceed remaining debt');
    }

    const remaining = decimal(debt.remaining_amount).minus(data.amount);
    const paidAmount = decimal(debt.paid_amount).plus(data.amount);
    const nextStatus = remaining.eq(0) ? 'paid' : 'partially_paid';

    paymentId = await model.createPayment(connection, {
      store_id: debt.store_id,
      customer_id: debt.customer_id,
      cash_account_id: data.cash_account_id,
      payment_number: createDocumentNumber('PAY'),
      payment_date: data.payment_date,
      amount: data.amount,
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      collected_by_salesman_id: data.collected_by_salesman_id || debt.salesman_id,
      notes: data.notes,
      created_by: userId
    });
    await model.createPaymentAllocation(connection, {
      customer_payment_id: paymentId,
      customer_debt_id: debtId,
      allocated_amount: data.amount
    });
    await model.updateDebt(debtId, {
      paid_amount: toMoney(paidAmount),
      remaining_amount: toMoney(remaining),
      status: nextStatus
    }, connection);
    receiptId = await model.createReceipt(connection, {
      store_id: debt.store_id,
      receipt_number: createDocumentNumber('RCP'),
      customer_id: debt.customer_id,
      dispatch_request_id: debt.dispatch_request_id,
      dispatch_customer_id: debt.dispatch_customer_id,
      customer_payment_id: paymentId,
      receipt_date: data.payment_date,
      subtotal_amount: debt.subtotal_amount || debt.original_amount,
      vat_amount: debt.vat_amount || 0,
      total_amount: debt.original_amount,
      paid_amount: data.amount,
      remaining_amount: toMoney(remaining),
      receipt_type: 'payment',
      created_by: userId
    });

    await accountingModel.createFinancialTransaction(connection, {
      store_id: debt.store_id,
      cash_account_id: data.cash_account_id,
      transaction_type: 'customer_debt_payment',
      direction: 'in',
      amount: data.amount,
      reference_type: 'customer_payment',
      reference_id: paymentId,
      description: data.notes,
      created_by: userId
    });
  });

  return { payment_id: paymentId, receipt_id: receiptId };
}

async function applyCreditToDebt(debtId, data = {}, userId, actor = {}) {
  let receiptId;
  let appliedAmount = toMoney(0);

  await withTransaction(async (connection) => {
    const debt = await model.lockDebtById(connection, debtId);
    assertRowInScope(debt, actor, 'Customer debt not found');

    if (!['pending', 'partially_paid'].includes(debt.status)) {
      throw ApiError.conflict('Only pending or partially paid debts can use customer credit');
    }

    const credits = await model.lockAvailableCreditsForCustomer(connection, debt.customer_id, debt.store_id);
    const creditBalance = credits.reduce((total, credit) => total.plus(credit.remaining_amount), decimal(0));
    if (creditBalance.lte(0)) {
      throw ApiError.conflict('Customer has no available credit');
    }

    const requestedAmount = data.amount ? decimal(data.amount) : creditBalance;
    const remainingDebt = decimal(debt.remaining_amount);
    const amountToApply = DecimalMin(requestedAmount, creditBalance, remainingDebt);
    const remaining = remainingDebt.minus(amountToApply);
    const paidAmount = decimal(debt.paid_amount).plus(amountToApply);
    const nextStatus = remaining.eq(0) ? 'paid' : 'partially_paid';

    let creditToConsume = amountToApply;
    for (const credit of credits) {
      if (creditToConsume.lte(0)) break;
      const creditAvailable = decimal(credit.remaining_amount);
      const consumed = creditToConsume.lt(creditAvailable) ? creditToConsume : creditAvailable;
      const remainingCredit = creditAvailable.minus(consumed);
      const usedCredit = decimal(credit.used_amount).plus(consumed);
      await model.updateCustomerCredit(credit.id, {
        used_amount: toMoney(usedCredit),
        remaining_amount: toMoney(remainingCredit),
        status: remainingCredit.eq(0) ? 'used' : 'partially_used'
      }, connection);
      creditToConsume = creditToConsume.minus(consumed);
    }
    if (creditToConsume.gt(0)) {
      throw ApiError.conflict('Customer credit changed before it could be applied');
    }
    appliedAmount = toMoney(amountToApply);
    await model.updateDebt(debtId, {
      paid_amount: toMoney(paidAmount),
      remaining_amount: toMoney(remaining),
      status: nextStatus
    }, connection);
    receiptId = await model.createReceipt(connection, {
      store_id: debt.store_id,
      receipt_number: createDocumentNumber('RCP'),
      customer_id: debt.customer_id,
      dispatch_request_id: debt.dispatch_request_id,
      dispatch_customer_id: debt.dispatch_customer_id,
      receipt_date: data.apply_date || new Date().toISOString().slice(0, 10),
      subtotal_amount: debt.subtotal_amount || debt.original_amount,
      vat_amount: debt.vat_amount || 0,
      total_amount: debt.original_amount,
      paid_amount: appliedAmount,
      remaining_amount: toMoney(remaining),
      receipt_type: 'credit',
      created_by: userId
    });
  });

  return { applied_amount: appliedAmount, receipt_id: receiptId };
}

function DecimalMin(...values) {
  return values.reduce((min, value) => (value.lt(min) ? value : min));
}

module.exports = {
  applyCreditToDebt,
  createCustomerPayment,
  getDebt,
  getReceipt,
  listDebts: (query, actor = {}) => model.listDebts(scopedQuery(query, actor)),
  listCredits: (query, actor = {}) => model.listCredits(scopedQuery(query, actor)),
  listPayments: (query, actor = {}) => model.listPayments(scopedQuery(query, actor)),
  listReceipts: (query, actor = {}) => model.listReceipts(scopedQuery(query, actor)),
  markReceiptPrinted: async (id, actor = {}) => { await getReceipt(id, actor); return model.markReceiptPrinted(id); },
  payDebt,
  updateDebtStatus: async (id, status, actor = {}) => {
    const debt = await getDebt(id, actor);
    const paid = decimal(debt.paid_amount);
    const remaining = decimal(debt.remaining_amount);
    if (status === 'paid' && !remaining.eq(0)) {
      throw ApiError.conflict('Debt can only be marked paid when remaining amount is zero');
    }
    if (status === 'pending' && !paid.eq(0)) {
      throw ApiError.conflict('Debt with payments cannot be marked pending');
    }
    if (['written_off', 'cancelled'].includes(status) && remaining.gt(0)) {
      return withTransaction(async (connection) => {
        const lockedDebt = await model.lockDebtById(connection, id);
        assertRowInScope(lockedDebt, actor, 'Customer debt not found');
        const lockedRemaining = decimal(lockedDebt.remaining_amount);
        if (lockedRemaining.lte(0)) {
          return model.updateDebt(id, { status }, connection);
        }

        await model.createDebtAdjustment(connection, {
          store_id: lockedDebt.store_id,
          customer_debt_id: lockedDebt.id,
          dispatch_request_id: lockedDebt.dispatch_request_id,
          adjustment_date: new Date().toISOString().slice(0, 10),
          adjustment_type: status === 'written_off' ? 'write_off' : 'decrease',
          amount: toMoney(lockedRemaining),
          reason: `Non-cash ${status} adjustment applied.`,
          created_by: actor.id
        });

        return model.updateDebt(id, {
          status,
          remaining_amount: toMoney(0),
          notes: [lockedDebt.notes, `Non-cash ${status} adjustment applied.`].filter(Boolean).join('\n')
        }, connection);
      });
    }
    return model.updateDebt(id, { status });
  }
};
