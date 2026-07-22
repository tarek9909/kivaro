import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  GlassPanel,
  GlassPanelBody,
  GlassPanelHeader,
  Input,
  Modal,
  Pagination,
  Select,
  Textarea
} from '@/components/ui/index.js';
import { formatDateTime, formatNumber } from '@/lib/formatters.js';
import { INVENTORY_PERMISSIONS } from './inventory.config.js';
import { formatStockQuantity, getEntryUnitLabel, getStockMode } from './stockUnits.js';
import { useItemsOptions, useWarehousesOptions } from './useInventoryOptions.js';

function emptyForm() {
  return {
    warehouse_id: '',
    item_id: '',
    adjustment_target: 'stock',
    direction: 'increase',
    quantity: '',
    unit_cost: '',
    cost_per_carton: '',
    reason: ''
  };
}

function itemOptionLabel(item) {
  const unit = getEntryUnitLabel(item);
  const mode = getStockMode(item);
  return `${item.name} (${item.code}) · ${mode}${unit ? ` · ${unit}` : ''}`;
}

function AdjustmentFormModal({ open, onClose, warehouses, items, canLoadInventoryOptions }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();
  const selectedItem = items.find((item) => String(item.id) === String(form.item_id));
  const stockMode = getStockMode(selectedItem || {});
  const isCartonWeight = stockMode === 'carton_weight';
  const isLooseUnitAdjustment = isCartonWeight && form.adjustment_target === 'loose_units';
  const isPieceStock = stockMode === 'piece';
  const quantityLabel = isCartonWeight
    ? isLooseUnitAdjustment ? 'Loose units' : 'Carton count'
    : `Quantity${getEntryUnitLabel(selectedItem || {}) ? ` (${getEntryUnitLabel(selectedItem)})` : ''}`;

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open]);

  const mutation = useMutation({
    mutationFn: (payload) => api.inventory.stockAdjustments.create(payload),
    onSuccess: () => {
      toast.success('Stock adjustment posted');
      for (const key of ['movements', 'balances', 'adjustments', 'items', 'carton-lots', 'open-carton-shelves']) {
        queryClient.invalidateQueries({ queryKey: ['inventory', key] });
      }
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'items'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not post adjustment.'));
    }
  });

  function handleChange(field, value) {
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      if (field === 'item_id') {
        next.adjustment_target = 'stock';
        next.direction = 'increase';
        next.quantity = '';
        next.unit_cost = '';
        next.cost_per_carton = '';
      }
      if (field === 'adjustment_target') {
        next.direction = value === 'loose_units' ? 'decrease' : 'increase';
        next.quantity = '';
        next.unit_cost = '';
        next.cost_per_carton = '';
      }
      return next;
    });
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  function validate() {
    const next = {};
    const warehouseId = Number(form.warehouse_id);
    const itemId = Number(form.item_id);
    const quantity = Number(form.quantity);
    if (!form.warehouse_id || Number.isNaN(warehouseId) || warehouseId <= 0) next.warehouse_id = 'Warehouse is required.';
    if (!form.item_id || Number.isNaN(itemId) || itemId <= 0) next.item_id = 'Item is required.';
    if (!form.quantity || Number.isNaN(quantity) || quantity <= 0) next.quantity = 'Enter a positive quantity. Use direction to add or remove.';
    if ((isCartonWeight || isPieceStock) && form.quantity && !Number.isInteger(quantity)) {
      next.quantity = 'This stock mode requires a whole number.';
    }
    if (isLooseUnitAdjustment && form.direction !== 'decrease') {
      next.direction = 'Loose shelf units can only be removed by an adjustment.';
    }
    if (!isCartonWeight && form.unit_cost !== '' && Number(form.unit_cost) < 0) next.unit_cost = 'Unit cost cannot be negative.';
    if (isCartonWeight && !isLooseUnitAdjustment && form.cost_per_carton !== '' && Number(form.cost_per_carton) < 0) {
      next.cost_per_carton = 'Cost per carton cannot be negative.';
    }
    if (!form.reason?.trim()) next.reason = 'Reason is required.';
    if (form.reason && form.reason.length > 500) next.reason = 'Reason must be 500 characters or fewer.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const signedQuantity = form.direction === 'decrease' ? -Number(form.quantity) : Number(form.quantity);
    const payload = {
      warehouse_id: Number(form.warehouse_id),
      item_id: Number(form.item_id),
      reason: form.reason.trim()
    };
    if (isCartonWeight) {
      if (isLooseUnitAdjustment) {
        payload.loose_units_change = signedQuantity;
      } else {
        payload.carton_count_change = signedQuantity;
        if (form.cost_per_carton !== '') payload.cost_per_carton = Number(form.cost_per_carton);
      }
    } else {
      payload.quantity_change = signedQuantity;
      if (form.unit_cost !== '') payload.unit_cost = Number(form.unit_cost);
    }
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Post stock adjustment"
      description="Adjust canonical item stock. Carton stock and open shelf units are controlled separately."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="adjustment-form" isLoading={mutation.isPending}>Post adjustment</Button>
        </>
      }
    >
      <form id="adjustment-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {!canLoadInventoryOptions && <Badge tone="warn">inventory.view is needed to select a warehouse and item.</Badge>}
        <Select
          label="Warehouse"
          value={form.warehouse_id}
          onChange={(event) => handleChange('warehouse_id', event.target.value)}
          error={errors.warehouse_id}
          disabled={!canLoadInventoryOptions}
          required
        >
          <option value="">Select warehouse</option>
          {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </Select>
        <Select
          label="Item"
          value={form.item_id}
          onChange={(event) => handleChange('item_id', event.target.value)}
          error={errors.item_id}
          disabled={!canLoadInventoryOptions}
          required
        >
          <option value="">Select item</option>
          {items.map((item) => <option key={item.id} value={item.id}>{itemOptionLabel(item)}</option>)}
        </Select>

        {isCartonWeight && (
          <Select
            label="Adjust"
            value={form.adjustment_target}
            onChange={(event) => handleChange('adjustment_target', event.target.value)}
            description="Carton stock is adjusted separately from already-open loose shelf units."
          >
            <option value="stock">Sealed cartons</option>
            <option value="loose_units">Open loose units (remove only)</option>
          </Select>
        )}

        <div className={`grid gap-4 ${isCartonWeight && !isLooseUnitAdjustment ? 'sm:grid-cols-3' : 'sm:grid-cols-3'}`}>
          <Select
            label="Direction"
            value={form.direction}
            onChange={(event) => handleChange('direction', event.target.value)}
            disabled={isLooseUnitAdjustment}
            error={errors.direction}
          >
            <option value="increase">Increase</option>
            <option value="decrease">Decrease</option>
          </Select>
          <Input
            label={quantityLabel}
            type="number"
            min="0"
            step={isCartonWeight || isPieceStock ? '1' : '0.0001'}
            value={form.quantity}
            onChange={(event) => handleChange('quantity', event.target.value)}
            error={errors.quantity}
            required
          />
          {isCartonWeight && !isLooseUnitAdjustment ? (
            <Input
              label="Cost per carton"
              type="number"
              min="0"
              step="0.0001"
              value={form.cost_per_carton}
              onChange={(event) => handleChange('cost_per_carton', event.target.value)}
              error={errors.cost_per_carton}
              description="Optional; used when increasing stock."
            />
          ) : (
            <Input
              label="Unit cost"
              type="number"
              min="0"
              step="0.0001"
              value={form.unit_cost}
              onChange={(event) => handleChange('unit_cost', event.target.value)}
              error={errors.unit_cost}
              disabled={isLooseUnitAdjustment}
              description="Optional; used when increasing stock to update WAC."
            />
          )}
        </div>
        <Textarea
          label="Reason"
          value={form.reason}
          onChange={(event) => handleChange('reason', event.target.value)}
          error={errors.reason}
          rows={3}
          required
          description="Recorded in the inventory movement and audit trail."
        />
      </form>
    </Modal>
  );
}

