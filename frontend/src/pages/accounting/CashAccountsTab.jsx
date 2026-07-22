import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Search, ShieldAlert , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  GlassPanel,
  GlassPanelBody,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';
import {
  ACCOUNTING_PERMISSIONS,
  CASH_ACCOUNT_TYPES,
  STATUS_FILTER_OPTIONS
} from './accounting.config.js';
import { CashAccountFormModal } from './CashAccountFormModal.jsx';

export default function CashAccountsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canView = hasPermission(ACCOUNTING_PERMISSIONS.view);
  const canManage = hasPermission(ACCOUNTING_PERMISSIONS.manage);

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    return params;
  }, [debouncedSearch, status, page, limit]);

  // GET /cash-accounts requires accounting.view; do not call it for
  // manage-only operators.
  const listQuery = useQuery({
    queryKey: ['accounting', 'cash-accounts', queryParams],
    queryFn: () => api.accounting.cashAccounts.list(queryParams),
    enabled: canView
  });

  const rows = listQuery.data?.data?.cash_accounts || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'account_name',
        header: 'Account',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.account_name}</p>
            <p className="truncate text-xs text-ink-400">
              {CASH_ACCOUNT_TYPES.find((entry) => entry.value === row.account_type)?.label ||
                row.account_type}
            </p>
          </div>
        )
      },
      {
        id: 'opening_balance',
        header: 'Opening',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {formatNumber(row.opening_balance, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'current_balance',
        header: 'Current',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.current_balance, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'cash_flow_permission',
        header: 'Cash flow',
        cell: (row) => (
          <span className="text-xs text-ink-300">
            {row.cash_flow_permission === 'incoming'
              ? 'Incoming only'
              : row.cash_flow_permission === 'outgoing'
                ? 'Outgoing only'
                : 'Both'}
          </span>
        )
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => (
          <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>
            {row.status === 'active' ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) =>
          canManage ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={Pencil}
              onClick={() => setEditing(row)}
            >
              Edit
            </Button>
          ) : null
      }
    ],
    [canManage]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canManage}>
          New cash account
        </Button>
      </div>

      {!canView ? (
        <GlassPanel>
          <GlassPanelBody>
            <EmptyState
              icon={ShieldAlert}
              title="Browsing is restricted"
              description={
                canManage
                  ? 'Use New cash account above to add an account. Browsing existing accounts requires the accounting view permission.'
                  : 'Ask an administrator for the accounting view permission to browse cash accounts.'
              }
            />
          </GlassPanelBody>
        </GlassPanel>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
              
              leftIcon={Search}
              placeholder="Search by account name"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
        </div>
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
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
              title: 'No cash accounts yet',
              description: canManage
                ? 'Create the first cash, bank, or wallet account to track money flows.'
                : 'No cash accounts match the filters.'
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

      <CashAccountFormModal open={creating} onClose={() => setCreating(false)} />
      <CashAccountFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        account={editing || undefined}
      />
    </div>
  );
}
