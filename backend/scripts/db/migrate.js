const fs = require('fs');
const path = require('path');
const { createDatabaseConnection, ensureDatabaseExists } = require('./lib');

const migrationsDir = path.resolve(__dirname, '..', '..', 'migrations');

function readMigrations() {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => ({
      name: file,
      sql: fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    }));
}

async function ensureMigrationsTable(connection) {
  await connection.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`
  );
}

async function appliedMigrations(connection) {
  const [rows] = await connection.execute('SELECT migration_name FROM schema_migrations');
  return new Set(rows.map((row) => row.migration_name));
}

async function markMigrationsApplied(connection, migrations) {
  for (const migration of migrations) {
    await connection.execute(
      'INSERT IGNORE INTO schema_migrations (migration_name) VALUES (?)',
      [migration.name]
    );
  }
}

function splitStatements(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function executeMigrationSql(connection, sql) {
  const statements = splitStatements(sql);

  for (const statement of statements) {
    const addColumnIfMissing = statement.match(
      /^ALTER\s+TABLE\s+(`?\w+`?)\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+(.+)$/is
    );

    if (addColumnIfMissing) {
      const compatibleStatement = `ALTER TABLE ${addColumnIfMissing[1]} ADD COLUMN ${addColumnIfMissing[2]}`;
      try {
        await connection.query(compatibleStatement);
      } catch (error) {
        if (error.code !== 'ER_DUP_FIELDNAME') {
          throw error;
        }
      }
      continue;
    }

    await connection.query(statement);
  }
}

async function runMigrations({ dryRun = false } = {}) {
  const migrations = readMigrations();
  const bootstrap = await ensureDatabaseExists({ dryRun });

  if (dryRun && bootstrap.missing) {
    return {
      pending: [
        `Create database ${bootstrap.database} from ${path.basename(bootstrap.schemaPath)}`,
        ...migrations.map((migration) => migration.name)
      ],
      applied: [],
      bootstrapped: false,
      databaseMissing: true
    };
  }

  const connection = await createDatabaseConnection({ multipleStatements: true });

  try {
    await ensureMigrationsTable(connection);

    if (bootstrap.created) {
      await markMigrationsApplied(connection, migrations);
      return {
        pending: [],
        applied: [],
        bootstrapped: true,
        database: bootstrap.database,
        schemaPath: bootstrap.schemaPath,
        recordedMigrations: migrations.map((migration) => migration.name)
      };
    }

    const applied = await appliedMigrations(connection);
    const pending = migrations.filter((migration) => !applied.has(migration.name));

    if (dryRun) {
      return { pending: pending.map((migration) => migration.name), applied: [], bootstrapped: false };
    }

    const appliedNow = [];
    for (const migration of pending) {
      await connection.beginTransaction();
      try {
        await executeMigrationSql(connection, migration.sql);
        await connection.execute(
          'INSERT INTO schema_migrations (migration_name) VALUES (?)',
          [migration.name]
        );
        await connection.commit();
        appliedNow.push(migration.name);
      } catch (error) {
        await connection.rollback();
        throw new Error(`${migration.name}: ${error.message}`);
      }
    }

    return { pending: pending.map((migration) => migration.name), applied: appliedNow, bootstrapped: false };
  } finally {
    await connection.end();
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('--check');
  const result = await runMigrations({ dryRun });

  if (dryRun) {
    if (result.pending.length) {
      console.log(`Pending migrations: ${result.pending.join(', ')}`);
      process.exitCode = 1;
      return;
    }

    console.log('No pending migrations.');
    return;
  }

  if (!result.applied.length) {
    if (result.bootstrapped) {
      console.log(`Database ${result.database} created from ${result.schemaPath}`);
      console.log(`Recorded ${result.recordedMigrations.length} existing migrations as applied.`);
      return;
    }

    console.log('No migrations to apply.');
    return;
  }

  console.log(`Applied migrations: ${result.applied.join(', ')}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  readMigrations,
  runMigrations
};
