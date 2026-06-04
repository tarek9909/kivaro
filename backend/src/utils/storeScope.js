const ApiError = require('./ApiError');

function normalizeStoreId(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const storeId = Number(value);
  return Number.isInteger(storeId) && storeId > 0 ? storeId : null;
}

function resolveStoreId(actor = {}, input = {}, options = {}) {
  const { requireForSuperadmin = true } = options;

  if (actor.is_superadmin) {
    const storeId = normalizeStoreId(input.store_id);

    if (!storeId && requireForSuperadmin) {
      throw ApiError.badRequest('Validation failed', [
        { field: 'store_id', message: 'store_id is required for superadmin store-scoped operations' }
      ]);
    }

    return storeId;
  }

  const storeId = normalizeStoreId(actor.store_id);

  if (!storeId) {
    throw ApiError.forbidden('Store access is required');
  }

  return storeId;
}

function scopedQuery(input = {}, actor = {}, options = {}) {
  const storeId = resolveStoreId(actor, input, options);
  return storeId ? { ...input, store_id: storeId } : { ...input };
}

function scopedData(data = {}, actor = {}, options = {}) {
  const storeId = resolveStoreId(actor, data, options);
  return storeId ? { ...data, store_id: storeId } : { ...data };
}

function assertRowInScope(row, actor = {}, message = 'Resource not found') {
  if (!row) {
    throw ApiError.notFound(message);
  }

  if (!actor.is_superadmin && normalizeStoreId(row.store_id) !== normalizeStoreId(actor.store_id)) {
    throw ApiError.notFound(message);
  }

  return row;
}

function assertSameStore(row, storeId, field, message = 'Record does not belong to this store') {
  if (!row || normalizeStoreId(row.store_id) !== normalizeStoreId(storeId)) {
    throw ApiError.badRequest('Validation failed', [{ field, message }]);
  }

  return row;
}

module.exports = {
  assertRowInScope,
  assertSameStore,
  normalizeStoreId,
  resolveStoreId,
  scopedData,
  scopedQuery
};
