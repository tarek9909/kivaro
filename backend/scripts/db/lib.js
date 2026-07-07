const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const env = require('../../src/bootstrap/env');

const REQUIRED_TABLES = [
  'roles',
  'stores',
  'store_modules',
  'permissions',
  'role_permissions',
  'users',
  'user_sessions',
  'system_settings',
  'company_profiles',
  'locations',
  'sublocations',
  'salesmen',
  'customers',
  'item_categories',
  'units',
  'items',
  'item_variants',
  'warehouses',
  'stock_balances',
  'stock_movements',
  'purchase_orders',
  'purchase_order_items',
  'purchase_receipts',
  'production_batches',
  'dispatch_requests',
  'dispatch_settlements',
  'customer_debts',
  'customer_debt_adjustments',
  'customer_payments',
  'customer_payment_allocations',
  'customer_credits',
  'customer_receipts',
  'cash_accounts',
  'financial_transactions',
  'commission_rules',
  'commission_calculations',
  'audit_logs',
  'notifications'
];

const REQUIRED_PERMISSIONS = [
  'users.view',
  'roles.manage',
  'inventory.view',
  'stock.adjust',
  'purchase_orders.receive',
  'production.complete',
  'dispatch.settle',
  'dispatch.print',
  'accounting.manage',
  'debts.manage',
  'commissions.manage',
  'reports.view',
  'reports.export',
  'audit_logs.view',
  'settings.manage',
  'superadmin.manage'
];

const SCHEMA_DUMP_PATH = path.resolve(__dirname, '..', '..', 'charcoal_erp (3).sql');

function getArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function adminConfig(options = {}) {
  const { database, ...baseConfig } = env.db;
  return {
    ...baseConfig,
    multipleStatements: Boolean(options.multipleStatements)
  };
}

function databaseConfig(options = {}) {
  return {
    ...env.db,
    multipleStatements: Boolean(options.multipleStatements)
  };
}

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, '``')}\``;
}

async function createAdminConnection(options) {
  return mysql.createConnection(adminConfig(options));
}

async function createDatabaseConnection(options) {
  return mysql.createConnection(databaseConfig(options));
}

function loadSchemaDumpSql() {
  return fs.readFileSync(SCHEMA_DUMP_PATH, 'utf8')
    .replace(/\sDEFINER=`[^`]+`@`[^`]+`/gi, '')
    .replace(/DROP DATABASE IF EXISTS `?charcoal_erp`?;\s*/i, '')
    .replace(/CREATE DATABASE(?: IF NOT EXISTS)? `?charcoal_erp`?(?:[^;]*)?;\s*/i, '')
    .replace(/USE `?charcoal_erp`?;\s*/i, '');
}

