import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';

const PAGE = { page: 1, limit: 100 };

export function useCustomersList(enabled = true) {
  return useQuery({
    queryKey: ['dispatch', 'options', 'customers'],
    queryFn: () => api.customers.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useCashAccountsList(enabled = true) {
  return useQuery({
    queryKey: ['dispatch', 'options', 'cash-accounts'],
    queryFn: () => api.accounting.cashAccounts.list(PAGE),
    staleTime: 60_000,
    enabled
  });
}
