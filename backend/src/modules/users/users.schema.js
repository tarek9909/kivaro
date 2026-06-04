const { z } = require('zod');

const idParam = z.object({
  id: z.coerce.number().int().positive()
});

const userStatus = z.enum(['active', 'inactive', 'suspended']);

const optionalText = z
  .string()
  .trim()
  .min(1)
  .optional()
  .nullable();

const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
    status: userStatus.optional(),
    role_id: z.coerce.number().int().positive().optional(),
    store_id: z.coerce.number().int().positive().optional()
  })
});

const createUserSchema = z.object({
  body: z.object({
    role_id: z.coerce.number().int().positive(),
    store_id: z.coerce.number().int().positive().optional(),
    full_name: z.string().trim().min(1),
    username: optionalText,
    email: z.string().trim().email().optional().nullable(),
    phone: optionalText,
    password: z.string().min(8),
    status: userStatus.default('active')
  })
});

const updateUserSchema = z.object({
  params: idParam,
  body: z
    .object({
      role_id: z.coerce.number().int().positive().optional(),
      full_name: z.string().trim().min(1).optional(),
      username: optionalText,
      email: z.string().trim().email().optional().nullable(),
      phone: optionalText,
      password: z.string().min(8).optional(),
      status: userStatus.optional()
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field is required'
    })
});

const updateUserStatusSchema = z.object({
  params: idParam,
  body: z.object({
    status: userStatus
  })
});

const userIdSchema = z.object({
  params: idParam
});

module.exports = {
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
  updateUserStatusSchema,
  userIdSchema
};
