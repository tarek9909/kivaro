const { archiveAndResetDatabase } = require('./lib');

async function main() {
  const result = await archiveAndResetDatabase();
  console.log(`Verified archive created: ${result.archive.archivePath}`);
  console.log(`Database reset completed: ${result.database}`);
}

main().catch((error) => {
  console.error(`Database reset failed: ${error.message}`);
  process.exitCode = 1;
});
