import { createReadOnlyResourceApi } from '../resourceApi.js';

export function createAuditLogsApi(client) {
  return createReadOnlyResourceApi(client, '/audit-logs');
}
