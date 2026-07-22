const mockConnection = { execute: jest.fn() };

jest.mock('../src/modules/packaging/packaging.model', () => ({
  createOperation: jest.fn(),
  createOperationComponent: jest.fn(),
  createReadyStockContainer: jest.fn(),
  createReadyStockMovement: jest.fn(),
  findGroupById: jest.fn(),
  findOperationById: jest.fn(),
  getGroupComponents: jest.fn(),
  lockGroupById: jest.fn()
}));

jest.mock('../src/bootstrap/db', () => ({ query: jest.fn() }));

jest.mock('../src/modules/inventory/inventory.model', () => ({
  findItemById: jest.fn(),
  findWarehouseById: jest.fn()
}));

jest.mock('../src/modules/inventory/stock.service', () => ({
  consumeCartonLooseUnits: jest.fn(),
  decreaseItemStock: jest.fn()
}));

jest.mock('../src/services/storeConfig.service', () => ({
  getStoreVatSettings: jest.fn()
}));

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn(async (callback) => callback(mockConnection))
}));

const model = require('../src/modules/packaging/packaging.model');
const db = require('../src/bootstrap/db');
const inventoryModel = require('../src/modules/inventory/inventory.model');
const stockService = require('../src/modules/inventory/stock.service');
const service = require('../src/modules/packaging/packaging.service');

const actor = { id: 9, store_id: 1 };

function normalCartonInput(overrides = {}) {
  return {
    id: 11,
    store_id: 1,
    name: 'Raw charcoal',
    code: 'RAW-01',
    status: 'active',
    item_kind: 'normal',
    stock_mode: 'carton_weight',
    kg_per_carton: '12.0000',
    loose_units_per_carton: 30,
    max_content_weight_kg: '0.0000',
    ...overrides
  };
}

function packagingItem(id, name, maxContentWeightKg = '0.0000', overrides = {}) {
  return {
    id,
    store_id: 1,
    name,
    code: `PKG-${id}`,
    status: 'active',
    item_kind: 'packaging',
    stock_mode: 'piece',
    max_content_weight_kg: maxContentWeightKg,
    ...overrides
  };
}

function group(overrides = {}) {
  return {
    id: 7,
    store_id: 1,
    name: 'Six kilogram retail carton',
    code: 'SIX-KG',
    input_item_id: 11,
    default_warehouse_id: 2,
    status: 'active',
    ...overrides
  };
}

function components(overrides = {}) {
  return [
    {
      id: 1,
      item_id: 21,
      component_role: 'outer_sellable',
      quantity_per_outer: '1.0000',
      sort_order: 0,
      ...overrides.outer
    },
    {
      id: 2,
      item_id: 22,
      component_role: 'inner_sellable',
      quantity_per_outer: '15.0000',
      sort_order: 1,
      ...overrides.inner
    },
    {
      id: 3,
      item_id: 23,
      component_role: 'consumable',
      quantity_per_outer: '1.0000',
      sort_order: 2,
      ...overrides.consumable
    }
  ];
}

function configureItems({ input = normalCartonInput(), outer, inner, consumable } = {}) {
  const items = new Map([
    [Number(input.id), input],
    [21, outer || packagingItem(21, 'Outer carton')],
    [22, inner || packagingItem(22, 'Inner bag', '0.4000')],
    [23, consumable || packagingItem(23, 'Seal sticker')]
  ]);
  inventoryModel.findItemById.mockImplementation(async (id) => items.get(Number(id)) || null);
  inventoryModel.findWarehouseById.mockResolvedValue({
    id: 2,
    store_id: 1,
    name: 'Main warehouse',
    status: 'active'
  });
  return items;
}

function configureBalances(costs = {}) {
  const balances = {
    11: { quantity_on_hand: '100.0000', quantity_reserved: '0.0000', average_cost: '2.0000' },
    21: { quantity_on_hand: '10.0000', quantity_reserved: '0.0000', average_cost: '1.0000' },
    22: { quantity_on_hand: '100.0000', quantity_reserved: '0.0000', average_cost: '0.1000' },
    23: { quantity_on_hand: '10.0000', quantity_reserved: '0.0000', average_cost: '0.2000' },
    ...costs
  };
  const findBalance = (params) => balances[Number(params[1])] || null;
  db.query.mockImplementation(async (sql, params) => (
    sql.includes('FROM item_stock_balances') && findBalance(params) ? [findBalance(params)] : []
  ));
  mockConnection.execute.mockImplementation(async (sql, params) => (
    sql.includes('FROM item_stock_balances') && findBalance(params) ? [[findBalance(params)]] : [[]]
  ));
}

function configureGroupConfiguration({ groupData = group(), componentRows = components() } = {}) {
  model.findGroupById.mockResolvedValue(groupData);
  model.lockGroupById.mockResolvedValue(groupData);
  model.getGroupComponents.mockResolvedValue(componentRows);
}

