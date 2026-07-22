const { z } = require('zod');

const isoDate = z.string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected date in YYYY-MM-DD format');

const dashboardQuery = z.object({
  store_id: z.coerce.number().int().positive().optional(),
  date_from: isoDate.optional(),
  date_to: isoDate.optional()
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
  dashboardSchema: z.object({ query: dashboardQuery })
};
