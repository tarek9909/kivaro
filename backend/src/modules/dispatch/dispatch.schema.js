const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const dispatchStatus = z.enum([
  'draft', 'pending_approval', 'approved', 'delivery', 'partially_settled', 'completed', 'cancelled'
]);
const originEnum = z.enum(['direct']);
const lifecycleStatus = z.enum(['pending', 'released', 'out_for_delivery', 'closeout_pending', 'settled', 'cancelled']);
const workflowTab = z.enum(['all', 'orders', 'deliveries', 'completed']);
const lineType = z.enum(['sale', 'free_gift']);
const discountType = z.enum(['percent', 'fixed']);
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
      origin: originEnum.optional().default('direct'),
      salesman_id: z.coerce.number().int().positive(),
      warehouse_id: z.coerce.number().int().positive(),
      request_date: z.string().trim().min(1),
      notes: optionalText,
      store_id: z.coerce.number().int().positive().optional(),
      customers: z.array(z.object({
        customer_id: z.coerce.number().int().positive(),
        location_id: z.coerce.number().int().positive().optional(),
        sublocation_id: z.coerce.number().int().positive().optional(),
        notes: optionalText,
        discount_type: discountType.optional().nullable(),
        discount_value: z.coerce.number().min(0).optional().nullable(),
        lines: z.array(z.object({
          sale_catalog_entry_id: z.coerce.number().int().positive(),
          quantity: z.coerce.number().positive(),
          unit_price: z.coerce.number().min(0).optional(),
          vat_rate: z.coerce.number().min(0).optional(),
          line_type: lineType.default('sale')
        })).optional().default([])
      })).optional()
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
  customerReceiptSchema: z.object({
    params: z.object({
      id: z.coerce.number().int().positive(),
      customerId: z.coerce.number().int().positive()
    }),
    query: z.object({
      // No part means the combined two-page document. Do not default this to
      // receipt: doing so prevents the combined download from being recorded.
      part: z.enum(['receipt', 'consent']).optional()
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
      workflow_tab: workflowTab.optional(),
      lifecycle_status: lifecycleStatus.optional(),
      origin: originEnum.optional(),
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
      notes: optionalText,
      customers: z.array(z.object({
        customer_id: z.coerce.number().int().positive(),
        location_id: z.coerce.number().int().positive().optional(),
        sublocation_id: z.coerce.number().int().positive().optional(),
        notes: optionalText,
        discount_type: discountType.optional().nullable(),
        discount_value: z.coerce.number().min(0).optional().nullable(),
        lines: z.array(z.object({
          sale_catalog_entry_id: z.coerce.number().int().positive(),
          quantity: z.coerce.number().positive(),
          unit_price: z.coerce.number().min(0).optional(),
          vat_rate: z.coerce.number().min(0).optional(),
          line_type: lineType.default('sale')
        })).optional().default([])
      })).optional()
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
