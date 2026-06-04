import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Drawer,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatDate, formatDateTime, formatNumber } from '@/lib/formatters.js';
import { useSalesmenList } from '@/pages/locations/useLocationsOptions.js';
import { LOCATIONS_PERMISSIONS } from '@/pages/locations/locations.config.js';
import {
  ACCOUNTING_PERMISSIONS,
  SALESMAN_BALANCE_STATUSES,
  SALESMAN_BALANCE_STATUS_FILTER_OPTIONS,
  getSalesmanBalanceStatusTone
} from './accounting.config.js';

function StatusBadge({ status }) {
  const tone = getSalesmanBalanceStatusTone(status);
  const label =
    SALESMAN_BALANCE_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span className="break-words text-sm text-ink-100">{value || '-'}</span>
    </div>
  );
}

export default function SalesmanBalancesTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission(ACCOUNTING_PERMISSIONS.manage);
  const canPickSalesmen = hasPermission(LOCATIONS_PERMISSIONS.salesmen);
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [salesmanId, setSalesmanId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [openBalanceId, setOpenBalanceId] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (status) params.status = status;
    if (salesmanId) params.salesman_id = salesmanId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [status, salesmanId, dateFrom, dateTo, page, limit]);

  const listQuery = useQuery({
    queryKey: ['accounting', 'salesman-balances', queryParams],
    queryFn: () => api.accounting.salesmanBalances.list(queryParams)
  });

  const detailQuery = useQuery({
    queryKey: ['accounting', 'salesman-balance', openBalanceId],
    queryFn: () => api.accounting.salesmanBalances.get(openBalanceId),
    enabled: Boolean(openBalanceId)
  });

  const salesmenQuery = useSalesmenList(canPickSalesmen);
  const salesmen = salesmenQuery.data?.data?.salesmen || [];

  const closeMutation = useMutation({
    mutationFn: (id) => api.accounting.salesmanBalances.close(id),
    onSuccess: () => {
      toast.success('Balance closed');
      setCloseTarget(null);
      queryClient.invalidateQueries({ queryKey: ['accounting', 'salesman-balances'] });
      queryClient.invalidateQueries({
        queryKey: ['accounting', 'salesman-balance', openBalanceId]
      });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not close balance.'))
  });

  const rows = listQuery.data?.data?.salesman_balances || [];
  const meta = listQuery.data?.meta || {};
  const balance = detailQuery.data?.data?.salesman_balance;

  const columns = useMemo(
    () => [
      {
        id: 'balance_date',
        header: 'Balance date',
        cell: (row) => (
          <span className="text-sm text-ink-200">{formatDate(row.balance_date)}</span>
        )
      },
      {
        id: 'salesman_name',
        header: 'Salesman',
        cell: (row) => (
          <span className="text-sm text-ink-100">{row.salesman_name || '-'}</span>
        )
      },
      {
        id: 'expected_amount',
        header: 'Expected',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.expected_amount, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'collected_amount',
        header: 'Collected',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {formatNumber(row.collected_amount, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'debt_amount',
        header: 'Debt',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {formatNumber(row.debt_amount, { maximumFractionDigits: 4 })}
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpenBalanceId(row.id)}>
              View
            </Button>
            {canManage && row.status === 'open' && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={CheckCircle2}
                onClick={() => setCloseTarget(row)}
              >
                Close
              </Button>
            )}
          </div>
        )
      }
    ],
    [canManage]
  );

  return (
    <div className="space-y-4">
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
          <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          {SALESMAN_BALANCE_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
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
          title: 'No salesman balances match the filters',
          description:
            'Balances are created automatically when settlements are completed for a salesman.'
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

      <Drawer
        open={Boolean(openBalanceId)}
        onClose={() => setOpenBalanceId(null)}
        width="lg"
        title={
          balance
            ? `Salesman balance ${formatDate(balance.balance_date)}`
            : 'Salesman balance'
        }
        description={balance ? `Created ${formatDateTime(balance.created_at)}` : undefined}
        footer={
          <Button variant="secondary" onClick={() => setOpenBalanceId(null)}>
            Close
          </Button>
        }
      >
        {detailQuery.isPending ? (
          <LoadingState label="Loading balance..." />
        ) : detailQuery.isError ? (
          <ErrorState
            title="Could not load balance"
            description={getErrorMessage(detailQuery.error)}
            onRetry={() => detailQuery.refetch()}
          />
        ) : !balance ? (
          <EmptyState title="Balance not found" />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={balance.status} />
              {canManage && balance.status === 'open' && (
                <Button
                  size="sm"
                  leftIcon={CheckCircle2}
                  onClick={() => setCloseTarget(balance)}
                >
                  Close balance
                </Button>
              )}
            </div>

            <section className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Salesman"
                value={balance.salesman_name || (balance.salesman_id ? `#${balance.salesman_id}` : null)}
              />
              <Field label="Balance date" value={formatDate(balance.balance_date)} />
              <Field
                label="Dispatch"
                value={
                  balance.dispatch_number ||
                  (balance.dispatch_request_id ? `#${balance.dispatch_request_id}` : '-')
                }
              />
              <Field
                label="Closed"
                value={
                  balance.closed_at ? formatDateTime(balance.closed_at) : 'Not closed'
                }
              />
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <Field
                label="Expected"
                value={formatNumber(balance.expected_amount, { maximumFractionDigits: 4 })}
              />
              <Field
                label="Collected"
                value={formatNumber(balance.collected_amount, {
                  maximumFractionDigits: 4
                })}
              />
              <Field
                label="Debt"
                value={formatNumber(balance.debt_amount, { maximumFractionDigits: 4 })}
              />
            </section>

            {balance.notes && (
              <section>
                <h3 className="font-display text-sm font-semibold text-ink-50">Notes</h3>
                <p className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 text-pretty">
                  {balance.notes}
                </p>
              </section>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={Boolean(closeTarget)}
        onClose={() => setCloseTarget(null)}
        onConfirm={() => closeTarget && closeMutation.mutate(closeTarget.id)}
        title="Close salesman balance"
        description="Mark this balance as closed. Closed balances are read-only."
        confirmLabel="Close balance"
        tone="primary"
        isLoading={closeMutation.isPending}
      />
    </div>
  );
}
