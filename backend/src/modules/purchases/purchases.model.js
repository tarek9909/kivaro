const { query } = require('../../bootstrap/db');
const { findById, insertRecord, listRecords, nullable, updateRecord } = require('../../utils/crud');

async function listSuppliers(input) {
  return listRecords({
    select: 'SELECT id, store_id, name, phone, email, address, contact_person, status, created_by, created_at, updated_at',
    from: 'suppliers',
    filters: [
      { key: 'status', column: 'status' },
      { key: 'store_id', column: 'store_id' },
      { key: 'search', type: 'search', fields: ['name', 'phone', 'email', 'contact_person'] }
    ],
    orderBy: 'ORDER BY name ASC'
  }, input);
}

async function findSupplierById(id) {
  return findById('suppliers', id);
}

async function createSupplier(data) {
  return insertRecord('suppliers', data);
}

async function updateSupplier(id, data) {
  return updateRecord('suppliers', id, data);
}

async function deactivateSupplier(id) {
  const result = await query('UPDATE suppliers SET status = ? WHERE id = ?', ['inactive', id]);
  return result.affectedRows;
}

async function listPurchaseOrders(input) {
  return listRecords({
    select: `SELECT
      po.id, po.store_id, po.po_number, po.supplier_id, s.name AS supplier_name, po.warehouse_id,
      w.name AS warehouse_name, po.cash_account_id, ca.account_name AS cash_account_name,
      po.payment_method, po.order_date, po.expected_date, po.status, po.subtotal,
      po.discount_amount, po.tax_amount, po.total_amount, po.amount_paid, po.notes,
      po.created_by, po.approved_by, po.approved_at, po.created_at, po.updated_at`,
    from: 'purchase_orders po',
    joins: `
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      JOIN warehouses w ON w.id = po.warehouse_id
      LEFT JOIN cash_accounts ca ON ca.id = po.cash_account_id`,
    filters: [
      { key: 'status', column: 'po.status' },
      { key: 'store_id', column: 'po.store_id' },
      { key: 'supplier_id', column: 'po.supplier_id' },
      { key: 'warehouse_id', column: 'po.warehouse_id' },
      { key: 'date_from', column: 'po.order_date', operator: 'date_gte' },
      { key: 'date_to', column: 'po.order_date', operator: 'date_lte' },
      { key: 'search', type: 'search', fields: ['po.po_number', 's.name'] }
    ],
    orderBy: 'ORDER BY po.created_at DESC, po.id DESC'
  }, input);
}

async function findPurchaseOrderById(id) {
  const rows = await query(
    `SELECT po.*, s.name AS supplier_name, w.name AS warehouse_name, ca.account_name AS cash_account_name
     FROM purchase_orders po
     LEFT JOIN suppliers s ON s.id = po.supplier_id
     JOIN warehouses w ON w.id = po.warehouse_id
     LEFT JOIN cash_accounts ca ON ca.id = po.cash_account_id
     WHERE po.id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function getPurchaseOrderItems(id) {
  return query(
    `SELECT
      poi.id, poi.purchase_order_id, poi.item_id, poi.item_variant_id, iv.variant_name, iv.sku,
      i.base_unit_id, u.symbol AS base_unit_symbol, u.unit_type AS base_unit_type,
      u.conversion_to_base AS base_unit_conversion_to_base,
      i.name AS item_name, poi.ordered_quantity, poi.received_quantity,
      poi.unit_cost, poi.line_total, poi.notes, poi.created_at
     FROM purchase_order_items poi
     JOIN items i ON i.id = poi.item_id
     JOIN units u ON u.id = i.base_unit_id
     LEFT JOIN item_variants iv ON iv.id = poi.item_variant_id
     WHERE poi.purchase_order_id = ?
     ORDER BY poi.id ASC`,
    [id]
  );
}

async function getPurchaseOrderReceipts(id) {
  return query(
    `SELECT id, purchase_order_id, receipt_number, received_date, status, notes, received_by, created_at
     FROM purchase_receipts
     WHERE purchase_order_id = ?
     ORDER BY created_at DESC, id DESC`,
    [id]
  );
}

async function getPurchaseOrderReceivedValue(id, connection = null) {
  const sql = `SELECT COALESCE(SUM(pri.received_quantity * pri.unit_cost), 0) AS received_value
     FROM purchase_receipt_items pri
     JOIN purchase_receipts pr ON pr.id = pri.purchase_receipt_id
     WHERE pr.purchase_order_id = ?
       AND pr.status = 'posted'`;
  const rows = connection
    ? (await connection.execute(sql, [id]))[0]
    : await query(sql, [id]);

  return Number(rows[0]?.received_value || 0);
}

async function createPurchaseOrder(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO purchase_orders (
      store_id, po_number, supplier_id, warehouse_id, cash_account_id, payment_method,
      order_date, expected_date, status,
      subtotal, discount_amount, tax_amount, total_amount, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.po_number,
      nullable(data.supplier_id),
      data.warehouse_id,
      nullable(data.cash_account_id),
      data.payment_method || 'cash',
      data.order_date,
      nullable(data.expected_date),
      data.status || 'draft',
      data.subtotal,
      data.discount_amount,
      data.tax_amount,
      data.total_amount,
      nullable(data.notes),
      nullable(data.created_by)
    ]
  );

  return result.insertId;
}

async function createPurchaseOrderItem(connection, data) {
  await connection.execute(
    `INSERT INTO purchase_order_items (
      purchase_order_id, item_id, item_variant_id, ordered_quantity, unit_cost, line_total, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.purchase_order_id,
      data.item_id,
      nullable(data.item_variant_id),
      data.ordered_quantity,
      data.unit_cost,
      data.line_total,
      nullable(data.notes)
    ]
  );
}

