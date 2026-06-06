const bcrypt = require('bcryptjs');
const { createDatabaseConnection } = require('./lib');

const STORE_ID = 1;
const PASSWORD = 'DemoPass123!';
const TODAY = '2026-06-07';

const CREDENTIALS = [
  { fullName: 'Demo Owner', username: 'demo_owner', email: 'demo.owner@kivaro.local', role: 'owner', phone: '+96170000001' },
  { fullName: 'Nour Accountant', username: 'nour_accountant', email: 'accountant@kivaro.local', role: 'accountant', phone: '+96170000002' },
  { fullName: 'Karim Warehouse', username: 'karim_warehouse', email: 'warehouse@kivaro.local', role: 'inventory_manager', phone: '+96170000003' },
  { fullName: 'Ali Driver', username: 'ali_driver', email: 'ali.salesman@kivaro.local', role: 'salesman', phone: '+96170000004' },
  { fullName: 'Maya Driver', username: 'maya_driver', email: 'maya.salesman@kivaro.local', role: 'salesman', phone: '+96170000005' }
];

function columnsSql(data) {
  return Object.keys(data).map((column) => `\`${column}\``).join(', ');
}

function placeholders(data) {
  return Object.keys(data).map(() => '?').join(', ');
}

async function getRoleIds(db) {
  const [roles] = await db.execute(
    `SELECT id, name FROM roles WHERE store_id = ? OR store_id IS NULL`,
    [STORE_ID]
  );
  return new Map(roles.map((role) => [role.name, role.id]));
}

async function upsert(db, table, data, updateColumns, selectSql, selectParams) {
  const updates = updateColumns.map((column) => `\`${column}\` = VALUES(\`${column}\`)`).join(', ');
  await db.execute(
    `INSERT INTO \`${table}\` (${columnsSql(data)})
     VALUES (${placeholders(data)})
     ON DUPLICATE KEY UPDATE ${updates}`,
    Object.values(data)
  );
  const [rows] = await db.execute(selectSql, selectParams);
  if (!rows.length) {
    throw new Error(`Failed to load ${table} after upsert.`);
  }
  return rows[0];
}

async function ensureStandardUnits(db) {
  await db.execute(
    `DELETE FROM units
     WHERE store_id = ?
       AND symbol NOT IN ('g', 'kg', 'ton', 'pc')`,
    [STORE_ID]
  );

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

  await upsert(
    db,
    'units',
    {
      store_id: STORE_ID,
      name: 'Gram',
      symbol: 'g',
      unit_type: 'weight',
      base_unit_id: kg.id,
      conversion_to_base: 0.001
    },
    ['name', 'unit_type', 'base_unit_id', 'conversion_to_base'],
    'SELECT id FROM units WHERE store_id = ? AND symbol = ?',
    [STORE_ID, 'g']
  );

  await upsert(
    db,
    'units',
    {
      store_id: STORE_ID,
      name: 'Ton',
      symbol: 'ton',
      unit_type: 'weight',
      base_unit_id: kg.id,
      conversion_to_base: 1000
    },
    ['name', 'unit_type', 'base_unit_id', 'conversion_to_base'],
    'SELECT id FROM units WHERE store_id = ? AND symbol = ?',
    [STORE_ID, 'ton']
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
      throw new Error(`Missing role "${account.role}".`);
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
      'SELECT id, full_name, email FROM users WHERE store_id = ? AND email = ?',
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
      item_type: data.itemType,
      tracking_type: 'stocked',
      description: data.description,
      default_cost: data.defaultCost,
      default_selling_price: data.defaultSellingPrice,
      reorder_level: data.reorderLevel,
      status: 'active',
      created_by: data.createdBy
    },
    [
      'category_id',
      'base_unit_id',
      'name',
      'item_type',
      'tracking_type',
      'description',
      'default_cost',
      'default_selling_price',
      'reorder_level',
      'status',
      'created_by'
    ],
    'SELECT id FROM items WHERE store_id = ? AND code = ?',
    [STORE_ID, data.code]
  );
}

