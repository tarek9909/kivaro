import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search, ShieldAlert, Trash2 , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  GlassPanel,
  GlassPanelBody,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import {
  ACCOUNTING_PERMISSIONS,
  STATUS_FILTER_OPTIONS
} from './accounting.config.js';
import { ExpenseCategoryFormModal } from './ExpenseCategoryFormModal.jsx';

export default function ExpenseCategoriesTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canView = hasPermission(ACCOUNTING_PERMISSIONS.view);
  const canManage = hasPermission(ACCOUNTING_PERMISSIONS.manage);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
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
    return params;
  }, [debouncedSearch, status, page, limit]);

  // GET /expense-categories requires accounting.view; do not call it for
  // manage-only operators.
  const listQuery = useQuery({
    queryKey: ['accounting', 'expense-categories', queryParams],
    queryFn: () => api.accounting.expenseCategories.list(queryParams),
    enabled: canView
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.accounting.expenseCategories.remove(id),
    onSuccess: () => {
      toast.success('Category deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['accounting', 'expense-categories'] });
      queryClient.invalidateQueries({
        queryKey: ['accounting', 'options', 'expense-categories']
      });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not deactivate category.'))
  });

  const rows = listQuery.data?.data?.expense_categories || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.name}</p>
            {row.description && (
              <p className="truncate text-xs text-ink-400">{row.description}</p>
            )}
          </div>
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
          New category
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
                  ? 'Use New category above to add a category. Browsing existing categories requires the accounting view permission.'
                  : 'Ask an administrator for the accounting view permission to browse expense categories.'
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
              title: 'No expense categories yet',
              description: canManage
                ? 'Create your first category to organize expenses by spending area.'
                : 'No categories match the filters.'
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

      <ExpenseCategoryFormModal open={creating} onClose={() => setCreating(false)} />
      <ExpenseCategoryFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        category={editing || undefined}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate expense category"
        description={
          deleteTarget
            ? `Set ${deleteTarget.name} to inactive? Inactive categories stay on past expenses but are hidden from new expense forms.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
