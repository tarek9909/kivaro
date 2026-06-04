const Decimal = require('decimal.js');

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP
});

function decimal(value = 0) {
  return new Decimal(value || 0);
}

function toMoney(value) {
  return decimal(value).toDecimalPlaces(4).toFixed(4);
}

function percent(value) {
  return decimal(value).div(100);
}

module.exports = {
  decimal,
  percent,
  toMoney
};