async function updatePurchaseOrder(id, data) {
  return updateRecord('purchase_orders', id, data);
}

async function setPurchaseOrderStatus(connection, id, status) {
  await connection.execute(
    `UPDATE purchase_orders
     SET status = ?
     WHERE id = ?`,
    [status, id]
  );
}

async function approvePurchaseOrder(connection, id, userId) {
  await connection.execute(
    `UPDATE purchase_orders
     SET status = 'approved', approved_by = ?, approved_at = NOW()
     WHERE id = ? AND status IN ('draft','pending')`,
    [userId, id]
  );

  return findPurchaseOrderById(id);
}

async function lockPurchaseOrder(connection, id) {
  const [rows] = await connection.execute(
    `SELECT *
     FROM purchase_orders
     WHERE id = ?
     LIMIT 1
     FOR UPDATE`,
    [id]
  );

  return rows[0] || null;
}

async function lockPurchaseOrderItems(connection, purchaseOrderId) {
  const [rows] = await connection.execute(
    `SELECT poi.*, i.base_unit_id, u.symbol AS base_unit_symbol,
       u.unit_type AS base_unit_type, u.conversion_to_base AS base_unit_conversion_to_base
     FROM purchase_order_items poi
     JOIN items i ON i.id = poi.item_id
     JOIN units u ON u.id = i.base_unit_id
     WHERE poi.purchase_order_id = ?
     FOR UPDATE`,
    [purchaseOrderId]
  );

  return rows;
}

async function createReceipt(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO purchase_receipts (
      store_id, purchase_order_id, receipt_number, received_date, status, notes, received_by
    ) VALUES (?, ?, ?, ?, 'posted', ?, ?)`,
    [
      data.store_id,
      data.purchase_order_id,
      data.receipt_number,
      data.received_date,
      nullable(data.notes),
      nullable(data.received_by)
    ]
  );

  return result.insertId;
}

async function createReceiptItem(connection, data) {
  await connection.execute(
    `INSERT INTO purchase_receipt_items (
      purchase_receipt_id, purchase_order_item_id, item_id, item_variant_id, received_quantity, unit_cost
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.purchase_receipt_id,
      data.purchase_order_item_id,
      data.item_id,
      nullable(data.item_variant_id),
      data.received_quantity,
      data.unit_cost
    ]
  );
}

async function incrementReceivedQuantity(connection, purchaseOrderItemId, quantity) {
  await connection.execute(
    `UPDATE purchase_order_items
     SET received_quantity = received_quantity + ?
     WHERE id = ?`,
    [quantity, purchaseOrderItemId]
  );
}

async function getReceiptById(id) {
  const rows = await query(
    `SELECT id, store_id, purchase_order_id, receipt_number, received_date, status, notes, received_by, created_at
     FROM purchase_receipts
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function listSupplierPayments(input) {
  return listRecords({
    select: `SELECT
      sp.id, sp.store_id, sp.supplier_id, s.name AS supplier_name, sp.purchase_order_id,
      po.po_number, sp.payment_date, sp.amount, sp.payment_method, sp.reference_number,
      sp.notes, sp.created_by, sp.created_at`,
    from: 'supplier_payments sp',
    joins: `
      JOIN suppliers s ON s.id = sp.supplier_id
      LEFT JOIN purchase_orders po ON po.id = sp.purchase_order_id`,
    filters: [
      { key: 'supplier_id', column: 'sp.supplier_id' },
      { key: 'store_id', column: 'sp.store_id' },
      { key: 'purchase_order_id', column: 'sp.purchase_order_id' },
      { key: 'date_from', column: 'sp.payment_date', operator: 'date_gte' },
      { key: 'date_to', column: 'sp.payment_date', operator: 'date_lte' }
    ],
    orderBy: 'ORDER BY sp.payment_date DESC, sp.id DESC'
  }, input);
}

async function getSupplierPaymentById(id) {
  return findById('supplier_payments', id);
}

async function createSupplierPaymentRecord(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO supplier_payments (
      store_id, supplier_id, purchase_order_id, payment_date, amount, payment_method,
      reference_number, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.store_id,
      data.supplier_id,
      nullable(data.purchase_order_id),
      data.payment_date,
      data.amount,
      data.payment_method || 'cash',
      nullable(data.reference_number),
      nullable(data.notes),
      nullable(data.created_by)
    ]
  );

  return result.insertId;
}

async function incrementPurchaseOrderPaid(connection, purchaseOrderId, amount) {
  if (!purchaseOrderId) {
    return;
  }

  await connection.execute(
      `UPDATE purchase_orders
       SET amount_paid = amount_paid + ?
       WHERE id = ?`,
    [amount, purchaseOrderId]
  );
}

module.exports = {
  approvePurchaseOrder,
  createPurchaseOrder,
  createPurchaseOrderItem,
  createReceipt,
  createReceiptItem,
  createSupplier,
  createSupplierPaymentRecord,
  deactivateSupplier,
  findPurchaseOrderById,
  findSupplierById,
  getPurchaseOrderItems,
  getPurchaseOrderReceipts,
  getPurchaseOrderReceivedValue,
  getSupplierPaymentById,
  getReceiptById,
  incrementPurchaseOrderPaid,
  incrementReceivedQuantity,
  listPurchaseOrders,
  listSupplierPayments,
  listSuppliers,
  lockPurchaseOrder,
  lockPurchaseOrderItems,
  setPurchaseOrderStatus,
  updatePurchaseOrder,
  updateSupplier
};
