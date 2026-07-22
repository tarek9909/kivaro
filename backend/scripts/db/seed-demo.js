const bcrypt = require('bcryptjs');
const { createDatabaseConnection } = require('./lib');

// The clean baseline owns the template store at id 1.  Keeping the demo seed
// scoped to that store avoids accidentally rewriting a real tenant profile.
const STORE_ID = 1;
const PASSWORD = 'DemoPass123!';
const SEEDED_DATE = '2026-07-01';
const SEEDED_AT = '2026-07-01 08:00:00';
const BACKTICK = String.fromCharCode(96);

const CREDENTIALS = [
  { fullName: 'Demo Owner', username: 'demo_owner', email: 'demo.owner@kivaro.local', role: 'owner', phone: '+96170000001' },
  { fullName: 'Nour Accountant', username: 'nour_accountant', email: 'accountant@kivaro.local', role: 'accountant', phone: '+96170000002' },
  { fullName: 'Karim Warehouse', username: 'karim_warehouse', email: 'warehouse@kivaro.local', role: 'inventory_manager', phone: '+96170000003' },
  { fullName: 'Ali Driver', username: 'ali_salesman', email: 'ali.salesman@kivaro.local', role: 'salesman', phone: '+96170000004' },
  { fullName: 'Maya Driver', username: 'maya_salesman', email: 'maya.salesman@kivaro.local', role: 'salesman', phone: '+96170000005' }
];

function sql(parts) {
  return parts.filter(Boolean).join('\n');
}

function quoteIdentifier(identifier) {
  return BACKTICK + String(identifier).replaceAll(BACKTICK, BACKTICK + BACKTICK) + BACKTICK;
}

function columnsSql(data) {
  return Object.keys(data).map(quoteIdentifier).join(', ');
}

function placeholders(data) {
  return Object.keys(data).map(() => '?').join(', ');
}

async function upsert(db, table, data, updateColumns, selectSql, selectParams) {
  const updates = updateColumns
    .map((column) => quoteIdentifier(column) + ' = VALUES(' + quoteIdentifier(column) + ')')
    .join(', ');
  await db.execute(
    'INSERT INTO ' + quoteIdentifier(table) + ' (' + columnsSql(data) + ')' +
      ' VALUES (' + placeholders(data) + ')' +
      ' ON DUPLICATE KEY UPDATE ' + updates,
    Object.values(data)
  );
  const [rows] = await db.execute(selectSql, selectParams);
  if (!rows.length) {
    throw new Error('Failed to load ' + table + ' after upsert.');
  }
  return rows[0];
}

async function getRoleIds(db) {
  const [rows] = await db.execute(
    'SELECT id, name FROM roles WHERE store_id = ? OR store_id IS NULL',
    [STORE_ID]
  );
  return new Map(rows.map((row) => [row.name, row.id]));
}

async function ensureStoreProfile(db) {
  const [stores] = await db.execute('SELECT id FROM stores WHERE id = ? LIMIT 1', [STORE_ID]);
  if (!stores.length) {
    throw new Error('Demo seeding requires the template store with id ' + STORE_ID + '.');
  }

  await db.execute(
    sql([
      'UPDATE stores',
      'SET name = ?, code = ?, slug = ?, status = \'active\', contact_name = ?,',
      '  phone = ?, email = ?, address = ?, currency_code = ?, notes = ?',
      'WHERE id = ?'
    ]),
    [
      'Kivaro Demo Charcoal',
      'KIVARO-DEMO',
      'kivaro-demo',
      'Demo Owner',
      '+96170000000',
      'demo@kivaro.local',
      'Beirut, Lebanon',
      'USD',
      'Safe, idempotent canonical item-inventory demonstration data.',
      STORE_ID
    ]
  );

  await upsert(
    db,
    'company_profiles',
    {
      store_id: STORE_ID,
      company_name: 'Kivaro Demo Charcoal',
      phone: '+96170000000',
      email: 'demo@kivaro.local',
      address: 'Beirut, Lebanon',
      logo_url: null,
      currency_code: 'USD',
      tax_number: 'LB-DEMO-VAT-001'
    },
    ['company_name', 'phone', 'email', 'address', 'logo_url', 'currency_code', 'tax_number'],
    'SELECT id FROM company_profiles WHERE store_id = ?',
    [STORE_ID]
  );
}

async function ensureStandardUnits(db) {
  const kg = await upsert(
    db,
    'units',
    {
      store_id: STORE_ID,
      name: 'Kilogram',
      symbol: 'kg',
      unit_type: 'weight',
      base_unit_id: null,
      conversion_to_base: 1
    },
    ['name', 'unit_type', 'base_unit_id', 'conversion_to_base'],
    'SELECT id FROM units WHERE store_id = ? AND symbol = ?',
    [STORE_ID, 'kg']
  );
  const pc = await upsert(
    db,
    'units',
    {
      store_id: STORE_ID,
      name: 'Piece',
      symbol: 'pc',
      unit_type: 'quantity',
      base_unit_id: null,
      conversion_to_base: 1
    },
    ['name', 'unit_type', 'base_unit_id', 'conversion_to_base'],
    'SELECT id FROM units WHERE store_id = ? AND symbol = ?',
    [STORE_ID, 'pc']
  );
  return { kg: kg.id, pc: pc.id };
}

