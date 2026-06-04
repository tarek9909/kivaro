const { resetDatabase } = require('./lib');

async function main() {
  const result = await resetDatabase();
  console.log(`Database reset completed: ${result.database}`);
}

main().catch((error) => {
  console.error(`Database reset failed: ${error.message}`);
  process.exitCode = 1;
});
