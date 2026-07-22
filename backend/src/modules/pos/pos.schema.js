const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const orderStatus = z.enum(['pending', 'accepted', 'cancelled', 'converted', 'rejected']);
const lineType = z.enum(['sale', 'free_gift']);
const saleEntryType = z.enum([
  'normal_carton',
  'normal_loose_unit',
  'normal_weight',
  'normal_piece',
  'ready_outer_carton',
  'ready_inner_unit'
]);
const optionalText = z.string().trim().max(5000).optional().nullable();
const date = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const storeScope = {
  store_id: z.coerce.number().int().positive().optional()
};

const listQuery = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().optional(),
  warehouse_id: z.coerce.number().int().positive().optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  status: orderStatus.optional(),
  date_from: date.optional(),
  date_to: date.optional(),
  ...storeScope
};

const orderLine = z.object({
  sale_catalog_entry_id: z.coerce.number().int().positive(),
  line_type: lineType.default('sale'),
  quantity: z.coerce.number().positive(),
  notes: optionalText
});

const orderBody = z.object({
  order_number: z.string().trim().min(1).max(100).optional(),
  warehouse_id: z.coerce.number().int().positive(),
  customer_id: z.coerce.number().int().positive(),
  order_date: date.optional(),
  notes: optionalText,
  lines: z.array(orderLine).min(1),
  ...storeScope
});

const customerBody = z.object({
  customer_code: z.string().trim().max(100).optional().nullable(),
  name: z.string().trim().min(1).max(150),
  phone: z.string().trim().max(50).optional().nullable(),
  secondary_phone: z.string().trim().max(50).optional().nullable(),
  location_id: z.coerce.number().int().positive(),
  sublocation_id: z.coerce.number().int().positive(),
  address: z.string().trim().max(255).optional().nullable(),
  detailed_address: optionalText,
  notes: optionalText,
  ...storeScope
});

const giftDecision = z.object({
  pos_order_line_id: z.coerce.number().int().positive(),
  decision: z.enum(['approve', 'remove'])
});

const prepareDispatchBody = z.object({
  pos_order_ids: z.array(z.coerce.number().int().positive()).min(1),
  gift_decisions: z.array(giftDecision).optional(),
  ...storeScope
});

module.exports = {
  cancelOrderSchema: z.object({
    params: idParam,
    body: z.object({
      notes: optionalText,
      ...storeScope
    })
  }),
  createCustomerSchema: z.object({ body: customerBody }),
  createOrderSchema: z.object({ body: orderBody }),
  getOrderSchema: z.object({
    params: idParam,
    query: z.object(storeScope)
  }),
  listCatalogSchema: z.object({
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().trim().optional(),
      entry_type: saleEntryType.optional(),
      warehouse_id: z.coerce.number().int().positive(),
      ...storeScope
    })
  }),
  listCustomersSchema: z.object({ query: z.object(listQuery) }),
  listOrdersSchema: z.object({ query: z.object(listQuery) }),
  listReviewSchema: z.object({
    query: z.object({
      ...listQuery,
      salesman_id: z.coerce.number().int().positive().optional()
    })
  }),
  listTerritoriesSchema: z.object({ query: z.object(storeScope) }),
  workspaceSchema: z.object({
    query: z.object({
      date_from: date.optional(),
      date_to: date.optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      ...storeScope
    })
  }),
  prepareDispatchSchema: z.object({ body: prepareDispatchBody }),
  updateOrderSchema: z.object({
    params: idParam,
    body: z.object({
      warehouse_id: z.coerce.number().int().positive().optional(),
      customer_id: z.coerce.number().int().positive().optional(),
      order_date: date.optional(),
      notes: optionalText,
      lines: z.array(orderLine).min(1).optional(),
      ...storeScope
    }).refine((body) => Object.keys(body).some((key) => key !== 'store_id'), {
      message: 'At least one field is required'
    })
  })
};