function formatAdjustmentChange(row) {
  if (getStockMode(row) === 'carton_weight') {
    if (row.carton_count_change !== null && row.carton_count_change !== undefined) {
      return `${formatNumber(row.carton_count_change, { maximumFractionDigits: 0 })} cartons`;
    }
    if (row.loose_units_change !== null && row.loose_units_change !== undefined) {
      return `${formatNumber(row.loose_units_change, { maximumFractionDigits: 0 })} loose units`;
    }
  }
  return formatStockQuantity(Math.abs(Number(row.quantity_change || 0)), row);
}

export default function AdjustmentsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canAdjust = hasPermission(INVENTORY_PERMISSIONS.adjust);
  const canViewMovements = hasPermission(INVENTORY_PERMISSIONS.movements);
  const canLoadInventoryOptions = hasPermission(INVENTORY_PERMISSIONS.view);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const warehousesQuery = useWarehousesOptions(canLoadInventoryOptions);
  const itemsQuery = useItemsOptions(canLoadInventoryOptions, { status: 'active' });
  const warehouses = warehousesQuery.data?.data?.warehouses || [];
  const items = itemsQuery.data?.data?.items || [];
  const queryParams = useMemo(() => ({ page, limit }), [limit, page]);
  const historyQuery = useQuery({
    queryKey: ['inventory', 'adjustments', queryParams],
    queryFn: () => api.inventory.stockAdjustments.list(queryParams),
    enabled: canViewMovements
  });
  const rows = historyQuery.data?.data?.stock_adjustments || [];
  const meta = historyQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'created_at',
        header: 'When',
        cell: (row) => <span className="whitespace-nowrap text-xs text-ink-200">{formatDateTime(row.created_at)}</span>
      },
      {
        id: 'warehouse_name',
        header: 'Warehouse',
        cell: (row) => <span className="text-sm text-ink-100">{row.warehouse_name || '-'}</span>
      },
      {
        id: 'item',
        header: 'Item',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-ink-50">{row.item_name}</p>
            <p className="truncate font-mono text-xs text-ink-400">{row.item_code || row.code || '-'}</p>
          </div>
        )
      },
      {
        id: 'quantity_change',
        header: 'Change',
        align: 'right',
        cell: (row) => {
          const value = Number(row.quantity_change ?? row.carton_count_change ?? row.loose_units_change ?? 0);
          const isPositive = value >= 0;
          const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
          return <span className={`inline-flex items-center justify-end gap-1 font-mono text-sm ${isPositive ? 'text-emerald-200' : 'text-rose-200'}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{formatAdjustmentChange(row)}</span>;
        }
      },
      {
        id: 'quantity_after',
        header: 'On hand after',
        align: 'right',
        cell: (row) => <span className="font-mono text-sm text-ink-100">{formatStockQuantity(row.quantity_after, row)}</span>
      },
      {
        id: 'reason',
        header: 'Reason',
        cell: (row) => <span className="line-clamp-2 text-pretty text-sm text-ink-200">{row.notes || row.reason || '-'}</span>
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-300">
          {canAdjust ? <Badge tone="success">stock.adjust granted</Badge> : <Badge tone="warn">stock.adjust missing</Badge>}
          {!canLoadInventoryOptions && <Badge tone="neutral">inventory.view needed for pickers</Badge>}
        </div>
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canAdjust || !canLoadInventoryOptions}>New adjustment</Button>
      </div>

      <GlassPanel>
        <GlassPanelHeader title="Recent adjustments" subtitle="Canonical item-stock corrections, including sealed cartons and opened loose units." />
        <GlassPanelBody>
          {!canViewMovements ? (
            <EmptyState title="Movements view restricted" description="The stock.movements permission is needed to see adjustment history." />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.movement_id || row.id}
              isLoading={historyQuery.isPending}
              isError={historyQuery.isError}
              error={historyQuery.error}
              onRetry={() => historyQuery.refetch()}
              empty={{ title: 'No adjustments recorded yet', description: canAdjust ? 'Post an adjustment to correct or seed item stock.' : 'There are no adjustments to display.' }}
              footer={meta?.totalPages ? <Pagination page={meta.page || page} totalPages={meta.totalPages || 1} total={meta.total} limit={meta.limit || limit} onChange={setPage} /> : null}
            />
          )}
        </GlassPanelBody>
      </GlassPanel>

      <AdjustmentFormModal open={creating} onClose={() => setCreating(false)} warehouses={warehouses} items={items} canLoadInventoryOptions={canLoadInventoryOptions} />
    </div>
  );
}
