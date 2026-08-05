const { getPool, closePool } = require('../src/bootstrap/db');
const service = require('../src/modules/commissions/commissions.service');

function businessDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Beirut' });
}

async function recordHeartbeat(connection, status, details = null, error = null) {
  await connection.execute(
    `INSERT INTO scheduler_heartbeats (
      scheduler_name, last_started_at, last_succeeded_at, last_error, details
    ) VALUES ('commission-period-close', NOW(),
      CASE WHEN ? = 'succeeded' THEN NOW() ELSE NULL END, ?, ?)
    ON DUPLICATE KEY UPDATE
      last_started_at = NOW(),
      last_succeeded_at = CASE WHEN ? = 'succeeded' THEN NOW() ELSE last_succeeded_at END,
      last_error = ?, details = ?`,
    [status, error, details ? JSON.stringify(details) : null, status, error, details ? JSON.stringify(details) : null]
  );
}

async function runOnce() {
  const date = businessDate();
  const connection = await getPool().getConnection();
  try {
    const [locks] = await connection.execute('SELECT GET_LOCK(?, 0) AS acquired', [`kivaro:commissions:${date}`]);
    if (!locks[0]?.acquired) return;
    try {
      await recordHeartbeat(connection, 'running', { business_date: date });
      const result = await service.processDueCommissions(date);
      await recordHeartbeat(connection, 'succeeded', { business_date: date, ...result });
      console.log(`[${date}] processed ${result.processed_count} due commission(s).`);
    } catch (error) {
      try { await recordHeartbeat(connection, 'failed', { business_date: date }, error.message); } catch (_) { /* preserve original scheduler error */ }
      throw error;
    }
  } finally {
    try { await connection.execute('DO RELEASE_LOCK(?)', [`kivaro:commissions:${date}`]); } catch (_) { /* connection release also clears locks */ }
    connection.release();
  }
}

async function main() {
  await runOnce();
  setInterval(() => runOnce().catch((error) => console.error(`Commission scheduler failed: ${error.message}`)), 15 * 60 * 1000);
}

main().catch(async (error) => {
  console.error(`Commission scheduler failed: ${error.message}`);
  await closePool();
  process.exitCode = 1;
});
