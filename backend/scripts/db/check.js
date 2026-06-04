const { checkDatabase } = require('./lib');

async function main() {
  const result = await checkDatabase();

  console.log(`Database: ${result.database}`);
  console.log(`Tables found: ${result.tableCount}`);
  console.log(`Seeded permissions found: ${result.permissionCount}`);

  if (!result.ok) {
    if (result.missingTables.length) {
      console.error(`Missing tables: ${result.missingTables.join(', ')}`);
    }

    if (result.missingPermissions.length) {
      console.error(`Missing permissions: ${result.missingPermissions.join(', ')}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log('Database check passed.');
}

main().catch((error) => {
  console.error(`Database check failed: ${error.message}`);
  process.exitCode = 1;
});
