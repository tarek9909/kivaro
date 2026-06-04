jest.mock('../src/modules/packaging/packaging.model', () => ({
  createComponent: jest.fn(),
  createAssignment: jest.fn(),
  findAssignmentById: jest.fn(),
  findGroupById: jest.fn(),
  findComponentById: jest.fn(),
  getGroupComponents: jest.fn(),
  getWarehouseVariantBalances: jest.fn(),
  updateAssignment: jest.fn()
}));

jest.mock('../src/modules/inventory/inventory.model', () => ({
  findVariantById: jest.fn(),
  findWarehouseById: jest.fn()
}));

jest.mock('../src/modules/inventory/stock.service', () => ({
  decreaseStock: jest.fn()
}));

jest.mock('../src/utils/transaction', () => ({
  withTransaction: jest.fn(async (callback) => callback({ execute: jest.fn() }))
}));

const model = require('../src/modules/packaging/packaging.model');
const inventoryModel = require('../src/modules/inventory/inventory.model');
const stockService = require('../src/modules/inventory/stock.service');
const service = require('../src/modules/packaging/packaging.service');

const actor = { store_id: 1 };

function component(overrides) {
  return {
    id: overrides.id,
    store_id: 1,
    packaging_group_id: 7,
    parent_component_id: null,
    level_key: 'category',
    item_variant_id: overrides.id,
    item_name: `Material ${overrides.id}`,
    variant_name: `Variant ${overrides.id}`,
    sku: `SKU-${overrides.id}`,
    cost: 0,
    unit_symbol: 'pc',
    quantity_per_parent: null,
    capacity_kg: null,
    sort_order: 0,
    ...overrides
  };
}

function requirementById(calculation, id) {
  return calculation.requirements.find((requirement) => Number(requirement.component_id) === Number(id));
}

