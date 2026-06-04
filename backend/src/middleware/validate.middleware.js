const ApiError = require('../utils/ApiError');

function formatIssue(issue) {
  return {
    field: issue.path.join('.'),
    message: issue.message
  };
}

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      return next(
        ApiError.badRequest(
          'Validation failed',
          result.error.issues.map(formatIssue)
        )
      );
    }

    if (Object.prototype.hasOwnProperty.call(result.data, 'body')) {
      req.body = result.data.body;
    }

    if (Object.prototype.hasOwnProperty.call(result.data, 'params')) {
      req.params = result.data.params;
    }

    if (Object.prototype.hasOwnProperty.call(result.data, 'query')) {
      req.query = result.data.query;
    }

    return next();
  };
}

module.exports = validate;
