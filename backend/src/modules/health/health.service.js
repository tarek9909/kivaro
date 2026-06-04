const env = require('../../bootstrap/env');
const healthModel = require('./health.model');

async function getHealth() {
  const database = await healthModel.checkDatabase();

  return {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    environment: env.nodeEnv,
    database
  };
}

module.exports = {
  getHealth
};
