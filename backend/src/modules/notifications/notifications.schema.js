const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });

module.exports = {
  createSchema: z.object({
    body: z.object({
      user_id: z.coerce.number().int().positive().optional().nullable(),
      title: z.string().trim().min(1).max(200),
      message: z.string().trim().min(1),
      notification_type: z.enum(['info', 'warning', 'danger', 'success']).default('info'),
      reference_type: z.string().trim().optional().nullable(),
      reference_id: z.coerce.number().int().positive().optional().nullable(),
      store_id: z.coerce.number().int().positive().optional()
    })
  }),
  idSchema: z.object({ params: idParam }),
  listSchema: z.object({
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      search: z.string().trim().optional(),
      user_id: z.coerce.number().int().positive().optional(),
      notification_type: z.enum(['info', 'warning', 'danger', 'success']).optional(),
      reference_type: z.string().trim().optional(),
      reference_id: z.coerce.number().int().positive().optional(),
      store_id: z.coerce.number().int().positive().optional()
    })
  })
};
