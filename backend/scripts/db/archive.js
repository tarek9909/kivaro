const { archiveDatabase } = require('./lib');

async function main() {
  const result = await archiveDatabase();
  console.log(`Verified archive created: ${result.archivePath}`);
  console.log(`SHA-256: ${result.checksum}`);
}

main().catch((error) => {
  console.error(`Database archive failed: ${error.message}`);
  process.exitCode = 1;
});
