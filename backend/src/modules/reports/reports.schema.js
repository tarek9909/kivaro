const { z } = require('zod');

const reportQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().trim().optional(),
  status: z.string().trim().optional(),
  warehouse_id: z.coerce.number().int().positive().optional(),
  item_id: z.coerce.number().int().positive().optional(),
  item_variant_id: z.coerce.number().int().positive().optional(),
  store_id: z.coerce.number().int().positive().optional(),
  item_type: z.string().trim().optional(),
  packaging_group_id: z.coerce.number().int().positive().optional(),
  production_batch_id: z.coerce.number().int().positive().optional(),
  supplier_id: z.coerce.number().int().positive().optional(),
  location_id: z.coerce.number().int().positive().optional(),
  sublocation_id: z.coerce.number().int().positive().optional(),
  movement_type: z.string().trim().optional(),
  reference_type: z.string().trim().optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  salesman_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
  format: z.enum(['json', 'csv']).optional()
});

module.exports = {
  reportSchema: z.object({ query: reportQuery })
};
