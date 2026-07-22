const fs = require('fs');
const path = require('path');

const {
  REQUIRED_PERMISSIONS,
  REQUIRED_TABLES,
  TARGET_BASELINE_MIGRATION
} = require('../scripts/db/lib');
const {
  MODULE_KEYS,
  getModuleByRequestPath
} = require('../src/modules/superadmin/moduleCatalog');

const backendRoot = path.resolve(__dirname, '..');
const cleanSchemaPath = path.join(backendRoot, 'charcoal_erp_clean.sql');
const composePath = path.join(backendRoot, 'docker-compose.yml');

function schemaObjects(sql) {
  const tables = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?/gi)].map((match) => match[1]);
  const views = [...sql.matchAll(/CREATE OR REPLACE VIEW\s+`?(\w+)`?/gi)].map((match) => match[1]);
  return new Set([...tables, ...views]);
}

function tableBody(sql, tableName) {
  const match = new RegExp(
    'CREATE TABLE IF NOT EXISTS\\s+`?' + tableName + '`?\\s*\\(([\\s\\S]*?)\\) ENGINE=',
    'i'
  ).exec(sql);
  return match ? match[1] : '';
}

function tableColumns(sql, tableName) {
  return new Set(
    [...tableBody(sql, tableName).matchAll(
      /^\s*`?(\w+)`?\s+(?:BIGINT|INT|VARCHAR|TEXT|JSON|DECIMAL|DATE|DATETIME|TIMESTAMP|ENUM|TINYINT|CHAR|LONGTEXT|MEDIUMTEXT|DOUBLE|FLOAT|BOOLEAN)/gim
    )].map((match) => match[1])
  );
}

function tableDefinitions(sql) {
  return [...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?\s*\(([\s\S]*?)\) ENGINE=/gi)]
    .map((match) => ({ name: match[1], body: match[2] }));
}

function seededValues(sql, tableName, valueColumn) {
  const escapedTableName = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const statement = new RegExp(
    'INSERT INTO ' + escapedTableName + '[\\s\\S]*?ON DUPLICATE KEY UPDATE',
    'i'
  ).exec(sql)?.[0] || '';

  if (tableName === 'permissions') {
    return new Set([...statement.matchAll(/\(\d+, '[^']+', '[^']+', '([\w.]+)'/g)].map((match) => match[1]));
  }

  if (tableName === 'store_modules') {
    return new Set([...statement.matchAll(/\(1, '([^']+)', 1\)/g)].map((match) => match[1]));
  }

  throw new Error(`Unsupported seeded-value parser for ${tableName}.${valueColumn}`);
}

describe('clean item-based baseline contract', () => {
  const schema = fs.readFileSync(cleanSchemaPath, 'utf8');

  test('contains every runtime object, target migration ledger, and no retired stock model', () => {
    const objects = schemaObjects(schema);

    expect(REQUIRED_TABLES.filter((name) => !objects.has(name))).toEqual([]);
    expect([...objects].filter((name) => !REQUIRED_TABLES.includes(name))).toEqual([]);
    expect(schema).toContain(`VALUES ('${TARGET_BASELINE_MIGRATION}')`);
    expect(schema).toMatch(/SET FOREIGN_KEY_CHECKS = 0;/);
    expect(schema).toMatch(/SET FOREIGN_KEY_CHECKS = 1;/);
    expect(schema).not.toMatch(/CREATE TABLE[^;]*\bitem_variants\b/is);
    expect(schema).not.toMatch(/CREATE TABLE[^;]*\bproduction_batches\b/is);
    expect(schema).not.toMatch(/CREATE TABLE[^;]*\bpackaging_assignments\b/is);
    expect(schema).not.toMatch(/CREATE TABLE[^;]*\bitem_stock_adjustments\b/is);
  });

  test('defines every non-self foreign-key target before it is referenced', () => {
    const seen = new Set();
    const forwardReferences = [];

    for (const definition of tableDefinitions(schema)) {
      for (const match of definition.body.matchAll(/REFERENCES\s+`?(\w+)`?/gi)) {
        const target = match[1];
        if (target !== definition.name && !seen.has(target)) {
          forwardReferences.push(`${definition.name} -> ${target}`);
        }
      }
      seen.add(definition.name);
    }

    expect(forwardReferences).toEqual([]);
  });

  test('carries the accounting and payment columns used by active canonical services', () => {
    const assertColumns = (tableName, requiredColumns) => {
      const columns = tableColumns(schema, tableName);
      expect(requiredColumns.filter((column) => !columns.has(column))).toEqual([]);
    };

    assertColumns('expenses', ['status', 'voided_by', 'voided_at', 'cash_account_id']);
    assertColumns('cash_accounts', ['account_name', 'cash_flow_permission', 'current_balance']);
    assertColumns('customer_payments', ['cash_account_id', 'collected_by_salesman_id', 'payment_number']);
    assertColumns('customer_debts', ['dispatch_request_id', 'dispatch_customer_id', 'debt_number']);
    expect(fs.readFileSync(path.join(backendRoot, 'src/modules/customers/customers.model.js'), 'utf8'))
      .toContain('ca.account_name AS cash_account_name');
  });

  test('seeds every configured module and permission and maps workspace API correctly', () => {
    const permissions = seededValues(schema, 'permissions', 'permission_key');
    const modules = seededValues(schema, 'store_modules', 'module_key');

    expect(REQUIRED_PERMISSIONS.filter((permission) => !permissions.has(permission))).toEqual([]);
    expect(MODULE_KEYS.filter((moduleKey) => !modules.has(moduleKey))).toEqual([]);
    expect(getModuleByRequestPath('/pos/workspace')?.key).toBe('salesman_workspace');
  });

  test('uses the same clean dump for Docker initialization', () => {
    const compose = fs.readFileSync(composePath, 'utf8');

    expect(compose).toContain('./charcoal_erp_clean.sql:/docker-entrypoint-initdb.d/001-schema.sql:ro');
    expect(compose).toContain('mysql_item_based_data');
    expect(compose).not.toContain('./charcoal_erp.sql:/docker-entrypoint-initdb.d/001-schema.sql:ro');
  });
});
