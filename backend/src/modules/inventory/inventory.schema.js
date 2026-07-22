const { z } = require('zod');

const idParam = z.object({
  id: z.coerce.number().int().positive()
});

const status = z.enum(['active', 'inactive']);
const unitType = z.enum(['weight', 'quantity', 'volume', 'length', 'other']);
const itemKind = z.enum(['normal', 'packaging']);
const stockMode = z.enum(['carton_weight', 'weight', 'piece']);
const nonNegativeNumber = z.coerce.number().min(0);
const positiveNumber = z.coerce.number().positive();
const optionalText = z.string().trim().optional().nullable();

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
  body: createCategorySchema.shape.body.omit({ store_id: true }).partial().refine(
    (body) => Object.keys(body).length > 0,
    { message: 'At least one field is required' }
  )
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
    conversion_to_base: z.coerce.number().positive().default(1),
    store_id: z.coerce.number().int().positive().optional()
  })
});

const updateUnitSchema = z.object({
  params: idParam,
  body: createUnitSchema.shape.body.omit({ store_id: true }).partial().refine(
    (body) => Object.keys(body).length > 0,
    { message: 'At least one field is required' }
  )
});

function itemConfigurationIssues(data, ctx, { partial = false } = {}) {
  const kind = data.item_kind;
  const mode = data.stock_mode;

  if (!partial && !kind) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['item_kind'], message: 'Item kind is required' });
  }
  if (!partial && !mode) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['stock_mode'], message: 'Stock mode is required' });
  }

  if (kind === 'packaging' && mode && mode !== 'piece') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['stock_mode'],
      message: 'Packaging items must use piece stock mode'
    });
  }

  if (mode === 'carton_weight') {
    if (!data.kg_per_carton || Number(data.kg_per_carton) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['kg_per_carton'],
        message: 'Carton-weight items require kg per carton'
      });
    }
    if (!data.loose_units_per_carton || !Number.isInteger(Number(data.loose_units_per_carton)) || Number(data.loose_units_per_carton) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['loose_units_per_carton'],
        message: 'Carton-weight items require a whole-number loose unit count per carton'
      });
    }
  }

  if (kind === 'packaging' && data.max_content_weight_kg !== undefined && Number(data.max_content_weight_kg) < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['max_content_weight_kg'],
      message: 'Packaging capacity cannot be negative'
    });
  }
}

const itemFields = z.object({
  category_id: z.coerce.number().int().positive(),
  base_unit_id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).max(150),
  code: z.string().trim().min(1).max(80),
  item_kind: itemKind,
  stock_mode: stockMode,
  kg_per_carton: positiveNumber.optional().nullable(),
  loose_units_per_carton: z.coerce.number().int().positive().optional().nullable(),
  max_content_weight_kg: nonNegativeNumber.optional().nullable(),
  description: optionalText,
  default_cost: nonNegativeNumber.default(0),
  default_selling_price: nonNegativeNumber.optional().nullable(),
  carton_selling_price: nonNegativeNumber.optional().nullable(),
  loose_unit_selling_price: nonNegativeNumber.optional().nullable(),
  reorder_level: nonNegativeNumber.default(0),
  status: status.default('active'),
  warehouse_id: z.coerce.number().int().positive().optional(),
  initial_quantity: nonNegativeNumber.optional(),
  initial_unit_cost: nonNegativeNumber.optional().nullable(),
  initial_cartons: z.coerce.number().int().nonnegative().optional(),
  initial_cost_per_carton: nonNegativeNumber.optional().nullable(),
  store_id: z.coerce.number().int().positive().optional()
});

const itemBody = itemFields.superRefine((data, ctx) => itemConfigurationIssues(data, ctx));

const createItemSchema = z.object({ body: itemBody });

const updateItemSchema = z.object({
  params: idParam,
  body: itemFields.omit({
    store_id: true,
    warehouse_id: true,
    initial_quantity: true,
    initial_unit_cost: true,
    initial_cartons: true,
    initial_cost_per_carton: true
  }).partial().superRefine((data, ctx) => itemConfigurationIssues(data, ctx, { partial: true })).refine(
    (body) => Object.keys(body).length > 0,
    { message: 'At least one field is required' }
  )
});

