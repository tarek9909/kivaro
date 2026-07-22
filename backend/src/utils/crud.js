const { query } = require('../bootstrap/db');
const { getPagination, getPaginationMeta } = require('./pagination');

function nullable(value) {
  return value === undefined || value === '' ? null : value;
}

function buildFilters(filters = [], input = {}) {
  const conditions = [];
  const params = [];

  for (const filter of filters) {
    const value = input[filter.key];

    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (filter.type === 'search') {
      const term = `%${value}%`;
      conditions.push(
        `(${filter.fields.map((field) => `${field} LIKE ?`).join(' OR ')})`
      );
      params.push(...filter.fields.map(() => term));
      continue;
    }

    if (filter.type === 'cash_flow_capability') {
      conditions.push(`(${filter.column} = 'both' OR ${filter.column} = ?)`);
      params.push(value === 'incoming' ? 'incoming' : 'outgoing');
      continue;
    }

    if (filter.operator === 'date_gte') {
      conditions.push(`DATE(${filter.column}) >= ?`);
      params.push(value);
      continue;
    }

    if (filter.operator === 'date_lte') {
      conditions.push(`DATE(${filter.column}) <= ?`);
      params.push(value);
      continue;
    }

    conditions.push(`${filter.column} = ?`);
    params.push(value);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
}

async function listRecords(config, input = {}) {
  const pagination = getPagination(input);
  const { whereClause, params } = buildFilters(config.filters, input);
  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM ${config.from}
     ${config.joins || ''}
     ${whereClause}`,
    params
  );
  const limitClause = input.allRows ? '' : 'LIMIT ? OFFSET ?';
  const rowParams = input.allRows ? params : [...params, pagination.limit, pagination.offset];
  const rows = await query(
    `${config.select}
     FROM ${config.from}
     ${config.joins || ''}
     ${whereClause}
     ${config.orderBy || 'ORDER BY id DESC'}
     ${limitClause}`,
    rowParams
  );

  return {
    rows,
    meta: getPaginationMeta({
      ...pagination,
      total: Number(countRows[0].total)
    })
  };
}

async function findById(tableName, id, columns = '*') {
  const rows = await query(
    `SELECT ${columns}
     FROM ${tableName}
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function findByIdInStore(tableName, id, storeId, columns = '*') {
  const rows = await query(
    `SELECT ${columns}
     FROM ${tableName}
     WHERE id = ?
       AND store_id = ?
     LIMIT 1`,
    [id, storeId]
  );

  return rows[0] || null;
}

async function insertRecord(tableName, data, returning = '*') {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const columns = entries.map(([key]) => key);
  const placeholders = columns.map(() => '?').join(', ');
  const params = entries.map(([, value]) => nullable(value));
  const result = await query(
    `INSERT INTO ${tableName} (${columns.join(', ')})
     VALUES (${placeholders})`,
    params
  );

  return findById(tableName, result.insertId, returning);
}

async function updateRecord(tableName, id, data, returning = '*') {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);

  if (entries.length > 0) {
    const assignments = entries.map(([key]) => `${key} = ?`).join(', ');
    const params = entries.map(([, value]) => nullable(value));

    await query(
      `UPDATE ${tableName}
       SET ${assignments}
       WHERE id = ?`,
      [...params, id]
    );
  }

  return findById(tableName, id, returning);
}

module.exports = {
  buildFilters,
  findById,
  findByIdInStore,
  insertRecord,
  listRecords,
  nullable,
  updateRecord
};
