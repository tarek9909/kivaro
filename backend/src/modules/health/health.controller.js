const healthService = require('./health.service');
const { successResponse } = require('../../utils/response');

async function healthCheck(req, res) {
  const health = await healthService.getHealth();

  return successResponse(res, {
    message: 'Health check completed',
    data: health
  });
}

module.exports = {
  healthCheck
};