async function ensureUsers(db) {
  const roleIds = await getRoleIds(db);
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const users = {};

  for (const account of CREDENTIALS) {
    const roleId = roleIds.get(account.role);
    if (!roleId) {
      throw new Error('Missing role "' + account.role + '".');
    }
    const user = await upsert(
      db,
      'users',
      {
        store_id: STORE_ID,
        role_id: roleId,
        full_name: account.fullName,
        username: account.username,
        email: account.email,
        phone: account.phone,
        password_hash: passwordHash,
        status: 'active',
        deleted_at: null
      },
      ['role_id', 'full_name', 'username', 'phone', 'password_hash', 'status', 'deleted_at'],
      'SELECT id, full_name, email, phone FROM users WHERE store_id = ? AND email = ?',
      [STORE_ID, account.email]
    );
    users[account.username] = user;
  }
  return users;
}

async function ensureCategory(db, code, name, createdBy) {
  return upsert(
    db,
    'item_categories',
    {
      store_id: STORE_ID,
      parent_id: null,
      name,
      code,
      description: null,
      status: 'active'
    },
    ['name', 'description', 'status'],
    'SELECT id FROM item_categories WHERE store_id = ? AND code = ?',
    [STORE_ID, code]
  );
}

async function ensureItem(db, data) {
  return upsert(
    db,
    'items',
    {
      store_id: STORE_ID,
      category_id: data.categoryId,
      base_unit_id: data.baseUnitId,
      name: data.name,
      code: data.code,
      item_kind: data.itemKind,
      stock_mode: data.stockMode,
      kg_per_carton: data.kgPerCarton ?? null,
      loose_units_per_carton: data.looseUnitsPerCarton ?? null,
      max_content_weight_kg: data.maxContentWeightKg ?? null,
      description: data.description ?? null,
      default_cost: data.defaultCost,
      default_selling_price: data.defaultSellingPrice ?? null,
      carton_selling_price: data.cartonSellingPrice ?? null,
      loose_unit_selling_price: data.looseUnitSellingPrice ?? null,
      reorder_level: data.reorderLevel,
      status: 'active',
      created_by: data.createdBy
    },
    [
      'category_id',
      'base_unit_id',
      'name',
      'item_kind',
      'stock_mode',
      'kg_per_carton',
      'loose_units_per_carton',
      'max_content_weight_kg',
      'description',
      'default_cost',
      'default_selling_price',
      'carton_selling_price',
      'loose_unit_selling_price',
      'reorder_level',
      'status',
      'created_by'
    ],
    'SELECT id, name, code, item_kind, stock_mode FROM items WHERE store_id = ? AND code = ?',
    [STORE_ID, data.code]
  );
}

async function ensureLocation(db, code, name, createdBy) {
  return upsert(
    db,
    'locations',
    {
      store_id: STORE_ID,
      name,
      code,
      description: null,
      status: 'active',
      created_by: createdBy
    },
    ['name', 'description', 'status', 'created_by'],
    'SELECT id FROM locations WHERE store_id = ? AND code = ?',
    [STORE_ID, code]
  );
}

async function ensureSublocation(db, locationId, code, name, createdBy) {
  return upsert(
    db,
    'sublocations',
    {
      store_id: STORE_ID,
      location_id: locationId,
      name,
      code,
      description: null,
      status: 'active',
      created_by: createdBy
    },
    ['location_id', 'name', 'description', 'status', 'created_by'],
    'SELECT id FROM sublocations WHERE store_id = ? AND code = ?',
    [STORE_ID, code]
  );
}

async function ensureWarehouse(db, locationId) {
  return upsert(
    db,
    'warehouses',
    {
      store_id: STORE_ID,
      name: 'Main Demo Warehouse',
      code: 'DEMO-MAIN-WH',
      location_id: locationId,
      address: 'Demo warehouse near Beirut port',
      status: 'active'
    },
    ['name', 'location_id', 'address', 'status'],
    'SELECT id FROM warehouses WHERE store_id = ? AND code = ?',
    [STORE_ID, 'DEMO-MAIN-WH']
  );
}

async function ensureSalesman(db, user, vehicleNumber) {
  return upsert(
    db,
    'salesmen',
    {
      store_id: STORE_ID,
      user_id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
      vehicle_number: vehicleNumber,
      national_id: null,
      base_salary: 900,
      status: 'active',
      joined_at: SEEDED_DATE
    },
    ['store_id', 'full_name', 'phone', 'email', 'vehicle_number', 'base_salary', 'status', 'joined_at'],
    'SELECT id, full_name FROM salesmen WHERE user_id = ?',
    [user.id]
  );
}

async function assignSalesman(db, salesmanId, sublocationId) {
  const [rows] = await db.execute(
    sql([
      'SELECT id FROM salesman_sublocations',
      'WHERE salesman_id = ? AND sublocation_id = ? AND status = \'active\'',
      'LIMIT 1'
    ]),
    [salesmanId, sublocationId]
  );
  if (rows.length) {
    await db.execute(
      'UPDATE salesman_sublocations SET assigned_at = ?, unassigned_at = NULL WHERE id = ?',
      [SEEDED_DATE, rows[0].id]
    );
    return rows[0];
  }
  const [result] = await db.execute(
    sql([
      'INSERT INTO salesman_sublocations (salesman_id, sublocation_id, assigned_at, status)',
      'VALUES (?, ?, ?, \'active\')'
    ]),
    [salesmanId, sublocationId, SEEDED_DATE]
  );
  return { id: result.insertId };
}