describe('flat packaging groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureItems();
  });

  test('derives six kilograms from fifteen 0.4 kg inner bags', async () => {
    const result = await service._private.validateFlatComponents(components(), 1);

    expect(result.outer.item.id).toBe(21);
    expect(result.inner.item.id).toBe(22);
    expect(result.group_capacity_kg.toFixed(4)).toBe('6.0000');
  });

  test('rejects an outer package whose positive capacity cannot hold its inner bags', async () => {
    configureItems({ outer: packagingItem(21, 'Small outer carton', '5.0000') });

    await expect(service._private.validateFlatComponents(components(), 1)).rejects.toMatchObject({
      statusCode: 400,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'components' })
      ])
    });
  });

  test('requires a carton input loose unit to exactly match the inner-bag capacity', () => {
    const compatible = service._private.calculateInputRequirement(
      normalCartonInput(),
      '0.4000',
      '15.0000',
      2
    );

    expect(compatible.raw_quantity_kg.toFixed(4)).toBe('12.0000');
    expect(compatible.loose_units_required.toFixed(4)).toBe('30.0000');
    expect(() => service._private.calculateInputRequirement(
      normalCartonInput({ loose_units_per_carton: 24 }),
      '0.4000',
      '15.0000',
      2
    )).toThrow('Carton input loose-unit weight must exactly match the group inner-bag capacity');
  });
});

describe('packaging preview and completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureItems();
    configureGroupConfiguration();
    configureBalances();
  });

  test('previews input, component shortages, and WAC costs from canonical item balances', async () => {
    const preview = await service.previewGroup(7, {
      warehouse_id: 2,
      output_carton_count: 2
    }, actor);

    expect(preview.group_capacity_kg).toBe('6.0000');
    expect(preview.input).toMatchObject({
      raw_quantity_kg: '12.0000',
      loose_units_required: '30.0000',
      unit_cost: '2.0000',
      total_cost: '24.0000'
    });
    expect(preview.output).toMatchObject({
      full_outer_cartons: '2.0000',
      total_inner_quantity: '30.0000'
    });
    expect(preview.costs).toMatchObject({
      raw_cost: '24.0000',
      packaging_cost: '5.4000',
      total_cost: '29.4000',
      cost_per_outer: '14.7000'
    });
    expect(preview.shortages.every((entry) => entry.available)).toBe(true);
    expect(preview).not.toHaveProperty('_configuration');
  });

  test('atomically consumes inputs and creates one ready container per completed outer carton', async () => {
    model.createOperation.mockResolvedValue(101);
    model.createReadyStockContainer
      .mockResolvedValueOnce(201)
      .mockResolvedValueOnce(202);
    model.findOperationById.mockResolvedValue({ id: 101, status: 'completed' });
    stockService.consumeCartonLooseUnits.mockResolvedValue({ carton_allocations: [] });
    stockService.decreaseItemStock.mockResolvedValue({});

    const result = await service.completePackaging(7, {
      warehouse_id: 2,
      output_carton_count: 2,
      notes: 'Morning packaging run'
    }, 9, actor);

    expect(stockService.consumeCartonLooseUnits).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
      itemId: 11,
      looseUnits: expect.anything(),
      movementType: 'packaging_consume'
    }));
    expect(stockService.decreaseItemStock).toHaveBeenCalledTimes(3);
    expect(stockService.decreaseItemStock).toHaveBeenCalledWith(mockConnection, expect.objectContaining({
      itemId: 22,
      quantity: expect.anything(),
      referenceType: 'packaging_operation',
      referenceId: 101
    }));
    expect(model.createOperationComponent).toHaveBeenCalledTimes(4);
    expect(model.createReadyStockContainer).toHaveBeenCalledTimes(2);
    expect(model.createReadyStockContainer).toHaveBeenNthCalledWith(1, mockConnection, expect.objectContaining({
      packaging_operation_id: 101,
      initial_inner_quantity: '15.0000',
      remaining_inner_quantity: '15.0000',
      capacity_kg: '6.0000',
      status: 'full'
    }));
    expect(model.createReadyStockMovement).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      packaging_operation: { id: 101, status: 'completed' },
      ready_stock_container_ids: [201, 202]
    });
  });

  test('does not create a packaging operation when a canonical input is short', async () => {
    configureBalances({
      22: { quantity_on_hand: '10.0000', quantity_reserved: '0.0000', average_cost: '0.1000' }
    });

    await expect(service.completePackaging(7, {
      warehouse_id: 2,
      output_carton_count: 2
    }, 9, actor)).rejects.toMatchObject({ statusCode: 409 });

    expect(model.createOperation).not.toHaveBeenCalled();
    expect(stockService.consumeCartonLooseUnits).not.toHaveBeenCalled();
    expect(stockService.decreaseItemStock).not.toHaveBeenCalled();
  });
});
