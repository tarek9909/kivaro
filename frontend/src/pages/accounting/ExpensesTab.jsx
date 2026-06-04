import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, ShieldAlert, Trash2 , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
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
import { formatDate, formatNumber } from '@/lib/formatters.js';
import {
  ACCOUNTING_PERMISSIONS,
  PAYMENT_METHODS
} from './accounting.config.js';
import { useExpenseCategoriesList } from './useAccountingOptions.js';
import { ExpenseFormModal } from './ExpenseFormModal.jsx';

export default function ExpensesTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canView = hasPermission(ACCOUNTING_PERMISSIONS.view);
  const canManage = hasPermission(ACCOUNTING_PERMISSIONS.manage);
  const queryClient = useQueryClient();

  const [categoryId, setCategoryId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (categoryId) params.expense_category_id = categoryId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [categoryId, dateFrom, dateTo, page, limit]);

  // GET /expenses requires accounting.view; do not call it for manage-only
  // operators.
  const listQuery = useQuery({
    queryKey: ['accounting', 'expenses', queryParams],
    queryFn: () => api.accounting.expenses.list(queryParams),
    enabled: canView
  });

  const categoriesQuery = useExpenseCategoriesList(canView);
  const categories = categoriesQuery.data?.data?.expense_categories || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.accounting.expenses.remove(id),
    onSuccess: () => {
      toast.success('Expense voided');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['accounting', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['accounting', 'transactions'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not remove expense.'))
  });

  const rows = listQuery.data?.data?.expenses || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'expense_date',
        header: 'Date',
        cell: (row) => (
          <span className="text-sm text-ink-200">{formatDate(row.expense_date)}</span>
        )
      },
      {
        id: 'expense_category_name',
        header: 'Category',
        cell: (row) => (
          <span className="text-sm text-ink-100">
            {row.expense_category_name || '-'}
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
        id: 'reference_number',
        header: 'Reference',
        cell: (row) => (
          <span className="font-mono text-xs text-ink-300">
            {row.reference_number || '-'}
          </span>
        )
      },
      {
        id: 'description',
        header: 'Description',
        cell: (row) => (
          <span className="text-sm text-ink-300">{row.description || '-'}</span>
        )
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => {
          const isPosted = Boolean(row.is_posted);
          const isVoided = row.status === 'voided' || Boolean(row.is_voided);
          return (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isVoided && <Badge tone="danger">Voided</Badge>}
              {isPosted && <Badge tone="neutral">Posted</Badge>}
              {canManage && !isVoided && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={Pencil}
                onClick={() => setEditing(row)}
              >
                Edit
              </Button>
              )}
              {canManage && !isVoided && (
              <Button
                variant="ghost"
                size="icon"
                leftIcon={Trash2}
                aria-label={`Void expense ${row.id}`}
                onClick={() => setDeleteTarget(row)}
              />
              )}
            </div>
          );
        }
      }
    ],
    [canManage]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canManage}>
          New expense
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
                  ? 'Use New expense above to record an expense. Browsing existing expenses requires the accounting view permission.'
                  : 'Ask an administrator for the accounting view permission to browse expenses.'
              }
            />
          </GlassPanelBody>
        </GlassPanel>
      ) : (
        <>
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
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
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
              title: 'No expenses match the filters',
              description: canManage
                ? 'Adjust your filters or record a new expense.'
                : 'Adjust your filters to find existing expenses.'
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

      <ExpenseFormModal open={creating} onClose={() => setCreating(false)} />
      <ExpenseFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        expense={editing || undefined}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Void expense"
        description={
          deleteTarget
            ? `Void this expense entry${
                deleteTarget.reference_number ? ` (${deleteTarget.reference_number})` : ''
              }? A reversing ledger entry will be posted to keep cash history auditable.`
            : ''
        }
        confirmLabel="Void"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
