const { z } = require('zod');

const saleEntryType = z.enum([
  'normal_carton',
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
  ...storeScope
};

const customerBody = z.object({
  salesman_id: z.coerce.number().int().positive().optional(),
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

module.exports = {
  createCustomerSchema: z.object({ body: customerBody }),
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
  listTerritoriesSchema: z.object({
    query: z.object({
      salesman_id: z.coerce.number().int().positive().optional(),
      ...storeScope
    })
  }),
  workspaceSchema: z.object({
    query: z.object({
      date_from: date.optional(),
      date_to: date.optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      salesman_id: z.coerce.number().int().positive().optional(),
      ...storeScope
    })
  })
};
