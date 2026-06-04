const ALL_METHODS = ['list', 'create', 'get', 'update', 'replace', 'remove'];

function buildOperations(client, basePath) {
  return {
    list: (params, options) => client.get(basePath, { ...options, params }),
    create: (payload, options) => client.post(basePath, payload, options),
    get: (id, options) => client.get(`${basePath}/${id}`, options),
    update: (id, payload, options) => client.patch(`${basePath}/${id}`, payload, options),
    replace: (id, payload, options) => client.put(`${basePath}/${id}`, payload, options),
    remove: (id, options) => client.delete(`${basePath}/${id}`, options)
  };
}

/**
 * Build a typed CRUD surface that mirrors the backend routes for a resource.
 * Pass `only` to opt-in to specific operations supported by the backend.
 */
export function createResourceApi(client, basePath, { only = ALL_METHODS } = {}) {
  const operations = buildOperations(client, basePath);
  return Object.fromEntries(only.map((method) => [method, operations[method]]));
}

export function createReadOnlyResourceApi(client, basePath, { only = ['list', 'get'] } = {}) {
  return createResourceApi(client, basePath, { only });
}
