const express = require('express');
const request = require('supertest');
const { z } = require('zod');
const validate = require('../src/middleware/validate.middleware');
const { errorHandler } = require('../src/middleware/error.middleware');
const { successResponse } = require('../src/utils/response');

function buildApp() {
  const app = express();

  app.use(express.json());
  app.post(
    '/validate',
    validate(
      z.object({
        body: z.object({
          quantity: z.number().positive()
        })
      })
    ),
    (req, res) => successResponse(res, { data: req.body })
  );
  app.use(errorHandler);

  return app;
}

describe('validate middleware', () => {
  test('returns normalized 400 response for invalid input', async () => {
    const response = await request(buildApp())
      .post('/validate')
      .send({ quantity: 0 })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
    expect(response.body.errors).toEqual([
      {
        field: 'body.quantity',
        message: 'Number must be greater than 0'
      }
    ]);
  });
});
