const service = require('./dashboard.service');
const { successResponse } = require('../../utils/response');

async function getDashboard(req, res) {
  const dashboard = await service.getDashboard(req.user);
  return successResponse(res, {
    message: 'Dashboard fetched',
    data: { dashboard }
  });
}

module.exports = {
  getDashboard
};
