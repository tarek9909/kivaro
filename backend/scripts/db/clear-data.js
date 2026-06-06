const { createDatabaseConnection } = require('./lib');

const PRESERVE_TABLES = [
  'users',
  'units',
  'roles',
  'permissions',
  'role_permissions',
  'stores',
  'store_modules',
  'system_settings',
  'schema_migrations',
  'company_profiles'
];

async function main() {
  console.log('Connecting to database...');
  const connection = await createDatabaseConnection();

  try {
    const [databaseRow] = await connection.query('SELECT DATABASE() AS db_name');
    const dbName = databaseRow[0]?.db_name || 'unknown';
    console.log(`Connected to database: ${dbName}`);

    // Fetch all base tables in the current database
    const [rows] = await connection.query(
      `SELECT TABLE_NAME AS table_name 
       FROM information_schema.tables 
       WHERE table_schema = ? AND table_type = 'BASE TABLE'`,
      [dbName]
    );

    const tables = rows.map((row) => row.table_name || row.TABLE_NAME);
    const tablesToClear = tables.filter(
      (table) => !PRESERVE_TABLES.includes(table.toLowerCase())
    );

    if (tablesToClear.length === 0) {
      console.log('No tables found to clear.');
      return;
    }

    console.log(`Found ${tables.length} tables total. Clearing ${tablesToClear.length} tables...`);
    console.log('Preserved tables:', PRESERVE_TABLES.join(', '));

    console.log('Disabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tablesToClear) {
      console.log(`Truncating table: ${table}`);
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }

    console.log('Enabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Database clear completed successfully.');
  } catch (error) {
    console.error(`Error clearing database: ${error.message}`);
    // Ensure we re-enable foreign keys if an error occurs mid-way
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (_) {}
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`Clear script failed: ${error.message}`);
  process.exitCode = 1;
});
