const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
    status: z.string().trim().optional(),
    salesman_id: z.coerce.number().int().positive().optional(),
    warehouse_id: z.coerce.number().int().positive().optional(),
    store_id: z.coerce.number().int().positive().optional(),
    date_from: z.string().trim().optional(),
    date_to: z.string().trim().optional()
  })
});

module.exports = {
  addCustomerSchema: z.object({
    params: idParam,
    body: z.object({
      customer_id: z.coerce.number().int().positive(),
      receipt_number: z.string().trim().optional(),
      notes: z.string().trim().optional().nullable()
    })
  }),
  addItemSchema: z.object({
    params: idParam,
    body: z.object({
      item_variant_id: z.coerce.number().int().positive(),
      packaging_assignment_id: z.coerce.number().int().positive().optional().nullable(),
      quantity: z.coerce.number().positive(),
      unit_price: z.coerce.number().min(0),
      unit_cost: z.coerce.number().min(0).optional()
    })
  }),
  completeSettlementSchema: z.object({
    params: idParam,
    body: z.object({
      cash_account_id: z.coerce.number().int().positive().optional().nullable(),
      payment_method: z.enum(['cash', 'bank_transfer', 'cheque', 'other']).default('cash'),
      due_date: z.string().trim().optional().nullable(),
      notes: z.string().trim().optional().nullable()
    }).default({})
  }),
  createDispatchSchema: z.object({
    body: z.object({
      dispatch_number: z.string().trim().optional(),
      salesman_id: z.coerce.number().int().positive(),
      warehouse_id: z.coerce.number().int().positive(),
      request_date: z.string().trim().min(1),
      store_id: z.coerce.number().int().positive().optional(),
      notes: z.string().trim().optional().nullable()
    })
  }),
  createReturnSchema: z.object({
    params: idParam,
    body: z.object({
      dispatch_item_id: z.coerce.number().int().positive(),
      returned_quantity: z.coerce.number().positive(),
      reason: z.string().trim().optional().nullable()
    })
  }),
  createSettlementSchema: z.object({
    params: idParam,
    body: z.object({
      settlement_number: z.string().trim().optional(),
      settlement_date: z.string().trim().min(1),
      notes: z.string().trim().optional().nullable()
    })
  }),
  idSchema: z.object({ params: idParam }),
  listSchema,
  settlementCustomerSchema: z.object({
    params: idParam,
    body: z.object({
      dispatch_customer_id: z.coerce.number().int().positive(),
      collected_amount: z.coerce.number().min(0),
      notes: z.string().trim().optional().nullable()
    })
  }),
  updateDispatchSchema: z.object({
    params: idParam,
    body: z.object({
      request_date: z.string().trim().optional(),
      notes: z.string().trim().optional().nullable()
    })
  })
};
