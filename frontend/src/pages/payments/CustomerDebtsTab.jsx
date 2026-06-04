import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import {
  Badge,
  Button,
  DataTable,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import { useCustomersList } from '@/pages/accounting/useAccountingOptions.js';
import { useSalesmenList } from '@/pages/locations/useLocationsOptions.js';
import { LOCATIONS_PERMISSIONS } from '@/pages/locations/locations.config.js';
import {
  DEBT_STATUSES,
  DEBT_STATUS_FILTER_OPTIONS,
  getDebtStatusTone
} from './payments.config.js';
import { CustomerDebtDrawer } from './CustomerDebtDrawer.jsx';

const CUSTOMERS_VIEW = 'customers.view';

function StatusBadge({ status }) {
  const tone = getDebtStatusTone(status);
  const label = DEBT_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

export default function CustomerDebtsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickCustomers = hasPermission(CUSTOMERS_VIEW);
  const canPickSalesmen = hasPermission(LOCATIONS_PERMISSIONS.salesmen);

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [openDebtId, setOpenDebtId] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (customerId) params.customer_id = customerId;
    if (salesmanId) params.salesman_id = salesmanId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [debouncedSearch, status, customerId, salesmanId, dateFrom, dateTo, page, limit]);

  const listQuery = useQuery({
    queryKey: ['payments', 'debts', queryParams],
    queryFn: () => api.payments.debts.list(queryParams)
  });

  const customersQuery = useCustomersList(canPickCustomers);
  const salesmenQuery = useSalesmenList(canPickSalesmen);
  const customers = customersQuery.data?.data?.customers || [];
  const salesmen = salesmenQuery.data?.data?.salesmen || [];

  const rows = listQuery.data?.data?.customer_debts || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'debt_date',
        header: 'Debt date',
        cell: (row) => (
          <span className="text-sm text-ink-200">{formatDate(row.debt_date)}</span>
        )
      },
      {
        id: 'customer_name',
        header: 'Customer',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">
              {row.customer_name || `customer #${row.customer_id}`}
            </p>
            <p className="truncate text-xs text-ink-400">
              {row.dispatch_request_id ? `Dispatch #${row.dispatch_request_id}` : ''}
            </p>
          </div>
        )
      },
      {
        id: 'salesman_name',
        header: 'Salesman',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.salesman_name || '-'}</span>
        )
      },
      {
        id: 'original_amount',
        header: 'Original',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {formatNumber(row.original_amount, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'remaining_amount',
        header: 'Remaining',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.remaining_amount, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'due_date',
        header: 'Due',
        cell: (row) => (
          <span className="text-sm text-ink-200">
            {row.due_date ? formatDate(row.due_date) : '-'}
          </span>
        )
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.status} />
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <Button variant="secondary" size="sm" onClick={() => setOpenDebtId(row.id)}>
            View
          </Button>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          containerClassName="xl:col-span-2"
          leftIcon={Search}
          placeholder="Search by customer or salesman name"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          {DEBT_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {canPickCustomers ? (
          <Select
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
            description="Numeric only."
          />
        )}
      </div>

      <div className="flex justify-end">
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          leftIcon={SlidersHorizontal}
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0 sm:w-auto w-full"
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
          {canPickSalesmen ? (
          <Select
            value={salesmanId}
            onChange={(event) => {
              setSalesmanId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All salesmen</option>
            {salesmen.map((salesman) => (
              <option key={salesman.id} value={salesman.id}>
                {salesman.full_name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Salesman ID"
            type="number"
            min="1"
            value={salesmanId}
            onChange={(event) => {
              setSalesmanId(event.target.value);
              setPage(1);
            }}
            description="Numeric only."
          />
        )}
        <Input
          label="From"
          type="date"
          value={dateFrom}
          onChange={(event) => {
            setDateFrom(event.target.value);
            setPage(1);
          }}
        />
        <Input
          label="To"
          type="date"
          value={dateTo}
          onChange={(event) => {
            setDateTo(event.target.value);
            setPage(1);
          }}
        />
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
          title: 'No customer debts match the filters',
          description:
            'Debts are created automatically when settlements leave outstanding balances on a customer.'
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

      <CustomerDebtDrawer
        open={Boolean(openDebtId)}
        onClose={() => setOpenDebtId(null)}
        debtId={openDebtId}
      />
    </div>
  );
}
