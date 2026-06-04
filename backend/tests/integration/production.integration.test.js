const {
  authRequest,
  closeIntegrationPool,
  createInventoryFixture,
  dbQuery,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('production integration', () => {
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

  test('completing production consumes components and outputs finished stock atomically', async () => {
    if (!dbReady) return;

    const raw = await createInventoryFixture(token, 'production_raw');

    const finishedItemResponse = await authRequest(token)
      .post('/api/items')
      .send({
        category_id: 3,
        base_unit_id: 1,
        name: 'Integration Finished Product',
        code: `FIN_${Date.now()}`,
        item_type: 'finished_product',
        tracking_type: 'stocked',
        default_cost: 0,
        default_selling_price: 10,
        reorder_level: 0
      })
      .expect(201);

    const finishedVariantResponse = await authRequest(token)
      .post('/api/item-variants')
      .send({
        item_id: finishedItemResponse.body.data.item.id,
        variant_name: 'Finished Default',
        sku: `FIN_SKU_${Date.now()}`,
        cost: 0,
        selling_price: 10
      })
      .expect(201);

    await authRequest(token)
      .post('/api/stock-adjustments')
      .send({
        warehouse_id: raw.warehouse.id,
        item_variant_id: raw.variant.id,
        quantity_change: 20,
        unit_cost: 2,
        reason: 'Production component stock'
      })
      .expect(201);

    const configResponse = await authRequest(token)
      .post('/api/packaging-configurations')
      .send({
        config_name: 'Integration Production Config',
        output_item_variant_id: finishedVariantResponse.body.data.item_variant.id,
        packaging_type: 'custom',
        charcoal_quantity_per_output: 0
      })
      .expect(201);

    await authRequest(token)
      .post(`/api/packaging-configurations/${configResponse.body.data.packaging_configuration.id}/components`)
      .send({
        component_item_variant_id: raw.variant.id,
        quantity_per_output: 2,
        unit_id: 1,
        component_role: 'charcoal',
        waste_percentage: 0
      })
      .expect(201);

    const batchResponse = await authRequest(token)
      .post('/api/production-batches')
      .send({
        packaging_configuration_id: configResponse.body.data.packaging_configuration.id,
        warehouse_id: raw.warehouse.id,
        planned_quantity: 3
      })
      .expect(201);

    await authRequest(token)
      .post(`/api/production-batches/${batchResponse.body.data.production_batch.id}/complete`)
      .send({ produced_quantity: 3, notes: 'Integration completion' })
      .expect(200);

    const movements = await dbQuery(
      `SELECT movement_type
       FROM stock_movements
       WHERE reference_type = 'production_batch'
       ORDER BY id ASC`
    );

    expect(movements.map((movement) => movement.movement_type)).toEqual(
      expect.arrayContaining(['production_consume', 'production_output'])
    );
  });

  test('configured charcoal fields are consumed as implicit production components', async () => {
    if (!dbReady) return;

    const raw = await createInventoryFixture(token, 'production_implicit_raw');

    const finishedItemResponse = await authRequest(token)
      .post('/api/items')
      .send({
        category_id: 3,
        base_unit_id: 1,
        name: 'Implicit Charcoal Finished Product',
        code: `FIN_IMPLICIT_${Date.now()}`,
        item_type: 'finished_product',
        tracking_type: 'stocked',
        default_cost: 0,
        default_selling_price: 10,
        reorder_level: 0
      })
      .expect(201);

    const finishedVariantResponse = await authRequest(token)
      .post('/api/item-variants')
      .send({
        item_id: finishedItemResponse.body.data.item.id,
        variant_name: 'Finished Default',
        sku: `FIN_IMPLICIT_SKU_${Date.now()}`,
        cost: 0,
        selling_price: 10
      })
      .expect(201);

    await authRequest(token)
      .post('/api/stock-adjustments')
      .send({
        warehouse_id: raw.warehouse.id,
        item_variant_id: raw.variant.id,
        quantity_change: 20,
        unit_cost: 2,
        reason: 'Implicit charcoal stock'
      })
      .expect(201);

    const configResponse = await authRequest(token)
      .post('/api/packaging-configurations')
      .send({
        config_name: 'Implicit Charcoal Config',
        output_item_variant_id: finishedVariantResponse.body.data.item_variant.id,
        charcoal_variant_id: raw.variant.id,
        charcoal_quantity_per_output: 2,
        charcoal_unit_id: 1,
        packaging_type: 'carton_direct'
      })
      .expect(201);

    const costResponse = await authRequest(token)
      .post(`/api/packaging-configurations/${configResponse.body.data.packaging_configuration.id}/calculate-cost`)
      .send({ warehouse_id: raw.warehouse.id })
      .expect(200);
    expect(Number(costResponse.body.data.cost.calculated_cost)).toBe(4);

    const batchResponse = await authRequest(token)
      .post('/api/production-batches')
      .send({
        packaging_configuration_id: configResponse.body.data.packaging_configuration.id,
        warehouse_id: raw.warehouse.id,
        planned_quantity: 3
      })
      .expect(201);

    await authRequest(token)
      .post(`/api/production-batches/${batchResponse.body.data.production_batch.id}/complete`)
      .send({ produced_quantity: 3 })
      .expect(200);

    const [balance] = await dbQuery(
      'SELECT quantity_on_hand FROM stock_balances WHERE warehouse_id = ? AND item_variant_id = ?',
      [raw.warehouse.id, raw.variant.id]
    );
    expect(Number(balance.quantity_on_hand)).toBe(14);
  });

  test('production can consume packaging group requirements directly', async () => {
    if (!dbReady) return;

    const raw = await createInventoryFixture(token, 'production_group_raw');
    const [group] = await dbQuery(
      "SELECT id FROM packaging_groups WHERE code = 'PKG_GROUP_STARTER_10KG_400G' LIMIT 1"
    );
    const packagingVariants = await dbQuery(
      `SELECT sku, id
       FROM item_variants
       WHERE sku IN ('PKG-CARTON-10KG', 'PKG-BAG-400G', 'PKG-STICKER-STARTER')`
    );
    const variantBySku = Object.fromEntries(packagingVariants.map((variant) => [variant.sku, variant.id]));

    const finishedItemResponse = await authRequest(token)
      .post('/api/items')
      .send({
        category_id: 3,
        base_unit_id: 4,
        name: 'Group Production Finished Carton',
        code: `FIN_GROUP_${Date.now()}`,
        item_type: 'finished_product',
        tracking_type: 'stocked',
        default_cost: 0,
        default_selling_price: 10,
        reorder_level: 0
      })
      .expect(201);

    const finishedVariantResponse = await authRequest(token)
      .post('/api/item-variants')
      .send({
        item_id: finishedItemResponse.body.data.item.id,
        variant_name: '10kg carton finished',
        sku: `FIN_GROUP_SKU_${Date.now()}`,
        cost: 0,
        selling_price: 10
      })
      .expect(201);

    for (const [variantId, quantity, unitCost] of [
      [raw.variant.id, 30, 2],
      [variantBySku['PKG-CARTON-10KG'], 10, 0.5],
      [variantBySku['PKG-BAG-400G'], 100, 0.05],
      [variantBySku['PKG-STICKER-STARTER'], 100, 0.01]
    ]) {
      await authRequest(token)
        .post('/api/stock-adjustments')
        .send({
          warehouse_id: raw.warehouse.id,
          item_variant_id: variantId,
          quantity_change: quantity,
          unit_cost: unitCost,
          reason: 'Group production opening stock'
        })
        .expect(201);
    }

    const batchResponse = await authRequest(token)
      .post('/api/production-batches')
      .send({
        packaging_group_id: group.id,
        warehouse_id: raw.warehouse.id,
        charcoal_variant_id: raw.variant.id,
        output_item_variant_id: finishedVariantResponse.body.data.item_variant.id,
        planned_quantity: 20
      })
      .expect(201);

    await authRequest(token)
      .post(`/api/production-batches/${batchResponse.body.data.production_batch.id}/complete`)
      .send({ produced_quantity: 20 })
      .expect(200);

    const balances = await dbQuery(
      `SELECT item_variant_id, quantity_on_hand
       FROM stock_balances
       WHERE warehouse_id = ?
         AND item_variant_id IN (?, ?, ?, ?, ?)
       ORDER BY item_variant_id ASC`,
      [
        raw.warehouse.id,
        raw.variant.id,
        variantBySku['PKG-CARTON-10KG'],
        variantBySku['PKG-BAG-400G'],
        variantBySku['PKG-STICKER-STARTER'],
        finishedVariantResponse.body.data.item_variant.id
      ]
    );
    const balanceByVariant = Object.fromEntries(
      balances.map((balance) => [Number(balance.item_variant_id), Number(balance.quantity_on_hand)])
    );

    expect(balanceByVariant[raw.variant.id]).toBe(10);
    expect(balanceByVariant[variantBySku['PKG-CARTON-10KG']]).toBe(8);
    expect(balanceByVariant[variantBySku['PKG-BAG-400G']]).toBe(50);
    expect(balanceByVariant[variantBySku['PKG-STICKER-STARTER']]).toBe(50);
    expect(balanceByVariant[finishedVariantResponse.body.data.item_variant.id]).toBe(2);
  });

  test('production batch output must match active configuration and active variants', async () => {
    if (!dbReady) return;

    const raw = await createInventoryFixture(token, 'production_hardening_raw');
    const finishedA = await createInventoryFixture(token, 'production_hardening_a');
    const finishedB = await createInventoryFixture(token, 'production_hardening_b');

    const configResponse = await authRequest(token)
      .post('/api/packaging-configurations')
      .send({
        config_name: 'Hardening Config',
        output_item_variant_id: finishedA.variant.id,
        packaging_type: 'custom',
        charcoal_quantity_per_output: 0
      })
      .expect(201);
    const configId = configResponse.body.data.packaging_configuration.id;

    const incompatibleUnitResponse = await authRequest(token)
      .post('/api/units')
      .send({
        name: `Hardening Liters ${Date.now()}`,
        symbol: `hl_${Date.now()}`,
        unit_type: 'volume',
        conversion_to_base: 1
      })
      .expect(201);

    await authRequest(token)
      .post(`/api/packaging-configurations/${configId}/components`)
      .send({
        component_item_variant_id: raw.variant.id,
        quantity_per_output: 1,
        unit_id: incompatibleUnitResponse.body.data.unit.id,
        component_role: 'charcoal',
        waste_percentage: 0
      })
      .expect(400);

    const childUnitResponse = await authRequest(token)
      .post('/api/units')
      .send({
        name: `Hardening Grams ${Date.now()}`,
        symbol: `hg_${Date.now()}`,
        unit_type: 'weight',
        base_unit_id: 1,
        conversion_to_base: 0.001
      })
      .expect(201);

    await authRequest(token)
      .post(`/api/packaging-configurations/${configId}/components`)
      .send({
        component_item_variant_id: raw.variant.id,
        quantity_per_output: 1,
        unit_id: childUnitResponse.body.data.unit.id,
        component_role: 'charcoal',
        waste_percentage: 0
      })
      .expect(201);

    const costResponse = await authRequest(token)
      .post(`/api/packaging-configurations/${configId}/calculate-cost`)
      .send({ warehouse_id: raw.warehouse.id })
      .expect(200);
    expect(Number(costResponse.body.data.cost.components[0].quantity_with_waste)).toBeCloseTo(0.001, 4);

    await authRequest(token)
      .post('/api/production-batches')
      .send({
        packaging_configuration_id: configResponse.body.data.packaging_configuration.id,
        warehouse_id: raw.warehouse.id,
        output_item_variant_id: finishedB.variant.id,
        planned_quantity: 1
      })
      .expect(400);

    await authRequest(token)
      .delete(`/api/packaging-configurations/${configId}`)
      .expect(200);

    await authRequest(token)
      .post('/api/production-batches')
      .send({
        packaging_configuration_id: configId,
        warehouse_id: raw.warehouse.id,
        planned_quantity: 1
      })
      .expect(400);

    await authRequest(token)
      .patch(`/api/item-variants/${raw.variant.id}`)
      .send({ status: 'inactive' })
      .expect(200);

    await authRequest(token)
      .post('/api/packaging-configurations')
      .send({
        config_name: 'Inactive Component Config',
        output_item_variant_id: finishedA.variant.id,
        packaging_type: 'custom',
        charcoal_quantity_per_output: 0
      })
      .expect(201);

    const inactiveConfigRows = await dbQuery(
      'SELECT id FROM packaging_configurations WHERE config_name = ? ORDER BY id DESC LIMIT 1',
      ['Inactive Component Config']
    );

    await authRequest(token)
      .post(`/api/packaging-configurations/${inactiveConfigRows[0].id}/components`)
      .send({
        component_item_variant_id: raw.variant.id,
        quantity_per_output: 1,
        unit_id: 1,
        component_role: 'charcoal',
        waste_percentage: 0
      })
      .expect(400);
  });
});
