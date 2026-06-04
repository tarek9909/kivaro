const { pingDatabase } = require('../../bootstrap/db');

async function checkDatabase() {
  const startedAt = Date.now();

  try {
    await pingDatabase();

    return {
      status: 'connected',
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      status: 'unavailable',
      latencyMs: Date.now() - startedAt,
      error: error.code || error.message
    };
  }
}

module.exports = {
  checkDatabase
};
