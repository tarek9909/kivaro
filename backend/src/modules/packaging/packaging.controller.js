const service = require('./packaging.service');
const { successResponse } = require('../../utils/response');

function listHandler(serviceMethod, resourceName, message) {
  return async (req, res) => {
    const result = await serviceMethod(req.query, req.user);

    successResponse(res, {
      message,
      data: {
        [resourceName]: result[resourceName]
      },
      meta: result.meta
    });
  };
}

async function createGroup(req, res) {
  const packaging_group = await service.createGroup(req.body, req.user.id, req.user);
  successResponse(res, {
    statusCode: 201,
    message: 'Packaging group created',
    data: { packaging_group }
  });
}

async function getGroup(req, res) {
  const packaging_group = await service.getGroup(req.params.id, req.user);
  successResponse(res, {
    message: 'Packaging group fetched',
    data: { packaging_group }
  });
}

async function updateGroup(req, res) {
  const packaging_group = await service.updateGroup(req.params.id, req.body, req.user);
  successResponse(res, {
    message: 'Packaging group updated',
    data: { packaging_group }
  });
}

async function deleteGroup(req, res) {
  await service.deleteGroup(req.params.id, req.user);
  successResponse(res, {
    message: 'Packaging group deactivated',
    data: {}
  });
}

async function hardDeleteGroup(req, res) {
  await service.hardDeleteGroup(req.params.id, req.user);
  successResponse(res, {
    message: 'Packaging group hard-deleted',
    data: {}
  });
}

async function addComponent(req, res) {
  const packaging_component = await service.addComponent(req.params.id, req.body, req.user);
  successResponse(res, {
    statusCode: 201,
    message: 'Packaging component added',
    data: { packaging_component }
  });
}

async function updateComponent(req, res) {
  const packaging_component = await service.updateComponent(req.params.id, req.body, req.user);
  successResponse(res, {
    message: 'Packaging component updated',
    data: { packaging_component }
  });
}

async function deleteComponent(req, res) {
  await service.deleteComponent(req.params.id, req.user);
  successResponse(res, {
    message: 'Packaging component deleted',
    data: {}
  });
}

async function calculateGroup(req, res) {
  const calculation = await service.calculateGroup(
    req.params.id,
    req.body,
    req.user,
    req.body.warehouse_id || null
  );
  successResponse(res, {
    message: 'Packaging group calculated',
    data: { calculation }
  });
}

async function createAssignment(req, res) {
  const packaging_assignment = await service.createAssignment(req.body, req.user.id, req.user);
  successResponse(res, {
    statusCode: 201,
    message: 'Packaging assignment created',
    data: { packaging_assignment }
  });
}

async function consumeAssignment(req, res) {
  const packaging_assignment = await service.consumeAssignment(
    req.params.id,
    req.body || {},
    req.user.id,
    req.user
  );
  successResponse(res, {
    message: 'Packaging stock consumed',
    data: { packaging_assignment }
  });
}

async function hardDeleteAssignment(req, res) {
  await service.hardDeleteAssignment(req.params.id, req.user);
  successResponse(res, {
    message: 'Packaging assignment hard-deleted',
    data: {}
  });
}

module.exports = {
  addComponent,
  calculateGroup,
  consumeAssignment,
  createAssignment,
  createGroup,
  deleteComponent,
  deleteGroup,
  hardDeleteAssignment,
  hardDeleteGroup,
  getGroup,
  listAssignments: listHandler(service.listAssignments, 'packaging_assignments', 'Packaging assignments fetched'),
  listGroups: listHandler(service.listGroups, 'packaging_groups', 'Packaging groups fetched'),
  updateComponent,
  updateGroup
};
