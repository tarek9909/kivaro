import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';

/**
 * Light option-list queries with high stale time so opening a form does not
 * thrash the API. We pull the first 100 items which is enough for typical
 * ERP catalogs; pagination can be added later if needed.
 */
const PAGE = { page: 1, limit: 100 };

export function useCategoriesOptions(enabled = true) {
  return useQuery({
    queryKey: ['inventory', 'options', 'categories'],
    queryFn: () => api.inventory.categories.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useUnitsOptions(enabled = true) {
  return useQuery({
    queryKey: ['inventory', 'options', 'units'],
    queryFn: () => api.inventory.units.list(PAGE),
    staleTime: 60_000,
    enabled
  });
}

export function useItemsOptions(enabled = true, params = {}) {
  return useQuery({
    queryKey: ['inventory', 'options', 'items', params],
    queryFn: () => api.inventory.items.list({ ...PAGE, status: 'active', ...params }),
    staleTime: 60_000,
    enabled
  });
}

export function useVariantsOptions(enabled = true, params = {}) {
  return useQuery({
    queryKey: ['inventory', 'options', 'variants', params],
    queryFn: () => api.inventory.variants.list({ ...PAGE, status: 'active', ...params }),
    staleTime: 60_000,
    enabled
  });
}

export function useWarehousesOptions(enabled = true) {
  return useQuery({
    queryKey: ['inventory', 'options', 'warehouses'],
    queryFn: () => api.inventory.warehouses.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}
