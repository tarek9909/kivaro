function successResponse(res, options = {}) {
  const {
    statusCode = 200,
    message = 'OK',
    data = {},
    meta
  } = options;

  const body = {
    success: true,
    message,
    data
  };

  if (meta) {
    body.meta = meta;
  }

  return res.status(statusCode).json(body);
}

function errorResponse(res, options = {}) {
  const {
    statusCode = 500,
    message = 'Internal server error',
    errors = []
  } = options;

  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
}

module.exports = {
  errorResponse,
  successResponse
};
