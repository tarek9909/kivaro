const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const dispatchStatus = z.enum([
  'draft', 'pending_approval', 'approved', 'dispatched', 'partially_settled', 'completed', 'cancelled'
]);
const lineType = z.enum(['sale', 'free_gift']);
const optionalText = z.string().trim().optional().nullable();
const pagination = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  store_id: z.coerce.number().int().positive().optional()
};

module.exports = {
  addCustomerSchema: z.object({
    params: idParam,
    body: z.object({
      customer_id: z.coerce.number().int().positive(),
      receipt_number: z.string().trim().max(100).optional().nullable(),
      notes: optionalText
    })
  }),
  addItemSchema: z.object({
    params: idParam,
    body: z.object({
      sale_catalog_entry_id: z.coerce.number().int().positive(),
      quantity: z.coerce.number().positive(),
      unit_price: z.coerce.number().min(0).optional(),
      line_type: lineType.default('sale')
    })
  }),
  closeoutSchema: z.object({
    params: idParam,
    body: z.object({
      settlement_number: z.string().trim().max(100).optional(),
      settlement_date: z.string().trim().min(1),
      notes: optionalText,
      customers: z.array(z.object({
        dispatch_customer_id: z.coerce.number().int().positive(),
        collected_amount: z.coerce.number().min(0).default(0),
        notes: optionalText
      })).optional().default([])
    })
  }),
  createDispatchSchema: z.object({
    body: z.object({
      dispatch_number: z.string().trim().max(100).optional(),
      salesman_id: z.coerce.number().int().positive(),
      warehouse_id: z.coerce.number().int().positive(),
      request_date: z.string().trim().min(1),
      notes: optionalText,
      store_id: z.coerce.number().int().positive().optional()
    })
  }),
  createFromPosSchema: z.object({
    body: z.object({
      pos_order_ids: z.array(z.coerce.number().int().positive()).min(1),
      gift_decisions: z.array(z.object({
        pos_order_line_id: z.coerce.number().int().positive(),
        decision: z.enum(['approve', 'remove'])
      })).optional(),
      dispatch_number: z.string().trim().max(100).optional(),
      request_date: z.string().trim().optional(),
      notes: optionalText,
      store_id: z.coerce.number().int().positive().optional()
    })
  }),
  createReturnSchema: z.object({
    params: idParam,
    body: z.object({
      dispatch_item_id: z.coerce.number().int().positive(),
      returned_quantity: z.coerce.number().positive(),
      reason: z.string().trim().max(255).optional().nullable()
    })
  }),
  idSchema: z.object({ params: idParam }),
  invoiceListSchema: z.object({
    query: z.object({
      ...pagination,
      dispatch_request_id: z.coerce.number().int().positive().optional(),
      customer_id: z.coerce.number().int().positive().optional(),
      status: z.enum(['issued', 'voided', 'cancelled']).optional(),
      date_from: z.string().trim().optional(),
      date_to: z.string().trim().optional()
    })
  }),
  listSchema: z.object({
    query: z.object({
      ...pagination,
      status: dispatchStatus.optional(),
      salesman_id: z.coerce.number().int().positive().optional(),
      warehouse_id: z.coerce.number().int().positive().optional(),
      date_from: z.string().trim().optional(),
      date_to: z.string().trim().optional()
    })
  }),
  postSettlementSchema: z.object({
    params: idParam,
    body: z.object({
      cash_account_id: z.coerce.number().int().positive().optional().nullable(),
      settlement_date: z.string().trim().optional()
    })
  }),
  reworkSchema: z.object({
    params: idParam,
    body: z.object({ reason: z.string().trim().min(1).max(500).optional() }).default({})
  }),
  updateDispatchSchema: z.object({
    params: idParam,
    body: z.object({
      salesman_id: z.coerce.number().int().positive().optional(),
      warehouse_id: z.coerce.number().int().positive().optional(),
      request_date: z.string().trim().optional(),
      notes: optionalText
    }).refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' })
  }),
  updateItemSchema: z.object({
    params: idParam,
    body: z.object({
      sale_catalog_entry_id: z.coerce.number().int().positive().optional(),
      quantity: z.coerce.number().positive().optional(),
      unit_price: z.coerce.number().min(0).optional(),
      line_type: lineType.optional()
    }).refine((body) => Object.keys(body).length > 0, { message: 'At least one field is required' })
  })
};
