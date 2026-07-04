const app = require('./app');
const env = require('./bootstrap/env');
const { closePool } = require('./bootstrap/db');

let server;

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down API server.`);

  if (!server) {
    await closePool();
    process.exit(0);
  }

  server.close(async () => {
    try {
      await closePool();
      process.exit(0);
    } catch (error) {
      console.error('Failed to close database pool cleanly.', error);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function startServer() {
  server = app.listen(env.port, () => {
    console.log(`Charcoal ERP API listening on port ${env.port}`);
  });
}

startServer();
