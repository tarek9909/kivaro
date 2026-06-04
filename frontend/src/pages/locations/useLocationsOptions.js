import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';

const PAGE = { page: 1, limit: 100 };

export function useLocationsList(enabled = true) {
  return useQuery({
    queryKey: ['locations', 'options', 'locations'],
    queryFn: () => api.locations.locations.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useSublocationsList(enabled = true) {
  return useQuery({
    queryKey: ['locations', 'options', 'sublocations'],
    queryFn: () => api.locations.sublocations.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useSalesmenList(enabled = true) {
  return useQuery({
    queryKey: ['locations', 'options', 'salesmen'],
    queryFn: () => api.locations.salesmen.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}
