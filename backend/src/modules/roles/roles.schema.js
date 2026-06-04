const { z } = require('zod');

const idParam = z.object({
  id: z.coerce.number().int().positive()
});

const roleStatus = z.enum(['active', 'inactive']);

const listRolesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
    status: roleStatus.optional()
  })
});

const createRoleSchema = z.object({
  body: z.object({
      name: z.string().trim().min(1).max(100),
      display_name: z.string().trim().min(1).max(150),
      description: z.string().trim().optional().nullable(),
      status: roleStatus.default('active'),
      store_id: z.coerce.number().int().positive().optional().nullable()
  })
});

const updateRoleSchema = z.object({
  params: idParam,
  body: z
    .object({
      name: z.string().trim().min(1).max(100).optional(),
      display_name: z.string().trim().min(1).max(150).optional(),
      description: z.string().trim().optional().nullable(),
      status: roleStatus.optional(),
      store_id: z.coerce.number().int().positive().optional().nullable()
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field is required'
    })
});

const roleIdSchema = z.object({
  params: idParam
});

const replaceRolePermissionsSchema = z.object({
  params: idParam,
  body: z.object({
    permission_ids: z.array(z.coerce.number().int().positive()).default([])
  })
});

module.exports = {
  createRoleSchema,
  listRolesSchema,
  replaceRolePermissionsSchema,
  roleIdSchema,
  updateRoleSchema
};
