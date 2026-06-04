const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const salesmanIdParam = z.object({
  id: z.coerce.number().int().positive(),
  sublocationId: z.coerce.number().int().positive().optional()
});
const status = z.enum(['active', 'inactive']);
const targetStatus = z.enum(['draft', 'active', 'closed', 'cancelled']);

const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
    status: z.string().trim().optional(),
    store_id: z.coerce.number().int().positive().optional(),
    location_id: z.coerce.number().int().positive().optional(),
    period_start: z.string().trim().optional(),
    period_end: z.string().trim().optional()
  })
});

const locationBody = z.object({
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  store_id: z.coerce.number().int().positive().optional(),
  status: status.default('active')
});

const sublocationBody = z.object({
  location_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  store_id: z.coerce.number().int().positive().optional(),
  status: status.default('active')
});

const salesmanBody = z.object({
  user_id: z.coerce.number().int().positive().optional().nullable(),
  full_name: z.string().trim().min(1).max(150),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  vehicle_number: z.string().trim().optional().nullable(),
  national_id: z.string().trim().optional().nullable(),
  status: status.default('active'),
  store_id: z.coerce.number().int().positive().optional(),
  joined_at: z.string().trim().optional().nullable()
});

const assignSchema = z.object({
  params: idParam,
  body: z.object({
    sublocation_id: z.coerce.number().int().positive(),
    assigned_at: z.string().trim().min(1)
  })
});

const locationTargetBody = z.object({
  location_id: z.coerce.number().int().positive(),
  target_period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  period_start: z.string().trim().min(1),
  period_end: z.string().trim().min(1),
  target_amount: z.coerce.number().min(0),
  store_id: z.coerce.number().int().positive().optional(),
  status: targetStatus.default('draft')
});

const sublocationTargetSchema = z.object({
  params: idParam,
  body: z.object({
    sublocation_id: z.coerce.number().int().positive(),
    target_amount: z.coerce.number().min(0),
    status: targetStatus.default('draft')
  })
});

function updateSchema(body) {
  return z.object({
    params: idParam,
    body: body.partial()
  });
}

module.exports = {
  assignSchema,
  createLocationSchema: z.object({ body: locationBody }),
  createLocationTargetSchema: z.object({ body: locationTargetBody }),
  createSalesmanSchema: z.object({ body: salesmanBody }),
  createSublocationSchema: z.object({ body: sublocationBody }),
  idSchema: z.object({ params: idParam }),
  listSchema,
  salesmanSublocationIdSchema: z.object({ params: salesmanIdParam.required({ sublocationId: true }) }),
  sublocationTargetSchema,
  updateLocationSchema: updateSchema(locationBody),
  updateLocationTargetSchema: updateSchema(locationTargetBody),
  updateSalesmanSchema: updateSchema(salesmanBody),
  updateSublocationSchema: updateSchema(sublocationBody)
};
