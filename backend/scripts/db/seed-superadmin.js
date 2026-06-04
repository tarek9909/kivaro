const bcrypt = require('bcryptjs');
const { createDatabaseConnection, getArg } = require('./lib');

async function seedSuperadmin() {
  const fullName = getArg('full-name', process.env.SUPERADMIN_FULL_NAME || 'Platform Superadmin');
  const username = getArg('username', process.env.SUPERADMIN_USERNAME || 'superadmin');
  const email = getArg('email', process.env.SUPERADMIN_EMAIL || 'superadmin@example.com');
  const phone = getArg('phone', process.env.SUPERADMIN_PHONE || null);
  const password = getArg('password', process.env.SUPERADMIN_PASSWORD);

  if (!password || password.length < 8) {
    throw new Error('Set SUPERADMIN_PASSWORD or pass --password=<at-least-8-characters>.');
  }

  const connection = await createDatabaseConnection();

  try {
    const [existingRows] = await connection.execute(
      `SELECT id
       FROM users
       WHERE deleted_at IS NULL
         AND store_id IS NULL
         AND (username = ? OR email = ?)
       LIMIT 1`,
      [username, email]
    );
    const passwordHash = await bcrypt.hash(password, 12);

    if (existingRows.length > 0) {
      await connection.execute(
        `UPDATE users
         SET store_id = NULL,
             role_id = 7,
             full_name = ?,
             username = ?,
             email = ?,
             phone = ?,
             password_hash = ?,
             status = 'active',
             deleted_at = NULL
         WHERE id = ?`,
        [fullName, username, email, phone, passwordHash, existingRows[0].id]
      );
      return { id: existingRows[0].id, created: false };
    }

    const [result] = await connection.execute(
      `INSERT INTO users (
        store_id, role_id, full_name, username, email, phone, password_hash, status
      ) VALUES (NULL, 7, ?, ?, ?, ?, ?, 'active')`,
      [fullName, username, email, phone, passwordHash]
    );

    return { id: result.insertId, created: true };
  } finally {
    await connection.end();
  }
}

seedSuperadmin()
  .then((result) => {
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  })
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
