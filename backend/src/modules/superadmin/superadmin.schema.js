const { z } = require('zod');

const idParam = z.object({
  id: z.coerce.number().int().positive()
});
const idParamSchema = z.object({
  params: idParam
});
const slugParamSchema = z.object({
  params: z.object({
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })
});

const storeStatus = z.enum(['active', 'inactive', 'suspended']);

const optionalText = z.string().trim().optional().nullable();

const ownerSchema = z.object({
  full_name: z.string().trim().min(1),
  username: optionalText,
  email: z.string().trim().email().optional().nullable(),
  phone: optionalText,
  password: z.string().min(8)
});

const listStoresSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
    status: storeStatus.optional()
  })
});

const createStoreSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(150),
    code: z.string().trim().min(1).max(50),
    slug: z.string().trim().min(1).max(120).optional(),
    status: storeStatus.default('active'),
    contact_name: optionalText,
    phone: optionalText,
    email: z.string().trim().email().optional().nullable(),
    address: optionalText,
    currency_code: z.string().trim().min(1).max(10).default('USD'),
    notes: optionalText,
    vat: z.object({
      enabled: z.coerce.boolean().default(false),
      rate: z.coerce.number().min(0).max(100).default(0)
    }).optional(),
    modules: z.record(z.boolean()).optional(),
    owner: ownerSchema
  }).refine((body) => !body.vat?.enabled || Number(body.vat.rate) > 0, {
    path: ['vat', 'rate'],
    message: 'VAT rate is required when VAT is enabled'
  })
});

const updateStoreSchema = z.object({
  params: idParam,
  body: z
    .object({
      name: z.string().trim().min(1).max(150).optional(),
      code: z.string().trim().min(1).max(50).optional(),
      slug: z.string().trim().min(1).max(120).optional(),
      status: storeStatus.optional(),
      contact_name: optionalText,
      phone: optionalText,
      email: z.string().trim().email().optional().nullable(),
      address: optionalText,
      currency_code: z.string().trim().min(1).max(10).optional(),
      notes: optionalText,
      vat: z.object({
        enabled: z.coerce.boolean().default(false),
        rate: z.coerce.number().min(0).max(100).default(0)
      }).optional(),
      modules: z.record(z.boolean()).optional()
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field is required'
    })
    .refine((body) => !body.vat?.enabled || Number(body.vat.rate) > 0, {
      path: ['vat', 'rate'],
      message: 'VAT rate is required when VAT is enabled'
    })
});

const updateStoreStatusSchema = z.object({
  params: idParam,
  body: z.object({
    status: storeStatus
  })
});

const moduleSchema = z.object({
  module_key: z.string().trim().min(1),
  enabled: z.boolean()
});

const replaceModulesSchema = z.object({
  params: idParam,
  body: z.object({
    modules: z.array(moduleSchema)
  })
});

module.exports = {
  createStoreSchema,
  idParam,
  idParamSchema,
  listStoresSchema,
  replaceModulesSchema,
  slugParamSchema,
  updateStoreSchema,
  updateStoreStatusSchema
};
