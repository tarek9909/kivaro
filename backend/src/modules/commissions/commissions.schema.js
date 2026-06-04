const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
    status: z.string().trim().optional(),
    target_period: z.string().trim().optional(),
    salesman_id: z.coerce.number().int().positive().optional(),
    sublocation_id: z.coerce.number().int().positive().optional(),
    date_from: z.string().trim().optional(),
    date_to: z.string().trim().optional(),
    store_id: z.coerce.number().int().positive().optional()
  })
});

const ruleBody = z.object({
  name: z.string().trim().min(1).max(150),
  target_period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  below_target_rate: z.coerce.number().min(0).default(5),
  at_target_rate: z.coerce.number().min(0).default(10),
  above_target_extra_rate: z.coerce.number().min(0).default(1),
  applies_from: z.string().trim().min(1),
  applies_to: z.string().trim().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  store_id: z.coerce.number().int().positive().optional()
});

module.exports = {
  calculateSchema: z.object({
    body: z.object({
      salesman_target_id: z.coerce.number().int().positive(),
      commission_rule_id: z.coerce.number().int().positive().optional()
    })
  }),
  idSchema: z.object({ params: idParam }),
  listSchema,
  paySchema: z.object({
    params: idParam,
    body: z.object({
      payment_date: z.string().trim().min(1),
      amount: z.coerce.number().positive().optional(),
      payment_method: z.enum(['cash', 'bank_transfer', 'cheque', 'other']).default('cash'),
      reference_number: z.string().trim().optional().nullable(),
      cash_account_id: z.coerce.number().int().positive(),
      notes: z.string().trim().optional().nullable()
    })
  }),
  ruleCreateSchema: z.object({ body: ruleBody }),
  ruleUpdateSchema: z.object({ params: idParam, body: ruleBody.omit({ store_id: true }).partial() })
};
