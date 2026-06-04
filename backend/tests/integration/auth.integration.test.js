const fs = require('fs');
const path = require('path');
const {
  app,
  authRequest,
  closeIntegrationPool,
  loginOwner,
  prepareIntegrationDb,
  request
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('auth integration', () => {
  let dbReady = false;

  beforeAll(async () => {
    dbReady = await prepareIntegrationDb();
  });

  afterAll(async () => {
    await closeIntegrationPool();
  });

  test('owner can login, logout, and revoked token is rejected', async () => {
    if (!dbReady) return;

    const token = await loginOwner();

    await authRequest(token).get('/api/auth/me').expect(200);
    await authRequest(token).post('/api/auth/logout').expect(200);
    await authRequest(token).get('/api/auth/me').expect(401);
  });

  test('inactive users cannot log in', async () => {
    if (!dbReady) return;

    await authRequest(await loginOwner())
      .post('/api/users')
      .send({
        role_id: 6,
        full_name: 'Inactive Integration User',
        username: 'inactive_user',
        email: 'inactive_user@example.com',
        password: 'ChangeMe123!',
        status: 'inactive'
      })
      .expect(201);

    await request(app)
      .post('/api/auth/login')
      .send({ login: 'inactive_user', password: 'ChangeMe123!' })
      .expect(401);
  });

  test('image upload requires auth and rejects non-image payloads', async () => {
    if (!dbReady) return;

    await request(app)
      .post('/api/upload')
      .send({
        filename: 'logo.png',
        content: 'data:image/png;base64,aGVsbG8='
      })
      .expect(401);

    const token = await loginOwner();
    await authRequest(token)
      .post('/api/upload')
      .send({
        filename: 'bad.txt',
        content: 'data:text/plain;base64,aGVsbG8='
      })
      .expect(400);

    const response = await authRequest(token)
      .post('/api/upload')
      .send({
        filename: 'logo.png',
        content: 'data:image/png;base64,aGVsbG8='
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.url).toMatch(/\/uploads\/\d+-logo\.png$/);
    const uploadedName = response.body.url.split('/uploads/')[1];
    fs.rmSync(path.join(__dirname, '../../public/uploads', uploadedName), { force: true });
  });
});
