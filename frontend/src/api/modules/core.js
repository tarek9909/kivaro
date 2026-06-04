export function createCoreApi(client) {
  return {
    apiInfo: (options) => client.get('/', options),
    health: (options) => client.get('/health', options),
    openapi: (options) => client.get('/openapi.json', options),
    docsHtml: (options) => client.get('/docs', { ...options, responseType: 'text' })
  };
}
