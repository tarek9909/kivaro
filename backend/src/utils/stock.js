const ApiError = require('./ApiError');
const { decimal } = require('./money');

function assertPositiveQuantity(quantity, field = 'quantity') {
  if (decimal(quantity).lte(0)) {
    throw ApiError.badRequest('Validation failed', [
      {
        field,
        message: 'Quantity must be greater than zero'
      }
    ]);
  }
}

function assertNonNegativeQuantity(quantity, field = 'quantity') {
  if (decimal(quantity).lt(0)) {
    throw ApiError.badRequest('Validation failed', [
      {
        field,
        message: 'Quantity cannot be negative'
      }
    ]);
  }
}

module.exports = {
  assertNonNegativeQuantity,
  assertPositiveQuantity
};
