const { z } = require('zod');

const listPermissionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
    module: z.string().trim().optional()
  })
});

module.exports = {
  listPermissionsSchema
};
