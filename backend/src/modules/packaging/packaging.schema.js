const { z } = require('zod');

const idParam = z.object({
  id: z.coerce.number().int().positive()
});

const status = z.enum(['active', 'inactive']);
const packagingLevel = z.enum(['category', 'item', 'sub_item', 'sub_sub_item']);
const optionalText = z.string().trim().optional().nullable();
const positiveNumber = z.coerce.number().positive();
const nonNegativeNumber = z.coerce.number().min(0);

const paginationQuery = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  store_id: z.coerce.number().int().positive().optional()
};

const idSchema = z.object({
  params: idParam
});

const listGroupSchema = z.object({
  query: z.object({
    ...paginationQuery,
    status: status.optional(),
    charcoal_variant_id: z.coerce.number().int().positive().optional()
  })
});

const createGroupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(150),
    code: z.string().trim().min(1).max(80),
    charcoal_variant_id: z.coerce.number().int().positive().optional().nullable(),
    default_warehouse_id: z.coerce.number().int().positive().optional().nullable(),
    description: optionalText,
    status: status.default('active'),
    store_id: z.coerce.number().int().positive().optional()
  })
});

const updateGroupSchema = z.object({
  params: idParam,
  body: createGroupSchema.shape.body.omit({ store_id: true }).partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required'
  })
});

const componentBody = z.object({
  parent_component_id: z.coerce.number().int().positive().optional().nullable(),
  level_key: packagingLevel,
  item_variant_id: z.coerce.number().int().positive(),
  unit_symbol: z.literal('pc').default('pc'),
  quantity_per_parent: positiveNumber.optional().nullable(),
  capacity_kg: nonNegativeNumber.optional().nullable(),
  sort_order: z.coerce.number().int().min(0).default(0),
  notes: optionalText
});

const createComponentSchema = z.object({
  params: idParam,
  body: componentBody
});

const updateComponentSchema = z.object({
  params: idParam,
  body: componentBody.partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required'
  })
});

const calculateSchema = z.object({
  params: idParam,
  body: z.object({
    charcoal_quantity_kg: positiveNumber,
    warehouse_id: z.coerce.number().int().positive().optional().nullable()
  })
});

const listAssignmentSchema = z.object({
  query: z.object({
    ...paginationQuery,
    status: z.enum(['calculated', 'consumed', 'cancelled']).optional(),
    packaging_group_id: z.coerce.number().int().positive().optional(),
    warehouse_id: z.coerce.number().int().positive().optional(),
    charcoal_variant_id: z.coerce.number().int().positive().optional(),
    production_batch_id: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional()
  })
});

const createAssignmentSchema = z.object({
  body: z.object({
    packaging_group_id: z.coerce.number().int().positive(),
    warehouse_id: z.coerce.number().int().positive(),
    charcoal_variant_id: z.coerce.number().int().positive(),
    output_item_variant_id: z.coerce.number().int().positive(),
    charcoal_quantity_kg: positiveNumber,
    production_batch_id: z.coerce.number().int().positive().optional().nullable(),
    notes: optionalText,
    store_id: z.coerce.number().int().positive().optional()
  })
});

const consumeAssignmentSchema = z.object({
  params: idParam,
  body: z.object({
    notes: optionalText
  }).optional().default({})
});

module.exports = {
  calculateSchema,
  consumeAssignmentSchema,
  createAssignmentSchema,
  createComponentSchema,
  createGroupSchema,
  idSchema,
  listAssignmentSchema,
  listGroupSchema,
  updateComponentSchema,
  updateGroupSchema
};
