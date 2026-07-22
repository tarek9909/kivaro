export function createDashboardApi(client) {
  return {
    get: (params, options) => client.get('/dashboard', { ...options, params })
  };
}
