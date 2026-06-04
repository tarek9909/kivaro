const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const paymentMethod = z.enum(['cash', 'bank_transfer', 'cheque', 'other']);

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
    customer_id: z.coerce.number().int().positive().optional(),
    customer_debt_id: z.coerce.number().int().positive().optional(),
    direction: z.enum(['credit', 'debit']).optional(),
    dispatch_request_id: z.coerce.number().int().positive().optional(),
    salesman_id: z.coerce.number().int().positive().optional(),
    receipt_type: z.string().trim().optional(),
    status: z.string().trim().optional(),
    date_from: z.string().trim().optional(),
    date_to: z.string().trim().optional(),
    store_id: z.coerce.number().int().positive().optional()
  })
});

const paymentBody = z.object({
  customer_id: z.coerce.number().int().positive(),
  customer_debt_id: z.coerce.number().int().positive().optional().nullable(),
  payment_date: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  payment_method: paymentMethod.default('cash'),
  reference_number: z.string().trim().optional().nullable(),
  collected_by_salesman_id: z.coerce.number().int().positive().optional().nullable(),
  cash_account_id: z.coerce.number().int().positive(),
  notes: z.string().trim().optional().nullable()
  , store_id: z.coerce.number().int().positive().optional()
});

const debtPaymentBody = paymentBody.omit({ customer_id: true });

module.exports = {
  applyCreditSchema: z.object({
    params: idParam,
    body: z.object({
      amount: z.coerce.number().positive().optional(),
      apply_date: z.string().trim().optional(),
      notes: z.string().trim().optional().nullable()
    }).default({})
  }),
  debtPaymentSchema: z.object({ params: idParam, body: debtPaymentBody }),
  idSchema: z.object({ params: idParam }),
  listSchema,
  paymentSchema: z.object({ body: paymentBody }),
  updateDebtStatusSchema: z.object({
    params: idParam,
    body: z.object({
      status: z.enum(['pending', 'partially_paid', 'paid', 'written_off', 'cancelled'])
    })
  })
};
