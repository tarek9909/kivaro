'use strict';

const crypto = require('crypto');
const { createDatabaseConnection } = require('./lib');
const sources = require(process.env.ROUTE_SEED_DATA_MODULE || './seed-route-customers.data');

const STORE_IDS = [4, 5];
const SALESMAN_NAME = process.env.ROUTE_SEED_SALESMAN_NAME || 'bilal abou saleh';
const ASSIGNED_AT = process.env.ROUTE_SEED_ASSIGNED_AT || new Date().toISOString().slice(0, 10);
const DRY_RUN = process.argv.includes('--dry-run');

function clean(value) {
  const normalized = String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized || null;
}

function normalizePhone(value) {
  const original = clean(value);
  if (!original) return null;

  let digits = original.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('00961')) {
    digits = digits.slice(5);
  } else if (digits.startsWith('961')) {
    digits = digits.slice(3);
  }

  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits ? `+961${digits}` : null;
}

function normalizeName(value) {
  return clean(value)?.toLocaleLowerCase() || null;
}

function sublocationCode(source, area, ordinal) {
  const hash = crypto
    .createHash('sha1')
    .update(`${source.key}\u0000${area}`, 'utf8')
    .digest('hex')
    .slice(0, 12);

  return `${source.locationCode}-SL-${String(ordinal).padStart(3, '0')}-${hash}`;
}

function sourceAreas(source) {
  const areas = [];
  const seen = new Set();

  for (const row of source.rows) {
    const area = clean(row.area) || 'Unspecified';
    if (!seen.has(area)) {
      seen.add(area);
      areas.push(area);
    }
  }

  return new Map(areas.map((area, index) => [area, sublocationCode(source, area, index + 1)]));
}

function customerName(source, row, sequence) {
  return clean(row.shopName) || clean(row.customerName) || `${source.locationName} customer ${sequence}`;
}

function customerNotes(source, row, sequence, normalizedPhone) {
  const notes = [`Imported from ${source.fileName}, Excel row ${row.sourceRow}.`];
  const shopName = clean(row.shopName);
  const contactName = clean(row.customerName);
  const sourcePhone = clean(row.phone);

  if (shopName && contactName && normalizeName(shopName) !== normalizeName(contactName)) {
    notes.push(`Source customer name: ${contactName}.`);
  }

  if (!shopName && !contactName) {
    notes.push('Source shop and customer names were blank; a fallback name was generated.');
  }

  if (sourcePhone && normalizedPhone && sourcePhone !== normalizedPhone) {
    notes.push(`Source phone: ${sourcePhone}; normalized phone: ${normalizedPhone}.`);
  }

  if (clean(row.sourceNotes)) notes.push(clean(row.sourceNotes));
  return notes.join(' ');
}

async function requireStore(db, storeId) {
  const [rows] = await db.execute(
    'SELECT id, status FROM stores WHERE id = ? LIMIT 1 FOR UPDATE',
    [storeId]
  );

  if (!rows.length) throw new Error(`Store ${storeId} was not found in the online database.`);
  return rows[0];
}

async function findSalesman(db, storeId) {
  const [rows] = await db.execute(
    'SELECT id, full_name FROM salesmen WHERE store_id = ? AND status = \'active\'',
    [storeId]
  );
  const wanted = normalizeName(SALESMAN_NAME);
  const matches = rows.filter((row) => normalizeName(row.full_name) === wanted);

  if (matches.length !== 1) {
    const available = rows.map((row) => `${row.id}:${row.full_name}`).join(', ') || 'none';
    throw new Error(
      `Expected exactly one active salesman named "${SALESMAN_NAME}" in store ${storeId}; ` +
      `found ${matches.length}. Available: ${available}.`
    );
  }

  return matches[0];
}

async function ensureLocation(db, storeId, source) {
  const [rows] = await db.execute(
    'SELECT id FROM locations WHERE store_id = ? AND code = ? LIMIT 1 FOR UPDATE',
    [storeId, source.locationCode]
  );

  if (rows.length) {
    await db.execute(
      'UPDATE locations SET name = ?, description = ?, status = \'active\' WHERE id = ?',
      [source.locationName, `Imported from ${source.fileName}.`, rows[0].id]
    );
    return { id: rows[0].id, created: false };
  }

  const [result] = await db.execute(
    `INSERT INTO locations (store_id, name, code, description, status, created_by)
     VALUES (?, ?, ?, ?, 'active', NULL)`,
    [storeId, source.locationName, source.locationCode, `Imported from ${source.fileName}.`]
  );
  return { id: result.insertId, created: true };
}

async function ensureSublocation(db, storeId, locationId, source, area, code) {
  const [rows] = await db.execute(
    'SELECT id FROM sublocations WHERE store_id = ? AND code = ? LIMIT 1 FOR UPDATE',
    [storeId, code]
  );

  if (rows.length) {
    await db.execute(
      `UPDATE sublocations
       SET location_id = ?, name = ?, description = ?, status = 'active'
       WHERE id = ?`,
      [locationId, area, `Imported from ${source.fileName}.`, rows[0].id]
    );
    return { id: rows[0].id, created: false };
  }

  const [result] = await db.execute(
    `INSERT INTO sublocations (store_id, location_id, name, code, description, status, created_by)
     VALUES (?, ?, ?, ?, ?, 'active', NULL)`,
    [storeId, locationId, area, code, `Imported from ${source.fileName}.`]
  );
  return { id: result.insertId, created: true };
}

