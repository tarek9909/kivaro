import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, ClipboardList, Eye, PackageCheck } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Badge, Button, DataTable, GlassPanel, GlassPanelBody, GlassPanelHeader, Input, Pagination, Select, Textarea } from '@/components/ui/index.js';
import { formatDateTime, formatNumber } from '@/lib/formatters.js';
import { useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import { statusTone } from './packaging.constants.js';
import { PackagingPreviewModal } from './PackagingPreviewModal.jsx';

const PAGE_SIZE = 15;

function outputPayload(form) {
  return {
    warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : undefined,
    output_carton_count: Number(form.output_carton_count),
    notes: form.notes.trim() || undefined
  };
}

export function PackagingOperationsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canComplete = hasPermission('inventory.create') || hasPermission('stock.adjust');
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ group_id: '', warehouse_id: '', output_carton_count: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [page, setPage] = useState(1);
  const [historyGroupId, setHistoryGroupId] = useState('');
  const [historyWarehouseId, setHistoryWarehouseId] = useState('');

  const groupsQuery = useQuery({
    queryKey: ['packaging', 'groups', 'operation-options'],
    queryFn: () => api.packaging.groups.list({ page: 1, limit: 100, status: 'active' })
  });
  const warehousesQuery = useWarehousesOptions(true);
  const groups = groupsQuery.data?.data?.packaging_groups || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];

  const historyParams = useMemo(() => {
    const next = { page, limit: PAGE_SIZE };
    if (historyGroupId) next.packaging_group_id = historyGroupId;
    if (historyWarehouseId) next.warehouse_id = historyWarehouseId;
    return next;
  }, [historyGroupId, historyWarehouseId, page]);
  const operationsQuery = useQuery({
    queryKey: ['packaging', 'operations', historyParams],
    queryFn: () => api.packaging.operations.list(historyParams)
  });
  const operations = operationsQuery.data?.data?.packaging_operations || [];
  const meta = operationsQuery.data?.meta || {};

  const previewMutation = useMutation({
    mutationFn: ({ groupId, payload }) => api.packaging.groups.preview(groupId, payload),
    onSuccess: (response) => setPreview(response.data?.preview || null),
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not generate a packaging preview.'));
    }
  });
  const completeMutation = useMutation({
    mutationFn: ({ groupId, payload }) => api.packaging.groups.complete(groupId, payload),
    onSuccess: () => {
      toast.success('Packaging completed and ready containers created');
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ['packaging'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Packaging could not be completed. Generate a fresh preview and try again.'))
  });

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setPreview(null);
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.group_id) next.group_id = 'Choose a packaging group.';
    if (!form.output_carton_count || !Number.isInteger(Number(form.output_carton_count)) || Number(form.output_carton_count) <= 0) {
      next.output_carton_count = 'Enter a positive whole outer-carton count.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function previewOperation(event) {
    event.preventDefault();
    if (!validate()) return;
    previewMutation.mutate({ groupId: Number(form.group_id), payload: outputPayload(form) });
  }

  function completePreview() {
    if (!form.group_id || !preview) return;
    completeMutation.mutate({ groupId: Number(form.group_id), payload: outputPayload(form) });
  }

  const columns = useMemo(() => [
    {
      id: 'operation_number',
      header: 'Operation',
      cell: (row) => (
        <div>
          <p className="font-mono text-sm font-medium text-ink-50">{row.operation_number}</p>
          <p className="text-xs text-ink-400">{formatDateTime(row.completed_at)}</p>
        </div>
      )
    },
    {
      id: 'packaging_group_name',
      header: 'Group / input',
      cell: (row) => <span className="text-sm text-ink-100">{row.packaging_group_name} · {row.input_item_name}</span>
    },
    {
      id: 'warehouse_name',
      header: 'Warehouse',
      cell: (row) => <span className="text-sm text-ink-200">{row.warehouse_name}</span>
    },
    {
      id: 'output_carton_count',
      header: 'Output',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm">{formatNumber(row.output_carton_count, { maximumFractionDigits: 0 })} cartons</span>
    },
    {
      id: 'container_count',
      header: 'Ready state',
      cell: (row) => <span className="text-xs text-ink-200">{row.full_container_count || 0} full · {row.partial_container_count || 0} partial</span>
    },
    {
      id: 'total_cost',
      header: 'Total cost',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm">{formatNumber(row.total_cost, { maximumFractionDigits: 4 })}</span>
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>
    }
  ], []);

  return (
    <div className="space-y-5">
      <GlassPanel strong>
        <GlassPanelHeader
          title="Create ready packaged stock"
          subtitle="Select a saved group and outer-carton output. The preview uses live server stock and cost; it does not reserve inventory."
          icon={Calculator}
        />
        <GlassPanelBody>
          <form onSubmit={previewOperation} className="space-y-4" noValidate>
            <div className="grid gap-4 md:grid-cols-3">
              <Select label="Packaging group" value={form.group_id} onChange={(event) => change('group_id', event.target.value)} error={errors.group_id} disabled={!canComplete}>
                <option value="">Select active group</option>
                {groups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.code})</option>)}
              </Select>
              <Select label="Warehouse" value={form.warehouse_id} onChange={(event) => change('warehouse_id', event.target.value)} description="Leave blank to use the group default." disabled={!canComplete}>
                <option value="">Group default warehouse</option>
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </Select>
              <Input label="Outer cartons to produce" type="number" min="1" step="1" inputMode="numeric" value={form.output_carton_count} onChange={(event) => change('output_carton_count', event.target.value)} error={errors.output_carton_count} disabled={!canComplete} />
            </div>
            <Textarea label="Operation notes" rows={2} value={form.notes} onChange={(event) => change('notes', event.target.value)} disabled={!canComplete} />
            <div className="flex justify-end">
              <Button type="submit" leftIcon={Eye} isLoading={previewMutation.isPending} disabled={!canComplete}>Preview consumption and output</Button>
            </div>
          </form>
        </GlassPanelBody>
      </GlassPanel>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink-50">Packaging history</h2>
            <p className="mt-1 text-sm text-ink-300">Every completed operation retains its input, component, capacity, and cost snapshot.</p>
          </div>
          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
            <Select value={historyGroupId} onChange={(event) => { setHistoryGroupId(event.target.value); setPage(1); }}>
              <option value="">All groups</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </Select>
            <Select value={historyWarehouseId} onChange={(event) => { setHistoryWarehouseId(event.target.value); setPage(1); }}>
              <option value="">All warehouses</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </Select>
          </div>
        </div>
        <DataTable
          columns={columns}
          rows={operations}
          rowKey={(row) => row.id}
          isLoading={operationsQuery.isPending}
          isError={operationsQuery.isError}
          error={operationsQuery.error}
          onRetry={() => operationsQuery.refetch()}
          empty={{ icon: ClipboardList, title: 'No packaging operations', description: 'Complete a packaging preview to create the first ready containers.' }}
          footer={meta.totalPages ? <Pagination page={meta.page || page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit || PAGE_SIZE} onChange={setPage} /> : null}
        />
      </section>

      <PackagingPreviewModal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        preview={preview}
        onComplete={completePreview}
        isCompleting={completeMutation.isPending}
      />
    </div>
  );
}