async function ensureCustomer(db, data) {
  return upsert(
    db,
    'customers',
    {
      store_id: STORE_ID,
      customer_code: data.code,
      name: data.name,
      phone: data.phone,
      secondary_phone: null,
      location_id: data.locationId,
      sublocation_id: data.sublocationId,
      assigned_salesman_id: data.salesmanId,
      address: data.address,
      detailed_address: data.address,
      credit_limit: data.creditLimit ?? 0,
      status: 'active',
      notes: data.notes,
      created_by: data.createdBy
    },
    [
      'name',
      'phone',
      'location_id',
      'sublocation_id',
      'assigned_salesman_id',
      'address',
      'detailed_address',
      'credit_limit',
      'status',
      'notes',
      'created_by'
    ],
    'SELECT id, name FROM customers WHERE store_id = ? AND customer_code = ?',
    [STORE_ID, data.code]
  );
}

async function ensureCashAccount(db, accountName, accountType, cashFlowPermission, balance) {
  return upsert(
    db,
    'cash_accounts',
    {
      store_id: STORE_ID,
      account_name: accountName,
      account_type: accountType,
      cash_flow_permission: cashFlowPermission,
      opening_balance: balance,
      current_balance: balance,
      status: 'active'
    },
    ['account_type', 'cash_flow_permission', 'opening_balance', 'current_balance', 'status'],
    'SELECT id FROM cash_accounts WHERE store_id = ? AND account_name = ?',
    [STORE_ID, accountName]
  );
}

async function ensurePackagingGroup(db, data) {
  return upsert(
    db,
    'packaging_groups',
    {
      store_id: STORE_ID,
      name: data.name,
      code: data.code,
      input_item_id: data.inputItemId,
      default_warehouse_id: data.warehouseId,
      description: data.description,
      status: 'active',
      created_by: data.createdBy
    },
    ['name', 'input_item_id', 'default_warehouse_id', 'description', 'status', 'created_by'],
    'SELECT id FROM packaging_groups WHERE store_id = ? AND code = ?',
    [STORE_ID, data.code]
  );
}

async function ensureGroupComponent(db, groupId, component) {
  const [rows] = await db.execute(
    sql([
      'SELECT id, item_id FROM packaging_group_components',
      'WHERE packaging_group_id = ? AND component_role = ?',
      'ORDER BY id ASC'
    ]),
    [groupId, component.role]
  );
  if (rows.length > 1 || (rows.length && Number(rows[0].item_id) !== Number(component.itemId))) {
    throw new Error(
      'Demo packaging group has a conflicting ' + component.role +
        ' component; remove the conflicting demo configuration before reseeding.'
    );
  }
  if (rows.length) {
    await db.execute(
      sql([
        'UPDATE packaging_group_components',
        'SET quantity_per_outer = ?, sort_order = ?, notes = ?',
        'WHERE id = ?'
      ]),
      [component.quantityPerOuter, component.sortOrder, component.notes ?? null, rows[0].id]
    );
    return rows[0];
  }
  const [result] = await db.execute(
    sql([
      'INSERT INTO packaging_group_components (',
      '  store_id, packaging_group_id, item_id, component_role, quantity_per_outer, sort_order, notes',
      ') VALUES (?, ?, ?, ?, ?, ?, ?)'
    ]),
    [
      STORE_ID,
      groupId,
      component.itemId,
      component.role,
      component.quantityPerOuter,
      component.sortOrder,
      component.notes ?? null
    ]
  );
  return { id: result.insertId };
}

async function ensureSaleCatalogEntry(db, data) {
  const subjectColumn = data.itemId ? 'item_id' : 'packaging_group_id';
  const subjectId = data.itemId || data.packagingGroupId;
  const [rows] = await db.execute(
    sql([
      'SELECT id FROM sale_catalog_entries',
      'WHERE store_id = ? AND entry_type = ? AND ' + subjectColumn + ' = ?',
      'ORDER BY id ASC'
    ]),
    [STORE_ID, data.entryType, subjectId]
  );
  if (rows.length > 1) {
    throw new Error('Duplicate demo sale catalog entries found for ' + data.entryType + '.');
  }
  if (rows.length) {
    await db.execute(
      sql([
        'UPDATE sale_catalog_entries',
        'SET display_name = ?, unit_label = ?, default_price = ?, vat_rate = ?,',
        '  is_pos_active = ?, status = \'active\', created_by = ?',
        'WHERE id = ?'
      ]),
      [
        data.displayName,
        data.unitLabel,
        data.defaultPrice,
        data.vatRate,
        data.isPosActive ? 1 : 0,
        data.createdBy,
        rows[0].id
      ]
    );
    return rows[0];
  }
  const [result] = await db.execute(
    sql([
      'INSERT INTO sale_catalog_entries (',
      '  store_id, entry_type, item_id, packaging_group_id, display_name, unit_label,',
      '  default_price, vat_rate, is_pos_active, status, created_by',
      ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, \'active\', ?)'
    ]),
    [
      STORE_ID,
      data.entryType,
      data.itemId ?? null,
      data.packagingGroupId ?? null,
      data.displayName,
      data.unitLabel,
      data.defaultPrice,
      data.vatRate,
      data.isPosActive ? 1 : 0,
      data.createdBy
    ]
  );
  return { id: result.insertId };
}

