const { z } = require('zod');

const idParam = z.object({
  id: z.coerce.number().int().positive()
});

const status = z.enum(['active', 'inactive']);
const unitType = z.enum(['weight', 'quantity', 'volume', 'length', 'other']);
const itemType = z.enum(['raw_charcoal', 'packaging', 'finished_product', 'service', 'other']);
const trackingType = z.enum(['stocked', 'non_stocked']);
const movementType = z.enum([
  'purchase_receive',
  'production_consume',
  'production_output',
  'dispatch_reserve',
  'dispatch_unreserve',
  'dispatch_out',
  'dispatch_return',
  'batch_movement',
  'sales_settle',
  'damage',
  'adjustment',
  'transfer_in',
  'transfer_out'
]);

const optionalText = z.string().trim().optional().nullable();
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

const listCategorySchema = z.object({
  query: z.object({
    ...paginationQuery,
    status: status.optional(),
    parent_id: z.coerce.number().int().positive().optional()
  })
});

const createCategorySchema = z.object({
  body: z.object({
    parent_id: z.coerce.number().int().positive().optional().nullable(),
    name: z.string().trim().min(1).max(150),
    code: optionalText,
    description: optionalText,
    store_id: z.coerce.number().int().positive().optional(),
    status: status.default('active')
  })
});

const updateCategorySchema = z.object({
  params: idParam,
  body: createCategorySchema.shape.body.omit({ store_id: true }).partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required'
  })
});

const listUnitSchema = z.object({
  query: z.object(paginationQuery)
});

const createUnitSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    symbol: z.string().trim().min(1).max(30),
    unit_type: unitType.default('quantity'),
    base_unit_id: z.coerce.number().int().positive().optional().nullable(),
    conversion_to_base: z.coerce.number().positive().default(1)
    , store_id: z.coerce.number().int().positive().optional()
  })
});

const updateUnitSchema = z.object({
  params: idParam,
  body: createUnitSchema.shape.body.omit({ store_id: true }).partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required'
  })
});

const listItemSchema = z.object({
  query: z.object({
    ...paginationQuery,
    status: status.optional(),
    item_type: itemType.optional(),
    tracking_type: trackingType.optional(),
    exclude_item_type: itemType.optional(),
    category_id: z.coerce.number().int().positive().optional()
  })
});

const createItemSchema = z.object({
  body: z.object({
    category_id: z.coerce.number().int().positive(),
    base_unit_id: z.coerce.number().int().positive(),
    name: z.string().trim().min(1).max(150),
    code: z.string().trim().min(1).max(80),
    item_type: itemType,
    tracking_type: trackingType.default('stocked'),
    description: optionalText,
    default_cost: nonNegativeNumber.default(0),
    default_selling_price: nonNegativeNumber.optional().nullable(),
    reorder_level: nonNegativeNumber.default(0),
    status: status.default('active'),
    warehouse_id: z.coerce.number().int().positive().optional(),
    initial_quantity: nonNegativeNumber.optional()
    , store_id: z.coerce.number().int().positive().optional()
  })
});

const updateItemSchema = z.object({
  params: idParam,
  body: createItemSchema.shape.body.omit({ store_id: true, warehouse_id: true, initial_quantity: true }).partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required'
  })
});

const listVariantSchema = z.object({
  query: z.object({
    ...paginationQuery,
    status: status.optional(),
    item_id: z.coerce.number().int().positive().optional(),
    item_type: itemType.optional(),
    exclude_item_type: itemType.optional(),
    tracking_type: trackingType.optional()
  })
});

const createVariantSchema = z.object({
  body: z.object({
    item_id: z.coerce.number().int().positive(),
    variant_name: z.string().trim().min(1).max(150),
    sku: z.string().trim().min(1).max(100),
    attributes_json: z.record(z.any()).optional().nullable(),
    cost: nonNegativeNumber.default(0),
    selling_price: nonNegativeNumber.optional().nullable(),
    status: status.default('active'),
    warehouse_id: z.coerce.number().int().positive().optional(),
    initial_quantity: nonNegativeNumber.optional()
    , store_id: z.coerce.number().int().positive().optional()
  })
});

const updateVariantSchema = z.object({
  params: idParam,
  body: createVariantSchema.shape.body.omit({ store_id: true, warehouse_id: true, initial_quantity: true }).partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required'
  })
});

const listWarehouseSchema = z.object({
  query: z.object({
    ...paginationQuery,
    status: status.optional(),
    location_id: z.coerce.number().int().positive().optional()
  })
});

const createWarehouseSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(150),
    code: z.string().trim().min(1).max(50),
    location_id: z.coerce.number().int().positive().optional().nullable(),
    address: optionalText,
    status: status.default('active')
    , store_id: z.coerce.number().int().positive().optional()
  })
});

const updateWarehouseSchema = z.object({
  params: idParam,
  body: createWarehouseSchema.shape.body.partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required'
  })
});

const listStockBalanceSchema = z.object({
  query: z.object({
    ...paginationQuery,
    warehouse_id: z.coerce.number().int().positive().optional(),
    item_id: z.coerce.number().int().positive().optional(),
    item_variant_id: z.coerce.number().int().positive().optional(),
    item_type: itemType.optional()
  })
});

const listStockMovementSchema = z.object({
  query: z.object({
    ...paginationQuery,
    warehouse_id: z.coerce.number().int().positive().optional(),
    item_variant_id: z.coerce.number().int().positive().optional(),
    movement_type: movementType.optional(),
    reference_type: z.string().trim().optional(),
    date_from: z.string().trim().optional(),
    date_to: z.string().trim().optional()
  })
});

const stockAdjustmentSchema = z.object({
  body: z.object({
    target_type: z.enum(['item', 'variant']).default('variant'),
    warehouse_id: z.coerce.number().int().positive(),
    item_id: z.coerce.number().int().positive().optional(),
    item_variant_id: z.coerce.number().int().positive().optional(),
    quantity_change: z.coerce.number().refine((value) => value !== 0, {
      message: 'Quantity change cannot be zero'
    }),
    unit_cost: nonNegativeNumber.optional().nullable(),
    reason: z.string().trim().min(1).max(500)
  }).superRefine((body, ctx) => {
    if (body.target_type === 'item' && !body.item_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['item_id'],
        message: 'Item is required.'
      });
    }

    if (body.target_type === 'variant' && !body.item_variant_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['item_variant_id'],
        message: 'Variant is required.'
      });
    }
  })
});

const listStockAdjustmentSchema = z.object({
  query: z.object({
    ...paginationQuery,
    warehouse_id: z.coerce.number().int().positive().optional(),
    item_type: itemType.optional()
  })
});

module.exports = {
  createCategorySchema,
  createItemSchema,
  createUnitSchema,
  createVariantSchema,
  createWarehouseSchema,
  idSchema,
  listCategorySchema,
  listItemSchema,
  listStockBalanceSchema,
  listStockAdjustmentSchema,
  listStockMovementSchema,
  listUnitSchema,
  listVariantSchema,
  listWarehouseSchema,
  stockAdjustmentSchema,
  updateCategorySchema,
  updateItemSchema,
  updateUnitSchema,
  updateVariantSchema,
  updateWarehouseSchema
};
