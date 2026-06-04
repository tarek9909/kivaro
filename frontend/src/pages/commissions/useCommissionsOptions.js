import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';

const PAGE = { page: 1, limit: 100 };

export function useCommissionRulesList(enabled = true) {
  return useQuery({
    queryKey: ['commissions', 'options', 'rules'],
    queryFn: () => api.commissions.rules.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}