describe('packaging service hierarchy calculations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    model.findGroupById.mockResolvedValue({
      id: 7,
      store_id: 1,
      name: 'Retail carton group'
    });
    model.getGroupComponents.mockResolvedValue([]);
    model.getWarehouseVariantBalances.mockResolvedValue([]);
  });

  test('uses category capacity as the top container capacity', async () => {
    model.getGroupComponents.mockResolvedValue([
      component({
        id: 1,
        level_key: 'category',
        variant_attributes_json: JSON.stringify({ capacity_kg: 6 })
      }),
      component({
        id: 2,
        parent_component_id: 1,
        level_key: 'sub_item',
        quantity_per_parent: 15,
        capacity_kg: 0.4,
        sort_order: 1
      }),
      component({
        id: 3,
        parent_component_id: 2,
        level_key: 'sub_sub_item',
        quantity_per_parent: 1,
        sort_order: 1
      })
    ]);

    const calculation = await service.calculateGroup(7, { charcoal_quantity_kg: 600 }, actor);

    expect(calculation.primary_container_component_id).toBe(1);
    expect(calculation.primary_container_capacity_kg).toBe('6.0000');
    expect(calculation.primary_container_count).toBe(100);
    expect(requirementById(calculation, 1).required_quantity).toBe('100.0000');
    expect(requirementById(calculation, 2).required_quantity).toBe('1500.0000');
    expect(requirementById(calculation, 3).required_quantity).toBe('1500.0000');
  });

  test('cascades cartons, bags, and stickers from charcoal kg', async () => {
    model.getGroupComponents.mockResolvedValue([
      component({ id: 1, level_key: 'category' }),
      component({
        id: 2,
        parent_component_id: 1,
        level_key: 'item',
        quantity_per_parent: 1,
        capacity_kg: 10,
        sort_order: 1
      }),
      component({
        id: 3,
        parent_component_id: 2,
        level_key: 'sub_item',
        quantity_per_parent: 25,
        capacity_kg: 0.4,
        sort_order: 1
      }),
      component({
        id: 4,
        parent_component_id: 3,
        level_key: 'sub_sub_item',
        quantity_per_parent: 1,
        sort_order: 1
      })
    ]);

    const calculation = await service.calculateGroup(7, { charcoal_quantity_kg: 600 }, actor);

    expect(calculation.primary_container_component_id).toBe(2);
    expect(calculation.primary_container_count).toBe(60);
    expect(requirementById(calculation, 1).required_quantity).toBe('60.0000');
    expect(requirementById(calculation, 2).required_quantity).toBe('60.0000');
    expect(requirementById(calculation, 3).required_quantity).toBe('1500.0000');
    expect(requirementById(calculation, 4).required_quantity).toBe('1500.0000');
  });

  test('derives child quantity from parent and child capacity attributes', async () => {
    model.findComponentById.mockResolvedValue(component({
      id: 2,
      level_key: 'item',
      variant_attributes_json: JSON.stringify({ capacity_kg: 10 })
    }));
    inventoryModel.findVariantById.mockResolvedValue({
      id: 3,
      store_id: 1,
      status: 'active',
      item_type: 'packaging',
      tracking_type: 'stocked',
      attributes_json: JSON.stringify({ capacity_kg: 0.4 })
    });
    model.createComponent.mockImplementation(async (payload) => ({ id: 10, ...payload }));

    const created = await service.addComponent(7, {
      parent_component_id: 2,
      level_key: 'sub_item',
      item_variant_id: 3,
      unit_symbol: 'pc'
    }, actor);

    expect(created.quantity_per_parent).toBe(25);
    expect(model.createComponent).toHaveBeenCalledWith(expect.objectContaining({
      quantity_per_parent: 25,
      unit_symbol: 'pc'
    }));
  });

  test('rejects child quantities above parent capacity', async () => {
    model.findComponentById.mockResolvedValue(component({
      id: 2,
      level_key: 'item',
      capacity_kg: 10
    }));
    inventoryModel.findVariantById.mockResolvedValue({
      id: 3,
      store_id: 1,
      status: 'active',
      item_type: 'packaging',
      tracking_type: 'stocked',
      attributes_json: JSON.stringify({ capacity_kg: 0.4 })
    });

    await expect(service.addComponent(7, {
      parent_component_id: 2,
      level_key: 'sub_item',
      item_variant_id: 3,
      unit_symbol: 'pc',
      quantity_per_parent: 26
    }, actor)).rejects.toMatchObject({
      statusCode: 400,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: 'quantity_per_parent' })
      ])
    });
  });
});

