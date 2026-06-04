import { ApiError } from './ApiError.js';
import { apiConfig } from './config.js';
import { httpClient } from './httpClient.js';
import { tokenStorage } from './tokenStorage.js';
import { createAccountingApi } from './modules/accounting.js';
import { createAuditLogsApi } from './modules/auditLogs.js';
import { createAuthApi } from './modules/auth.js';
import { createCommissionsApi } from './modules/commissions.js';
import { createCoreApi } from './modules/core.js';
import { createCustomersApi } from './modules/customers.js';
import { createDashboardApi } from './modules/dashboard.js';
import { createDispatchApi } from './modules/dispatch.js';
import { createInventoryApi } from './modules/inventory.js';
import { createLocationsApi } from './modules/locations.js';
import { createNotificationsApi } from './modules/notifications.js';
import { createPaymentsApi } from './modules/payments.js';
import { createProductionApi } from './modules/production.js';
import { createPurchasesApi } from './modules/purchases.js';
import { createReportsApi } from './modules/reports.js';
import { createRolesApi } from './modules/roles.js';
import { createSettingsApi } from './modules/settings.js';
import { createSuperadminApi } from './modules/superadmin.js';
import { createUsersApi } from './modules/users.js';

export const api = {
  accounting: createAccountingApi(httpClient),
  auditLogs: createAuditLogsApi(httpClient),
  auth: createAuthApi(httpClient),
  commissions: createCommissionsApi(httpClient),
  core: createCoreApi(httpClient),
  customers: createCustomersApi(httpClient),
  dashboard: createDashboardApi(httpClient),
  dispatch: createDispatchApi(httpClient),
  inventory: createInventoryApi(httpClient),
  locations: createLocationsApi(httpClient),
  notifications: createNotificationsApi(httpClient),
  payments: createPaymentsApi(httpClient),
  production: createProductionApi(httpClient),
  purchases: createPurchasesApi(httpClient),
  reports: createReportsApi(httpClient),
  roles: createRolesApi(httpClient),
  settings: createSettingsApi(httpClient),
  superadmin: createSuperadminApi(httpClient),
  users: createUsersApi(httpClient)
};

export { ApiError, apiConfig, httpClient, tokenStorage };
