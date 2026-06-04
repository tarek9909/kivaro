export function createDashboardApi(client) {
  return {
    get: (options) => client.get('/dashboard', options)
  };
}
