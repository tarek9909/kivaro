process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'charcoal_erp_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration_test_secret_change_me_123456';
process.env.OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'ChangeMe123!';

const request = require('supertest');
const app = require('../../../src/app');
const { closePool } = require('../../../src/bootstrap/db');
const {
  checkDatabase,
  createDatabaseConnection,
  resetDatabase,
  seedOwner
} = require('../../../scripts/db/lib');

function isDbUnavailable(error) {
  return ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ER_ACCESS_DENIED_ERROR'].includes(error.code);
}

async function prepareIntegrationDb() {
  try {
    await resetDatabase(process.env.DB_NAME);
    await checkDatabase();
    const owner = await seedOwner({
      fullName: 'Integration Owner',
      username: 'owner',
      email: 'owner@example.com',
      password: process.env.OWNER_PASSWORD,
      forceUpdatePassword: true
    });
    // The template owner has the platform-wide permission, which deliberately
    // requires an explicit store_id on every scoped request. Integration tests
    // exercise one store, so run the seeded account as the equivalent store
    // administrator and keep every request scoped by its token's store.
    const connection = await createDatabaseConnection();
    try {
      const [roles] = await connection.execute(
        "SELECT id FROM roles WHERE store_id = 1 AND name = 'admin' LIMIT 1"
      );
      await connection.execute('UPDATE users SET role_id = ? WHERE id = ?', [roles[0].id, owner.id]);
    } finally {
      await connection.end();
    }
    return true;
  } catch (error) {
    if (isDbUnavailable(error)) return false;
    throw error;
  }
}

async function dbQuery(sql, params = []) {
  const connection = await createDatabaseConnection();
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    await connection.end();
  }
}

async function loginOwner() {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ login: 'owner', password: process.env.OWNER_PASSWORD })
    .expect(200);
  return response.body.data.token;
}

function authRequest(token) {
  const client = request(app);
  return new Proxy(client, {
    get(target, property) {
      const value = target[property];
      if (typeof value !== 'function') return value;
      return (...args) => value.apply(target, args).set('Authorization', `Bearer ${token}`);
    }
  });
}

