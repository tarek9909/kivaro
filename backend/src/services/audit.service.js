const { query } = require('../bootstrap/db');

const MODULE_ALIASES = {
  'cash-accounts': 'accounting',
  categories: 'inventory',
  'commission-calculations': 'commissions',
  'commission-payments': 'commissions',
  'commission-rules': 'commissions',
  'company-profile': 'settings',
  'customer-debts': 'debts',
  'customer-payments': 'payments',
  'customer-receipts': 'payments',
  'dispatch-customers': 'dispatch',
  'dispatch-requests': 'dispatch',
  'dispatch-settlements': 'dispatch',
  'expense-categories': 'accounting',
  expenses: 'accounting',
  'financial-transactions': 'accounting',
  items: 'inventory',
  'packaging-groups': 'inventory',
  'packaging-operations': 'inventory',
  'ready-stock': 'inventory',
  'sale-catalog': 'inventory',
  invoices: 'invoices',
  pos: 'pos',
  'purchase-orders': 'purchases',
  'stock-adjustments': 'inventory',
  'stock-movements': 'inventory',
  sublocations: 'locations',
  suppliers: 'purchases',
  units: 'inventory',
  warehouses: 'inventory'
};

const TABLE_ALIASES = {
  categories: 'item_categories',
  'cash-accounts': 'cash_accounts',
  'commission-calculations': 'commission_calculations',
  'commission-payments': 'commission_payments',
  'commission-rules': 'commission_rules',
  'company-profile': 'company_profiles',
  'customer-debts': 'customer_debts',
  'customer-payments': 'customer_payments',
  'customer-receipts': 'customer_receipts',
  'dispatch-customers': 'dispatch_customers',
  'dispatch-requests': 'dispatch_requests',
  'dispatch-settlements': 'dispatch_settlements',
  'expense-categories': 'expense_categories',
  'financial-transactions': 'financial_transactions',
  'packaging-groups': 'packaging_groups',
  'packaging-operations': 'packaging_operations',
  'ready-stock': 'ready_stock_containers',
  'sale-catalog': 'sale_catalog_entries',
  invoices: 'invoices',
  pos: 'pos_orders',
  'purchase-orders': 'purchase_orders',
  'stock-adjustments': 'item_stock_movements',
  'stock-movements': 'item_stock_movements'
};

function jsonOrNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
}

async function logAudit(connection, event) {
  const {
    userId = null,
    module,
    action,
    tableName = null,
    recordId = null,
    storeId = null,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    description = null
  } = event;

  const sql = `INSERT INTO audit_logs (
    store_id,
    user_id,
    module,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    description
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    storeId,
    userId,
    module,
    action,
    tableName,
    recordId,
    jsonOrNull(oldValues),
    jsonOrNull(newValues),
    ipAddress,
    userAgent,
    description
  ];

  if (connection) {
    await connection.execute(sql, params);
    return;
  }

  await query(sql, params);
}

function getPathSegments(req) {
  const path = req.originalUrl.split('?')[0].replace(/^\/api\/?/, '');
  return path.split('/').filter(Boolean);
}

function inferResource(req) {
  const segments = getPathSegments(req);
  return segments[0] || 'api';
}

function inferModule(req) {
  const resource = inferResource(req);
  return MODULE_ALIASES[resource] || resource.replace(/-/g, '_');
}

function inferAction(req) {
  const segments = getPathSegments(req);
  const tail = segments[segments.length - 1];

  if (segments.length > 1 && tail && Number.isNaN(Number(tail))) {
    return tail.replace(/-/g, '_');
  }

  if (req.method === 'POST') return 'create';
  if (req.method === 'PUT') return 'replace';
  if (req.method === 'PATCH') return 'update';
  if (req.method === 'DELETE') return 'delete';
  return req.method.toLowerCase();
}

function inferTableName(req) {
  const resource = inferResource(req);
  return TABLE_ALIASES[resource] || resource.replace(/-/g, '_');
}

function inferRecordId(req) {
  if (req.params && req.params.id) {
    return Number(req.params.id);
  }

  const segments = getPathSegments(req);
  const maybeId = segments.find((segment) => /^\d+$/.test(segment));
  return maybeId ? Number(maybeId) : null;
}

async function auditSuccessfulMutation(req, res) {
  if (!req.user || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return;
  }

  if (res.statusCode >= 400 || req.originalUrl.startsWith('/api/audit-logs')) {
    return;
  }

  await logAudit(null, {
    userId: req.user.id,
    storeId: req.user.store_id || req.body?.store_id || req.query?.store_id || null,
    module: inferModule(req),
    action: inferAction(req),
    tableName: inferTableName(req),
    recordId: inferRecordId(req),
    newValues: {
      params: req.params,
      body: req.body,
      query: req.query
    },
    ipAddress: req.audit && req.audit.ipAddress,
    userAgent: req.audit && req.audit.userAgent,
    description: `${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  auditSuccessfulMutation,
  inferAction,
  inferModule,
  inferRecordId,
  inferTableName,
  logAudit
};
