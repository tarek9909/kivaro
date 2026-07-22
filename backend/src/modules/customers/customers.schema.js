const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const status = z.enum(['active', 'inactive', 'blocked']);
const isoDate = z.string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format');
const customerBody = z.object({
  customer_code: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1).max(150),
  phone: z.string().trim().optional().nullable(),
  secondary_phone: z.string().trim().optional().nullable(),
  location_id: z.coerce.number().int().positive(),
  sublocation_id: z.coerce.number().int().positive(),
  assigned_salesman_id: z.coerce.number().int().positive().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  detailed_address: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  store_id: z.coerce.number().int().positive().optional(),
  status: status.default('active')
});

module.exports = {
  createCustomerSchema: z.object({ body: customerBody }),
  idSchema: z.object({ params: idParam }),
  exportSchema: z.object({
    query: z.object({
      dataset: z.enum(['directory', 'invoices', 'receipts', 'payments', 'debts']).default('directory'),
      search: z.string().trim().max(200).optional(),
      status: status.optional(),
      location_id: z.coerce.number().int().positive().optional(),
      sublocation_id: z.coerce.number().int().positive().optional(),
      salesman_id: z.coerce.number().int().positive().optional(),
      invoice_status: z.enum(['issued', 'voided', 'cancelled']).optional(),
      receipt_type: z.enum(['sale', 'payment', 'credit', 'other']).optional(),
      debt_status: z.enum(['pending', 'partially_paid', 'paid', 'written_off', 'cancelled']).optional(),
      date_from: isoDate.optional(),
      date_to: isoDate.optional(),
      store_id: z.coerce.number().int().positive().optional()
    }).strict().superRefine((value, context) => {
      if (value.date_from && value.date_to && value.date_from > value.date_to) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['date_to'],
          message: 'date_to must be on or after date_from'
        });
      }
    })
  }),
  listSchema: z.object({
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      search: z.string().trim().optional(),
      status: status.optional(),
      location_id: z.coerce.number().int().positive().optional(),
      sublocation_id: z.coerce.number().int().positive().optional(),
      salesman_id: z.coerce.number().int().positive().optional()
      , store_id: z.coerce.number().int().positive().optional()
    })
  }),
  updateCustomerSchema: z.object({
    params: idParam,
    body: customerBody.omit({ store_id: true }).partial()
  })
};
