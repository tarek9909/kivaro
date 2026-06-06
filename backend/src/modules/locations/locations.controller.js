const service = require('./locations.service');
const { successResponse } = require('../../utils/response');

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

async function listSalesmanSublocations(req, res) {
  const assignments = await service.listSalesmanSublocations(req.params.id, req.query, req.user);
  successResponse(res, {
    message: 'Salesman assignments fetched',
    data: { assignments }
  });
}

async function unassignSalesmanSublocation(req, res) {
  await service.unassignSalesmanSublocation(req.params.id, req.params.sublocationId, req.user);
  successResponse(res, { message: 'Salesman unassigned from sublocation', data: {} });
}

async function createSublocationTarget(req, res) {
  const sublocation_target = await service.createSublocationTarget(req.params.id, req.body, req.user);
  successResponse(res, { statusCode: 201, message: 'Sublocation target created', data: { sublocation_target } });
}

async function generateSalesmanTargets(req, res) {
  const salesman_targets = await service.generateSalesmanTargets(req.params.id, req.user);
  successResponse(res, { message: 'Salesman targets generated', data: { salesman_targets } });
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
  createLocationTarget: create(service.createLocationTarget, 'location_target', 'Location target created'),
  createSalesman: create(service.createSalesman, 'salesman', 'Salesman created'),
  createSublocation: create(service.createSublocation, 'sublocation', 'Sublocation created'),
  createSublocationTarget,
  deleteLocation: remove(service.deleteLocation, 'Location deleted'),
  deleteSalesman: remove(service.deleteSalesman, 'Salesman deleted'),
  deleteSublocation: remove(service.deleteSublocation, 'Sublocation deleted'),
  generateSalesmanTargets,
  getLocation: get(service.getLocation, 'location', 'Location fetched'),
  getLocationTarget: get(service.getLocationTarget, 'location_target', 'Location target fetched'),
  getSalesman: get(service.getSalesman, 'salesman', 'Salesman fetched'),
  listLocationSublocations,
  listLocationTargets: list(service.listLocationTargets, 'location_targets', 'Location targets fetched'),
  listLocations: list(service.listLocations, 'locations', 'Locations fetched'),
  listSalesmanSublocations,
  listSalesmen: list(service.listSalesmen, 'salesmen', 'Salesmen fetched'),
  listSublocations: list(service.listSublocations, 'sublocations', 'Sublocations fetched'),
  updateLocation: update(service.updateLocation, 'location', 'Location updated'),
  updateLocationTarget: update(service.updateLocationTarget, 'location_target', 'Location target updated'),
  updateSalesman: update(service.updateSalesman, 'salesman', 'Salesman updated'),
  updateSublocation: update(service.updateSublocation, 'sublocation', 'Sublocation updated'),
  unassignSalesmanSublocation
};
