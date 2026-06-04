const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const listSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    search: z.string().trim().optional(),
    status: z.string().trim().optional(),
    is_active: z.coerce.number().int().min(0).max(1).optional(),
    warehouse_id: z.coerce.number().int().positive().optional(),
    packaging_configuration_id: z.coerce.number().int().positive().optional(),
    packaging_group_id: z.coerce.number().int().positive().optional(),
    output_item_variant_id: z.coerce.number().int().positive().optional(),
    item_variant_id: z.coerce.number().int().positive().optional(),
    store_id: z.coerce.number().int().positive().optional()
  })
});

const configBody = z.object({
  config_name: z.string().trim().min(1).max(150),
  output_item_variant_id: z.coerce.number().int().positive(),
  charcoal_variant_id: z.coerce.number().int().positive().optional().nullable(),
  packaging_type: z.enum(['carton_with_packages', 'carton_direct', 'loose_shawl', 'custom']),
  charcoal_quantity_per_output: z.coerce.number().min(0).default(0),
  charcoal_unit_id: z.coerce.number().int().positive().optional().nullable(),
  packages_per_carton: z.coerce.number().int().positive().optional().nullable(),
  is_active: z.coerce.number().int().min(0).max(1).default(1),
  notes: z.string().trim().optional().nullable(),
  store_id: z.coerce.number().int().positive().optional()
});

const componentBody = z.object({
  component_item_variant_id: z.coerce.number().int().positive(),
  quantity_per_output: z.coerce.number().positive(),
  unit_id: z.coerce.number().int().positive(),
  component_role: z.enum(['charcoal', 'carton', 'package_bag', 'sticker', 'other']),
  waste_percentage: z.coerce.number().min(0).default(0)
});

const batchBody = z.object({
  batch_number: z.string().trim().optional(),
  packaging_configuration_id: z.coerce.number().int().positive().optional().nullable(),
  packaging_group_id: z.coerce.number().int().positive().optional().nullable(),
  warehouse_id: z.coerce.number().int().positive(),
  charcoal_variant_id: z.coerce.number().int().positive().optional().nullable(),
  output_item_variant_id: z.coerce.number().int().positive().optional(),
  planned_quantity: z.coerce.number().positive(),
  notes: z.string().trim().optional().nullable(),
  store_id: z.coerce.number().int().positive().optional()
}).refine((body) => Boolean(body.packaging_configuration_id) !== Boolean(body.packaging_group_id), {
  message: 'Select either a packaging group or a production recipe',
  path: ['packaging_group_id']
}).refine((body) => Boolean(body.packaging_configuration_id) || Boolean(body.output_item_variant_id), {
  message: 'Output variant is required for packaging group production',
  path: ['output_item_variant_id']
});

module.exports = {
  calculateCostSchema: z.object({
    params: idParam,
    body: z.object({ warehouse_id: z.coerce.number().int().positive().optional().nullable() }).default({})
  }),
  completeBatchSchema: z.object({
    params: idParam,
    body: z.object({
      produced_quantity: z.coerce.number().positive().optional(),
      notes: z.string().trim().optional().nullable()
    }).default({})
  }),
  configCreateSchema: z.object({ body: configBody }),
  configUpdateSchema: z.object({ params: idParam, body: configBody.partial() }),
  componentCreateSchema: z.object({ params: idParam, body: componentBody }),
  componentUpdateSchema: z.object({ params: idParam, body: componentBody.partial() }),
  batchCreateSchema: z.object({ body: batchBody }),
  idSchema: z.object({ params: idParam }),
  listSchema
};
