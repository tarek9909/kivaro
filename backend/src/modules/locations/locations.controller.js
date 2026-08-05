const service = require('./locations.service');
const { successResponse } = require('../../utils/response');
const { sendCsv } = require('../../utils/csv');

function list(method, key, message) {
  return async (req, res) => {
    const result = await method(req.query, req.user);
    successResponse(res, { message, data: { [key]: result.rows }, meta: result.meta });
  };
}

function get(method, key, message) {
  return async (req, res) => {
    const data = await method(req.params.id, req.user);
    successResponse(res, { message, data: { [key]: data } });
  };
}

function create(method, key, message) {
  return async (req, res) => {
    const data = await method(req.body, req.user.id, req.user);
    successResponse(res, { statusCode: 201, message, data: { [key]: data } });
  };
}

function update(method, key, message) {
  return async (req, res) => {
    const data = await method(req.params.id, req.body, req.user);
    successResponse(res, { message, data: { [key]: data } });
  };
}

function remove(method, message) {
  return async (req, res) => {
    await method(req.params.id, req.user);
    successResponse(res, { message, data: {} });
  };
}

async function assignSalesmanSublocation(req, res) {
  const assignment = await service.assignSalesmanSublocation(req.params.id, req.body, req.user);
  successResponse(res, { statusCode: 201, message: 'Salesman assigned to sublocation', data: { assignment } });
}

async function replaceSalesmanSublocations(req, res) {
  const result = await service.replaceSalesmanSublocations(req.params.id, req.body, req.user);
  successResponse(res, {
    message: 'Salesman sublocation assignments updated',
    data: result
  });
}

async function listSalesmanSublocations(req, res) {
  const assignments = await service.listSalesmanSublocations(req.params.id, req.query, req.user);
  successResponse(res, {
    message: 'Salesman assignments fetched',
    data: { assignments }
  });
}

async function exportSalesmen(req, res) {
  const rows = await service.exportSalesmen(req.query, req.user);
  const dataset = req.query.dataset || 'performance';
  return sendCsv(res, `salesmen-${dataset}.csv`, rows);
}

async function unassignSalesmanSublocation(req, res) {
  await service.unassignSalesmanSublocation(req.params.id, req.params.sublocationId, req.user);
  successResponse(res, { message: 'Salesman unassigned from sublocation', data: {} });
}

async function createTargetBundle(req, res) {
  const location_target = await service.createTargetBundle(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Active target bundle created', data: { location_target } });
}

async function updateTargetAssignment(req, res) {
  const location_target = await service.updateTargetAssignment(req.params.id, req.body, req.user.id, req.user);
  successResponse(res, { message: 'Target assignment updated', data: { location_target } });
}

async function getTargetSetup(req, res) {
  const setup = await service.getTargetSetup(req.params.id, req.user);
  successResponse(res, { message: 'Target assignment setup fetched', data: { setup } });
}

async function listLocationSublocations(req, res) {
  const result = await service.listSublocations({
    ...req.query,
    location_id: req.params.id
  }, req.user);
  successResponse(res, {
    message: 'Sublocations fetched',
    data: { sublocations: result.rows },
    meta: result.meta
  });
}

module.exports = {
  assignSalesmanSublocation,
  createLocation: create(service.createLocation, 'location', 'Location created'),
  createTargetBundle,
  createSalesman: create(service.createSalesman, 'salesman', 'Salesman created'),
  createSublocation: create(service.createSublocation, 'sublocation', 'Sublocation created'),
  deleteLocation: remove(service.deleteLocation, 'Location deleted'),
  deleteSalesman: remove(service.deleteSalesman, 'Salesman deleted'),
  deleteSublocation: remove(service.deleteSublocation, 'Sublocation deleted'),
  getTargetSetup,
  getLocation: get(service.getLocation, 'location', 'Location fetched'),
  getLocationTarget: get(service.getLocationTarget, 'location_target', 'Location target fetched'),
  getSalesman: get(service.getSalesman, 'salesman', 'Salesman fetched'),
  exportSalesmen,
  listLocationSublocations,
  listLocationTargets: list(service.listLocationTargets, 'location_targets', 'Location targets fetched'),
  listLocations: list(service.listLocations, 'locations', 'Locations fetched'),
  listSalesmanSublocations,
  replaceSalesmanSublocations,
  listSalesmen: list(service.listSalesmen, 'salesmen', 'Salesmen fetched'),
  listSublocations: list(service.listSublocations, 'sublocations', 'Sublocations fetched'),
  updateLocation: update(service.updateLocation, 'location', 'Location updated'),
  updateTargetAssignment,
  updateSalesman: update(service.updateSalesman, 'salesman', 'Salesman updated'),
  updateSublocation: update(service.updateSublocation, 'sublocation', 'Sublocation updated'),
  unassignSalesmanSublocation
};
