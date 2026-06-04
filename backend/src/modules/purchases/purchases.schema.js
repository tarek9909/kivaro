const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const status = z.enum(['active', 'inactive']);
const paymentMethod = z.enum(['cash', 'bank_transfer', 'cheque', 'other']);

const listQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  supplier_id: z.coerce.number().int().positive().optional(),
  warehouse_id: z.coerce.number().int().positive().optional(),
  purchase_order_id: z.coerce.number().int().positive().optional(),
  store_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional()
});

const supplierBody = z.object({
  name: z.string().trim().min(1).max(150),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  contact_person: z.string().trim().optional().nullable(),
  store_id: z.coerce.number().int().positive().optional(),
  status: status.default('active')
});

const poItem = z.object({
  item_variant_id: z.coerce.number().int().positive(),
  ordered_quantity: z.coerce.number().positive(),
  unit_cost: z.coerce.number().min(0),
  notes: z.string().trim().optional().nullable()
});

const createPurchaseOrderSchema = z.object({
  body: z.object({
    po_number: z.string().trim().optional(),
    supplier_id: z.coerce.number().int().positive().optional().nullable(),
    warehouse_id: z.coerce.number().int().positive(),
    order_date: z.string().trim().min(1),
    expected_date: z.string().trim().optional().nullable(),
    discount_amount: z.coerce.number().min(0).default(0),
    tax_amount: z.coerce.number().min(0).default(0),
    notes: z.string().trim().optional().nullable(),
    store_id: z.coerce.number().int().positive().optional(),
    items: z.array(poItem).min(1)
  })
});

const updatePurchaseOrderSchema = z.object({
  params: idParam,
  body: z.object({
    supplier_id: z.coerce.number().int().positive().optional().nullable(),
    expected_date: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable()
    , store_id: z.coerce.number().int().positive().optional()
  })
});

const receivePurchaseOrderSchema = z.object({
  params: idParam,
  body: z.object({
    receipt_number: z.string().trim().optional(),
    received_date: z.string().trim().min(1),
    notes: z.string().trim().optional().nullable(),
    items: z.array(z.object({
      purchase_order_item_id: z.coerce.number().int().positive(),
      received_quantity: z.coerce.number().positive(),
      unit_cost: z.coerce.number().min(0).optional()
    })).min(1)
  })
});

const supplierPaymentSchema = z.object({
  body: z.object({
    supplier_id: z.coerce.number().int().positive(),
    purchase_order_id: z.coerce.number().int().positive().optional().nullable(),
    payment_date: z.string().trim().min(1),
    amount: z.coerce.number().positive(),
    payment_method: paymentMethod.default('cash'),
    reference_number: z.string().trim().optional().nullable(),
    cash_account_id: z.coerce.number().int().positive(),
    notes: z.string().trim().optional().nullable()
  })
});

module.exports = {
  createPurchaseOrderSchema,
  idSchema: z.object({ params: idParam }),
  listSchema: z.object({ query: listQuery }),
  receivePurchaseOrderSchema,
  supplierCreateSchema: z.object({ body: supplierBody }),
  supplierPaymentSchema,
  supplierUpdateSchema: z.object({
    params: idParam,
    body: supplierBody.partial()
  }),
  updatePurchaseOrderSchema
};
