const { z } = require('zod');

module.exports = {
  idSchema: z.object({
    params: z.object({ id: z.coerce.number().int().positive() })
  }),
  listSchema: z.object({
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      search: z.string().trim().optional(),
      user_id: z.coerce.number().int().positive().optional(),
      module: z.string().trim().optional(),
      action: z.string().trim().optional(),
      table_name: z.string().trim().optional(),
      record_id: z.coerce.number().int().positive().optional(),
      date_from: z.string().trim().optional(),
      date_to: z.string().trim().optional(),
      store_id: z.coerce.number().int().positive().optional()
    })
  })
};