function suffix(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

async function createCategoryFixture(token, prefix = 'fixture') {
  const response = await authRequest(token)
    .post('/api/item-categories')
    .send({ name: suffix(`${prefix}_category`), code: suffix(`${prefix}_cat`) })
    .expect(201);
  return response.body.data.category;
}

async function createWarehouseFixture(token, prefix = 'fixture') {
  const response = await authRequest(token)
    .post('/api/warehouses')
    .send({ name: suffix(`${prefix}_warehouse`), code: suffix(`${prefix}_wh`) })
    .expect(201);
  return response.body.data.warehouse;
}

function itemPayload(prefix, category, options = {}) {
  const itemKind = options.item_kind || 'normal';
  const stockMode = options.stock_mode || 'piece';
  const isWeight = stockMode === 'weight' || stockMode === 'carton_weight';
  return {
    category_id: category.id,
    base_unit_id: options.base_unit_id || (isWeight ? 1 : 2),
    name: options.name || suffix(`${prefix}_item`),
    code: options.code || suffix(`${prefix}_item_code`),
    item_kind: itemKind,
    stock_mode: stockMode,
    kg_per_carton: stockMode === 'carton_weight' ? (options.kg_per_carton || 12) : undefined,
    loose_units_per_carton: stockMode === 'carton_weight' ? (options.loose_units_per_carton || 30) : undefined,
    max_content_weight_kg: itemKind === 'packaging' ? (options.max_content_weight_kg ?? 0) : undefined,
    default_cost: options.default_cost ?? 2,
    default_selling_price: options.default_selling_price ?? 5,
    carton_selling_price: options.carton_selling_price ?? (stockMode === 'carton_weight' ? 20 : undefined),
    loose_unit_selling_price: options.loose_unit_selling_price ?? (stockMode === 'carton_weight' ? 1 : undefined),
    reorder_level: options.reorder_level ?? 0
  };
}

async function receiveFixtureStock(token, fixture, data = {}) {
  const item = fixture.item || fixture;
  const warehouse = fixture.warehouse || data.warehouse;
  const stockMode = item.stock_mode;
  const body = {
    warehouse_id: warehouse.id,
    item_id: item.id,
    notes: data.notes || 'Integration fixture stock'
  };
  if (stockMode === 'carton_weight') {
    body.carton_count = data.carton_count ?? 1;
    body.cost_per_carton = data.cost_per_carton ?? 24;
  } else {
    body.quantity = data.quantity ?? 1;
    body.unit_cost = data.unit_cost ?? 2;
  }
  const response = await authRequest(token).post('/api/stock-receipts').send(body).expect(201);
  return response.body.data.receipt;
}

async function createInventoryFixture(token, prefix = 'fixture', options = {}) {
  const category = options.category || await createCategoryFixture(token, prefix);
  const warehouse = options.warehouse || await createWarehouseFixture(token, prefix);
  const response = await authRequest(token)
    .post('/api/items')
    .send(itemPayload(prefix, category, options))
    .expect(201);
  const fixture = { category, warehouse, item: response.body.data.item };
  if (options.receive !== false && options.initial_stock !== undefined) {
    await receiveFixtureStock(token, fixture, options.initial_stock);
  }
  return fixture;
}

async function createPackagingFixture(token, prefix = 'packaging') {
  const category = await createCategoryFixture(token, prefix);
  const warehouse = await createWarehouseFixture(token, prefix);
  const raw = await createInventoryFixture(token, `${prefix}_raw`, {
    category,
    warehouse,
    stock_mode: 'carton_weight',
    kg_per_carton: 12,
    loose_units_per_carton: 30,
    initial_stock: { carton_count: 5, cost_per_carton: 24 }
  });
  const outer = await createInventoryFixture(token, `${prefix}_outer`, {
    category,
    warehouse,
    item_kind: 'packaging',
    stock_mode: 'piece',
    max_content_weight_kg: 0,
    initial_stock: { quantity: 5, unit_cost: 1 }
  });
  const inner = await createInventoryFixture(token, `${prefix}_inner`, {
    category,
    warehouse,
    item_kind: 'packaging',
    stock_mode: 'piece',
    max_content_weight_kg: 0.4,
    initial_stock: { quantity: 75, unit_cost: 0.1 }
  });
  const consumable = await createInventoryFixture(token, `${prefix}_consumable`, {
    category,
    warehouse,
    item_kind: 'packaging',
    stock_mode: 'piece',
    max_content_weight_kg: 0,
    initial_stock: { quantity: 5, unit_cost: 0.2 }
  });
  const groupResponse = await authRequest(token)
    .post('/api/packaging-groups')
    .send({
      name: suffix(`${prefix}_group`),
      code: suffix(`${prefix}_group_code`),
      input_item_id: raw.item.id,
      default_warehouse_id: warehouse.id,
      components: [
        { item_id: outer.item.id, component_role: 'outer_sellable', quantity_per_outer: 1 },
        { item_id: inner.item.id, component_role: 'inner_sellable', quantity_per_outer: 15 },
        { item_id: consumable.item.id, component_role: 'consumable', quantity_per_outer: 1 }
      ]
    })
    .expect(201);
  return {
    category,
    warehouse,
    raw,
    outer,
    inner,
    consumable,
    group: groupResponse.body.data.packaging_group
  };
}

async function createSaleCatalogEntry(token, data) {
  const response = await authRequest(token)
    .post('/api/sale-catalog')
    .send(data)
    .expect(201);
  return response.body.data.sale_catalog_entry;
}

async function createLocationFixture(token, prefix = 'fixture') {
  const locationResponse = await authRequest(token)
    .post('/api/locations')
    .send({ name: suffix(`${prefix}_location`), code: suffix(`${prefix}_loc`) })
    .expect(201);
  const sublocationResponse = await authRequest(token)
    .post('/api/sublocations')
    .send({
      location_id: locationResponse.body.data.location.id,
      name: suffix(`${prefix}_sublocation`),
      code: suffix(`${prefix}_sub`)
    })
    .expect(201);
  const salesmanResponse = await authRequest(token)
    .post('/api/salesmen')
    .send({
      full_name: suffix(`${prefix}_salesman`),
      email: `${suffix(prefix)}@example.com`,
      joined_at: '2026-05-01'
    })
    .expect(201);
  await authRequest(token)
    .post(`/api/salesmen/${salesmanResponse.body.data.salesman.id}/sublocations`)
    .send({ sublocation_id: sublocationResponse.body.data.sublocation.id, assigned_at: '2026-05-01' })
    .expect(201);
  const customerResponse = await authRequest(token)
    .post('/api/customers')
    .send({
      name: suffix(`${prefix}_customer`),
      location_id: locationResponse.body.data.location.id,
      sublocation_id: sublocationResponse.body.data.sublocation.id,
      assigned_salesman_id: salesmanResponse.body.data.salesman.id
    })
    .expect(201);
  return {
    location: locationResponse.body.data.location,
    sublocation: sublocationResponse.body.data.sublocation,
    salesman: salesmanResponse.body.data.salesman,
    customer: customerResponse.body.data.customer
  };
}

module.exports = {
  app,
  authRequest,
  closeIntegrationPool: closePool,
  createCategoryFixture,
  createInventoryFixture,
  createLocationFixture,
  createPackagingFixture,
  createSaleCatalogEntry,
  createWarehouseFixture,
  dbQuery,
  loginOwner,
  prepareIntegrationDb,
  receiveFixtureStock,
  request,
  suffix
};