function loadSchemaSql(databaseName = env.db.database) {
  const quotedDatabaseName = quoteIdentifier(databaseName);

  return [
    `DROP DATABASE IF EXISTS ${quotedDatabaseName};`,
    `CREATE DATABASE ${quotedDatabaseName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    `USE ${quotedDatabaseName};`,
    loadSchemaDumpSql()
  ].join('\n');
}

async function ensureDatabaseExists(options = {}) {
  const databaseName = options.databaseName || env.db.database;

  try {
    const connection = await createDatabaseConnection();

    try {
      await connection.ping();
      return { created: false, database: databaseName, schemaPath: SCHEMA_DUMP_PATH };
    } finally {
      await connection.end();
    }
  } catch (error) {
    if (error.code !== 'ER_BAD_DB_ERROR') {
      throw error;
    }

    if (options.dryRun) {
      return { created: false, database: databaseName, missing: true, schemaPath: SCHEMA_DUMP_PATH };
    }
  }

  const quotedDatabaseName = quoteIdentifier(databaseName);
  const adminConnection = await createAdminConnection();

  try {
    await adminConnection.ping();
    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS ${quotedDatabaseName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await adminConnection.end();
  }

  const databaseConnection = await createDatabaseConnection({ multipleStatements: true });

  try {
    await databaseConnection.query(loadSchemaDumpSql());
    return { created: true, database: databaseName, schemaPath: SCHEMA_DUMP_PATH };
  } finally {
    await databaseConnection.end();
  }
}

async function resetDatabase(databaseName = env.db.database) {
  const connection = await createAdminConnection({ multipleStatements: true });

  try {
    await connection.query(loadSchemaSql(databaseName));
    return { database: databaseName };
  } finally {
    await connection.end();
  }
}

async function checkDatabase() {
  const connection = await createDatabaseConnection();

  try {
    const [[databaseRow]] = await connection.query('SELECT DATABASE() AS database_name');
    const [tableRows] = await connection.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = ?`,
      [env.db.database]
    );
    const tableNames = new Set(tableRows.map((row) => row.TABLE_NAME || row.table_name));
    const missingTables = REQUIRED_TABLES.filter((tableName) => !tableNames.has(tableName));

    const [permissionRows] = await connection.query(
      `SELECT permission_key
       FROM permissions
       WHERE permission_key IN (${REQUIRED_PERMISSIONS.map(() => '?').join(', ')})`,
      REQUIRED_PERMISSIONS
    );
    const permissionKeys = new Set(permissionRows.map((row) => row.permission_key));
    const missingPermissions = REQUIRED_PERMISSIONS.filter((permission) => !permissionKeys.has(permission));

    return {
      database: databaseRow.database_name,
      tableCount: tableRows.length,
      missingTables,
      permissionCount: permissionRows.length,
      missingPermissions,
      ok: missingTables.length === 0 && missingPermissions.length === 0
    };
  } finally {
    await connection.end();
  }
}

async function seedOwner(options = {}) {
  const fullName = options.fullName || process.env.OWNER_FULL_NAME || 'System Owner';
  const username = options.username || process.env.OWNER_USERNAME || 'owner';
  const email = options.email || process.env.OWNER_EMAIL || 'owner@example.com';
  const phone = options.phone ?? process.env.OWNER_PHONE ?? null;
  const password = options.password || process.env.OWNER_PASSWORD;
  const forceUpdatePassword = Boolean(options.forceUpdatePassword);

  if (!password || password.length < 8) {
    throw new Error('Set OWNER_PASSWORD or pass --password=<at-least-8-characters>.');
  }

  const connection = await createDatabaseConnection();

  try {
    const [existingRows] = await connection.execute(
      `SELECT id, username, email
       FROM users
       WHERE deleted_at IS NULL
         AND (username = ? OR email = ?)
       LIMIT 1`,
      [username, email]
    );

    const passwordHash = await bcrypt.hash(password, 12);

    if (existingRows.length > 0) {
      const existingUser = existingRows[0];

      const assignments = [
        'role_id = 1',
        'store_id = 1',
        'full_name = ?',
        'username = ?',
        'email = ?',
        'phone = ?',
        "status = 'active'",
        'deleted_at = NULL'
      ];
      const params = [fullName, username, email, phone];

      if (forceUpdatePassword) {
        assignments.push('password_hash = ?');
        params.push(passwordHash);
      }

      params.push(existingUser.id);
      await connection.execute(
        `UPDATE users
         SET ${assignments.join(', ')}
         WHERE id = ?`,
        params
      );

      return {
        id: existingUser.id,
        created: false,
        passwordUpdated: forceUpdatePassword
      };
    }

    const [result] = await connection.execute(
      `INSERT INTO users (
        store_id,
        role_id,
        full_name,
        username,
        email,
        phone,
        password_hash,
        status
      ) VALUES (1, 1, ?, ?, ?, ?, ?, 'active')`,
      [fullName, username, email, phone, passwordHash]
    );

    return {
      id: result.insertId,
      created: true,
      passwordUpdated: true
    };
  } finally {
    await connection.end();
  }
}

module.exports = {
  REQUIRED_PERMISSIONS,
  REQUIRED_TABLES,
  checkDatabase,
  createAdminConnection,
  createDatabaseConnection,
  ensureDatabaseExists,
  getArg,
  loadSchemaDumpSql,
  loadSchemaSql,
  resetDatabase,
  seedOwner
};
