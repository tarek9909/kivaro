jest.mock('../src/modules/packaging/packaging.model', () => ({
  createComponent: jest.fn(),
  findGroupById: jest.fn(),
  findComponentById: jest.fn(),
  getGroupComponents: jest.fn()
}));

jest.mock('../src/modules/inventory/inventory.model', () => ({
  findVariantById: jest.fn(),
  findWarehouseById: jest.fn()
}));

const model = require('../src/modules/packaging/packaging.model');
const inventoryModel = require('../src/modules/inventory/inventory.model');
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
