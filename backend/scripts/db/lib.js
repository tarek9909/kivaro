const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const env = require('../../src/bootstrap/env');

const TARGET_BASELINE_MIGRATION = '025_item_based_rebuild.sql';

const REQUIRED_TABLES = [
  'schema_migrations',
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
  'salesman_sublocations',
  'location_targets',
  'sublocation_targets',
  'salesman_targets',
  'customers',
  'item_categories',
  'units',
  'items',
  'warehouses',
  'item_stock_balances',
  'item_stock_movements',
  'carton_stock_lots',
  'open_carton_shelves',
  'packaging_groups',
  'packaging_group_components',
  'packaging_operations',
  'packaging_operation_components',
  'ready_stock_containers',
  'ready_stock_movements',
  'sale_catalog_entries',
  'suppliers',
  'purchase_orders',
  'purchase_order_items',
  'purchase_receipts',
  'purchase_receipt_items',
  'expense_categories',
  'expenses',
  'dispatch_requests',
  'dispatch_customers',
  'dispatch_items',
  'dispatch_line_allocations',
  'invoices',
  'invoice_lines',
  'dispatch_document_generations',
  'dispatch_returns',
  'dispatch_settlements',
  'dispatch_settlement_customers',
  'salesman_balances',
  'pos_orders',
  'pos_order_lines',
  'pos_order_events',
  'pos_order_dispatch_links',
  'customer_debts',
  'customer_debt_adjustments',
  'customer_payments',
  'customer_payment_allocations',
  'customer_credits',
  'customer_receipts',
  'cash_accounts',
  'financial_transactions',
  'supplier_payments',
  'commission_rules',
  'commission_calculations',
  'commission_payments',
  'audit_logs',
  'notifications',
  'v_current_stock',
  'v_ready_stock',
  'v_customer_balances',
  'v_dispatch_summary',
  'v_salesman_target_progress'
];

const REQUIRED_PERMISSIONS = [
  'dashboard.view',
  'users.view',
  'users.create',
  'users.update',
  'users.delete',
  'roles.manage',
  'inventory.view',
  'inventory.create',
  'inventory.update',
  'inventory.delete',
  'stock.adjust',
  'stock.movements',
  'purchase_orders.view',
  'purchase_orders.create',
  'purchase_orders.approve',
  'purchase_orders.receive',
  'purchase_orders.cancel',
  'locations.manage',
  'targets.manage',
  'salesmen.manage',
  'customers.view',
  'customers.create',
  'customers.update',
  'customers.delete',
  'dispatch.view',
  'dispatch.create',
  'dispatch.approve',
  'dispatch.settle',
  'dispatch.print',
  'dispatch.gifts.approve',
  'invoices.view',
  'invoices.print',
  'pos.own_orders',
  'pos.review',
  'pos.accept',
  'pos.create_customers',
  'pos.request_gifts',
  'salesman_workspace.view',
  'accounting.view',
  'accounting.manage',
  'debts.manage',
  'commissions.manage',
  'reports.view',
  'reports.export',
  'audit_logs.view',
  'settings.manage',
  'superadmin.manage'
];

const SCHEMA_DUMP_FILENAMES = ['charcoal_erp_clean.sql'];

function schemaDumpPath() {
  const backendRoot = path.resolve(__dirname, '..', '..');
  const existingPath = SCHEMA_DUMP_FILENAMES
    .map((fileName) => path.join(backendRoot, fileName))
    .find((candidatePath) => fs.existsSync(candidatePath));

  return existingPath || path.join(backendRoot, SCHEMA_DUMP_FILENAMES[0]);
}

function backupsDirectory() {
  return path.resolve(__dirname, '..', '..', 'backups');
}

