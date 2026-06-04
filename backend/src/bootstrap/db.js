const mysql = require('mysql2/promise');
const env = require('./env');

let pool;

function createPool() {
  if (!pool) {
    pool = mysql.createPool(env.db);
  }

  return pool;
}

function getPool() {
  return createPool();
}

async function query(sql, params = []) {
  const [rows] = await getPool().query(sql, params);
  return rows;
}

async function pingDatabase() {
  const connection = await getPool().getConnection();

  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
}

async function closePool() {
  if (!pool) {
    return;
  }

  const currentPool = pool;
  pool = undefined;
  await currentPool.end();
}

module.exports = {
  closePool,
  getPool,
  pingDatabase,
  query
};
