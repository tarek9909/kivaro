const {
  authRequest,
  closeIntegrationPool,
  createPackagingFixture,
  dbQuery,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('flat packaging and ready-stock integration', () => {
  let dbReady = false;
  let token;

  beforeAll(async () => {
    dbReady = await prepareIntegrationDb();
    if (dbReady) token = await loginOwner();
  });

  afterAll(async () => {
    await closeIntegrationPool();
  });

  test('previews and atomically completes a 15 x 0.4 kg flat packaging group', async () => {
    if (!dbReady) return;

    const fixture = await createPackagingFixture(token, 'flat_packaging');
    const previewResponse = await authRequest(token)
      .post(`/api/packaging-groups/${fixture.group.id}/preview`)
      .send({ warehouse_id: fixture.warehouse.id, output_carton_count: 2 })
      .expect(200);
    const preview = previewResponse.body.data.preview;

    expect(preview.group_capacity_kg).toBe('6.0000');
    expect(preview.input.raw_quantity_kg).toBe('12.0000');
    expect(preview.input.loose_units_required).toBe('30.0000');
    expect(preview.output.total_inner_quantity).toBe('30.0000');
    expect(preview.can_complete).toBe(true);

    const completedResponse = await authRequest(token)
      .post(`/api/packaging-groups/${fixture.group.id}/complete`)
      .send({ warehouse_id: fixture.warehouse.id, output_carton_count: 2, notes: 'Integration run' })
      .expect(201);

    const operation = completedResponse.body.data.packaging_operation;
    expect(operation.status).toBe('completed');
    expect(completedResponse.body.data.ready_stock_container_ids).toHaveLength(2);

    const containers = await dbQuery(
      `SELECT initial_inner_quantity, remaining_inner_quantity, capacity_kg, status
       FROM ready_stock_containers
       WHERE packaging_operation_id = ?
       ORDER BY id ASC`,
      [operation.id]
    );
    expect(containers).toEqual([
      expect.objectContaining({
        initial_inner_quantity: 15,
        remaining_inner_quantity: 15,
        capacity_kg: '6.0000',
        status: 'full'
      }),
      expect.objectContaining({
        initial_inner_quantity: 15,
        remaining_inner_quantity: 15,
        capacity_kg: '6.0000',
        status: 'full'
      })
    ]);

    const movements = await dbQuery(
      `SELECT movement_type
       FROM item_stock_movements
       WHERE reference_type = 'packaging_operation' AND reference_id = ?
       ORDER BY id ASC`,
      [operation.id]
    );
    expect(movements.map((row) => row.movement_type)).toEqual(
      expect.arrayContaining(['packaging_consume'])
    );
  });
});
