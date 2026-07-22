const express = require('express');
const request = require('supertest');
const { requireAnyPermission, requirePermission } = require('../src/middleware/permission.middleware');
const { errorHandler } = require('../src/middleware/error.middleware');
const { successResponse } = require('../src/utils/response');

function buildApp(user) {
  const app = express();

  app.use((req, res, next) => {
    if (user) {
      req.user = user;
    }

    next();
  });

  app.get('/secure', requirePermission('users.view'), (req, res) => {
    successResponse(res, { message: 'Allowed' });
  });
  app.get('/users', requirePermission('users.view'), (req, res) => {
    successResponse(res, { message: 'Users allowed' });
  });
  app.get('/dispatch-requests', requireAnyPermission('dispatch.view', 'dispatch.create', 'dispatch.approve', 'dispatch.settle', 'dispatch.print'), (req, res) => {
    successResponse(res, { message: 'Dispatch read allowed' });
  });
  app.get('/packaging-operations', requireAnyPermission('inventory.view', 'inventory.create', 'stock.adjust'), (req, res) => {
    successResponse(res, { message: 'Packaging workflow read allowed' });
  });
  app.get('/dashboard', requirePermission('dashboard.view'), (req, res) => {
    successResponse(res, { message: 'Dashboard allowed' });
  });
  app.get('/pos/workspace', requirePermission('salesman_workspace.view'), (req, res) => {
    successResponse(res, { message: 'Salesman workspace allowed' });
  });
  app.use(errorHandler);

  return app;
}

describe('permission middleware', () => {
  test('requires an authenticated user', async () => {
    const response = await request(buildApp()).get('/secure').expect(401);

    expect(response.body).toEqual({
      success: false,
      message: 'Authentication required',
      errors: []
    });
  });

  test('blocks users without the required permission', async () => {
    const response = await request(
      buildApp({ id: 1, permissions: ['users.create'] })
    )
      .get('/secure')
      .expect(403);

    expect(response.body).toEqual({
      success: false,
      message: 'You do not have permission to perform this action',
      errors: []
    });
  });

  test('allows users with wildcard permission', async () => {
    const response = await request(buildApp({ id: 1, permissions: ['*'] }))
      .get('/secure')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Allowed');
  });

  test('blocks enabled-module requests when the store module is disabled', async () => {
    const response = await request(
      buildApp({
        id: 1,
        permissions: ['users.view'],
        enabled_modules: ['dashboard']
      })
    )
      .get('/users')
      .expect(403);

    expect(response.body.message).toBe('This workspace module is not enabled');
  });

  test('blocks wildcard users when the store module is disabled', async () => {
    const response = await request(
      buildApp({
        id: 1,
        permissions: ['*'],
        enabled_modules: ['dashboard']
      })
    )
      .get('/users')
      .expect(403);

    expect(response.body.message).toBe('This workspace module is not enabled');
  });

  test('treats an empty enabled_modules list as all modules enabled', async () => {
    const response = await request(
      buildApp({
        id: 1,
        permissions: ['users.view'],
        enabled_modules: []
      })
    )
      .get('/users')
      .expect(200);

    expect(response.body.message).toBe('Users allowed');
  });

  test('allows superadmins through module checks', async () => {
    const response = await request(
      buildApp({
        id: 1,
        is_superadmin: true,
        permissions: ['users.view'],
        enabled_modules: []
      })
    )
      .get('/users')
      .expect(200);

    expect(response.body.message).toBe('Users allowed');
  });

  test('allows dispatch action-only users to read workflow records', async () => {
    const response = await request(
      buildApp({
        id: 1,
        permissions: ['dispatch.settle'],
        enabled_modules: ['dispatch', 'dispatch.requests']
      })
    )
      .get('/dispatch-requests')
      .expect(200);

    expect(response.body.message).toBe('Dispatch read allowed');
  });

  test('allows a stock-adjustment user to read the canonical packaging workflow', async () => {
    const response = await request(
      buildApp({
        id: 1,
        permissions: ['stock.adjust'],
        enabled_modules: ['inventory', 'inventory.packaging']
      })
    )
      .get('/packaging-operations')
      .expect(200);

    expect(response.body.message).toBe('Packaging workflow read allowed');
  });

  test('blocks dashboard requests when the dashboard module is disabled', async () => {
    const response = await request(
      buildApp({
        id: 1,
        permissions: ['dashboard.view'],
        enabled_modules: ['inventory']
      })
    )
      .get('/dashboard')
      .expect(403);

    expect(response.body.message).toBe('This workspace module is not enabled');
  });

  test('uses the standalone salesman workspace module for its server-backed POS workspace endpoint', async () => {
    const permitted = await request(
      buildApp({
        id: 1,
        permissions: ['salesman_workspace.view'],
        enabled_modules: ['salesman_workspace']
      })
    )
      .get('/pos/workspace')
      .expect(200);

    expect(permitted.body.message).toBe('Salesman workspace allowed');

    const blocked = await request(
      buildApp({
        id: 1,
        permissions: ['salesman_workspace.view'],
        enabled_modules: ['pos']
      })
    )
      .get('/pos/workspace')
      .expect(403);

    expect(blocked.body.message).toBe('This workspace module is not enabled');
  });
});
