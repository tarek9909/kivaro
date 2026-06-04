const { findById, insertRecord, listRecords, updateRecord } = require('../../utils/crud');
const { query } = require('../../bootstrap/db');

async function listCustomers(input) {
  return listRecords({
    select: `SELECT
      c.id, c.customer_code, c.name, c.phone, c.secondary_phone, c.location_id,
      l.name AS location_name, c.sublocation_id, sl.name AS sublocation_name,
      c.assigned_salesman_id, s.full_name AS assigned_salesman_name, c.address,
      c.detailed_address, c.notes, c.status, c.store_id, c.created_by, c.created_at, c.updated_at`,
    from: 'customers c',
    joins: `
      JOIN locations l ON l.id = c.location_id
      JOIN sublocations sl ON sl.id = c.sublocation_id
      LEFT JOIN salesmen s ON s.id = c.assigned_salesman_id`,
    filters: [
      { key: 'status', column: 'c.status' },
      { key: 'location_id', column: 'c.location_id' },
      { key: 'sublocation_id', column: 'c.sublocation_id' },
      { key: 'salesman_id', column: 'c.assigned_salesman_id' },
      { key: 'store_id', column: 'c.store_id' },
      { key: 'search', type: 'search', fields: ['c.name', 'c.customer_code', 'c.phone', 'c.address'] }
    ],
    orderBy: 'ORDER BY c.name ASC'
  }, input);
}

async function findCustomerById(id) {
  return findById('customers', id);
}

async function createCustomer(data) {
  return insertRecord('customers', data);
}

async function updateCustomer(id, data) {
  return updateRecord('customers', id, data);
}

async function deactivateCustomer(id) {
  const result = await query('UPDATE customers SET status = ? WHERE id = ?', ['inactive', id]);
  return result.affectedRows;
}

async function countCustomerHistory(id) {
  const rows = await query(
    `SELECT
      (SELECT COUNT(*) FROM dispatch_customers WHERE customer_id = ?) +
      (SELECT COUNT(*) FROM customer_debts WHERE customer_id = ?) +
      (SELECT COUNT(*) FROM customer_payments WHERE customer_id = ?) AS total`,
    [id, id, id]
  );

  return Number(rows[0].total);
}

module.exports = {
  countCustomerHistory,
  createCustomer,
  deactivateCustomer,
  findCustomerById,
  listCustomers,
  updateCustomer
};