async function findDemoOperation(db) {
  const [rows] = await db.execute(
    sql([
      'SELECT id FROM packaging_operations',
      'WHERE store_id = ? AND operation_number = ?',
      'LIMIT 1'
    ]),
    [STORE_ID, 'DEMO-PKG-001']
  );
  return rows[0] || null;
}

async function assertNoExistingDemoStock(db, warehouseId, items) {
  const itemIds = items.map((item) => item.id);
  const placeholdersSql = itemIds.map(() => '?').join(', ');
  const [balances] = await db.execute(
    sql([
      'SELECT item_id, quantity_on_hand, quantity_reserved FROM item_stock_balances',
      'WHERE warehouse_id = ? AND item_id IN (' + placeholdersSql + ')'
    ]),
    [warehouseId, ...itemIds]
  );
  if (balances.length) {
    throw new Error(
      'Demo catalog already has item balances without DEMO-PKG-001. Refusing to overwrite existing canonical inventory.'
    );
  }
  const [lots] = await db.execute(
    sql([
      'SELECT id FROM carton_stock_lots',
      'WHERE warehouse_id = ? AND item_id = ?',
      'LIMIT 1'
    ]),
    [warehouseId, items[0].id]
  );
  if (lots.length) {
    throw new Error('Demo carton lots already exist without DEMO-PKG-001. Refusing to overwrite them.');
  }
  const [shelves] = await db.execute(
    sql([
      'SELECT id FROM open_carton_shelves',
      'WHERE warehouse_id = ? AND item_id = ?',
      'LIMIT 1'
    ]),
    [warehouseId, items[0].id]
  );
  if (shelves.length) {
    throw new Error('Demo carton shelves already exist without DEMO-PKG-001. Refusing to overwrite them.');
  }
  const [movements] = await db.execute(
    sql([
      'SELECT id FROM item_stock_movements',
      'WHERE warehouse_id = ? AND item_id IN (' + placeholdersSql + ')',
      'LIMIT 1'
    ]),
    [warehouseId, ...itemIds]
  );
  if (movements.length) {
    throw new Error('Demo item movements already exist without DEMO-PKG-001. Refusing to overwrite them.');
  }
}

async function insertBalance(db, warehouseId, itemId, quantityOnHand, averageCost) {
  await db.execute(
    sql([
      'INSERT INTO item_stock_balances (',
      '  store_id, warehouse_id, item_id, quantity_on_hand, quantity_reserved, average_cost',
      ') VALUES (?, ?, ?, ?, 0, ?)'
    ]),
    [STORE_ID, warehouseId, itemId, quantityOnHand, averageCost]
  );
}

