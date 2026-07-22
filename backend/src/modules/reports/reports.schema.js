const { z } = require('zod');

const id = z.coerce.number().int().positive();
const isoDate = z.string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format');

const reportQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.string().trim().max(50).optional(),
  store_id: id.optional(),
  warehouse_id: id.optional(),
  item_id: id.optional(),
  packaging_group_id: id.optional(),
  dispatch_request_id: id.optional(),
  customer_id: id.optional(),
  salesman_id: id.optional(),
  supplier_id: id.optional(),
  location_id: id.optional(),
  sublocation_id: id.optional(),
  item_kind: z.enum(['normal', 'packaging']).optional(),
  stock_mode: z.enum(['carton_weight', 'weight', 'piece']).optional(),
  stock_health: z.enum(['healthy', 'low']).optional(),
  ready_status: z.enum(['full', 'partial', 'depleted', 'cancelled']).optional(),
  component_role: z.enum(['raw_input', 'outer_sellable', 'inner_sellable', 'consumable']).optional(),
  movement_type: z.string().trim().max(50).optional(),
  reference_type: z.string().trim().max(100).optional(),
  source: z.enum(['item', 'ready_stock']).optional(),
  line_type: z.enum(['sale', 'free_gift']).optional(),
  fulfillment_type: z.enum([
    'normal_carton',
    'normal_loose_unit',
    'normal_weight',
    'normal_piece',
    'ready_outer_carton',
    'ready_inner_unit'
  ]).optional(),
  invoice_status: z.enum(['issued', 'voided', 'cancelled']).optional(),
  pos_status: z.enum(['pending', 'accepted', 'cancelled', 'converted', 'rejected']).optional(),
  date_from: isoDate.optional(),
  date_to: isoDate.optional(),
  format: z.enum(['json', 'csv']).optional()
}).strict().superRefine((value, context) => {
  if (value.date_from && value.date_to && value.date_from > value.date_to) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['date_to'],
      message: 'date_to must be on or after date_from'
    });
  }
});

module.exports = {
  reportSchema: z.object({ query: reportQuery })
};
