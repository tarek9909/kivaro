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
import { formatDateTime } from '@/lib/formatters.js';
import { INVENTORY_PERMISSIONS } from './inventory.config.js';
import { formatStockQuantity, getEntryUnitLabel } from './stockUnits.js';
import {
  useItemsOptions,
  useVariantsOptions,
  useWarehousesOptions
} from './useInventoryOptions.js';

function emptyForm() {
  return {
    catalog_type: 'product',
    target_type: 'item',
    warehouse_id: '',
    item_id: '',
    item_variant_id: '',
    direction: 'increase',
    quantity: '',
    unit_cost: '',
    reason: ''
  };
}

function variantOptionLabel(variant) {
  const unit = getEntryUnitLabel(variant);
  return `${variant.item_name} - ${variant.variant_name} (${variant.sku})${unit ? ` - ${unit}` : ''}`;
}

function itemOptionLabel(item) {
  const unit = getEntryUnitLabel(item);
  return `${item.name} (${item.code})${unit ? ` - ${unit}` : ''}`;
}

function AdjustmentFormModal({
  open,
  onClose,
  warehouses,
  productItems,
  packagingItems,
  productVariants,
  packagingVariants,
  canLoadInventoryOptions
}) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open]);

  const mutation = useMutation({
    mutationFn: (payload) => api.inventory.stockAdjustments.create(payload),
    onSuccess: () => {
      toast.success('Stock adjustment posted');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'variants'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not post adjustment.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(['target_type', 'catalog_type'].includes(field) ? { item_id: '', item_variant_id: '', quantity: '' } : {})
    }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    const items = form.catalog_type === 'packaging' ? packagingItems : productItems;
    const variants = form.catalog_type === 'packaging' ? packagingVariants : productVariants;
    const warehouseId = Number(form.warehouse_id);
    if (!form.warehouse_id || Number.isNaN(warehouseId) || warehouseId <= 0) {
      next.warehouse_id = 'Warehouse is required.';
    }
    if (form.target_type === 'item') {
      const itemId = Number(form.item_id);
      if (!form.item_id || Number.isNaN(itemId) || itemId <= 0) {
        next.item_id = 'Item is required.';
      }
    } else {
      const variantId = Number(form.item_variant_id);
      if (!form.item_variant_id || Number.isNaN(variantId) || variantId <= 0) {
        next.item_variant_id = 'Variant is required.';
      }
    }
    const quantity = Number(form.quantity);
    const selectedItem = items.find((item) => String(item.id) === String(form.item_id));
    const selectedVariant = variants.find((variant) => String(variant.id) === String(form.item_variant_id));
    const selectedTarget = form.target_type === 'item' ? selectedItem : selectedVariant;
    if (!form.quantity || Number.isNaN(quantity) || quantity <= 0) {
      next.quantity = 'Enter a positive quantity. Use direction to add or remove.';
    }
    if (form.quantity && selectedTarget?.base_unit_type === 'quantity' && !Number.isInteger(quantity)) {
      next.quantity = 'Piece-based quantities must be whole numbers.';
    }
    if (form.unit_cost !== '' && form.unit_cost !== null && Number(form.unit_cost) < 0) {
      next.unit_cost = 'Unit cost cannot be negative.';
    }
    if (!form.reason?.trim()) next.reason = 'Reason is required.';
    if (form.reason && form.reason.length > 500) next.reason = 'Reason must be 500 characters or fewer.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const quantity = Number(form.quantity);
    const quantity_change = form.direction === 'decrease' ? -quantity : quantity;
    mutation.mutate({
      target_type: form.target_type,
      warehouse_id: Number(form.warehouse_id),
      ...(form.target_type === 'item'
        ? { item_id: Number(form.item_id) }
        : { item_variant_id: Number(form.item_variant_id) }),
      quantity_change,
      unit_cost: form.unit_cost === '' ? null : Number(form.unit_cost),
      reason: form.reason.trim()
    });
  }

  const items = form.catalog_type === 'packaging' ? packagingItems : productItems;
  const variants = form.catalog_type === 'packaging' ? packagingVariants : productVariants;
  const selectedItem = items.find((item) => String(item.id) === String(form.item_id));
  const selectedVariant = variants.find((variant) => String(variant.id) === String(form.item_variant_id));
  const selectedVariantItem = selectedVariant
    ? items.find((item) => String(item.id) === String(selectedVariant.item_id))
    : null;
  const selectedTarget = form.target_type === 'item' ? selectedItem : selectedVariant;
  const stockUnitLabel = getEntryUnitLabel(selectedTarget);
  const quantityLabel = stockUnitLabel ? `Quantity (${stockUnitLabel})` : 'Quantity';
  const isPackagingVariantAdjustment = form.catalog_type === 'packaging' && form.target_type === 'variant';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Post stock adjustment"
      description="Adjust the item pool, or move quantity between the item pool and one of its variants."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="adjustment-form"
            isLoading={mutation.isPending}
          >
            Post adjustment
          </Button>
        </>
      }
    >
      <form id="adjustment-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {!canLoadInventoryOptions && (
          <Badge tone="warn">inventory.view is needed to select warehouse and variant.</Badge>
        )}
        <Select
          label="Adjustment catalog"
          value={form.catalog_type}
          onChange={(event) => handleChange('catalog_type', event.target.value)}
        >
          <option value="product">Normal items</option>
          <option value="packaging">Packaging items</option>
        </Select>
        <Select
          label="Target"
          value={form.target_type}
          onChange={(event) => handleChange('target_type', event.target.value)}
        >
          <option value="item">Item pool</option>
          <option value="variant">Variant stock</option>
        </Select>
        <Select
          label="Warehouse"
          value={form.warehouse_id}
          onChange={(event) => handleChange('warehouse_id', event.target.value)}
          error={errors.warehouse_id}
          disabled={!canLoadInventoryOptions}
          required
        >
          <option value="">Select warehouse</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </Select>
        {form.target_type === 'item' ? (
          <Select
            label="Item"
            value={form.item_id}
            onChange={(event) => handleChange('item_id', event.target.value)}
            error={errors.item_id}
            disabled={!canLoadInventoryOptions}
            required
          >
            <option value="">Select item</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {itemOptionLabel(item)}
              </option>
            ))}
          </Select>
        ) : (
          <Select
            label="Variant"
            value={form.item_variant_id}
            onChange={(event) => handleChange('item_variant_id', event.target.value)}
            error={errors.item_variant_id}
            disabled={!canLoadInventoryOptions}
            required
          >
            <option value="">Select variant</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variantOptionLabel(variant)}
              </option>
            ))}
          </Select>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="Direction"
            value={form.direction}
            onChange={(event) => handleChange('direction', event.target.value)}
          >
            <option value="increase">Increase</option>
            <option value="decrease">Decrease</option>
          </Select>
          <Input
            label={quantityLabel}
            type="number"
            min="0"
            step="0.0001"
            value={form.quantity}
            onChange={(event) => handleChange('quantity', event.target.value)}
            error={errors.quantity}
            required
            description={
              isPackagingVariantAdjustment
                ? 'Directly adjusts packaging variant stock.'
                : form.target_type === 'variant' && selectedVariantItem
                ? form.direction === 'increase'
                  ? `Increase subtracts from item pool. Available: ${formatStockQuantity(selectedVariantItem.item_quantity_on_hand || 0, selectedVariantItem)}`
                  : 'Decrease returns quantity to the item pool.'
                : undefined
            }
          />
          <Input
            label="Unit cost"
            type="number"
            min="0"
            step="0.0001"
            value={form.unit_cost}
            onChange={(event) => handleChange('unit_cost', event.target.value)}
            error={errors.unit_cost}
            description="Optional. Used when increasing stock to update the average cost."
          />
        </div>
        <Textarea
          label="Reason"
          value={form.reason}
          onChange={(event) => handleChange('reason', event.target.value)}
          error={errors.reason}
          rows={3}
          required
          description="Recorded with the audit log entry."
        />
      </form>
    </Modal>
  );
}