function archiveTimestamp(now = new Date()) {
  return now.toISOString().replace(/[:.]/g, '-');
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      windowsHide: true,
      stdio: options.stdio || 'pipe'
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const input = fs.createReadStream(filePath);
    input.on('error', reject);
    input.on('data', (chunk) => hash.update(chunk));
    input.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Create a timestamped SQL archive without exposing the database password in the
 * process argument list.  The caller must only proceed with a destructive reset
 * after this returns successfully.
 */
async function archiveDatabase(databaseName = env.db.database, options = {}) {
  const outputDirectory = options.outputDirectory || backupsDirectory();
  const timestamp = archiveTimestamp(options.now || new Date());
  const archivePath = path.join(outputDirectory, `${databaseName}-${timestamp}.sql`);
  const checksumPath = `${archivePath}.sha256`;
  const dumpBinary = options.dumpBinary || process.env.MYSQLDUMP_BIN || 'mysqldump';

  fs.mkdirSync(outputDirectory, { recursive: true });

  const args = [
    '--single-transaction',
    '--routines',
    '--events',
    '--triggers',
    '--no-tablespaces',
    '--default-character-set=utf8mb4',
    '--host', env.db.host,
    '--port', String(env.db.port),
    '--user', env.db.user,
    '--result-file', archivePath,
    databaseName
  ];

  try {
    await runCommand(dumpBinary, args, {
      env: {
        ...process.env,
        MYSQL_PWD: env.db.password
      }
    });

    const stats = fs.statSync(archivePath);
    if (stats.size === 0) {
      throw new Error('mysqldump produced an empty archive');
    }

    const archiveText = fs.readFileSync(archivePath, 'utf8');
    if (!/CREATE TABLE/i.test(archiveText)) {
      throw new Error('archive verification failed: no CREATE TABLE statement found');
    }

    const checksum = await sha256File(archivePath);
    fs.writeFileSync(checksumPath, `${checksum}  ${path.basename(archivePath)}\n`, 'utf8');

    return {
      database: databaseName,
      archivePath,
      checksumPath,
      checksum,
      bytes: stats.size
    };
  } catch (error) {
    for (const candidate of [archivePath, checksumPath]) {
      if (fs.existsSync(candidate)) {
        fs.unlinkSync(candidate);
      }
    }
    throw new Error(`Database archive failed: ${error.message}`);
  }
}

function getArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function adminConfig(options = {}) {
  const { database, ...baseConfig } = env.db;
  const config = {
    ...baseConfig,
    multipleStatements: Boolean(options.multipleStatements)
  };

  if (Object.prototype.hasOwnProperty.call(options, 'namedPlaceholders')) {
    config.namedPlaceholders = options.namedPlaceholders;
  }

  return config;
}

function databaseConfig(options = {}) {
  const config = {
    ...env.db,
    multipleStatements: Boolean(options.multipleStatements)
  };

  if (Object.prototype.hasOwnProperty.call(options, 'namedPlaceholders')) {
    config.namedPlaceholders = options.namedPlaceholders;
  }

  return config;
}

function rawSqlOptions() {
  return {
    multipleStatements: true,
    namedPlaceholders: false
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

function normalizeSchemaDumpSql(sql) {
  return sql
    .replace(/\/\*![89]\d{4}[\s\S]*?\*\/;?/g, '')
    .replace(/utf8mb4_0900_ai_ci/gi, 'utf8mb4_unicode_ci')
    .replace(/\sDEFINER=`[^`]+`@`[^`]+`/gi, '')
    .replace(/DROP DATABASE IF EXISTS `?charcoal_erp`?;\s*/i, '')
    .replace(/CREATE DATABASE(?: IF NOT EXISTS)? `?charcoal_erp`?(?:[^;]*)?;\s*/i, '')
    .replace(/USE `?charcoal_erp`?;\s*/i, '');
}

function loadSchemaDumpSql() {
  return normalizeSchemaDumpSql(fs.readFileSync(schemaDumpPath(), 'utf8'));
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

async function databaseTables(connection, databaseName = env.db.database) {
  const [rows] = await connection.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = ?`,
    [databaseName]
  );

  return rows.map((row) => row.TABLE_NAME || row.table_name);
}

function needsSchemaDump(tableNames) {
  const appTables = tableNames.filter((tableName) => tableName !== 'schema_migrations');
  return appTables.length === 0;
}

async function dropSchemaMigrationsTable(connection) {
  await connection.query('DROP TABLE IF EXISTS schema_migrations');
}

async function importSchemaDump(databaseName = env.db.database, options = {}) {
  const connection = await createDatabaseConnection(rawSqlOptions());

  try {
    if (options.dropSchemaMigrations) {
      await dropSchemaMigrationsTable(connection);
    }

    await connection.query(loadSchemaDumpSql());
    return { database: databaseName, schemaPath: schemaDumpPath() };
  } finally {
    await connection.end();
  }
}

async function ensureDatabaseExists(options = {}) {
  const databaseName = options.databaseName || env.db.database;

  try {
    const connection = await createDatabaseConnection();

    try {
      await connection.ping();
      const tableNames = await databaseTables(connection, databaseName);

      if (!needsSchemaDump(tableNames)) {
        return { created: false, database: databaseName, schemaPath: schemaDumpPath() };
      }

      if (options.dryRun) {
        return {
          created: false,
          database: databaseName,
          missing: true,
          empty: true,
          schemaPath: schemaDumpPath()
        };
      }
    } finally {
      await connection.end();
    }

    await importSchemaDump(databaseName, { dropSchemaMigrations: true });
    return { created: true, database: databaseName, existingDatabase: true, schemaPath: schemaDumpPath() };
  } catch (error) {
    if (error.code !== 'ER_BAD_DB_ERROR') {
      throw error;
    }

    if (options.dryRun) {
      return { created: false, database: databaseName, missing: true, schemaPath: schemaDumpPath() };
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

  await importSchemaDump(databaseName);
  return { created: true, database: databaseName, schemaPath: schemaDumpPath() };
}

async function resetDatabase(databaseName = env.db.database) {
  const connection = await createAdminConnection(rawSqlOptions());

  try {
    await connection.query(loadSchemaSql(databaseName));
    return { database: databaseName };
  } finally {
    await connection.end();
  }
}

async function archiveAndResetDatabase(databaseName = env.db.database, options = {}) {
  const archive = await archiveDatabase(databaseName, options);
  const reset = await resetDatabase(databaseName);
  return { ...reset, archive };
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

    let missingMigrations = [];
    if (tableNames.has('schema_migrations')) {
      const [migrationRows] = await connection.query(
        'SELECT migration_name FROM schema_migrations WHERE migration_name = ?',
        [TARGET_BASELINE_MIGRATION]
      );
      const applied = new Set(migrationRows.map((row) => row.migration_name));
      missingMigrations = applied.has(TARGET_BASELINE_MIGRATION)
        ? []
        : [TARGET_BASELINE_MIGRATION];
    } else {
      missingMigrations = [TARGET_BASELINE_MIGRATION];
    }

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
      missingMigrations,
      permissionCount: permissionRows.length,
      missingPermissions,
      ok: missingTables.length === 0 && missingMigrations.length === 0 && missingPermissions.length === 0
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
  TARGET_BASELINE_MIGRATION,
  archiveAndResetDatabase,
  archiveDatabase,
  backupsDirectory,
  checkDatabase,
  createAdminConnection,
  createDatabaseConnection,
  databaseTables,
  dropSchemaMigrationsTable,
  ensureDatabaseExists,
  getArg,
  importSchemaDump,
  loadSchemaDumpSql,
  loadSchemaSql,
  needsSchemaDump,
  normalizeSchemaDumpSql,
  rawSqlOptions,
  resetDatabase,
  schemaDumpPath,
  seedOwner
};
