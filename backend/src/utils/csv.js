function normalizeCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

function escapeCell(value) {
  const normalized = normalizeCell(value);
  const formulaSafe = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;

  if (/[",\r\n]/.test(formulaSafe)) {
    return `"${formulaSafe.replace(/"/g, '""')}"`;
  }

  return formulaSafe;
}

function toCsv(rows = []) {
  if (!rows.length) {
    return '';
  }

  const headers = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set())
  );
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row[header])).join(','))
  ];

  return `${lines.join('\r\n')}\r\n`;
}

function sendCsv(res, filename, rows) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(toCsv(rows));
}

module.exports = {
  sendCsv,
  toCsv
};