export default function AdjustmentsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canAdjust = hasPermission(INVENTORY_PERMISSIONS.adjust);
  const canViewMovements = hasPermission(INVENTORY_PERMISSIONS.movements);
  // Option lists hit /warehouses and /item-variants which are inventory.view
  // endpoints. Stay disabled when the user does not have inventory.view, even
  // if they have stock.adjust or stock.movements.
  const canLoadInventoryOptions = hasPermission(INVENTORY_PERMISSIONS.view);

  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const warehousesQuery = useWarehousesOptions(canLoadInventoryOptions);
  const productItemsQuery = useItemsOptions(canLoadInventoryOptions, { exclude_item_type: 'packaging' });
  const packagingItemsQuery = useItemsOptions(canLoadInventoryOptions, { item_type: 'packaging' });
  const productVariantsQuery = useVariantsOptions(canLoadInventoryOptions, { tracking_type: 'stocked', exclude_item_type: 'packaging' });
  const packagingVariantsQuery = useVariantsOptions(canLoadInventoryOptions, { tracking_type: 'stocked', item_type: 'packaging' });

  const warehouses = warehousesQuery.data?.data?.warehouses || [];
  const productItems = productItemsQuery.data?.data?.items || [];
  const packagingItems = packagingItemsQuery.data?.data?.items || [];
  const productVariants = productVariantsQuery.data?.data?.item_variants || [];
  const packagingVariants = packagingVariantsQuery.data?.data?.item_variants || [];

  // Recent adjustment history combines variant stock movements and item-pool
  // adjustment ledger entries from /stock-adjustments.
  const queryParams = useMemo(
    () => ({ page, limit }),
    [page, limit]
  );
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
        cell: (row) => (
          <span className="whitespace-nowrap text-xs text-ink-200">
            {formatDateTime(row.created_at)}
          </span>
        )
      },
      {
        id: 'warehouse_name',
        header: 'Warehouse',
        cell: (row) => (
          <span className="text-sm text-ink-100">{row.warehouse_name || '-'}</span>
        )
      },
      {
        id: 'item',
        header: 'Item / Variant',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-ink-50">{row.item_name}</p>
            <p className="truncate font-mono text-xs text-ink-400">
              {row.variant_name} - {row.sku}
              {row.item_type === 'packaging' ? ' - packaging' : ''}
            </p>
          </div>
        )
      },
      {
        id: 'quantity_change',
        header: 'Change',
        align: 'right',
        cell: (row) => {
          const value = Number(row.quantity_change);
          const isPositive = value >= 0;
          const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
          return (
            <span
              className={`inline-flex items-center justify-end gap-1 font-mono text-sm ${
                isPositive ? 'text-emerald-200' : 'text-rose-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {formatStockQuantity(Math.abs(value), row)}
            </span>
          );
        }
      },
      {
        id: 'quantity_after',
        header: 'On hand after',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatStockQuantity(row.quantity_after, row)}
          </span>
        )
      },
      {
        id: 'reason',
        header: 'Reason',
        cell: (row) => (
          <span className="line-clamp-2 text-sm text-ink-200 text-pretty">
            {row.notes || '-'}
          </span>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-300">
          {canAdjust ? (
            <Badge tone="success">stock.adjust granted</Badge>
          ) : (
            <Badge tone="warn">stock.adjust missing</Badge>
          )}
          {!canLoadInventoryOptions && (
            <Badge tone="neutral">inventory.view needed for pickers</Badge>
          )}
        </div>
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canAdjust || !canLoadInventoryOptions}>
          New adjustment
        </Button>
      </div>

      <GlassPanel>
        <GlassPanelHeader
          title="Recent adjustments"
          subtitle="Item-pool and variant adjustments for normal and packaging stock."
        />
        <GlassPanelBody>
          {!canViewMovements ? (
            <EmptyState
              title="Movements view restricted"
              description="The stock.movements permission is needed to see the adjustment history."
            />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              isLoading={historyQuery.isPending}
              isError={historyQuery.isError}
              error={historyQuery.error}
              onRetry={() => historyQuery.refetch()}
              empty={{
                title: 'No adjustments recorded yet',
                description: canAdjust
                  ? 'Post your first adjustment to seed balances.'
                  : 'There are no adjustments to display.'
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
          )}
        </GlassPanelBody>
      </GlassPanel>

      <AdjustmentFormModal
        open={creating}
        onClose={() => setCreating(false)}
        warehouses={warehouses}
        productItems={productItems}
        packagingItems={packagingItems}
        productVariants={productVariants}
        packagingVariants={packagingVariants}
        canLoadInventoryOptions={canLoadInventoryOptions}
      />
    </div>
  );
}
