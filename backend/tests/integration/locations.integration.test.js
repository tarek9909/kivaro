const {
  authRequest,
  closeIntegrationPool,
  createLocationFixture,
  loginOwner,
  prepareIntegrationDb
} = require('./helpers/integration');

jest.setTimeout(30000);

describe('locations assignment integration', () => {
  let dbReady = false;
  let token;

  beforeAll(async () => {
    dbReady = await prepareIntegrationDb();
    if (dbReady) {
      token = await loginOwner();
    }
  });

  afterAll(async () => {
    await closeIntegrationPool();
  });

  test('salesman sublocation assignments are listed and duplicate active assignments are rejected', async () => {
    if (!dbReady) return;

    const market = await createLocationFixture(token, 'salesman_assignments');

    const assignmentsResponse = await authRequest(token)
      .get(`/api/salesmen/${market.salesman.id}/sublocations`)
      .expect(200);

    expect(assignmentsResponse.body.data.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          salesman_id: market.salesman.id,
          sublocation_id: market.sublocation.id,
          status: 'active'
        })
      ])
    );

    await authRequest(token)
      .post(`/api/salesmen/${market.salesman.id}/sublocations`)
      .send({
        sublocation_id: market.sublocation.id,
        assigned_at: '2026-05-02'
      })
      .expect(409);

    await authRequest(token)
      .delete(`/api/salesmen/${market.salesman.id}/sublocations/${market.sublocation.id}`)
      .expect(200);

    await authRequest(token)
      .post(`/api/salesmen/${market.salesman.id}/sublocations`)
      .send({
        sublocation_id: market.sublocation.id,
        assigned_at: '2026-05-03'
      })
      .expect(201);
  });
});
