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
    dispatch_request_id: z.coerce.number().int().positive().optional(),
    salesman_id: z.coerce.number().int().positive().optional(),
    receipt_type: z.string().trim().optional(),
    status: z.string().trim().optional(),
    available_for_application: z.coerce.boolean().optional(),
    date_from: z.string().trim().optional(),
    date_to: z.string().trim().optional(),
    format: z.enum(['json', 'csv']).optional(),
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

// Debt payments are intentionally minimal. The debt itself supplies the
// customer and assigned salesman; the server supplies the payment date and
// records the correct partial/paid status from the amount received.
const debtPaymentBody = z.object({
  amount: z.coerce.number().positive(),
  cash_account_id: z.coerce.number().int().positive(),
  payment_date: z.string().trim().min(1).optional(),
  payment_method: paymentMethod.optional(),
  reference_number: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

const creditApplicationBody = z.object({
  amount: z.coerce.number().positive().optional(),
  apply_date: z.string().trim().min(1).optional()
});

module.exports = {
  debtPaymentSchema: z.object({ params: idParam, body: debtPaymentBody }),
  creditApplicationSchema: z.object({ params: idParam, body: creditApplicationBody }),
  idSchema: z.object({ params: idParam }),
  listSchema,
  paymentSchema: z.object({ body: paymentBody }),
  printSchema: z.object({
    params: idParam,
    query: z.object({ format: z.enum(['json', 'pdf']).optional() })
  })
};