async function insertMovement(db, data) {
  await db.execute(
    sql([
      'INSERT INTO item_stock_movements (',
      '  store_id, warehouse_id, item_id, movement_type, quantity_change, quantity_before, quantity_after,',
      '  reserved_quantity_change, reserved_quantity_before, reserved_quantity_after, unit_cost, total_cost,',
      '  reference_type, reference_id, carton_stock_lot_id, open_carton_shelf_id, notes, created_by, created_at',
      ') VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ]),
    [
      STORE_ID,
      data.warehouseId,
      data.itemId,
      data.movementType,
      data.quantityChange,
      data.quantityBefore,
      data.quantityAfter,
      data.unitCost,
      data.totalCost,
      data.referenceType,
      data.referenceId ?? null,
      data.cartonLotId ?? null,
      data.openCartonShelfId ?? null,
      data.notes,
      data.createdBy,
      SEEDED_AT
    ]
  );
}

async function insertClosedOpenCartonShelf(db, data) {
  const [result] = await db.execute(
    sql([
      'INSERT INTO open_carton_shelves (',
      '  store_id, warehouse_id, item_id, carton_lot_id, initial_loose_units, remaining_loose_units,',
      '  loose_unit_weight_kg, status, opened_at, opened_by, closed_at',
      ') VALUES (?, ?, ?, ?, 15, 0, 0.4, \'closed\', ?, ?, ?)'
    ]),
    [
      STORE_ID,
      data.warehouseId,
      data.itemId,
      data.cartonLotId,
      SEEDED_AT,
      data.openedBy,
      SEEDED_AT
    ]
  );
  return result.insertId;
}

async function insertReadyMovement(db, data) {
  await db.execute(
    sql([
      'INSERT INTO ready_stock_movements (',
      '  store_id, warehouse_id, ready_stock_container_id, movement_type, inner_quantity_change,',
      '  inner_quantity_before, inner_quantity_after, cost_change, cost_before, cost_after,',
      '  reference_type, reference_id, notes, created_by, created_at',
      ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ]),
    [
      STORE_ID,
      data.warehouseId,
      data.containerId,
      data.movementType,
      data.innerQuantityChange,
      data.innerQuantityBefore,
      data.innerQuantityAfter,
      data.costChange,
      data.costBefore,
      data.costAfter,
      data.referenceType,
      data.referenceId,
      data.notes,
      data.createdBy,
      SEEDED_AT
    ]
  );
}

async function createDemoInventory(db, data) {
  const existingOperation = await findDemoOperation(db);
  if (existingOperation) {
    return { operationId: existingOperation.id, created: false };
  }

  await assertNoExistingDemoStock(db, data.warehouseId, [
    data.rawItem,
    data.outerItem,
    data.innerItem,
    data.stickerItem,
    data.weightItem,
    data.pieceItem
  ]);

  const rawStartingQuantity = 300;
  const rawConsumedQuantity = 60;
  const rawRemainingQuantity = rawStartingQuantity - rawConsumedQuantity;
  const outerStartingQuantity = 20;
  const outerConsumedQuantity = 10;
  const innerStartingQuantity = 300;
  const innerConsumedQuantity = 150;
  const stickerStartingQuantity = 20;
  const stickerConsumedQuantity = 10;
  const rawCost = 1.2;
  const outerCost = 0.5;
  const innerCost = 0.1;
  const stickerCost = 0.02;
  const totalCost = 92.2;
  const costPerOuter = 9.22;
  const costPerInner = 0.6147;

  await insertBalance(db, data.warehouseId, data.rawItem.id, rawRemainingQuantity, rawCost);
  await insertBalance(db, data.warehouseId, data.outerItem.id, outerStartingQuantity - outerConsumedQuantity, outerCost);
  await insertBalance(db, data.warehouseId, data.innerItem.id, innerStartingQuantity - innerConsumedQuantity, innerCost);
  await insertBalance(db, data.warehouseId, data.stickerItem.id, stickerStartingQuantity - stickerConsumedQuantity, stickerCost);
  await insertBalance(db, data.warehouseId, data.weightItem.id, 120, 1.05);
  await insertBalance(db, data.warehouseId, data.pieceItem.id, 60, 0.15);

  const [lotResult] = await db.execute(
    sql([
      'INSERT INTO carton_stock_lots (',
      '  store_id, warehouse_id, item_id, received_cartons, remaining_cartons, kg_per_carton,',
      '  loose_units_per_carton, unit_cost_per_kg, source_type, source_id, received_at, created_by',
      ') VALUES (?, ?, ?, 50, 40, 6, 15, ?, \'demo_seed\', 1, ?, ?)'
    ]),
    [STORE_ID, data.warehouseId, data.rawItem.id, rawCost, SEEDED_AT, data.createdBy]
  );
  const cartonLotId = lotResult.insertId;

  const groupSnapshot = {
    id: data.groupId,
    name: 'Demo 6 kg Carton (15 x 0.4 kg bags)',
    code: 'DEMO-PKG-6KG',
    capacity_kg: 6,
    outer: {
      item_id: data.outerItem.id,
      name: 'Demo 6 kg Carton',
      quantity_per_outer: 1,
      max_content_weight_kg: 6
    },
    inner: {
      item_id: data.innerItem.id,
      name: 'Demo 0.4 kg Inner Bag',
      quantity_per_outer: 15,
      max_content_weight_kg: 0.4
    },
    components: [
      {
        item_id: data.outerItem.id,
        item_name: 'Demo 6 kg Carton',
        component_role: 'outer_sellable',
        quantity_per_outer: 1,
        max_content_weight_kg: 6
      },
      {
        item_id: data.innerItem.id,
        item_name: 'Demo 0.4 kg Inner Bag',
        component_role: 'inner_sellable',
        quantity_per_outer: 15,
        max_content_weight_kg: 0.4
      },
      {
        item_id: data.stickerItem.id,
        item_name: 'Demo Carton Seal Sticker',
        component_role: 'consumable',
        quantity_per_outer: 1,
        max_content_weight_kg: 0
      }
    ]
  };
  const inputSnapshot = {
    item_id: data.rawItem.id,
    item_name: 'Demo Bulk Charcoal Carton',
    stock_mode: 'carton_weight',
    kg_per_carton: 6,
    loose_units_per_carton: 15,
    loose_unit_weight_kg: 0.4,
    raw_quantity_kg: rawConsumedQuantity,
    loose_units_required: 150,
    unit_cost: rawCost
  };
  const [operationResult] = await db.execute(
    sql([
      'INSERT INTO packaging_operations (',
      '  store_id, operation_number, packaging_group_id, input_item_id, warehouse_id, output_carton_count,',
      '  raw_quantity_kg, raw_unit_cost, packaging_cost, total_cost, cost_per_outer, cost_per_inner,',
      '  group_snapshot_json, input_snapshot_json, status, completed_by, completed_at, notes',
      ') VALUES (?, \'DEMO-PKG-001\', ?, ?, ?, 10, 60, ?, 20.2, ?, ?, ?, ?, ?, \'completed\', ?, ?, ?)'
    ]),
    [
      STORE_ID,
      data.groupId,
      data.rawItem.id,
      data.warehouseId,
      rawCost,
      totalCost,
      costPerOuter,
      costPerInner,
      JSON.stringify(groupSnapshot),
      JSON.stringify(inputSnapshot),
      data.createdBy,
      SEEDED_AT,
      'Demo packaging operation: 10 ready 6 kg cartons.'
    ]
  );
  const operationId = operationResult.insertId;

  const operationComponents = [
    {
      itemId: data.rawItem.id,
      role: 'raw_input',
      quantityPerOuter: 6,
      required: 60,
      unitCost: rawCost,
      total: 72,
      snapshot: inputSnapshot
    },
    {
      itemId: data.outerItem.id,
      role: 'outer_sellable',
      quantityPerOuter: 1,
      required: 10,
      unitCost: outerCost,
      total: 5
    },
    {
      itemId: data.innerItem.id,
      role: 'inner_sellable',
      quantityPerOuter: 15,
      required: 150,
      unitCost: innerCost,
      total: 15
    },
    {
      itemId: data.stickerItem.id,
      role: 'consumable',
      quantityPerOuter: 1,
      required: 10,
      unitCost: stickerCost,
      total: 0.2
    }
  ];
  for (const component of operationComponents) {
    await db.execute(
      sql([
        'INSERT INTO packaging_operation_components (',
        '  packaging_operation_id, item_id, component_role, quantity_per_outer, required_quantity,',
        '  consumed_quantity, unit_cost, total_cost, component_snapshot_json',
        ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ]),
      [
        operationId,
        component.itemId,
        component.role,
        component.quantityPerOuter,
        component.required,
        component.required,
        component.unitCost,
        component.total,
        JSON.stringify(component.snapshot || {
          item_id: component.itemId,
          component_role: component.role,
          quantity_per_outer: component.quantityPerOuter,
          unit_cost: component.unitCost
        })
      ]
    );
  }

  await insertMovement(db, {
    warehouseId: data.warehouseId,
    itemId: data.rawItem.id,
    movementType: 'opening_balance',
    quantityChange: rawStartingQuantity,
    quantityBefore: 0,
    quantityAfter: rawStartingQuantity,
    unitCost: rawCost,
    totalCost: rawStartingQuantity * rawCost,
    referenceType: 'demo_seed',
    cartonLotId,
    notes: 'Demo opening receipt: 50 sealed charcoal cartons.',
    createdBy: data.createdBy
  });
  for (let index = 0; index < 10; index += 1) {
    const shelfId = await insertClosedOpenCartonShelf(db, {
      warehouseId: data.warehouseId,
      itemId: data.rawItem.id,
      cartonLotId,
      openedBy: data.createdBy
    });
    await insertMovement(db, {
      warehouseId: data.warehouseId,
      itemId: data.rawItem.id,
      movementType: 'carton_open',
      quantityChange: 0,
      quantityBefore: rawStartingQuantity,
      quantityAfter: rawStartingQuantity,
      unitCost: rawCost,
      totalCost: 0,
      referenceType: 'carton_stock_lot',
      referenceId: cartonLotId,
      cartonLotId,
      openCartonShelfId: shelfId,
      notes: 'Demo carton opened for packaging loose-unit consumption.',
      createdBy: data.createdBy
    });
  }
  await insertMovement(db, {
    warehouseId: data.warehouseId,
    itemId: data.rawItem.id,
    movementType: 'packaging_consume',
    quantityChange: -rawConsumedQuantity,
    quantityBefore: rawStartingQuantity,
    quantityAfter: rawRemainingQuantity,
    unitCost: rawCost,
    totalCost: rawConsumedQuantity * rawCost,
    referenceType: 'packaging_operation',
    referenceId: operationId,
    notes: 'Demo packaging consumed 150 loose charcoal units across ten opened cartons.',
    createdBy: data.createdBy
  });

  const packagingOpeningAndConsumption = [
    [data.outerItem, outerStartingQuantity, outerConsumedQuantity, outerCost, 'Demo carton stock'],
    [data.innerItem, innerStartingQuantity, innerConsumedQuantity, innerCost, 'Demo inner bag stock'],
    [data.stickerItem, stickerStartingQuantity, stickerConsumedQuantity, stickerCost, 'Demo seal sticker stock'],
    [data.weightItem, 120, 0, 1.05, 'Demo loose bulk-charcoal stock'],
    [data.pieceItem, 60, 0, 0.15, 'Demo fire-starter stock']
  ];
  for (const [item, startingQuantity, consumedQuantity, unitCost, label] of packagingOpeningAndConsumption) {
    await insertMovement(db, {
      warehouseId: data.warehouseId,
      itemId: item.id,
      movementType: 'opening_balance',
      quantityChange: startingQuantity,
      quantityBefore: 0,
      quantityAfter: startingQuantity,
      unitCost,
      totalCost: startingQuantity * unitCost,
      referenceType: 'demo_seed',
      notes: label + '.',
      createdBy: data.createdBy
    });
    if (consumedQuantity > 0) {
      await insertMovement(db, {
        warehouseId: data.warehouseId,
        itemId: item.id,
        movementType: 'packaging_consume',
        quantityChange: -consumedQuantity,
        quantityBefore: startingQuantity,
        quantityAfter: startingQuantity - consumedQuantity,
        unitCost,
        totalCost: consumedQuantity * unitCost,
        referenceType: 'packaging_operation',
        referenceId: operationId,
        notes: 'Demo packaging consumed ' + consumedQuantity + ' ' + label.toLowerCase() + '.',
        createdBy: data.createdBy
      });
    }
  }

  for (let index = 0; index < 10; index += 1) {
    const [containerResult] = await db.execute(
      sql([
        'INSERT INTO ready_stock_containers (',
        '  store_id, packaging_operation_id, packaging_group_id, warehouse_id, outer_item_id, inner_item_id,',
        '  outer_name_snapshot, inner_name_snapshot, initial_inner_quantity, remaining_inner_quantity,',
        '  reserved_inner_quantity, capacity_kg, total_cost, remaining_cost, status',
        ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, 15, 15, 0, 6, ?, ?, \'full\')'
      ]),
      [
        STORE_ID,
        operationId,
        data.groupId,
        data.warehouseId,
        data.outerItem.id,
        data.innerItem.id,
        'Demo 6 kg Carton',
        'Demo 0.4 kg Inner Bag',
        costPerOuter,
        costPerOuter
      ]
    );
    await insertReadyMovement(db, {
      warehouseId: data.warehouseId,
      containerId: containerResult.insertId,
      movementType: 'packaging_complete',
      innerQuantityChange: 15,
      innerQuantityBefore: 0,
      innerQuantityAfter: 15,
      costChange: costPerOuter,
      costBefore: 0,
      costAfter: costPerOuter,
      referenceType: 'packaging_operation',
      referenceId: operationId,
      notes: 'Demo ready carton ' + (index + 1) + ' created.',
      createdBy: data.createdBy
    });
  }
  return { operationId, created: true };
}

async function main() {
  const db = await createDatabaseConnection();
  try {
    await db.beginTransaction();
    await ensureStoreProfile(db);
    const units = await ensureStandardUnits(db);
    const users = await ensureUsers(db);
    const ownerId = users.demo_owner.id;

    const rawCategory = await ensureCategory(db, 'DEMO-RAW', 'Demo Raw Charcoal', ownerId);
    const normalCategory = await ensureCategory(db, 'DEMO-NORMAL', 'Demo Normal Goods', ownerId);
    const packagingCategory = await ensureCategory(db, 'DEMO-PACKAGING', 'Demo Packaging', ownerId);

    const rawItem = await ensureItem(db, {
      categoryId: rawCategory.id,
      baseUnitId: units.kg,
      name: 'Demo Bulk Charcoal Carton',
      code: 'DEMO-RAW-CARTON-6KG',
      itemKind: 'normal',
      stockMode: 'carton_weight',
      kgPerCarton: 6,
      looseUnitsPerCarton: 15,
      description: '6 kg sealed carton with fifteen 0.4 kg loose units.',
      defaultCost: 1.2,
      cartonSellingPrice: 9,
      looseUnitSellingPrice: 0.75,
      reorderLevel: 60,
      createdBy: ownerId
    });
    const weightItem = await ensureItem(db, {
      categoryId: normalCategory.id,
      baseUnitId: units.kg,
      name: 'Demo Loose Bulk Charcoal',
      code: 'DEMO-NORMAL-WEIGHT',
      itemKind: 'normal',
      stockMode: 'weight',
      description: 'Loose charcoal sold by kilogram.',
      defaultCost: 1.05,
      defaultSellingPrice: 1.8,
      reorderLevel: 25,
      createdBy: ownerId
    });
    const pieceItem = await ensureItem(db, {
      categoryId: normalCategory.id,
      baseUnitId: units.pc,
      name: 'Demo Fire Starter',
      code: 'DEMO-NORMAL-PIECE',
      itemKind: 'normal',
      stockMode: 'piece',
      description: 'Piece-based charcoal fire starter.',
      defaultCost: 0.15,
      defaultSellingPrice: 0.5,
      reorderLevel: 20,
      createdBy: ownerId
    });
    const outerItem = await ensureItem(db, {
      categoryId: packagingCategory.id,
      baseUnitId: units.pc,
      name: 'Demo 6 kg Carton',
      code: 'DEMO-PKG-OUTER-6KG',
      itemKind: 'packaging',
      stockMode: 'piece',
      maxContentWeightKg: 6,
      description: 'Sellable outer carton with 6 kg capacity.',
      defaultCost: 0.5,
      reorderLevel: 10,
      createdBy: ownerId
    });
    const innerItem = await ensureItem(db, {
      categoryId: packagingCategory.id,
      baseUnitId: units.pc,
      name: 'Demo 0.4 kg Inner Bag',
      code: 'DEMO-PKG-INNER-400G',
      itemKind: 'packaging',
      stockMode: 'piece',
      maxContentWeightKg: 0.4,
      description: 'Sellable inner bag with 0.4 kg capacity.',
      defaultCost: 0.1,
      reorderLevel: 75,
      createdBy: ownerId
    });
    const stickerItem = await ensureItem(db, {
      categoryId: packagingCategory.id,
      baseUnitId: units.pc,
      name: 'Demo Carton Seal Sticker',
      code: 'DEMO-PKG-STICKER',
      itemKind: 'packaging',
      stockMode: 'piece',
      maxContentWeightKg: 0,
      description: 'Packaging consumable with no intrinsic capacity.',
      defaultCost: 0.02,
      reorderLevel: 10,
      createdBy: ownerId
    });

    const beirut = await ensureLocation(db, 'DEMO-BEY', 'Beirut', ownerId);
    const mountLebanon = await ensureLocation(db, 'DEMO-ML', 'Mount Lebanon', ownerId);
    const hamra = await ensureSublocation(db, beirut.id, 'DEMO-HAMRA', 'Hamra', ownerId);
    const achrafieh = await ensureSublocation(db, beirut.id, 'DEMO-ACHRAFIEH', 'Achrafieh', ownerId);
    const jounieh = await ensureSublocation(db, mountLebanon.id, 'DEMO-JOUNIEH', 'Jounieh', ownerId);
    const warehouse = await ensureWarehouse(db, beirut.id);

    const ali = await ensureSalesman(db, users.ali_salesman, 'TRK-101');
    const maya = await ensureSalesman(db, users.maya_salesman, 'TRK-202');
    await assignSalesman(db, ali.id, hamra.id);
    await assignSalesman(db, maya.id, achrafieh.id);
    await assignSalesman(db, maya.id, jounieh.id);

    await ensureCustomer(db, {
      code: 'DEMO-CUST-001',
      name: 'Hamra Mini Market',
      phone: '+96171111001',
      locationId: beirut.id,
      sublocationId: hamra.id,
      salesmanId: ali.id,
      address: 'Hamra main street',
      notes: 'Prefers ready 6 kg cartons.',
      createdBy: ownerId
    });
    await ensureCustomer(db, {
      code: 'DEMO-CUST-002',
      name: 'Achrafieh Grill House',
      phone: '+96171111002',
      locationId: beirut.id,
      sublocationId: achrafieh.id,
      salesmanId: maya.id,
      address: 'Sassine area',
      notes: 'Restaurant account.',
      createdBy: ownerId
    });
    await ensureCustomer(db, {
      code: 'DEMO-CUST-003',
      name: 'Jounieh Superette',
      phone: '+96171111003',
      locationId: mountLebanon.id,
      sublocationId: jounieh.id,
      salesmanId: maya.id,
      address: 'Old souk road',
      notes: 'Weekly delivery.',
      createdBy: ownerId
    });

    await ensureCashAccount(db, 'Demo Main Cash', 'cash', 'both', 1500);
    await ensureCashAccount(db, 'Demo Collections Bank', 'bank', 'incoming', 5000);

    const group = await ensurePackagingGroup(db, {
      name: 'Demo 6 kg Carton (15 x 0.4 kg bags)',
      code: 'DEMO-PKG-6KG',
      inputItemId: rawItem.id,
      warehouseId: warehouse.id,
      description: 'Flat demo packaging template using carton-weight raw charcoal.',
      createdBy: ownerId
    });
    await ensureGroupComponent(db, group.id, {
      role: 'outer_sellable',
      itemId: outerItem.id,
      quantityPerOuter: 1,
      sortOrder: 0,
      notes: 'One sellable carton.'
    });
    await ensureGroupComponent(db, group.id, {
      role: 'inner_sellable',
      itemId: innerItem.id,
      quantityPerOuter: 15,
      sortOrder: 1,
      notes: 'Fifteen 0.4 kg bags per carton.'
    });
    await ensureGroupComponent(db, group.id, {
      role: 'consumable',
      itemId: stickerItem.id,
      quantityPerOuter: 1,
      sortOrder: 2,
      notes: 'One seal sticker per carton.'
    });

    const catalog = [
      {
        entryType: 'normal_carton',
        itemId: rawItem.id,
        displayName: 'Demo Bulk Charcoal — sealed 6 kg carton',
        unitLabel: 'carton',
        defaultPrice: 9,
        vatRate: 0,
        isPosActive: true
      },
      {
        entryType: 'normal_loose_unit',
        itemId: rawItem.id,
        displayName: 'Demo Bulk Charcoal — 0.4 kg loose unit',
        unitLabel: 'bag',
        defaultPrice: 0.75,
        vatRate: 0,
        isPosActive: true
      },
      {
        entryType: 'normal_weight',
        itemId: weightItem.id,
        displayName: 'Demo Loose Bulk Charcoal',
        unitLabel: 'kg',
        defaultPrice: 1.8,
        vatRate: 0,
        isPosActive: true
      },
      {
        entryType: 'normal_piece',
        itemId: pieceItem.id,
        displayName: 'Demo Fire Starter',
        unitLabel: 'piece',
        defaultPrice: 0.5,
        vatRate: 0,
        isPosActive: true
      },
      {
        entryType: 'ready_outer_carton',
        packagingGroupId: group.id,
        displayName: 'Demo Ready 6 kg Carton',
        unitLabel: 'carton',
        defaultPrice: 12,
        vatRate: 0,
        isPosActive: true
      },
      {
        entryType: 'ready_inner_unit',
        packagingGroupId: group.id,
        displayName: 'Demo Ready 0.4 kg Inner Bag',
        unitLabel: 'bag',
        defaultPrice: 0.9,
        vatRate: 0,
        isPosActive: true
      }
    ];
    for (const entry of catalog) {
      await ensureSaleCatalogEntry(db, { ...entry, createdBy: ownerId });
    }

    const inventory = await createDemoInventory(db, {
      groupId: group.id,
      warehouseId: warehouse.id,
      rawItem,
      weightItem,
      pieceItem,
      outerItem,
      innerItem,
      stickerItem,
      createdBy: ownerId
    });

    await db.commit();
    console.log('Canonical demo seed completed.');
    console.log('Store: ' + STORE_ID);
    console.log('Packaging operation: DEMO-PKG-001 (' + (inventory.created ? 'created' : 'already present') + ').');
    console.log('Accounts:');
    for (const account of CREDENTIALS) {
      console.log('- ' + account.email + ' / ' + PASSWORD + ' (' + account.role + ')');
    }
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
