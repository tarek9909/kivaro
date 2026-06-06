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
    await seedOwner({
      fullName: 'Integration Owner',
      username: 'owner',
      email: 'owner@example.com',
      password: process.env.OWNER_PASSWORD,
      forceUpdatePassword: true
    });
    return true;
  } catch (error) {
    if (isDbUnavailable(error)) {
      return false;
    }

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
      if (typeof value !== 'function') {
        return value;
      }

      return (...args) => value.apply(target, args).set('Authorization', `Bearer ${token}`);
    }
  });
}

function suffix(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

async function createInventoryFixture(token, prefix = 'fixture') {
  const warehouseResponse = await authRequest(token)
    .post('/api/warehouses')
    .send({
      name: suffix(`${prefix}_warehouse`),
      code: suffix(`${prefix}_wh`)
    })
    .expect(201);

  const itemResponse = await authRequest(token)
    .post('/api/items')
    .send({
      category_id: 1,
      base_unit_id: 1,
      name: suffix(`${prefix}_item`),
      code: suffix(`${prefix}_item_code`),
      item_type: 'raw_charcoal',
      tracking_type: 'stocked',
      default_cost: 2,
      default_selling_price: 5,
      reorder_level: 0
    })
    .expect(201);

  const variantResponse = await authRequest(token)
    .post('/api/item-variants')
    .send({
      item_id: itemResponse.body.data.item.id,
      variant_name: 'Default',
      sku: suffix(`${prefix}_sku`),
      cost: 2,
      selling_price: 5
    })
    .expect(201);

  if (['dispatch', 'production', 'audit', 'return', 'packaging'].some(k => prefix.includes(k))) {
    await authRequest(token)
      .post('/api/stock-adjustments')
      .send({
        target_type: 'item',
        warehouse_id: warehouseResponse.body.data.warehouse.id,
        item_id: itemResponse.body.data.item.id,
        quantity_change: 1000,
        unit_cost: 2,
        reason: 'Initial item pool stock for test fixture'
      })
      .expect(201);
  }

  return {
    warehouse: warehouseResponse.body.data.warehouse,
    item: itemResponse.body.data.item,
    variant: variantResponse.body.data.item_variant
  };
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
    .send({
      sublocation_id: sublocationResponse.body.data.sublocation.id,
      assigned_at: '2026-05-01'
    })
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
  createInventoryFixture,
  createLocationFixture,
  dbQuery,
  loginOwner,
  prepareIntegrationDb,
  request
};
