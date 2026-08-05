import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Printer, ShieldAlert , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import {
  Button,
  DataTable,
  EmptyState,
  GlassPanel,
  GlassPanelBody,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import { useCustomersList } from '@/pages/accounting/useAccountingOptions.js';
import { ACCOUNTING_PERMISSIONS } from '@/pages/accounting/accounting.config.js';
import { PAYMENT_METHODS } from './payments.config.js';
import { CustomerPaymentPrintModal } from './CustomerPaymentPrintModal.jsx';
import { CustomerPaymentFormModal } from './CustomerPaymentFormModal.jsx';

const CUSTOMERS_VIEW = 'customers.view';

export default function CustomerPaymentsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canView = hasPermission(ACCOUNTING_PERMISSIONS.view);
  const canManage = hasPermission(ACCOUNTING_PERMISSIONS.manage);
  const canRead = canView || canManage;
  const canPickCustomers = hasPermission(CUSTOMERS_VIEW);

  const [customerId, setCustomerId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [openPayment, setOpenPayment] = useState(null);
  const [creating, setCreating] = useState(false);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (customerId) params.customer_id = customerId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [customerId, dateFrom, dateTo, page, limit]);

  const listQuery = useQuery({
    queryKey: ['payments', 'customer-payments', queryParams],
    queryFn: () => api.payments.customerPayments.list(queryParams),
    enabled: canRead
  });

  const customersQuery = useCustomersList(canRead && canPickCustomers);
  const customers = customersQuery.data?.data?.customers || [];

  const rows = listQuery.data?.data?.customer_payments || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'payment_date',
        header: 'Date',
        cell: (row) => (
          <span className="text-sm text-ink-200">{formatDate(row.payment_date)}</span>
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
        id: 'amount',
        header: 'Amount',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.amount, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'payment_method',
        header: 'Method',
        cell: (row) => (
          <span className="text-sm text-ink-200">
            {PAYMENT_METHODS.find((entry) => entry.value === row.payment_method)?.label ||
              row.payment_method ||
              '-'}
          </span>
        )
      },
      {
        id: 'collected_by_salesman_name',
        header: 'Collected by',
        cell: (row) => (
          <span className="text-sm text-ink-200">
            {row.collected_by_salesman_name || '-'}
          </span>
        )
      },
      {
        id: 'reference_number',
        header: 'Reference',
        cell: (row) => (
          <span className="font-mono text-xs text-ink-300">
            {row.reference_number || '-'}
          </span>
        )
      },
      {
        id: 'print',
        header: '',
        cell: (row) => (
          <Button variant="secondary" size="sm" leftIcon={Printer} onClick={() => setOpenPayment(row)}>
            Open
          </Button>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      {!canRead ? (
        <GlassPanel>
          <GlassPanelBody>
            <EmptyState
              icon={ShieldAlert}
              title="Browsing is restricted"
              description={
                'Payments are recorded from the relevant customer debt. Ask an administrator for the accounting view permission to browse payment history.'
              }
            />
          </GlassPanelBody>
        </GlassPanel>
      ) : (
        <>
          <div className="flex flex-wrap justify-end gap-2">
        {canManage && (
          <Button leftIcon={Plus} onClick={() => setCreating(true)}>
            Record customer payment
          </Button>
        )}
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
              title: 'No customer payments match the filters',
              description: 'Payments are recorded from the relevant customer debt.'
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
        </>
      )}

      <CustomerPaymentPrintModal
        open={Boolean(openPayment)}
        onClose={() => setOpenPayment(null)}
        payment={openPayment}
      />
      <CustomerPaymentFormModal
        open={creating}
        onClose={() => setCreating(false)}
      />
    </div>
  );
}