const listItemSchema = z.object({
  query: z.object({
    ...paginationQuery,
    status: status.optional(),
    item_kind: itemKind.optional(),
    stock_mode: stockMode.optional(),
    category_id: z.coerce.number().int().positive().optional(),
    low_stock: z.coerce.boolean().optional()
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
    status: status.default('active'),
    store_id: z.coerce.number().int().positive().optional()
  })
});

const updateWarehouseSchema = z.object({
  params: idParam,
  body: createWarehouseSchema.shape.body.omit({ store_id: true }).partial().refine(
    (body) => Object.keys(body).length > 0,
    { message: 'At least one field is required' }
  )
});

const listStockBalanceSchema = z.object({
  query: z.object({
    ...paginationQuery,
    warehouse_id: z.coerce.number().int().positive().optional(),
    item_id: z.coerce.number().int().positive().optional(),
    item_kind: itemKind.optional(),
    stock_mode: stockMode.optional(),
    low_stock: z.coerce.boolean().optional()
  })
});

const listStockMovementSchema = z.object({
  query: z.object({
    ...paginationQuery,
    warehouse_id: z.coerce.number().int().positive().optional(),
    item_id: z.coerce.number().int().positive().optional(),
    item_kind: itemKind.optional(),
    movement_type: z.string().trim().min(1).max(50).optional(),
    reference_type: z.string().trim().optional(),
    date_from: z.string().trim().optional(),
    date_to: z.string().trim().optional()
  })
});

const listCartonLotSchema = z.object({
  query: z.object({
    ...paginationQuery,
    warehouse_id: z.coerce.number().int().positive().optional(),
    item_id: z.coerce.number().int().positive().optional(),
    source_type: z.string().trim().max(100).optional()
  })
});

const listOpenCartonShelfSchema = z.object({
  query: z.object({
    ...paginationQuery,
    warehouse_id: z.coerce.number().int().positive().optional(),
    item_id: z.coerce.number().int().positive().optional(),
    status: z.enum(['open', 'closed']).optional()
  })
});

const stockReceiptSchema = z.object({
  body: z.object({
    warehouse_id: z.coerce.number().int().positive(),
    item_id: z.coerce.number().int().positive(),
    quantity: positiveNumber.optional(),
    carton_count: z.coerce.number().int().positive().optional(),
    unit_cost: nonNegativeNumber.optional().nullable(),
    cost_per_carton: nonNegativeNumber.optional().nullable(),
    notes: optionalText
  }).superRefine((body, ctx) => {
    if (!body.quantity && !body.carton_count) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantity'], message: 'Quantity or carton count is required' });
    }
    if (body.quantity && body.carton_count) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['carton_count'], message: 'Send quantity or carton count, not both' });
    }
  })
});

const stockAdjustmentSchema = z.object({
  body: z.object({
    warehouse_id: z.coerce.number().int().positive(),
    item_id: z.coerce.number().int().positive(),
    quantity_change: z.coerce.number().optional(),
    carton_count_change: z.coerce.number().int().optional(),
    loose_units_change: z.coerce.number().int().optional(),
    unit_cost: nonNegativeNumber.optional().nullable(),
    cost_per_carton: nonNegativeNumber.optional().nullable(),
    reason: z.string().trim().min(1).max(500)
  }).superRefine((body, ctx) => {
    const supplied = ['quantity_change', 'carton_count_change', 'loose_units_change']
      .filter((field) => body[field] !== undefined);
    if (supplied.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity_change'],
        message: 'Send exactly one adjustment quantity'
      });
    }
    for (const field of supplied) {
      if (Number(body[field]) === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'Quantity change cannot be zero' });
      }
    }
  })
});

module.exports = {
  createCategorySchema,
  createItemSchema,
  createUnitSchema,
  createWarehouseSchema,
  idSchema,
  listCartonLotSchema,
  listCategorySchema,
  listItemSchema,
  listOpenCartonShelfSchema,
  listStockBalanceSchema,
  listStockMovementSchema,
  listUnitSchema,
  listWarehouseSchema,
  stockAdjustmentSchema,
  stockReceiptSchema,
  updateCategorySchema,
  updateItemSchema,
  updateUnitSchema,
  updateWarehouseSchema
};
