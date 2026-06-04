function pad(value) {
  return String(value).padStart(2, '0');
}

function compactTimestamp(date = new Date()) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    String(date.getMilliseconds()).padStart(3, '0')
  ].join('');
}

function createDocumentNumber(prefix) {
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${compactTimestamp()}-${random}`;
}

module.exports = {
  createDocumentNumber
};
