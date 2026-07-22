import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';

const PAGE = { page: 1, limit: 100 };

export function useSuppliersOptions(enabled = true) {
  return useQuery({
    queryKey: ['purchases', 'options', 'suppliers'],
    queryFn: () => api.purchases.suppliers.list({ ...PAGE, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export function usePurchaseOrdersOptions(enabled = true) {
  return useQuery({
    queryKey: ['purchases', 'options', 'purchase-orders'],
    queryFn: () => api.purchases.purchaseOrders.list(PAGE),
    staleTime: 60_000,
    enabled
  });
}

export function useCashAccountsOptions(enabled = true, params = {}) {
  return useQuery({
    queryKey: ['purchases', 'options', 'cash-accounts', params],
    queryFn: () => api.accounting.cashAccounts.list({ ...PAGE, status: 'active', ...params }),
    staleTime: 60_000,
    enabled
  });
}