async function ensureSalesmanAssignment(db, salesmanId, sublocationId) {
  const [rows] = await db.execute(
    `SELECT id
     FROM salesman_sublocations
     WHERE salesman_id = ? AND sublocation_id = ? AND status = 'active'
     LIMIT 1 FOR UPDATE`,
    [salesmanId, sublocationId]
  );

  if (rows.length) {
    await db.execute(
      `UPDATE salesman_sublocations
       SET assigned_at = ?, unassigned_at = NULL
       WHERE id = ?`,
      [ASSIGNED_AT, rows[0].id]
    );
    return { id: rows[0].id, created: false };
  }

  const [result] = await db.execute(
    `INSERT INTO salesman_sublocations
       (salesman_id, sublocation_id, assigned_at, unassigned_at, status)
     VALUES (?, ?, ?, NULL, 'active')`,
    [salesmanId, sublocationId, ASSIGNED_AT]
  );
  return { id: result.insertId, created: true };
}

async function ensureCustomer(db, data) {
  const [rows] = await db.execute(
    'SELECT id FROM customers WHERE store_id = ? AND customer_code = ? LIMIT 1 FOR UPDATE',
    [data.storeId, data.customerCode]
  );

  if (rows.length) {
    await db.execute(
      `UPDATE customers SET
         name = ?, phone = ?, secondary_phone = NULL, location_id = ?, sublocation_id = ?,
         assigned_salesman_id = ?, address = ?, detailed_address = ?, credit_limit = 0,
         status = 'active', notes = ?
       WHERE id = ?`,
      [
        data.name,
        data.phone,
        data.locationId,
        data.sublocationId,
        data.salesmanId,
        data.address,
        data.detailedAddress,
        data.notes,
        rows[0].id
      ]
    );
    return { id: rows[0].id, created: false };
  }

  const [result] = await db.execute(
    `INSERT INTO customers (
       store_id, customer_code, name, phone, secondary_phone, location_id, sublocation_id,
       assigned_salesman_id, address, detailed_address, credit_limit, status, notes, created_by
     ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 0, 'active', ?, NULL)`,
    [
      data.storeId,
      data.customerCode,
      data.name,
      data.phone,
      data.locationId,
      data.sublocationId,
      data.salesmanId,
      data.address,
      data.detailedAddress,
      data.notes
    ]
  );
  return { id: result.insertId, created: true };
}

async function seedStore(db, storeId) {
  await requireStore(db, storeId);
  const salesman = await findSalesman(db, storeId);
  const summary = {
    storeId,
    salesmanId: salesman.id,
    salesmanName: salesman.full_name,
    locations: 0,
    sublocations: 0,
    assignments: 0,
    customers: 0
  };

  for (const source of sources) {
    const location = await ensureLocation(db, storeId, source);
    summary.locations += 1;
    const areaCodes = sourceAreas(source);
    const sublocations = new Map();

    for (const [area, code] of areaCodes) {
      const sublocation = await ensureSublocation(db, storeId, location.id, source, area, code);
      sublocations.set(area, sublocation);
      await ensureSalesmanAssignment(db, salesman.id, sublocation.id);
      summary.sublocations += 1;
      summary.assignments += 1;
    }

    source.rows.forEach((row, index) => {
      row.__sequence = index + 1;
    });

    for (const row of source.rows) {
      const sequence = row.__sequence;
      const area = clean(row.area) || 'Unspecified';
      const sublocation = sublocations.get(area);
      const phone = normalizePhone(row.phone);
      const address = clean(row.address);

      await ensureCustomer(db, {
        storeId,
        customerCode: `${source.key}-${String(sequence).padStart(3, '0')}`,
        name: customerName(source, row, sequence),
        phone,
        locationId: location.id,
        sublocationId: sublocation.id,
        salesmanId: salesman.id,
        address,
        detailedAddress: address,
        notes: customerNotes(source, row, sequence, phone)
      });
      summary.customers += 1;
    }
  }

  return summary;
}

async function main() {
  const db = await createDatabaseConnection();
  let transactionStarted = false;

  try {
    await db.beginTransaction();
    transactionStarted = true;
    const summaries = [];

    for (const storeId of STORE_IDS) {
      summaries.push(await seedStore(db, storeId));
    }

    if (DRY_RUN) {
      await db.rollback();
    } else {
      await db.commit();
    }

    console.log(`${DRY_RUN ? 'Dry run' : 'Seed'} completed for stores ${STORE_IDS.join(' and ')}.`);
    console.log(`Salesman: ${SALESMAN_NAME}; assignment date: ${ASSIGNED_AT}.`);
    console.log(JSON.stringify({ dryRun: DRY_RUN, summaries }, null, 2));
  } catch (error) {
    if (transactionStarted) await db.rollback();
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
