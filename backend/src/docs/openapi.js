const packageJson = require('../../package.json');

const jsonResponse = {
  description: 'Normalized JSON response',
  content: {
    'application/json': {
      schema: {
        oneOf: [
          { $ref: '#/components/schemas/SuccessResponse' },
          { $ref: '#/components/schemas/ErrorResponse' }
        ]
      }
    }
  }
};

const csvResponse = {
  description: 'CSV export',
  content: {
    'text/csv': {
      schema: {
        type: 'string',
        example: 'id,name,created_at\n1,Example,2026-05-26'
      }
    }
  }
};

const pdfResponse = {
  description: 'Printable PDF document',
  content: {
    'application/pdf': {
      schema: {
        type: 'string',
        format: 'binary'
      }
    }
  }
};

function protectedOperation({ summary, tags, method = 'get', permission, body, parameters = [], responses } = {}) {
  const operation = {
    tags,
    summary,
    security: [{ bearerAuth: [] }],
    parameters: permission
      ? [
          ...parameters,
          {
            name: 'X-Permission',
            in: 'header',
            required: false,
            schema: { type: 'string', example: permission },
            description: 'Documented permission required by the API route.'
          }
        ]
      : parameters,
    responses: responses || {
      200: jsonResponse,
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' }
    }
  };

  if (body && ['post', 'put', 'patch'].includes(method)) {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: body
        }
      }
    };
  }

  return operation;
}

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'integer', minimum: 1 }
};

const paginationParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
  { name: 'search', in: 'query', schema: { type: 'string' } },
  {
    name: 'store_id',
    in: 'query',
    required: false,
    schema: { type: 'integer', minimum: 1 },
    description: 'Required for superadmin operational list/report requests.'
  }
];

