import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';

const PAGE = { page: 1, limit: 100 };

export function usePackagingConfigurationsList(enabled = true) {
  return useQuery({
    queryKey: ['production', 'options', 'configurations'],
    queryFn: () => api.production.packagingConfigurations.list({ ...PAGE, is_active: 1 }),
    staleTime: 60_000,
    enabled
  });
}

export function useProductionBatchesList(enabled = true) {
  return useQuery({
    queryKey: ['production', 'options', 'batches'],
    queryFn: () => api.production.productionBatches.list({ ...PAGE }),
    staleTime: 60_000,
    enabled
  });
}
