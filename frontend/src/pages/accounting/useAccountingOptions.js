import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';

const PAGE = { page: 1, limit: 100 };

export function useExpenseCategoriesList(enabled = true) {
  return useQuery({
    queryKey: ['accounting', 'options', 'expense-categories'],
    queryFn: () => api.accounting.expenseCategories.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function useCashAccountsList(enabled = true, params = {}) {
  return useQuery({
    queryKey: ['accounting', 'options', 'cash-accounts', params],
    queryFn: () => api.accounting.cashAccounts.list({ ...PAGE, status: 'active', ...params }),
    staleTime: 60_000,
    enabled
  });
}

export function useCustomersList(enabled = true) {
  return useQuery({
    queryKey: ['accounting', 'options', 'customers'],
    queryFn: () => api.customers.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}