const reportParams = [
  ...paginationParams,
  { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'csv'] } },
  { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date' } },
  { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date' } }
];

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Charcoal ERP API',
    version: packageJson.version,
    description:
      'Express/MySQL REST API for item inventory, carton lots, flat packaging, ready stock, Mini POS, source-aware dispatch, invoices, settlements, reporting, and administration.'
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Roles' },
    { name: 'Settings' },
    { name: 'Inventory' },
    { name: 'Purchases' },
    { name: 'Locations' },
    { name: 'Customers' },
    { name: 'Packaging' },
    { name: 'Mini POS' },
    { name: 'Invoices' },
    { name: 'Dispatch' },
    { name: 'Payments' },
    { name: 'Accounting' },
    { name: 'Commissions' },
    { name: 'Reports' },
    { name: 'Audit Logs' },
    { name: 'Notifications' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API and database health',
        responses: { 200: jsonResponse }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with username, email, or phone',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          200: jsonResponse,
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' }
        }
      }
    },
    '/auth/logout': {
      post: protectedOperation({ tags: ['Auth'], summary: 'Revoke the current bearer token', method: 'post' })
    },
    '/auth/me': {
      get: protectedOperation({ tags: ['Auth'], summary: 'Fetch the authenticated user profile and permissions' })
    },
    '/users': {
      get: protectedOperation({ tags: ['Users'], summary: 'List users', permission: 'users.view', parameters: paginationParams }),
      post: protectedOperation({
        tags: ['Users'],
        summary: 'Create a user',
        method: 'post',
        permission: 'users.create',
        body: { $ref: '#/components/schemas/UserWrite' },
        responses: { 201: jsonResponse, 400: { $ref: '#/components/responses/BadRequest' } }
      })
    },
    '/users/{id}': {
      get: protectedOperation({ tags: ['Users'], summary: 'Fetch a user', permission: 'users.view', parameters: [idParam] }),
      patch: protectedOperation({ tags: ['Users'], summary: 'Update a user', method: 'patch', permission: 'users.update', parameters: [idParam], body: { $ref: '#/components/schemas/UserWrite' } }),
      delete: protectedOperation({ tags: ['Users'], summary: 'Soft-delete a user', method: 'delete', permission: 'users.delete', parameters: [idParam] })
    },
    '/roles': {
      get: protectedOperation({ tags: ['Roles'], summary: 'List roles', permission: 'roles.manage', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Roles'], summary: 'Create a role', method: 'post', permission: 'roles.manage', body: { type: 'object' } })
    },
    '/roles/{id}/permissions': {
      put: protectedOperation({ tags: ['Roles'], summary: 'Replace role permissions', method: 'put', permission: 'roles.manage', parameters: [idParam], body: { type: 'object', properties: { permission_ids: { type: 'array', items: { type: 'integer' } } } } })
    },
    '/permissions': {
      get: protectedOperation({ tags: ['Roles'], summary: 'List permissions', permission: 'roles.manage', parameters: paginationParams })
    },
    '/settings': {
      get: protectedOperation({ tags: ['Settings'], summary: 'List system settings', permission: 'settings.manage' })
    },
    '/settings/vat': {
      get: protectedOperation({
        tags: ['Settings'],
        summary: 'Fetch store VAT settings. Superadmin must pass store_id.',
        parameters: [{ name: 'store_id', in: 'query', schema: { type: 'integer', minimum: 1 } }]
      }),
      patch: protectedOperation({
        tags: ['Settings'],
        summary: 'Update store VAT settings',
        method: 'patch',
        permission: 'settings.manage',
        body: {
          type: 'object',
          required: ['enabled', 'rate'],
          properties: {
            enabled: { type: 'boolean' },
            rate: { type: 'number', minimum: 0, maximum: 100 },
            store_id: { type: 'integer', minimum: 1, description: 'Required for superadmin updates.' }
          }
        }
      })
    },
    '/settings/{key}': {
      patch: protectedOperation({
        tags: ['Settings'],
        summary: 'Update a system setting',
        method: 'patch',
        permission: 'settings.manage',
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        body: { type: 'object' }
      })
    },
    '/company-profile': {
      get: protectedOperation({ tags: ['Settings'], summary: 'Fetch company profile', permission: 'settings.manage' }),
      patch: protectedOperation({ tags: ['Settings'], summary: 'Update company profile', method: 'patch', permission: 'settings.manage', body: { type: 'object' } })
    },
    '/item-categories': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List item categories', permission: 'inventory.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Inventory'], summary: 'Create an item category', method: 'post', permission: 'inventory.create', body: { type: 'object' } })
    },
    '/units': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List units', permission: 'inventory.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Inventory'], summary: 'Create a unit', method: 'post', permission: 'inventory.create', body: { type: 'object' } })
    },
    '/items': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List items', permission: 'inventory.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Inventory'], summary: 'Create an item', method: 'post', permission: 'inventory.create', body: { type: 'object' } })
    },
    '/warehouses': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List warehouses', permission: 'inventory.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Inventory'], summary: 'Create a warehouse', method: 'post', permission: 'inventory.create', body: { type: 'object' } })
    },
    '/stock-adjustments': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List canonical item stock adjustments', permission: 'stock.movements', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Inventory'], summary: 'Create a canonical item stock adjustment atomically', method: 'post', permission: 'stock.adjust', body: { type: 'object' } })
    },
    '/stock-receipts': {
      post: protectedOperation({ tags: ['Inventory'], summary: 'Receive item stock or carton-weight stock', method: 'post', permission: 'stock.adjust', body: { type: 'object' } })
    },
    '/stock-balances': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List canonical item stock balances', permission: 'inventory.view', parameters: paginationParams })
    },
    '/stock-movements': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List stock movements', permission: 'stock.movements', parameters: paginationParams })
    },
    '/carton-lots': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List carton-weight receipt lots', permission: 'inventory.view', parameters: paginationParams })
    },
    '/open-carton-shelves': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List carton shelves and loose units', permission: 'inventory.view', parameters: paginationParams })
    },
    '/suppliers': {
      get: protectedOperation({ tags: ['Purchases'], summary: 'List suppliers', permission: 'purchase_orders.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Purchases'], summary: 'Create a supplier', method: 'post', permission: 'purchase_orders.create', body: { type: 'object' } })
    },
    '/purchase-orders': {
      get: protectedOperation({ tags: ['Purchases'], summary: 'List purchase orders', permission: 'purchase_orders.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Purchases'], summary: 'Create a purchase order', method: 'post', permission: 'purchase_orders.create', body: { type: 'object' } })
    },
    '/purchase-orders/{id}/receipts': {
      post: protectedOperation({ tags: ['Purchases'], summary: 'Receive purchase order items and increase stock', method: 'post', permission: 'purchase_orders.receive', parameters: [idParam], body: { type: 'object' } })
    },
    '/locations': {
      get: protectedOperation({ tags: ['Locations'], summary: 'List locations', permission: 'locations.manage', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Locations'], summary: 'Create a location', method: 'post', permission: 'locations.manage', body: { type: 'object' } })
    },
    '/sublocations': {
      get: protectedOperation({ tags: ['Locations'], summary: 'List sublocations', permission: 'locations.manage', parameters: paginationParams })
    },
    '/salesmen': {
      get: protectedOperation({ tags: ['Locations'], summary: 'List salesmen', permission: 'salesmen.manage', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Locations'], summary: 'Create a salesman', method: 'post', permission: 'salesmen.manage', body: { type: 'object' } })
    },
    '/salesmen/export': {
      get: protectedOperation({
        tags: ['Locations'],
        summary: 'Export salesman performance, POS orders, invoices, delivered customers, or revenue as CSV',
        permission: 'salesmen.manage + reports.export',
        parameters: [
          { name: 'dataset', in: 'query', schema: { type: 'string', enum: ['performance', 'orders', 'invoices', 'delivered_customers', 'revenue'], default: 'performance' } },
          { name: 'salesman_id', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date' } },
          paginationParams[3]
        ],
        responses: { 200: csvResponse }
      })
    },
    '/customers': {
      get: protectedOperation({ tags: ['Customers'], summary: 'List customers', permission: 'customers.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Customers'], summary: 'Create a customer', method: 'post', permission: 'customers.create', body: { type: 'object' } })
    },
    '/customers/export': {
      get: protectedOperation({
        tags: ['Customers'],
        summary: 'Export the filtered customer directory, invoices, receipts, payments, or debts as CSV',
        permission: 'customers.view + reports.export',
        parameters: [
          { name: 'dataset', in: 'query', schema: { type: 'string', enum: ['directory', 'invoices', 'receipts', 'payments', 'debts'], default: 'directory' } },
          { name: 'location_id', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'sublocation_id', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'salesman_id', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date' } },
          paginationParams[3]
        ],
        responses: { 200: csvResponse }
      })
    },
    '/packaging-groups': {
      get: protectedOperation({ tags: ['Packaging'], summary: 'List flat packaging templates', permission: 'inventory.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Packaging'], summary: 'Create a flat packaging template with a saved normal input item', method: 'post', permission: 'inventory.create', body: { type: 'object' } })
    },
    '/packaging-groups/{id}/components': {
      put: protectedOperation({ tags: ['Packaging'], summary: 'Replace outer, inner, and optional consumable template components', method: 'put', permission: 'inventory.update', parameters: [idParam], body: { type: 'object' } })
    },
    '/packaging-groups/{id}/preview': {
      post: protectedOperation({ tags: ['Packaging'], summary: 'Preview server-calculated raw input, material shortages, capacity, and WAC cost', method: 'post', permission: 'inventory.view', parameters: [idParam], body: { type: 'object' } })
    },
    '/packaging-groups/{id}/complete': {
      post: protectedOperation({ tags: ['Packaging'], summary: 'Atomically consume inputs and create ready packaged containers', method: 'post', permission: 'inventory.create or stock.adjust', parameters: [idParam], body: { type: 'object' } })
    },
    '/packaging-operations': {
      get: protectedOperation({ tags: ['Packaging'], summary: 'List completed packaging operations and composition snapshots', permission: 'inventory.view', parameters: paginationParams })
    },
    '/ready-stock': {
      get: protectedOperation({ tags: ['Packaging'], summary: 'List ready packaged container availability', permission: 'inventory.view', parameters: paginationParams })
    },
    '/sale-catalog': {
      get: protectedOperation({ tags: ['Packaging'], summary: 'List normal and ready-stock sellable offers', permission: 'inventory.view or dispatch.create', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Packaging'], summary: 'Configure a sellable offer price, VAT, and POS activation', method: 'post', permission: 'inventory.create', body: { type: 'object' } })
    },
    '/dispatch-requests': {
      get: protectedOperation({ tags: ['Dispatch'], summary: 'List dispatch requests', permission: 'dispatch.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Create a compact item-based dispatch draft', method: 'post', permission: 'dispatch.create', body: { type: 'object' } })
    },
    '/dispatch-requests/from-pos': {
      post: protectedOperation({ tags: ['Mini POS'], summary: 'Combine selected available orders from one salesman into a dispatch draft', method: 'post', permission: 'pos.accept', body: { type: 'object' } })
    },
    '/dispatch-requests/{id}/submit': {
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Submit a draft and issue one current-revision invoice per customer', method: 'post', permission: 'dispatch.create', parameters: [idParam] })
    },
    '/dispatch-requests/{id}/rework': {
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Void the current invoices and return the dispatch to a new draft revision', method: 'post', permission: 'dispatch.create', parameters: [idParam], body: { type: 'object' } })
    },
    '/dispatch-requests/{id}/documents/customer-table': {
      get: protectedOperation({ tags: ['Dispatch'], summary: 'Generate/download the current-revision customer checklist PDF', permission: 'dispatch.print', parameters: [idParam], responses: { 200: pdfResponse } })
    },
    '/dispatch-requests/{id}/documents/quantity-table': {
      get: protectedOperation({ tags: ['Dispatch'], summary: 'Generate/download the current-revision quantity-only PDF', permission: 'dispatch.print', parameters: [idParam], responses: { 200: pdfResponse } })
    },
    '/dispatch-requests/{id}/approve': {
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Check document gate and reserve exact normal or ready-stock sources', method: 'post', permission: 'dispatch.approve', parameters: [idParam] })
    },
    '/dispatch-requests/{id}/dispatch': {
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Move dispatch stock out of inventory', method: 'post', permission: 'dispatch.approve', parameters: [idParam] })
    },
    '/dispatch-requests/{id}/settlements': {
      get: protectedOperation({ tags: ['Dispatch'], summary: 'List submitted delivery closeouts and settlements', permission: 'dispatch.view', parameters: [idParam] })
    },
    '/dispatch-settlements/{id}': {
      get: protectedOperation({ tags: ['Dispatch'], summary: 'Fetch settlement detail with settlement customers', permission: 'dispatch.view', parameters: [idParam] })
    },
    '/dispatch-settlements/{id}/complete': {
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Post a delivery closeout to an incoming-capable cash account', method: 'post', permission: 'dispatch.settle', parameters: [idParam], body: { type: 'object' } })
    },
    '/invoices': {
      get: protectedOperation({ tags: ['Invoices'], summary: 'List issued, voided, and cancelled invoices', permission: 'invoices.view', parameters: paginationParams })
    },
    '/invoices/{id}/pdf': {
      get: protectedOperation({ tags: ['Invoices'], summary: 'Generate/download a current issued invoice PDF and record the download', permission: 'invoices.print', parameters: [idParam], responses: { 200: pdfResponse } })
    },
    '/pos/catalog': {
      get: protectedOperation({ tags: ['Mini POS'], summary: 'List active available offers without exposing stock quantities', permission: 'pos.own_orders', parameters: paginationParams })
    },
    '/pos/orders': {
      get: protectedOperation({ tags: ['Mini POS'], summary: 'List own pending/history orders', permission: 'pos.own_orders', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Mini POS'], summary: 'Create a pending non-reserving POS order', method: 'post', permission: 'pos.own_orders', body: { type: 'object' } })
    },
    '/pos/workspace': {
      get: protectedOperation({ tags: ['Mini POS'], summary: 'Get the linked salesman’s own dispatch, closeout, debt, KPI, target, commission, territory, and POS history workspace', permission: 'salesman_workspace.view', parameters: paginationParams })
    },
    '/pos/review': {
      get: protectedOperation({ tags: ['Mini POS'], summary: 'Review pending POS work grouped by salesman with authoritative shortages', permission: 'pos.review', parameters: paginationParams })
    },
    '/customer-debts': {
      get: protectedOperation({ tags: ['Payments'], summary: 'List customer debts', permission: 'debts.manage', parameters: paginationParams })
    },
    '/customer-debts/{id}/payments': {
      post: protectedOperation({ tags: ['Payments'], summary: 'Record customer debt payment', method: 'post', permission: 'debts.manage', parameters: [idParam], body: { type: 'object' } })
    },
    '/customer-payments': {
      get: protectedOperation({ tags: ['Payments'], summary: 'List customer payments', permission: 'accounting.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Payments'], summary: 'Create customer payment and receipt', method: 'post', permission: 'accounting.manage', body: { type: 'object' } })
    },
    '/customer-receipts/{id}/print': {
      get: protectedOperation({
        tags: ['Payments'],
        summary: 'Mark receipt printed and return JSON or PDF with format=pdf',
        permission: 'dispatch.print',
        parameters: [idParam, { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'pdf'] } }],
        responses: { 200: { description: 'JSON or PDF response', content: { 'application/json': jsonResponse.content['application/json'], 'application/pdf': pdfResponse.content['application/pdf'] } } }
      })
    },
    '/expense-categories': {
      get: protectedOperation({ tags: ['Accounting'], summary: 'List expense categories', permission: 'accounting.view', parameters: paginationParams })
    },
    '/expenses': {
      get: protectedOperation({ tags: ['Accounting'], summary: 'List expenses', permission: 'accounting.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Accounting'], summary: 'Create expense and financial transaction', method: 'post', permission: 'accounting.manage', body: { type: 'object' } })
    },
    '/cash-accounts': {
      get: protectedOperation({ tags: ['Accounting'], summary: 'List cash accounts', permission: 'accounting.view', parameters: paginationParams })
    },
    '/financial-transactions': {
      get: protectedOperation({ tags: ['Accounting'], summary: 'List financial transactions', permission: 'accounting.view', parameters: paginationParams })
    },
    '/commission-rules': {
      get: protectedOperation({ tags: ['Commissions'], summary: 'List commission rules', permission: 'commissions.manage', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Commissions'], summary: 'Create commission rule', method: 'post', permission: 'commissions.manage', body: { type: 'object' } })
    },
    '/commissions/calculate': {
      post: protectedOperation({ tags: ['Commissions'], summary: 'Calculate commission for a salesman target', method: 'post', permission: 'commissions.manage', body: { type: 'object' } })
    },
    '/commissions': {
      get: protectedOperation({ tags: ['Commissions'], summary: 'List commission calculations', permission: 'commissions.manage', parameters: paginationParams })
    },
    '/commissions/{id}/approve': {
      post: protectedOperation({ tags: ['Commissions'], summary: 'Approve a commission calculation', method: 'post', permission: 'commissions.manage', parameters: [idParam] })
    },
    '/commissions/{id}/pay': {
      post: protectedOperation({ tags: ['Commissions'], summary: 'Pay an approved commission calculation', method: 'post', permission: 'commissions.manage', parameters: [idParam], body: { type: 'object' } })
    },
    '/reports/current-stock': {
      get: protectedOperation({ tags: ['Reports'], summary: 'Current stock report, JSON or CSV', permission: 'reports.view', parameters: reportParams, responses: { 200: { description: 'JSON or CSV response', content: { 'application/json': jsonResponse.content['application/json'], 'text/csv': csvResponse.content['text/csv'] } } } })
    },
    '/reports/dispatch-summary': {
      get: protectedOperation({ tags: ['Reports'], summary: 'Dispatch summary report, JSON or CSV', permission: 'reports.view', parameters: reportParams, responses: { 200: { description: 'JSON or CSV response', content: { 'application/json': jsonResponse.content['application/json'], 'text/csv': csvResponse.content['text/csv'] } } } })
    },
    '/reports/sales': {
      get: protectedOperation({ tags: ['Reports'], summary: 'Sales report, defaults to completed dispatches; JSON or CSV', permission: 'reports.view', parameters: reportParams })
    },
    '/reports/debts': {
      get: protectedOperation({ tags: ['Reports'], summary: 'Debts report, JSON or CSV', permission: 'reports.view', parameters: reportParams })
    },
    '/reports/purchases': {
      get: protectedOperation({ tags: ['Reports'], summary: 'Purchases report, JSON or CSV', permission: 'reports.view', parameters: reportParams })
    },
    '/reports/stock-movements': {
      get: protectedOperation({ tags: ['Reports'], summary: 'Stock movement report, JSON or CSV', permission: 'reports.view', parameters: reportParams })
    },
    '/reports/profit-loss': {
      get: protectedOperation({ tags: ['Reports'], summary: 'Profit/loss report, JSON or CSV', permission: 'reports.view', parameters: reportParams })
    },
    '/reports/commissions': {
      get: protectedOperation({ tags: ['Reports'], summary: 'Commissions report, JSON or CSV', permission: 'reports.view', parameters: reportParams })
    },
    '/audit-logs': {
      get: protectedOperation({ tags: ['Audit Logs'], summary: 'List audit logs', permission: 'audit_logs.view', parameters: paginationParams })
    },
    '/notifications': {
      get: protectedOperation({ tags: ['Notifications'], summary: 'List notifications for current user', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Notifications'], summary: 'Create internal notification', method: 'post', body: { type: 'object' } })
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['login', 'password'],
        properties: {
          login: { type: 'string', example: 'owner' },
          password: { type: 'string', format: 'password', example: 'ChangeMe123!' }
        }
      },
      UserWrite: {
        type: 'object',
        properties: {
          role_id: { type: 'integer', example: 1 },
          full_name: { type: 'string', example: 'System Owner' },
          username: { type: 'string', example: 'owner' },
          email: { type: 'string', format: 'email', example: 'owner@example.com' },
          phone: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
          password: { type: 'string', format: 'password' }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'OK' },
          data: { type: 'object' },
          meta: { type: 'object' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    },
    responses: {
      BadRequest: {
        description: 'Validation failed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
      },
      Unauthorized: {
        description: 'Missing, invalid, expired, or revoked bearer token',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
      },
      Forbidden: {
        description: 'Authenticated user lacks the required permission key',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
      }
    }
  }
};

module.exports = openapiSpec;
