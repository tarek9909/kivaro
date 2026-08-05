const service = require('../src/modules/commissions/commissions.service');

async function main() {
  const result = await service.processDueCommissions();
  console.log(`Processed ${result.processed_count} due commission(s).`);
}

main().catch((error) => {
  console.error(`Due commission processing failed: ${error.message}`);
  process.exitCode = 1;
});
