'use strict';

process.env.ROUTE_SEED_SALESMAN_NAME = process.env.ROUTE_SEED_SALESMAN_NAME || 'waed';
process.env.ROUTE_SEED_DATA_MODULE = './seed-waed-routes.data';

require('./seed-route-customers');
