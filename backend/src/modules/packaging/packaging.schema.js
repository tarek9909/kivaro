const { z } = require('zod');

const idParam = z.object({ id: z.coerce.number().int().positive() });
const status = z.enum(['active', 'inactive']);
const componentRole = z.enum(['outer_sellable', 'inner_sellable', 'consumable']);
const saleEntryType = z.enum([
  'normal_carton',
  'normal_loose_unit',
  'normal_weight',
  'normal_piece',
  'ready_outer_carton',
  'ready_inner_unit'
]);
const optionalText = z.string().trim().optional().nullable();
const pageQuery = {
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  store_id: z.coerce.number().int().positive().optional(),
  allRows: z.coerce.boolean().optional()
};

const componentBody = z.object({
  item_id: z.coerce.number().int().positive(),
  component_role: componentRole,
  quantity_per_outer: z.coerce.number().positive(),
  sort_order: z.coerce.number().int().min(0).optional(),
  notes: optionalText
});

const groupBody = z.object({
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().min(1).max(80),
  input_item_id: z.coerce.number().int().positive(),
  default_warehouse_id: z.coerce.number().int().positive().optional().nullable(),
  description: optionalText,
  status: status.default('active'),
  components: z.array(componentBody).min(2),
  store_id: z.coerce.number().int().positive().optional()
});

const previewBody = z.object({
  warehouse_id: z.coerce.number().int().positive().optional(),
  output_carton_count: z.coerce.number().int().positive(),
  notes: optionalText
});

const catalogBody = z.object({
  entry_type: saleEntryType,
  item_id: z.coerce.number().int().positive().optional().nullable(),
  packaging_group_id: z.coerce.number().int().positive().optional().nullable(),
  display_name: z.string().trim().min(1).max(200).optional(),
  unit_label: z.string().trim().min(1).max(40).optional(),
  default_price: z.coerce.number().min(0),
  vat_rate: z.coerce.number().min(0).max(100).optional(),
  is_pos_active: z.coerce.boolean().default(false),
  status: status.default('active'),
  store_id: z.coerce.number().int().positive().optional()
});

module.exports = {
  catalogCreateSchema: z.object({ body: catalogBody }),
  catalogUpdateSchema: z.object({
    params: idParam,
    body: catalogBody.omit({ store_id: true }).partial().refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field is required'
    })
  }),
  completeSchema: z.object({ params: idParam, body: previewBody }),
  createGroupSchema: z.object({ body: groupBody }),
  idSchema: z.object({ params: idParam }),
  listCatalogSchema: z.object({
    query: z.object({
      ...pageQuery,
      entry_type: saleEntryType.optional(),
      item_id: z.coerce.number().int().positive().optional(),
      packaging_group_id: z.coerce.number().int().positive().optional(),
      warehouse_id: z.coerce.number().int().positive().optional(),
      is_pos_active: z.coerce.boolean().optional(),
      status: status.optional()
    })
  }),
  listGroupSchema: z.object({
    query: z.object({
      ...pageQuery,
      input_item_id: z.coerce.number().int().positive().optional(),
      status: status.optional()
    })
  }),
  listOperationSchema: z.object({
    query: z.object({
      ...pageQuery,
      packaging_group_id: z.coerce.number().int().positive().optional(),
      warehouse_id: z.coerce.number().int().positive().optional(),
      status: z.enum(['completed', 'cancelled']).optional()
    })
  }),
  listReadyStockSchema: z.object({
    query: z.object({
      ...pageQuery,
      warehouse_id: z.coerce.number().int().positive().optional(),
      packaging_group_id: z.coerce.number().int().positive().optional(),
      packaging_operation_id: z.coerce.number().int().positive().optional(),
      status: z.enum(['full', 'partial', 'depleted', 'cancelled']).optional()
    })
  }),
  previewSchema: z.object({ params: idParam, body: previewBody }),
  replaceComponentsSchema: z.object({
    params: idParam,
    body: z.object({ components: z.array(componentBody).min(2) })
  }),
  updateGroupSchema: z.object({
    params: idParam,
    body: groupBody.omit({ store_id: true }).partial().refine((body) => Object.keys(body).length > 0, {
      message: 'At least one field is required'
    })
  })
};
