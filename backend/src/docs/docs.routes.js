const express = require('express');
const swaggerUi = require('swagger-ui-express');
const openapiSpec = require('./openapi');

const router = express.Router();

router.get('/openapi.json', (req, res) => {
  res.json(openapiSpec);
});

router.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
  explorer: true,
  customSiteTitle: 'Charcoal ERP API Docs'
}));

module.exports = router;
