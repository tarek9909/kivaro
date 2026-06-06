const {
  authRequest,
  closeIntegrationPool,
  createInventoryFixture,
  dbQuery,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('packaging assignment stock flow', () => {
  let dbReady = false;
  let token;

  beforeAll(async () => {
    dbReady = await prepareIntegrationDb();
    if (dbReady) {
      token = await loginOwner();
    }
  });

  afterAll(async () => {
    await closeIntegrationPool();
  });

  test('packaging assignment validates and consumes raw charcoal stock immediately', async () => {
    if (!dbReady) return;

    const raw = await createInventoryFixture(token, 'packaging_stock_raw');
    const [group] = await dbQuery(
      "SELECT id FROM packaging_groups WHERE code = 'PKG_GROUP_STARTER_10KG_400G' LIMIT 1"
    );
    const packagingVariants = await dbQuery(
      `SELECT sku, id
       FROM item_variants
       WHERE sku IN ('PKG-CARTON-10KG', 'PKG-BAG-400G', 'PKG-STICKER-STARTER')`
    );
    const variantBySku = Object.fromEntries(packagingVariants.map((variant) => [variant.sku, variant.id]));

    await dbQuery(
      `INSERT INTO stock_balances (
        store_id, warehouse_id, item_variant_id, quantity_on_hand, quantity_reserved, average_cost
      ) VALUES (?, ?, ?, ?, 0, ?)
      ON DUPLICATE KEY UPDATE quantity_on_hand = VALUES(quantity_on_hand), quantity_reserved = 0, average_cost = VALUES(average_cost)`,
      [raw.variant.store_id, raw.warehouse.id, raw.variant.id, 50, 2]
    );

    for (const [variantId, quantity, unitCost] of [
      [variantBySku['PKG-CARTON-10KG'], 10, 0.5],
      [variantBySku['PKG-BAG-400G'], 200, 0.05],
      [variantBySku['PKG-STICKER-STARTER'], 200, 0.01]
    ]) {
      await authRequest(token)
        .post('/api/stock-adjustments')
        .send({
          warehouse_id: raw.warehouse.id,
          item_variant_id: variantId,
          quantity_change: quantity,
          unit_cost: unitCost,
          reason: 'Packaging assignment opening stock'
        })
        .expect(201);
    }

    await authRequest(token)
      .post('/api/packaging-assignments')
      .send({
        packaging_group_id: group.id,
        warehouse_id: raw.warehouse.id,
        charcoal_variant_id: raw.variant.id,
        charcoal_quantity_kg: 70
      })
      .expect(409);

    const assignmentResponse = await authRequest(token)
      .post('/api/packaging-assignments')
      .send({
        packaging_group_id: group.id,
        warehouse_id: raw.warehouse.id,
        charcoal_variant_id: raw.variant.id,
        charcoal_quantity_kg: 40
      })
      .expect(201);

    const assignment = assignmentResponse.body.data.packaging_assignment;
    expect(assignment.status).toBe('consumed');
    expect(Number(assignment.produced_quantity)).toBe(4);

    const [rawBalance] = await dbQuery(
      `SELECT quantity_on_hand
       FROM stock_balances
       WHERE warehouse_id = ? AND item_variant_id = ?`,
      [raw.warehouse.id, raw.variant.id]
    );
    expect(Number(rawBalance.quantity_on_hand)).toBe(10);

    const movements = await dbQuery(
      `SELECT movement_type, reference_type, quantity_change
       FROM stock_movements
       WHERE warehouse_id = ? AND item_variant_id = ?
       ORDER BY id ASC`,
      [raw.warehouse.id, raw.variant.id]
    );
    expect(movements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          movement_type: 'production_consume',
          reference_type: 'packaging_assignment_raw',
          quantity_change: '-40.0000'
        })
      ])
    );
  });
});
