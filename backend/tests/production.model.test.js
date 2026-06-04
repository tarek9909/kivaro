jest.mock('../src/bootstrap/db', () => ({
  query: jest.fn()
}));

const db = require('../src/bootstrap/db');
const model = require('../src/modules/production/production.model');

describe('production model batch listing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('includes packaging assignment batches in the production batch list', async () => {
    db.query
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          id: 11,
          row_key: 'packaging-11',
          source_type: 'packaging_assignment',
          packaging_assignment_id: 11,
          batch_number: 'PA-11',
          packaging_group_name: 'Retail carton group',
          planned_quantity: '300.0000',
          produced_quantity: '50.0000',
          available_quantity: '50.0000',
          status: 'batched'
        }
      ]);

    const result = await model.listProductionBatches({ page: 1, limit: 20, status: 'batched' });

    expect(result.rows).toEqual([
      expect.objectContaining({
        row_key: 'packaging-11',
        source_type: 'packaging_assignment',
        produced_quantity: '50.0000'
      })
    ]);
    expect(db.query.mock.calls[0][0]).toContain('packaging_group_assignments');
    expect(db.query.mock.calls[0][0]).toContain("pga.status IN ('batched', 'consumed')");
    expect(result.meta.total).toBe(1);
  });
});
