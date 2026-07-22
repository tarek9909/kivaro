import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackagePlus, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage } from '@/lib/errors.js';
import { Badge, Button, ConfirmDialog, DataTable, Input, Pagination, Select } from '@/components/ui/index.js';
import { useItemsOptions, useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import { STATUS_OPTIONS, statusTone } from './packaging.constants.js';
import { PackagingGroupFormModal } from './PackagingGroupFormModal.jsx';

const PAGE_SIZE = 20;

export function PackagingGroupsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission('inventory.create');
  const canUpdate = hasPermission('inventory.update');
  const canDelete = hasPermission('inventory.delete');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 250);

  const params = useMemo(() => {
    const next = { page, limit: PAGE_SIZE };
    if (debouncedSearch) next.search = debouncedSearch;
    if (status) next.status = status;
    return next;
  }, [debouncedSearch, page, status]);

  const groupsQuery = useQuery({
    queryKey: ['packaging', 'groups', params],
    queryFn: () => api.packaging.groups.list(params)
  });
  const itemsQuery = useItemsOptions(true);
  const warehousesQuery = useWarehousesOptions(true);
  const groups = groupsQuery.data?.data?.packaging_groups || [];
  const meta = groupsQuery.data?.meta || {};
  const items = itemsQuery.data?.data?.items || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.packaging.groups.remove(id),
    onSuccess: () => {
      toast.success('Packaging group deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['packaging', 'groups'] });
      queryClient.invalidateQueries({ queryKey: ['packaging', 'sale-catalog'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not deactivate the packaging group.'))
  });

  const columns = useMemo(() => [
    {
      id: 'name',
      header: 'Group',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-50">{row.name}</p>
          <p className="truncate font-mono text-xs text-ink-400">{row.code}</p>
        </div>
      )
    },
    {
      id: 'input_item_name',
      header: 'Saved input',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-100">{row.input_item_name || '-'}</p>
          <p className="text-xs text-ink-400">{row.input_stock_mode || '-'}</p>
        </div>
      )
    },
    {
      id: 'components',
      header: 'Flat template',
      cell: (row) => (
        <span className="text-xs text-ink-200">
          {row.outer_component_count || 0} outer · {row.inner_component_count || 0} inner · {row.consumable_component_count || 0} consumable
        </span>
      )
    },
    {
      id: 'default_warehouse_name',
      header: 'Default warehouse',
      cell: (row) => <span className="text-sm text-ink-200">{row.default_warehouse_name || 'Set during operation'}</span>
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-2">
          {canUpdate && <Button variant="secondary" size="sm" leftIcon={Pencil} onClick={() => setEditing(row)}>Configure</Button>}
          {canDelete && row.status === 'active' && (
            <Button variant="ghost" size="icon" leftIcon={Trash2} title="Deactivate group" aria-label="Deactivate group" onClick={() => setDeleteTarget(row)} />
          )}
        </div>
      )
    }
  ], [canDelete, canUpdate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-ink-300">Each group has one saved normal input and a flat, future-only packaging template. Completed operations retain their own snapshot.</p>
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>New group</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_210px]">
        <Input
          leftIcon={Search}
          placeholder="Search group, code, or input item"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
        />
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={groups}
        rowKey={(row) => row.id}
        isLoading={groupsQuery.isPending}
        isError={groupsQuery.isError}
        error={groupsQuery.error}
        onRetry={() => groupsQuery.refetch()}
        empty={{
          icon: PackagePlus,
          title: 'No packaging groups found',
          description: canCreate ? 'Create a flat template to turn input stock into ready cartons and bags.' : 'Try another filter.'
        }}
        footer={meta.totalPages ? <Pagination page={meta.page || page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit || PAGE_SIZE} onChange={setPage} /> : null}
      />

      <PackagingGroupFormModal open={creating} onClose={() => setCreating(false)} items={items} warehouses={warehouses} />
      <PackagingGroupFormModal open={Boolean(editing)} onClose={() => setEditing(null)} group={editing || undefined} items={items} warehouses={warehouses} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deactivateMutation.mutate(deleteTarget.id)}
        title="Deactivate packaging group"
        description={deleteTarget ? `Deactivate ${deleteTarget.name}? Historical operations and ready containers are preserved.` : ''}
        confirmLabel="Deactivate"
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
}