async function ensureVariant(db, data) {
  return upsert(
    db,
    'item_variants',
    {
      store_id: STORE_ID,
      item_id: data.itemId,
      variant_name: data.variantName,
      sku: data.sku,
      attributes_json: JSON.stringify(data.attributes || {}),
      cost: data.cost,
      selling_price: data.sellingPrice,
      status: 'active'
    },
    ['item_id', 'variant_name', 'attributes_json', 'cost', 'selling_price', 'status'],
    'SELECT id FROM item_variants WHERE store_id = ? AND sku = ?',
    [STORE_ID, data.sku]
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
  const [existing] = await db.execute(
    'SELECT id FROM sublocations WHERE store_id = ? AND code = ? LIMIT 1',
    [STORE_ID, code]
  );

  if (existing.length) {
    await db.execute(
      `UPDATE sublocations
       SET location_id = ?, name = ?, status = 'active', created_by = ?
       WHERE id = ?`,
      [locationId, name, createdBy, existing[0].id]
    );
    return existing[0];
  }

  const [result] = await db.execute(
    `INSERT INTO sublocations (
      store_id, location_id, name, code, description, status, created_by
    ) VALUES (?, ?, ?, ?, NULL, 'active', ?)`,
    [STORE_ID, locationId, name, code, createdBy]
  );
  return { id: result.insertId };
}

async function ensureSalesman(db, user, vehicleNumber) {
  return upsert(
    db,
    'salesmen',
    {
      store_id: STORE_ID,
      user_id: user.id,
      full_name: user.full_name,
      phone: null,
      email: user.email,
      vehicle_number: vehicleNumber,
      national_id: null,
      base_salary: 900,
      status: 'active',
      joined_at: TODAY
    },
    ['store_id', 'full_name', 'email', 'vehicle_number', 'base_salary', 'status', 'joined_at'],
    'SELECT id, full_name FROM salesmen WHERE user_id = ?',
    [user.id]
  );
}

async function assignSalesman(db, salesmanId, sublocationId) {
  await db.execute(
    `INSERT INTO salesman_sublocations (salesman_id, sublocation_id, assigned_at, status)
     VALUES (?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE assigned_at = VALUES(assigned_at), status = 'active', unassigned_at = NULL`,
    [salesmanId, sublocationId, TODAY]
  );
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
      notes: data.notes,
      status: 'active',
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
      'notes',
      'status',
      'created_by'
    ],
    'SELECT id, name FROM customers WHERE store_id = ? AND customer_code = ?',
    [STORE_ID, data.code]
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

async function ensureCashAccount(db, accountName, accountType, balance) {
  return upsert(
    db,
    'cash_accounts',
    {
      store_id: STORE_ID,
      account_name: accountName,
      account_type: accountType,
      opening_balance: balance,
      current_balance: balance,
      status: 'active'
    },
    ['store_id', 'account_type', 'opening_balance', 'current_balance', 'status'],
    'SELECT id FROM cash_accounts WHERE account_name = ?',
    [accountName]
  );
}

async function setStock(db, warehouseId, variantId, quantity, cost) {
  await db.execute(
    `INSERT INTO stock_balances (
      store_id, warehouse_id, item_variant_id, quantity_on_hand, quantity_reserved, average_cost
    ) VALUES (?, ?, ?, ?, 0, ?)
    ON DUPLICATE KEY UPDATE
      store_id = VALUES(store_id),
      quantity_on_hand = VALUES(quantity_on_hand),
      quantity_reserved = 0,
      average_cost = VALUES(average_cost)`,
    [STORE_ID, warehouseId, variantId, quantity, cost]
  );
}

async function addStockMovement(db, warehouseId, variantId, type, change, before, after, cost, userId, notes, referenceId = null) {
  await db.execute(
    `INSERT INTO stock_movements (
      store_id, warehouse_id, item_variant_id, movement_type, quantity_change,
      quantity_before, quantity_after, reserved_quantity_change,
      reserved_quantity_before, reserved_quantity_after, unit_cost,
      reference_type, reference_id, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 'demo_seed', ?, ?, ?)`,
    [STORE_ID, warehouseId, variantId, type, change, before, after, cost, referenceId, notes, userId]
  );
}

async function removeDemoDispatch(db) {
  const [rows] = await db.execute(
    'SELECT id FROM dispatch_requests WHERE store_id = ? AND dispatch_number = ?',
    [STORE_ID, 'DEMO-DISP-001']
  );
  if (!rows.length) return;

  const dispatchId = rows[0].id;
  await db.execute(
    `DELETE dsc
     FROM dispatch_settlement_customers dsc
     INNER JOIN dispatch_settlements ds ON ds.id = dsc.dispatch_settlement_id
     WHERE ds.dispatch_request_id = ?`,
    [dispatchId]
  );
  await db.execute('DELETE FROM customer_receipts WHERE dispatch_request_id = ?', [dispatchId]);
  await db.execute('DELETE FROM customer_payments WHERE dispatch_request_id = ?', [dispatchId]);
  await db.execute('DELETE FROM customer_debts WHERE dispatch_request_id = ?', [dispatchId]);
  await db.execute('DELETE FROM dispatch_settlements WHERE dispatch_request_id = ?', [dispatchId]);
  await db.execute('DELETE FROM dispatch_items WHERE dispatch_request_id = ?', [dispatchId]);
  await db.execute('DELETE FROM dispatch_customers WHERE dispatch_request_id = ?', [dispatchId]);
  await db.execute('DELETE FROM dispatch_requests WHERE id = ?', [dispatchId]);
}

async function seedDemoDispatch(db, data) {
  await removeDemoDispatch(db);

  const [dispatchResult] = await db.execute(
    `INSERT INTO dispatch_requests (
      store_id, dispatch_number, salesman_id, warehouse_id, request_date, status,
      total_quantity, subtotal_amount, vat_amount, total_amount, total_collected,
      total_debt, approved_by, approved_at, dispatched_by, dispatched_at,
      completed_by, completed_at, notes, created_by
    ) VALUES (?, 'DEMO-DISP-001', ?, ?, ?, 'completed', 5, 60, 0, 60, 40, 20,
      ?, NOW(), ?, NOW(), ?, NOW(), 'Demo completed dispatch with partial customer payment.', ?)`,
    [
      STORE_ID,
      data.salesmanId,
      data.warehouseId,
      TODAY,
      data.userId,
      data.userId,
      data.userId,
      data.userId
    ]
  );
  const dispatchId = dispatchResult.insertId;

  const [dispatchCustomerResult] = await db.execute(
    `INSERT INTO dispatch_customers (
      store_id, dispatch_request_id, customer_id, location_id, sublocation_id,
      subtotal_amount, vat_amount, customer_total_amount, collected_amount,
      debt_amount, payment_status, receipt_number, notes
    ) VALUES (?, ?, ?, ?, ?, 60, 0, 60, 40, 20, 'partial_debt', 'DEMO-REC-001',
      'Demo customer paid part of the delivery.')`,
    [STORE_ID, dispatchId, data.customerId, data.locationId, data.sublocationId]
  );
  const dispatchCustomerId = dispatchCustomerResult.insertId;

  await db.execute(
    `INSERT INTO dispatch_items (
      dispatch_customer_id, dispatch_request_id, item_variant_id, quantity,
      unit_price, unit_cost, subtotal_amount, vat_rate, vat_amount, line_total
    ) VALUES (?, ?, ?, 5, 12, 6, 60, 0, 0, 60)`,
    [dispatchCustomerId, dispatchId, data.variantId]
  );

  const [debtResult] = await db.execute(
    `INSERT INTO customer_debts (
      store_id, customer_id, salesman_id, dispatch_request_id, dispatch_customer_id,
      debt_date, subtotal_amount, vat_amount, original_amount, paid_amount,
      remaining_amount, status, due_date, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, 60, 0, 20, 0, 20, 'pending', DATE_ADD(?, INTERVAL 14 DAY),
      'Demo remaining payment from completed dispatch.', ?)`,
    [STORE_ID, data.customerId, data.salesmanId, dispatchId, dispatchCustomerId, TODAY, TODAY, data.userId]
  );

  const [paymentResult] = await db.execute(
    `INSERT INTO customer_payments (
      store_id, customer_id, customer_debt_id, dispatch_request_id, payment_date,
      amount, payment_method, reference_number, collected_by_salesman_id,
      received_by_user_id, notes
    ) VALUES (?, ?, NULL, ?, ?, 40, 'cash', 'DEMO-PAY-001', ?, ?, 'Demo partial collection.')`,
    [STORE_ID, data.customerId, dispatchId, TODAY, data.salesmanId, data.userId]
  );

  await db.execute(
    `INSERT INTO customer_receipts (
      store_id, receipt_number, customer_id, dispatch_request_id, dispatch_customer_id,
      customer_payment_id, receipt_date, subtotal_amount, vat_amount, total_amount,
      paid_amount, remaining_amount, receipt_type, created_by
    ) VALUES (?, 'DEMO-REC-001', ?, ?, ?, ?, ?, 60, 0, 60, 40, 20, 'sale', ?)`,
    [STORE_ID, data.customerId, dispatchId, dispatchCustomerId, paymentResult.insertId, TODAY, data.userId]
  );

  await db.execute(
    `UPDATE customer_debts
     SET notes = CONCAT(notes, ' Debt id: ', ?)
     WHERE id = ?`,
    [debtResult.insertId, debtResult.insertId]
  );

  return dispatchId;
}

async function main() {
  const db = await createDatabaseConnection();

  try {
    await db.beginTransaction();

    await db.execute(
      `UPDATE stores
       SET name = 'Kivaro Demo Charcoal',
           code = 'KIVARO-DEMO',
           slug = 'kivaro-demo',
           status = 'active',
           contact_name = 'Demo Owner',
           phone = '+96170000000',
           email = 'demo@kivaro.local',
           address = 'Beirut, Lebanon',
           currency_code = 'USD'
       WHERE id = ?`,
      [STORE_ID]
    );

    const units = await ensureStandardUnits(db);
    const users = await ensureUsers(db);
    const ownerId = users.demo_owner.id;

    const rawCategory = await ensureCategory(db, 'DEMO-RAW', 'Raw Charcoal', ownerId);
    const finishedCategory = await ensureCategory(db, 'DEMO-FINISHED', 'Finished Goods', ownerId);
    const packagingCategory = await ensureCategory(db, 'DEMO-PACKAGING', 'Packaging Materials', ownerId);

    const rawItem = await ensureItem(db, {
      categoryId: rawCategory.id,
      baseUnitId: units.kg,
      name: 'Bulk Hardwood Charcoal',
      code: 'DEMO-RAW-CHAR',
      itemType: 'raw_charcoal',
      description: 'Bulk raw charcoal tracked by weight.',
      defaultCost: 1.1,
      defaultSellingPrice: null,
      reorderLevel: 500,
      createdBy: ownerId
    });
    const finishedItem = await ensureItem(db, {
      categoryId: finishedCategory.id,
      baseUnitId: units.kg,
      name: 'Premium Charcoal Bags',
      code: 'DEMO-FIN-CHAR',
      itemType: 'finished_product',
      description: 'Packed charcoal variants sold by weight.',
      defaultCost: 5.5,
      defaultSellingPrice: 12,
      reorderLevel: 50,
      createdBy: ownerId
    });
    const cartonItem = await ensureItem(db, {
      categoryId: packagingCategory.id,
      baseUnitId: units.pc,
      name: 'Printed Carton Box',
      code: 'DEMO-PKG-CARTON',
      itemType: 'packaging',
      description: 'Packaging carton tracked as pieces.',
      defaultCost: 0.45,
      defaultSellingPrice: null,
      reorderLevel: 100,
      createdBy: ownerId
    });
    const bagItem = await ensureItem(db, {
      categoryId: packagingCategory.id,
      baseUnitId: units.pc,
      name: 'Charcoal Retail Bag',
      code: 'DEMO-PKG-BAG',
      itemType: 'packaging',
      description: 'Retail bag tracked as pieces.',
      defaultCost: 0.18,
      defaultSellingPrice: null,
      reorderLevel: 200,
      createdBy: ownerId
    });

    const rawBulk = await ensureVariant(db, {
      itemId: rawItem.id,
      variantName: 'Bulk Raw Charcoal',
      sku: 'DEMO-RAW-BULK',
      attributes: { unit: 'kg' },
      cost: 1.1,
      sellingPrice: null
    });
    const fiveKg = await ensureVariant(db, {
      itemId: finishedItem.id,
      variantName: 'Premium Charcoal 5 kg Bag',
      sku: 'DEMO-CHAR-5KG',
      attributes: { packageWeightKg: 5 },
      cost: 3.25,
      sellingPrice: 7
    });
    const tenKg = await ensureVariant(db, {
      itemId: finishedItem.id,
      variantName: 'Premium Charcoal 10 kg Bag',
      sku: 'DEMO-CHAR-10KG',
      attributes: { packageWeightKg: 10 },
      cost: 6,
      sellingPrice: 12
    });
    const carton = await ensureVariant(db, {
      itemId: cartonItem.id,
      variantName: '10 kg Printed Carton',
      sku: 'DEMO-PKG-CARTON-10KG',
      attributes: { fits: '10kg bag', unit: 'pc' },
      cost: 0.45,
      sellingPrice: null
    });
    const bag = await ensureVariant(db, {
      itemId: bagItem.id,
      variantName: '5 kg Retail Bag',
      sku: 'DEMO-PKG-BAG-5KG',
      attributes: { fits: '5kg charcoal', unit: 'pc' },
      cost: 0.18,
      sellingPrice: null
    });

    const beirut = await ensureLocation(db, 'DEMO-BEY', 'Beirut', ownerId);
    const mountLebanon = await ensureLocation(db, 'DEMO-ML', 'Mount Lebanon', ownerId);
    const hamra = await ensureSublocation(db, beirut.id, 'DEMO-HAMRA', 'Hamra', ownerId);
    const achrafieh = await ensureSublocation(db, beirut.id, 'DEMO-ACHRAFIEH', 'Achrafieh', ownerId);
    const jounieh = await ensureSublocation(db, mountLebanon.id, 'DEMO-JOUNIEH', 'Jounieh', ownerId);
    const warehouse = await ensureWarehouse(db, beirut.id);

    const ali = await ensureSalesman(db, users.ali_driver, 'TRK-101');
    const maya = await ensureSalesman(db, users.maya_driver, 'TRK-202');
    await assignSalesman(db, ali.id, hamra.id);
    await assignSalesman(db, maya.id, hamra.id);
    await assignSalesman(db, maya.id, jounieh.id);

    const customers = [];
    customers.push(await ensureCustomer(db, {
      code: 'DEMO-CUST-001',
      name: 'Hamra Mini Market',
      phone: '+96171111001',
      locationId: beirut.id,
      sublocationId: hamra.id,
      salesmanId: ali.id,
      address: 'Hamra main street',
      notes: 'Prefers 10 kg bags.',
      createdBy: ownerId
    }));
    customers.push(await ensureCustomer(db, {
      code: 'DEMO-CUST-002',
      name: 'Achrafieh Grill House',
      phone: '+96171111002',
      locationId: beirut.id,
      sublocationId: achrafieh.id,
      salesmanId: maya.id,
      address: 'Sassine area',
      notes: 'Restaurant account.',
      createdBy: ownerId
    }));
    customers.push(await ensureCustomer(db, {
      code: 'DEMO-CUST-003',
      name: 'Jounieh Superette',
      phone: '+96171111003',
      locationId: mountLebanon.id,
      sublocationId: jounieh.id,
      salesmanId: maya.id,
      address: 'Old souk road',
      notes: 'Weekly delivery.',
      createdBy: ownerId
    }));

    await ensureCashAccount(db, 'Demo Main Cash', 'cash', 1500);
    await ensureCashAccount(db, 'Demo Bank Account', 'bank', 5000);

    await db.execute("DELETE FROM stock_movements WHERE store_id = ? AND reference_type = 'demo_seed'", [STORE_ID]);
    await setStock(db, warehouse.id, rawBulk.id, 2500, 1.1);
    await setStock(db, warehouse.id, fiveKg.id, 180, 3.25);
    await setStock(db, warehouse.id, tenKg.id, 115, 6);
    await setStock(db, warehouse.id, carton.id, 500, 0.45);
    await setStock(db, warehouse.id, bag.id, 900, 0.18);

    await addStockMovement(db, warehouse.id, rawBulk.id, 'adjustment', 2500, 0, 2500, 1.1, ownerId, 'Demo opening stock for bulk charcoal.');
    await addStockMovement(db, warehouse.id, fiveKg.id, 'adjustment', 180, 0, 180, 3.25, ownerId, 'Demo opening stock for 5 kg bags.');
    await addStockMovement(db, warehouse.id, tenKg.id, 'adjustment', 120, 0, 120, 6, ownerId, 'Demo opening stock for 10 kg bags.');
    await addStockMovement(db, warehouse.id, carton.id, 'adjustment', 500, 0, 500, 0.45, ownerId, 'Demo opening stock for carton packaging.');
    await addStockMovement(db, warehouse.id, bag.id, 'adjustment', 900, 0, 900, 0.18, ownerId, 'Demo opening stock for bag packaging.');

    const dispatchId = await seedDemoDispatch(db, {
      userId: ownerId,
      salesmanId: ali.id,
      warehouseId: warehouse.id,
      customerId: customers[0].id,
      locationId: beirut.id,
      sublocationId: hamra.id,
      variantId: tenKg.id
    });
    await addStockMovement(db, warehouse.id, tenKg.id, 'dispatch_out', -5, 120, 115, 6, ownerId, 'Demo completed dispatch.', dispatchId);

    await db.commit();

    console.log('Demo seed completed.');
    console.log(`Store: ${STORE_ID}`);
    console.log('Accounts:');
    for (const account of CREDENTIALS) {
      console.log(`- ${account.email} / ${PASSWORD} (${account.role})`);
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
