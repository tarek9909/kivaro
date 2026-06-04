const service = require('./purchases.service');
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

async function createSupplier(req, res) {
  const supplier = await service.createSupplier(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Supplier created', data: { supplier } });
}

async function updateSupplier(req, res) {
  const supplier = await service.updateSupplier(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Supplier updated', data: { supplier } });
}

async function deleteSupplier(req, res) {
  await service.deleteSupplier(req.params.id, req.user);
  successResponse(res, { message: 'Supplier deleted', data: {} });
}

async function createPurchaseOrder(req, res) {
  const purchase_order = await service.createPurchaseOrder(req.body, req.user.id, req.audit, req.user);
  successResponse(res, { statusCode: 201, message: 'Purchase order created', data: { purchase_order } });
}

async function updatePurchaseOrder(req, res) {
  const purchase_order = await service.updatePurchaseOrder(req.params.id, req.body, req.user);
  successResponse(res, { message: 'Purchase order updated', data: { purchase_order } });
}

async function submitPurchaseOrder(req, res) {
  const purchase_order = await service.submitPurchaseOrder(req.params.id, req.user);
  successResponse(res, { message: 'Purchase order submitted', data: { purchase_order } });
}

async function approvePurchaseOrder(req, res) {
  const purchase_order = await service.approvePurchaseOrder(req.params.id, req.user.id, req.user);
  successResponse(res, { message: 'Purchase order approved', data: { purchase_order } });
}

async function cancelPurchaseOrder(req, res) {
  const purchase_order = await service.cancelPurchaseOrder(req.params.id, req.user);
  successResponse(res, { message: 'Purchase order cancelled', data: { purchase_order } });
}

async function receivePurchaseOrder(req, res) {
  const purchase_receipt = await service.receivePurchaseOrder(req.params.id, req.body, req.user.id, req.audit, req.user);
  successResponse(res, { statusCode: 201, message: 'Purchase order received', data: { purchase_receipt } });
}

async function listPurchaseOrderReceipts(req, res) {
  const purchase_receipts = await service.listPurchaseOrderReceipts(req.params.id, req.user);
  successResponse(res, { message: 'Purchase order receipts fetched', data: { purchase_receipts } });
}

async function createSupplierPayment(req, res) {
  const supplier_payment = await service.createSupplierPayment(req.body, req.user.id, req.user);
  successResponse(res, { statusCode: 201, message: 'Supplier payment created', data: { supplier_payment } });
}

module.exports = {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  createSupplier,
  createSupplierPayment,
  deleteSupplier,
  getPurchaseOrder: get(service.getPurchaseOrder, 'purchase_order', 'Purchase order fetched'),
  getSupplier: get(service.getSupplier, 'supplier', 'Supplier fetched'),
  listPurchaseOrderReceipts,
  listPurchaseOrders: list(service.listPurchaseOrders, 'purchase_orders', 'Purchase orders fetched'),
  listSupplierPayments: list(service.listSupplierPayments, 'supplier_payments', 'Supplier payments fetched'),
  listSuppliers: list(service.listSuppliers, 'suppliers', 'Suppliers fetched'),
  receivePurchaseOrder,
  submitPurchaseOrder,
  updatePurchaseOrder,
  updateSupplier
};
