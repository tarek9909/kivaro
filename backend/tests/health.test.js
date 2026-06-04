jest.mock('../src/bootstrap/db', () => ({
  pingDatabase: jest.fn()
}));

const request = require('supertest');
const app = require('../src/app');
const { pingDatabase } = require('../src/bootstrap/db');

describe('health and base routing', () => {
  beforeEach(() => {
    pingDatabase.mockResolvedValue(true);
  });

  test('GET /api/health returns normalized success response', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Health check completed',
      data: {
        status: 'ok',
        environment: 'test',
        database: {
          status: 'connected'
        }
      }
    });
  });

  test('unknown route returns normalized 404 response', async () => {
    const response = await request(app).get('/api/missing-route').expect(404);

    expect(response.body).toEqual({
      success: false,
      message: 'Route /api/missing-route not found',
      errors: []
    });
  });
});
