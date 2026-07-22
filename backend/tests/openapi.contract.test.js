const openapi = require('../src/docs/openapi');

function documentedPermission(path, method) {
  const operation = openapi.paths[path][method];
  return operation.parameters.find((parameter) => parameter.name === 'X-Permission')?.schema?.example;
}

describe('OpenAPI canonical packaging permission contract', () => {
  test('documents the permissions enforced by the active packaging router', () => {
    expect(documentedPermission('/packaging-groups', 'get')).toBe('inventory.view');
    expect(documentedPermission('/packaging-groups', 'post')).toBe('inventory.create');
    expect(documentedPermission('/packaging-groups/{id}/components', 'put')).toBe('inventory.update');
    expect(documentedPermission('/packaging-groups/{id}/preview', 'post')).toBe('inventory.view');
    expect(documentedPermission('/packaging-groups/{id}/complete', 'post')).toBe('inventory.create or stock.adjust');
    expect(documentedPermission('/packaging-operations', 'get')).toBe('inventory.view');
    expect(documentedPermission('/ready-stock', 'get')).toBe('inventory.view');
    expect(documentedPermission('/sale-catalog', 'get')).toBe('inventory.view or dispatch.create');
    expect(documentedPermission('/sale-catalog', 'post')).toBe('inventory.create');
  });

  test('does not publish retired packaging-specific permission keys', () => {
    expect(JSON.stringify(openapi.paths)).not.toContain('packaging.view');
    expect(JSON.stringify(openapi.paths)).not.toContain('packaging.manage');
    expect(JSON.stringify(openapi.paths)).not.toContain('ready_stock.view');
    expect(JSON.stringify(openapi.paths)).not.toContain('ready_stock.manage');
  });
});