describe('packaging assignment output handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    model.findGroupById.mockResolvedValue({
      id: 7,
      store_id: 1,
      name: 'Retail carton group',
      charcoal_variant_id: null
    });
    model.getGroupComponents.mockResolvedValue([
      component({
        id: 1,
        level_key: 'category',
        variant_attributes_json: JSON.stringify({ capacity_kg: 6 })
      })
    ]);
    model.getWarehouseVariantBalances.mockResolvedValue([]);
    inventoryModel.findWarehouseById.mockResolvedValue({
      id: 2,
      store_id: 1,
      status: 'active'
    });
    inventoryModel.findVariantById.mockResolvedValue({
      id: 4,
      store_id: 1,
      status: 'active',
      item_type: 'raw_charcoal',
      tracking_type: 'stocked'
    });
    model.createAssignment.mockImplementation(async (payload) => ({ id: 11, ...payload }));
  });

  test('creates packaging assignments as consumed batches without a finished output variant', async () => {
    const createdAssignment = {
      id: 11,
      store_id: 1,
      packaging_group_id: 7,
      warehouse_id: 2,
      charcoal_variant_id: 4,
      output_item_variant_id: null,
      charcoal_quantity_kg: '600.0000',
      primary_container_count: 100,
      produced_quantity: '0.0000',
      total_packaging_cost: '25.0000',
      cost_per_kg: '0.0417',
      status: 'calculated',
      calculation_json: {
        primary_container_count: 100,
        requirements: [
          {
            component_id: 1,
            item_variant_id: 8,
            required_quantity: '100.0000',
            unit_cost: '0.2500',
            parent_component_id: null,
            capacity_kg: '6.0000'
          }
        ]
      },
      consumed_movements_json: null,
      notes: null
    };
    model.getWarehouseVariantBalances.mockResolvedValue([
      {
        item_variant_id: 1,
        quantity_on_hand: '150.0000',
        quantity_reserved: '0.0000'
      }
    ]);
    model.createAssignment.mockResolvedValue(createdAssignment);
    model.findAssignmentById.mockResolvedValueOnce(createdAssignment).mockResolvedValueOnce({
      ...createdAssignment,
      status: 'consumed',
      produced_quantity: '100.0000',
      consumed_movements_json: []
    });
    stockService.decreaseStock
      .mockResolvedValueOnce({
        stock_movement_id: 21,
        average_cost: '0.5000',
        quantity_after: '400.0000'
      })
      .mockResolvedValueOnce({
        stock_movement_id: 22,
        quantity_after: '50.0000'
      });
    model.updateAssignment.mockResolvedValue(undefined);

    const assignment = await service.createAssignment({
      packaging_group_id: 7,
      warehouse_id: 2,
      charcoal_variant_id: 4,
      charcoal_quantity_kg: 600,
      notes: null
    }, 9, actor);

    expect(inventoryModel.findVariantById).toHaveBeenCalledTimes(1);
    expect(model.createAssignment).toHaveBeenCalledWith(expect.objectContaining({
      packaging_group_id: 7,
      warehouse_id: 2,
      charcoal_variant_id: 4,
      output_item_variant_id: null,
      primary_container_count: 100
    }));
    expect(stockService.decreaseStock).toHaveBeenCalledTimes(2);
    expect(model.updateAssignment).toHaveBeenCalledWith(expect.anything(), 11, expect.objectContaining({
      status: 'consumed',
      produced_quantity: '100.0000'
    }));
    expect(assignment.status).toBe('consumed');
    expect(assignment.output_item_variant_id).toBeNull();
  });

  test('consumes packaging assignments without producing finished output stock', async () => {
    model.findAssignmentById.mockResolvedValue({
      id: 11,
      store_id: 1,
      packaging_group_id: 7,
      warehouse_id: 2,
      charcoal_variant_id: 4,
      output_item_variant_id: null,
      charcoal_quantity_kg: '600.0000',
      primary_container_count: 100,
      produced_quantity: '0.0000',
      total_packaging_cost: '25.0000',
      cost_per_kg: '0.0417',
      status: 'calculated',
      calculation_json: {
        primary_container_count: 100,
        requirements: [
          {
            component_id: 1,
            item_variant_id: 8,
            required_quantity: '100.0000',
            unit_cost: '0.2500',
            parent_component_id: null,
            capacity_kg: '6.0000'
          }
        ]
      },
      consumed_movements_json: null,
      notes: null
    });
    stockService.decreaseStock
      .mockResolvedValueOnce({
        stock_movement_id: 21,
        average_cost: '0.5000',
        quantity_after: '400.0000'
      })
      .mockResolvedValueOnce({
        stock_movement_id: 22,
        quantity_after: '50.0000'
      });
    model.updateAssignment.mockResolvedValue(undefined);

    await service.consumeAssignment(11, { notes: 'Consumed' }, 9, actor);

    expect(stockService.decreaseStock).toHaveBeenCalledTimes(2);
    expect(model.updateAssignment).toHaveBeenCalledWith(expect.anything(), 11, expect.objectContaining({
      status: 'consumed',
      produced_quantity: '100.0000',
      consumed_movements_json: expect.not.arrayContaining([
        expect.objectContaining({ role: 'finished_output' })
      ])
    }));
  });
});
