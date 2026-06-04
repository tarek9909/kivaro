import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, Trash2 , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import {
  COMMISSIONS_PERMISSIONS,
  STATUS_FILTER_OPTIONS,
  TARGET_PERIODS,
  TARGET_PERIOD_FILTER_OPTIONS
} from './commissions.config.js';
import { CommissionRuleFormModal } from './CommissionRuleFormModal.jsx';

export default function CommissionRulesTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission(COMMISSIONS_PERMISSIONS.manage);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (period) params.target_period = period;
    return params;
  }, [debouncedSearch, status, period, page, limit]);

  const listQuery = useQuery({
    queryKey: ['commissions', 'rules', queryParams],
    queryFn: () => api.commissions.rules.list(queryParams)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.commissions.rules.remove(id),
    onSuccess: () => {
      toast.success('Rule deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['commissions', 'rules'] });
      queryClient.invalidateQueries({ queryKey: ['commissions', 'options', 'rules'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not deactivate rule.'))
  });

  const rows = listQuery.data?.data?.commission_rules || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.name}</p>
            <p className="truncate text-xs text-ink-400">
              {TARGET_PERIODS.find((entry) => entry.value === row.target_period)?.label ||
                row.target_period}
            </p>
          </div>
        )
      },
      {
        id: 'rates',
        header: 'Rates',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-xs text-ink-200">
            {`Below ${formatNumber(row.below_target_rate)}%  At ${formatNumber(
              row.at_target_rate
            )}%  Extra ${formatNumber(row.above_target_extra_rate)}%`}
          </span>
        )
      },
      {
        id: 'applies_from',
        header: 'Applies from',
        cell: (row) => (
          <span className="text-sm text-ink-200">{formatDate(row.applies_from)}</span>
        )
      },
      {
        id: 'applies_to',
        header: 'Applies to',
        cell: (row) => (
          <span className="text-sm text-ink-200">
            {row.applies_to ? formatDate(row.applies_to) : 'Open ended'}
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
        cell: (row) => (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={Pencil}
                onClick={() => setEditing(row)}
              >
                Edit
              </Button>
            )}
            {canManage && row.status === 'active' && (
              <Button
                variant="ghost"
                size="icon"
                leftIcon={Trash2}
                aria-label={`Deactivate ${row.name}`}
                onClick={() => setDeleteTarget(row)}
              />
            )}
          </div>
        )
      }
    ],
    [canManage]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canManage}>
          New rule
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
          
          leftIcon={Search}
          placeholder="Search by name"
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
          value={period}
          onChange={(event) => {
            setPeriod(event.target.value);
            setPage(1);
          }}
        >
          {TARGET_PERIOD_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
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
          title: 'No commission rules yet',
          description: canManage
            ? 'Create your first rule to set commission rates by target period.'
            : 'No rules match the filters.'
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

      <CommissionRuleFormModal open={creating} onClose={() => setCreating(false)} />
      <CommissionRuleFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        rule={editing || undefined}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate commission rule"
        description={
          deleteTarget
            ? `Set ${deleteTarget.name} to inactive? Past commissions calculated with this rule are unaffected.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
