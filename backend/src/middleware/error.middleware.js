const env = require('../bootstrap/env');
const ApiError = require('../utils/ApiError');
const { errorResponse } = require('../utils/response');

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const errors = Array.isArray(error.errors) ? error.errors : [];

  const payload = {
    statusCode,
    message: statusCode === 500 ? 'Internal server error' : error.message,
    errors
  };

  if (env.isDevelopment && statusCode === 500) {
    payload.errors = [
      {
        message: error.message,
        stack: error.stack
      }
    ];
  }

  return errorResponse(res, payload);
}

module.exports = {
  errorHandler,
  notFoundHandler
};
