import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';

const PAGE = { page: 1, limit: 100 };

/**
 * Permission-gated option hooks for the reports filters. Each hook only
 * fires its underlying list endpoint when both the global enable flag and
 * the picker permission have been confirmed by the caller.
 */

export function useReportWarehouses(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'options', 'warehouses'],
    queryFn: () => api.inventory.warehouses.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useReportItems(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'options', 'items'],
    queryFn: () => api.inventory.items.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useReportVariants(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'options', 'variants'],
    queryFn: () => api.inventory.variants.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useReportCustomers(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'options', 'customers'],
    queryFn: () => api.customers.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useReportSalesmen(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'options', 'salesmen'],
    queryFn: () => api.locations.salesmen.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useReportLocations(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'options', 'locations'],
    queryFn: () => api.locations.locations.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useReportSublocations(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'options', 'sublocations'],
    queryFn: () => api.locations.sublocations.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useReportSuppliers(enabled = true) {
  return useQuery({
    queryKey: ['reports', 'options', 'suppliers'],
    queryFn: () => api.purchases.suppliers.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}
