const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const env = require('./env');
const routes = require('./routes');
const { auditContext, mutationAuditLogger } = require('../middleware/audit.middleware');
const { errorHandler, notFoundHandler } = require('../middleware/error.middleware');

function buildCorsOptions() {
  if (env.corsOrigin === '*') {
    return { origin: '*' };
  }

  return {
    origin: env.corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true
  };
}

function buildRateLimiter(options) {
  return rateLimit({
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests',
        errors: []
      });
    }
  });
}

function createApp() {
  const app = express();
  const apiLimiter = buildRateLimiter(env.rateLimit.api);
  const authLimiter = buildRateLimiter(env.rateLimit.auth);

  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: env.requestBodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: env.requestBodyLimit }));
  app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
    app.use('/api/auth', authLimiter);
    app.use('/api', apiLimiter);
  }

  app.use(auditContext);
  app.use(mutationAuditLogger);
  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp
};
