const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    login: z.string().trim().min(1, 'Username, email, or phone is required'),
    store_code: z.string().trim().min(1).optional(),
    password: z.string().min(1, 'Password is required')
  })
});

const optionalText = z.string().trim().optional().nullable();

const updateProfileSchema = z.object({
  body: z
    .object({
      full_name: z.string().trim().min(1).max(150).optional(),
      username: optionalText,
      email: z.string().trim().email().optional().nullable(),
      phone: optionalText
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field is required'
    })
});

const updatePasswordSchema = z.object({
  body: z
    .object({
      current_password: z.string().min(1, 'Current password is required'),
      new_password: z.string().min(8, 'New password must be at least 8 characters'),
      confirm_password: z.string().optional()
    })
    .refine(
      (body) => !body.confirm_password || body.confirm_password === body.new_password,
      {
        path: ['confirm_password'],
        message: 'Password confirmation does not match'
      }
    )
});

module.exports = {
  loginSchema,
  updatePasswordSchema,
  updateProfileSchema
};
