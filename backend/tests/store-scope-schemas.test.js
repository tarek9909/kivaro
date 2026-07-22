const inventorySchemas = require('../src/modules/inventory/inventory.schema');
const customerSchemas = require('../src/modules/customers/customers.schema');
const commissionSchemas = require('../src/modules/commissions/commissions.schema');

describe('store-scoped update schemas', () => {
  test.each([
    ['inventory category', inventorySchemas.updateCategorySchema, { name: 'Retail' }],
    ['inventory unit', inventorySchemas.updateUnitSchema, { symbol: 'kg' }],
    ['inventory item', inventorySchemas.updateItemSchema, { name: 'Premium charcoal' }],
    ['customer', customerSchemas.updateCustomerSchema, { name: 'Corner Market' }],
    ['commission rule', commissionSchemas.ruleUpdateSchema, { name: 'Monthly plan' }]
  ])('%s update strips store_id from payloads', (_label, schema, body) => {
    const parsed = schema.parse({
      params: { id: 1 },
      body: { ...body, store_id: 999 }
    });

    expect(parsed.body).toEqual(body);
    expect(parsed.body.store_id).toBeUndefined();
  });
});
