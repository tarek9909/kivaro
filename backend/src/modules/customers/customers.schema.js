const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const status = z.enum(['active', 'inactive', 'blocked']);
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
