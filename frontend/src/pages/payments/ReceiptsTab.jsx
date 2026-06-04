import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Search , SlidersHorizontal } from 'lucide-react';
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
import {
  RECEIPT_TYPES,
  RECEIPT_TYPE_FILTER_OPTIONS
} from './payments.config.js';
import { ReceiptPrintModal } from './ReceiptPrintModal.jsx';

const CUSTOMERS_VIEW = 'customers.view';

export default function ReceiptsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickCustomers = hasPermission(CUSTOMERS_VIEW);

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [receiptType, setReceiptType] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [openReceipt, setOpenReceipt] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (receiptType) params.receipt_type = receiptType;
    if (customerId) params.customer_id = customerId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [debouncedSearch, receiptType, customerId, dateFrom, dateTo, page, limit]);

  const listQuery = useQuery({
    queryKey: ['payments', 'receipts', queryParams],
    queryFn: () => api.payments.receipts.list(queryParams)
  });

  const customersQuery = useCustomersList(canPickCustomers);
  const customers = customersQuery.data?.data?.customers || [];

  const rows = listQuery.data?.data?.customer_receipts || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'receipt_number',
        header: 'Receipt',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.receipt_number}</p>
            <p className="truncate text-xs text-ink-400">{formatDate(row.receipt_date)}</p>
          </div>
        )
      },
      {
        id: 'customer_name',
        header: 'Customer',
        cell: (row) => (
          <span className="text-sm text-ink-100">
            {row.customer_name || `customer #${row.customer_id}`}
          </span>
        )
      },
      {
        id: 'receipt_type',
        header: 'Type',
        cell: (row) => (
          <Badge tone="info">
            {RECEIPT_TYPES.find((entry) => entry.value === row.receipt_type)?.label ||
              row.receipt_type ||
              '-'}
          </Badge>
        )
      },
      {
        id: 'total_amount',
        header: 'Total',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.total_amount, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'paid_amount',
        header: 'Paid',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {formatNumber(row.paid_amount, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'remaining_amount',
        header: 'Remaining',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {formatNumber(row.remaining_amount, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Printer}
            onClick={() => setOpenReceipt(row)}
          >
            Open
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
          placeholder="Search by receipt number"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <Select
          value={receiptType}
          onChange={(event) => {
            setReceiptType(event.target.value);
            setPage(1);
          }}
        >
          {RECEIPT_TYPE_FILTER_OPTIONS.map((option) => (
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
          title: 'No receipts match the filters',
          description:
            'Receipts are created automatically when settlements and payments are completed.'
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

      <ReceiptPrintModal
        open={Boolean(openReceipt)}
        onClose={() => setOpenReceipt(null)}
        receipt={openReceipt}
      />
    </div>
  );
}
