const { z } = require('zod');

const settingKeySchema = z.object({
  key: z.string().trim().min(1).max(150)
});

const updateCompanyProfileSchema = z.object({
  body: z
    .object({
      company_name: z.string().trim().min(1).max(150).optional(),
      phone: z.string().trim().optional().nullable(),
      email: z.string().trim().email().optional().nullable(),
      address: z.string().trim().optional().nullable(),
      logo_url: z.string().trim().url().optional().nullable(),
      currency_code: z.string().trim().min(1).max(10).optional(),
      tax_number: z.string().trim().optional().nullable()
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field is required'
    })
});

const updateSettingSchema = z.object({
  params: settingKeySchema,
  body: z.object({
    setting_value: z.any().optional().nullable(),
    value_type: z.enum(['string', 'number', 'boolean', 'json']).default('string'),
    description: z.string().trim().optional().nullable()
  })
});

const updateVatSettingsSchema = z.object({
  body: z.object({
    enabled: z.coerce.boolean(),
    rate: z.coerce.number().min(0).max(100),
    store_id: z.coerce.number().int().positive().optional()
  })
});

module.exports = {
  updateCompanyProfileSchema,
  updateVatSettingsSchema,
  updateSettingSchema
};
