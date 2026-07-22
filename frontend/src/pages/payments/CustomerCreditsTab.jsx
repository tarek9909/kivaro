import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import {
  Badge,
  Button,
  DataTable,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { useCustomersList } from '@/pages/accounting/useAccountingOptions.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';

const CUSTOMERS_VIEW = 'customers.view';

export default function CustomerCreditsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickCustomers = hasPermission(CUSTOMERS_VIEW);
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (customerId) params.customer_id = customerId;
    if (status) params.status = status;
    return params;
  }, [customerId, status, page, limit]);

  const listQuery = useQuery({
    queryKey: ['payments', 'customer-credits', queryParams],
    queryFn: () => api.payments.customerCredits.list(queryParams)
  });
  const customersQuery = useCustomersList(canPickCustomers);
  const customers = customersQuery.data?.data?.customers || [];
  const rows = listQuery.data?.data?.customer_credits || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'credit_date',
        header: 'Date',
        cell: (row) => <span className="text-sm text-ink-200">{formatDate(row.credit_date)}</span>
      },
      {
        id: 'customer_name',
        header: 'Customer',
        cell: (row) => <span className="text-sm text-ink-100">{row.customer_name || `Customer #${row.customer_id}`}</span>
      },
      {
        id: 'credit_number',
        header: 'Credit',
        cell: (row) => (
          <span className="font-mono text-xs text-ink-300">
            {row.credit_number || `Credit #${row.id}`}
          </span>
        )
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => (
          <Badge tone={row.status === 'available' ? 'success' : row.status === 'partially_used' ? 'warn' : 'neutral'}>
            {row.status === 'available' ? 'Available' : row.status === 'partially_used' ? 'Partially used' : row.status === 'used' ? 'Used' : 'Cancelled'}
          </Badge>
        )
      },
      {
        id: 'original_amount',
        header: 'Original',
        align: 'right',
        cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.original_amount, { maximumFractionDigits: 4 })}</span>
      },
      {
        id: 'remaining_amount',
        header: 'Remaining',
        align: 'right',
        cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.remaining_amount, { maximumFractionDigits: 4 })}</span>
      },
      {
        id: 'reference_type',
        header: 'Reference',
        cell: (row) => <span className="font-mono text-xs text-ink-300">{row.reference_type || '-'}</span>
      },
      {
        id: 'notes',
        header: 'Notes',
        cell: (row) => <span className="text-sm text-ink-300">{row.notes || '-'}</span>
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          leftIcon={SlidersHorizontal}
          onClick={() => setShowFilters(!showFilters)}
          className="w-full shrink-0 sm:w-auto"
        >
          {showFilters ? 'Hide Filters' : 'Filters'}
        </Button>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          showFilters
            ? 'max-h-[1000px] opacity-100 p-4 mt-3 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-sm overflow-visible'
            : 'max-h-0 opacity-0 p-0 border-transparent overflow-hidden'
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {canPickCustomers ? (
            <Select
              label="Customer"
              value={customerId}
              onChange={(event) => {
                setCustomerId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Customer ID"
              type="number"
              min="1"
              value={customerId}
              onChange={(event) => {
                setCustomerId(event.target.value);
                setPage(1);
              }}
            />
          )}
          <Select
            label="Status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="partially_used">Partially used</option>
            <option value="used">Used</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={listQuery.isPending}
        isError={listQuery.isError}
        error={listQuery.error}
        onRetry={() => listQuery.refetch()}
        empty={{
          title: 'No customer credits match the filters',
          description: 'Overpayments create credit balances that are consumed FIFO when applied to debts.'
        }}
        footer={
          meta?.totalPages ? (
            <Pagination
              page={meta.page || page}
              totalPages={meta.totalPages || 1}
              total={meta.total}
              limit={meta.limit || limit}
              onChange={(nextPage) => setPage(nextPage)}
            />
          ) : null
        }
      />
    </div>
  );
}
