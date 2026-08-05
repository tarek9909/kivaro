const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const salesmanIdParam = z.object({
  id: z.coerce.number().int().positive(),
  sublocationId: z.coerce.number().int().positive().optional()
});
const status = z.enum(['active', 'inactive']);
const isoDate = z.string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format');

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

const targetSetupSchema = z.object({ params: idParam });

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

const salesmanBaseBody = z.object({
  user_id: z.coerce.number().int().positive().optional().nullable(),
  full_name: z.string().trim().min(1).max(150),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable(),
  vehicle_number: z.string().trim().optional().nullable(),
  national_id: z.string().trim().optional().nullable(),
  base_salary: z.coerce.number().min(0).default(0),
  salary_effective_from: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  commission_rule_id: z.coerce.number().int().positive().optional(),
  status: status.default('active'),
  store_id: z.coerce.number().int().positive().optional(),
  joined_at: isoDate.optional().nullable(),
  employment_end_date: isoDate.optional().nullable()
});

const salesmanCreateBody = salesmanBaseBody.extend({
  commission_rule_id: z.coerce.number().int().positive(),
  create_login_user: z.coerce.boolean().default(true),
  password: z.string().min(8)
});

const salesmanBody = salesmanCreateBody.superRefine((body, ctx) => {
  if (!body.password) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['password'],
      message: 'Password is required for the automatically created salesman user.'
    });
  }
});

const assignSchema = z.object({
  params: idParam,
  body: z.object({
    sublocation_id: z.coerce.number().int().positive(),
    assigned_at: z.string().trim().min(1)
  })
});

const replaceAssignmentsSchema = z.object({
  params: idParam,
  body: z.object({
    sublocation_ids: z.array(z.coerce.number().int().positive()).default([]),
    assigned_at: z.string().trim().min(1).optional()
  })
});

const targetAllocation = z.object({
  sublocation_id: z.coerce.number().int().positive(),
  target_amount: z.coerce.number().min(0),
  salesman_ids: z.array(z.coerce.number().int().positive()).default([])
});

const targetBundleBody = z.object({
  location_id: z.coerce.number().int().positive(),
  target_period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  period_start: isoDate,
  target_amount: z.coerce.number().min(0),
  sublocation_targets: z.array(targetAllocation).min(1),
  store_id: z.coerce.number().int().positive().optional()
});

const targetAssignmentBody = z.object({
  target_amount: z.coerce.number().min(0),
  sublocation_targets: z.array(targetAllocation).min(1)
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
  createTargetBundleSchema: z.object({ body: targetBundleBody }),
  createSalesmanSchema: z.object({ body: salesmanBody }),
  createSublocationSchema: z.object({ body: sublocationBody }),
  idSchema: z.object({ params: idParam }),
  listSchema,
  replaceAssignmentsSchema,
  salesmanExportSchema: z.object({
    query: z.object({
      dataset: z.enum(['performance', 'invoices', 'delivered_customers', 'revenue']).default('performance'),
      salesman_id: z.coerce.number().int().positive().optional(),
      salesman_status: status.optional(),
      invoice_status: z.enum(['issued', 'voided', 'cancelled']).optional(),
      search: z.string().trim().max(200).optional(),
      date_from: isoDate.optional(),
      date_to: isoDate.optional(),
      store_id: z.coerce.number().int().positive().optional()
    }).strict().superRefine((value, context) => {
      if (value.date_from && value.date_to && value.date_from > value.date_to) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['date_to'],
          message: 'date_to must be on or after date_from'
        });
      }
    })
  }),
  salesmanSublocationIdSchema: z.object({ params: salesmanIdParam.required({ sublocationId: true }) }),
  targetSetupSchema,
  updateTargetAssignmentSchema: z.object({ params: idParam, body: targetAssignmentBody }),
  updateLocationSchema: updateSchema(locationBody),
  updateSalesmanSchema: updateSchema(salesmanBaseBody),
  updateSublocationSchema: updateSchema(sublocationBody)
};
