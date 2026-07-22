const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const paymentMethod = z.enum(['cash', 'bank_transfer', 'cheque', 'other']);

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
    status: z.string().trim().optional(),
    expense_category_id: z.coerce.number().int().positive().optional(),
    cash_account_id: z.coerce.number().int().positive().optional(),
    salesman_id: z.coerce.number().int().positive().optional(),
    dispatch_request_id: z.coerce.number().int().positive().optional(),
    transaction_type: z.string().trim().optional(),
    direction: z.enum(['in', 'out']).optional(),
    cash_flow_permission: z.enum(['incoming', 'outgoing', 'both']).optional(),
    cash_flow_direction: z.enum(['incoming', 'outgoing']).optional(),
    reference_type: z.string().trim().optional(),
    date_from: z.string().trim().optional(),
    date_to: z.string().trim().optional(),
    store_id: z.coerce.number().int().positive().optional()
  })
});

module.exports = {
  cashAccountSchema: z.object({
    body: z.object({
      account_name: z.string().trim().min(1).max(150),
      account_type: z.enum(['cash', 'bank', 'wallet', 'other']).default('cash'),
      cash_flow_permission: z.enum(['incoming', 'outgoing', 'both']).default('both'),
      opening_balance: z.coerce.number().min(0).default(0),
      status: z.enum(['active', 'inactive']).default('active')
      , store_id: z.coerce.number().int().positive().optional()
    })
  }),
  expenseCategorySchema: z.object({
    body: z.object({
      name: z.string().trim().min(1).max(150),
      description: z.string().trim().optional().nullable(),
      status: z.enum(['active', 'inactive']).default('active')
      , store_id: z.coerce.number().int().positive().optional()
    })
  }),
  expenseSchema: z.object({
    body: z.object({
      expense_category_id: z.coerce.number().int().positive(),
      expense_date: z.string().trim().min(1),
      amount: z.coerce.number().positive(),
      payment_method: paymentMethod.default('cash'),
      reference_number: z.string().trim().optional().nullable(),
      description: z.string().trim().optional().nullable(),
      cash_account_id: z.coerce.number().int().positive(),
      store_id: z.coerce.number().int().positive().optional()
    })
  }),
  idSchema: z.object({ params: idParam }),
  cashAccountUpdateSchema: z.object({
    params: idParam,
    body: z.object({
      account_name: z.string().trim().min(1).max(150).optional(),
      account_type: z.enum(['cash', 'bank', 'wallet', 'other']).optional(),
      cash_flow_permission: z.enum(['incoming', 'outgoing', 'both']).optional(),
      status: z.enum(['active', 'inactive']).optional()
    })
  }),
  expenseCategoryUpdateSchema: z.object({
    params: idParam,
    body: z.object({
      name: z.string().trim().min(1).max(150).optional(),
      description: z.string().trim().optional().nullable(),
      status: z.enum(['active', 'inactive']).optional()
    })
  }),
  expenseUpdateSchema: z.object({
    params: idParam,
    body: z.object({
      expense_category_id: z.coerce.number().int().positive().optional(),
      expense_date: z.string().trim().min(1).optional(),
      amount: z.coerce.number().positive().optional(),
      payment_method: paymentMethod.optional(),
      reference_number: z.string().trim().optional().nullable(),
      description: z.string().trim().optional().nullable(),
      cash_account_id: z.coerce.number().int().positive().optional()
    })
  }),
  listSchema
};
