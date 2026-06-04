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
      'Express/MySQL REST API for auth, RBAC, inventory, purchases, production, dispatch, settlements, debts, accounting, commissions, reports, audit logs, and notifications.'
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
    { name: 'Production' },
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
    '/item-variants': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List item variants', permission: 'inventory.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Inventory'], summary: 'Create an item variant', method: 'post', permission: 'inventory.create', body: { type: 'object' } })
    },
    '/warehouses': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List warehouses', permission: 'inventory.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Inventory'], summary: 'Create a warehouse', method: 'post', permission: 'inventory.create', body: { type: 'object' } })
    },
    '/stock-adjustments': {
      post: protectedOperation({ tags: ['Inventory'], summary: 'Create stock movement and balance adjustment atomically', method: 'post', permission: 'stock.adjust', body: { type: 'object' } })
    },
    '/stock-movements': {
      get: protectedOperation({ tags: ['Inventory'], summary: 'List stock movements', permission: 'stock.movements', parameters: paginationParams })
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
    '/customers': {
      get: protectedOperation({ tags: ['Customers'], summary: 'List customers', permission: 'customers.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Customers'], summary: 'Create a customer', method: 'post', permission: 'customers.create', body: { type: 'object' } })
    },
    '/packaging-configurations': {
      get: protectedOperation({ tags: ['Production'], summary: 'List packaging configurations', permission: 'production.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Production'], summary: 'Create packaging configuration', method: 'post', permission: 'production.create', body: { type: 'object' } })
    },
    '/production-batches': {
      get: protectedOperation({ tags: ['Production'], summary: 'List production batches', permission: 'production.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Production'], summary: 'Create a production batch', method: 'post', permission: 'production.create', body: { type: 'object' } })
    },
    '/production-batches/{id}/complete': {
      post: protectedOperation({ tags: ['Production'], summary: 'Consume components and create finished stock atomically', method: 'post', permission: 'production.complete', parameters: [idParam], body: { type: 'object' } })
    },
    '/dispatch-requests': {
      get: protectedOperation({ tags: ['Dispatch'], summary: 'List dispatch requests', permission: 'dispatch.view', parameters: paginationParams }),
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Create a dispatch request', method: 'post', permission: 'dispatch.create', body: { type: 'object' } })
    },
    '/dispatch-requests/{id}/approve': {
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Approve a submitted dispatch request', method: 'post', permission: 'dispatch.approve', parameters: [idParam] })
    },
    '/dispatch-requests/{id}/dispatch': {
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Move dispatch stock out of inventory', method: 'post', permission: 'dispatch.approve', parameters: [idParam] })
    },
    '/dispatch-requests/{id}/print-summary': {
      get: protectedOperation({
        tags: ['Dispatch'],
        summary: 'Return structured dispatch summary or PDF with format=pdf',
        permission: 'dispatch.print',
        parameters: [...[idParam], { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'pdf'] } }],
        responses: { 200: { description: 'JSON or PDF response', content: { 'application/json': jsonResponse.content['application/json'], 'application/pdf': pdfResponse.content['application/pdf'] } } }
      })
    },
    '/dispatch-requests/{id}/print-customer-receipts': {
      get: protectedOperation({
        tags: ['Dispatch'],
        summary: 'Return structured customer receipts or a PDF packet with format=pdf',
        permission: 'dispatch.print',
        parameters: [idParam, { name: 'format', in: 'query', schema: { type: 'string', enum: ['json', 'pdf'] } }],
        responses: { 200: { description: 'JSON or PDF response', content: { 'application/json': jsonResponse.content['application/json'], 'application/pdf': pdfResponse.content['application/pdf'] } } }
      })
    },
    '/dispatch-requests/{id}/settlements': {
      get: protectedOperation({ tags: ['Dispatch'], summary: 'List settlements for a dispatch request', permission: 'dispatch.view', parameters: [idParam] }),
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Create settlement for a dispatched request using return-adjusted net expected totals', method: 'post', permission: 'dispatch.settle', parameters: [idParam], body: { type: 'object' } })
    },
    '/dispatch-settlements/{id}': {
      get: protectedOperation({ tags: ['Dispatch'], summary: 'Fetch settlement detail with settlement customers', permission: 'dispatch.view', parameters: [idParam] })
    },
    '/dispatch-settlements/{id}/customers': {
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Add customer collection to a draft settlement', method: 'post', permission: 'dispatch.settle', parameters: [idParam], body: { type: 'object' } })
    },
    '/dispatch-settlements/{id}/complete': {
      post: protectedOperation({ tags: ['Dispatch'], summary: 'Complete settlement and post gross receipts, debts, payments, and balances', method: 'post', permission: 'dispatch.settle', parameters: [idParam], body: { type: 'object' } })
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
      get: protectedOperation({ tags: ['Reports'], summary: 'Sales report, JSON or CSV', permission: 'reports.view', parameters: reportParams })
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
