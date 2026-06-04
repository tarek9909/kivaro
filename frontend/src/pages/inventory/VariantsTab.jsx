import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Input,
  Modal,
  Pagination,
  Select,
  Textarea
} from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';
import { STATUSES, INVENTORY_PERMISSIONS } from './inventory.config.js';
import { useItemsOptions, useWarehousesOptions } from './useInventoryOptions.js';
import { formatStockQuantity, getEntryUnitLabel } from './stockUnits.js';

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...STATUSES];

function parseAttributesJson(value) {
  if (!value || !value.trim()) return null;
  return JSON.parse(value);
}

function attributesToString(attributes) {
  if (!attributes) return '';
  if (typeof attributes === 'string') {
    try {
      return JSON.stringify(JSON.parse(attributes), null, 2);
    } catch {
      return attributes;
    }
  }
  return JSON.stringify(attributes, null, 2);
}

function toStockQuantity(value, row = {}) {
  if (value === undefined || value === null || value === '') return 0;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  if ((row.base_unit_type || row.unit_type) === 'weight') {
    return numericValue * Number(row.base_unit_conversion_to_base || row.conversion_to_base || 1);
  }
  return numericValue;
}

function formatEntryQuantity(value, row = {}) {
  const unit = getEntryUnitLabel(row);
  const formatted = formatNumber(value, row.base_unit_type === 'quantity' ? { maximumFractionDigits: 0 } : { maximumFractionDigits: 4 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function emptyForm(variant) {
  return {
    item_id: variant?.item_id ?? '',
    variant_name: variant?.variant_name ?? '',
    sku: variant?.sku ?? '',
    cost: variant?.cost ?? 0,
    selling_price: variant?.selling_price ?? '',
    status: variant?.status ?? 'active',
    warehouse_id: '',
    initial_quantity: '',
    attributes: attributesToString(variant?.attributes_json)
  };
}

function VariantFormModal({ open, onClose, variant, items, warehouses }) {
  const isEdit = Boolean(variant);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(variant));
  const [errors, setErrors] = useState({});
  const selectedItem = items.find((item) => String(item.id) === String(form.item_id));
  const entryUnit = getEntryUnitLabel(selectedItem || {}) || 'unit';
  const isPieceBasedItem = selectedItem?.base_unit_type === 'quantity';
  const enteredStockQuantity = toStockQuantity(form.initial_quantity, selectedItem || {});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(variant));
    setErrors({});
  }, [open, variant]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.inventory.variants.update(variant.id, payload)
        : api.inventory.variants.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Variant updated' : 'Variant created');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'stock'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save variant.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.item_id) next.item_id = 'Item is required.';
    if (!form.variant_name?.trim()) next.variant_name = 'Variant name is required.';
    if (!form.sku?.trim()) next.sku = 'SKU is required.';
    if (form.cost !== '' && Number(form.cost) < 0) {
      next.cost = 'Cost cannot be negative.';
    }
    if (form.selling_price !== '' && Number(form.selling_price) < 0) {
      next.selling_price = 'Selling price cannot be negative.';
    }
    if (!isEdit && form.initial_quantity !== '' && Number(form.initial_quantity) < 0) {
      next.initial_quantity = 'Quantity cannot be negative.';
    }
    if (!isEdit && form.initial_quantity !== '' && isPieceBasedItem && !Number.isInteger(Number(form.initial_quantity))) {
      next.initial_quantity = 'Piece-based quantities must be whole numbers.';
    }
    if (!isEdit && Number(form.initial_quantity || 0) > 0 && !form.warehouse_id) {
      next.warehouse_id = 'Warehouse is required when quantity is greater than zero.';
    }
    if (!isEdit && selectedItem && enteredStockQuantity > Number(selectedItem.item_quantity_on_hand || 0)) {
      next.initial_quantity = `Only ${formatEntryQuantity(Number(selectedItem.item_quantity_on_hand || 0) / Number(selectedItem.base_unit_conversion_to_base || 1), selectedItem)} is available on the item.`;
    }
    if (form.attributes && form.attributes.trim()) {
      try {
        const parsed = parseAttributesJson(form.attributes);
        if (parsed && (typeof parsed !== 'object' || Array.isArray(parsed))) {
          next.attributes = 'Attributes must be a structured object.';
        }
      } catch (error) {
        next.attributes = `Invalid structured data. ${error.message}`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    let attributes_json = null;
    if (form.attributes && form.attributes.trim()) {
      try {
        attributes_json = parseAttributesJson(form.attributes);
      } catch {
        return;
      }
    }
    mutation.mutate({
      ...(isEdit ? {} : Number(form.initial_quantity || 0) > 0
        ? {
            warehouse_id: Number(form.warehouse_id),
            initial_quantity: Number(form.initial_quantity)
          }
        : {}),
      item_id: Number(form.item_id),
      variant_name: form.variant_name.trim(),
      sku: form.sku.trim(),
      cost: Number(form.cost) || 0,
      selling_price: form.selling_price === '' ? null : Number(form.selling_price),
      status: form.status,
      attributes_json
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit product variant' : 'New product variant'}
      description="Product variants are SKU-level entries for non-packaging stock. Packaging variants live in the Packaging tab."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="variant-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create variant'}
          </Button>
        </>
      }
    >
      <form id="variant-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Select
          label="Item"
          value={form.item_id || ''}
          onChange={(event) => handleChange('item_id', event.target.value)}
          error={errors.item_id}
          required
        >
          <option value="">Select item</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.code})
            </option>
          ))}
        </Select>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Variant name"
            value={form.variant_name}
            onChange={(event) => handleChange('variant_name', event.target.value)}
            error={errors.variant_name}
            required
          />
          <Input
            label="SKU"
            value={form.sku}
            onChange={(event) => handleChange('sku', event.target.value)}
            error={errors.sku}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Cost"
            type="number"
            min="0"
            step="0.0001"
            value={form.cost}
            onChange={(event) => handleChange('cost', event.target.value)}
            error={errors.cost}
          />
          <Input
            label="Selling price"
            type="number"
            min="0"
            step="0.0001"
            value={form.selling_price ?? ''}
            onChange={(event) => handleChange('selling_price', event.target.value)}
            error={errors.selling_price}
            description="Optional."
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(event) => handleChange('status', event.target.value)}
            error={errors.status}
          >
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        {!isEdit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Source warehouse"
              value={form.warehouse_id || ''}
              onChange={(event) => handleChange('warehouse_id', event.target.value)}
              error={errors.warehouse_id}
              description="Quantity is subtracted from the selected item's pool."
            >
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </Select>
            <Input
              label={`Variant quantity (${entryUnit})`}
              type="number"
              min="0"
              step={isPieceBasedItem ? '1' : '0.0001'}
              value={form.initial_quantity}
              onChange={(event) => handleChange('initial_quantity', event.target.value)}
              error={errors.initial_quantity}
              description={
                selectedItem
                  ? `Item available: ${formatEntryQuantity(Number(selectedItem.item_quantity_on_hand || 0) / Number(selectedItem.base_unit_conversion_to_base || 1), selectedItem)} (${formatStockQuantity(selectedItem.item_quantity_on_hand || 0, selectedItem)} stored)`
                  : 'Select an item first.'
              }
            />
          </div>
        )}
        <Textarea
          label="Attributes data"
          value={form.attributes}
          onChange={(event) => handleChange('attributes', event.target.value)}
          error={errors.attributes}
          rows={5}
          description="Optional structured object for variant attributes such as size, color, packaging."
        />
      </form>
    </Modal>
  );
}

export default function VariantsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(INVENTORY_PERMISSIONS.create);
  const canUpdate = hasPermission(INVENTORY_PERMISSIONS.update);
  const canDelete = hasPermission(INVENTORY_PERMISSIONS.delete);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [itemId, setItemId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (itemId) params.item_id = itemId;
    if (!itemId) params.exclude_item_type = 'packaging';
    return params;
  }, [debouncedSearch, status, itemId, page, limit]);

  const listQuery = useQuery({
    queryKey: ['inventory', 'variants', queryParams],
    queryFn: () => api.inventory.variants.list(queryParams)
  });

  const itemsQuery = useItemsOptions(true, { exclude_item_type: 'packaging' });
  const warehousesQuery = useWarehousesOptions(true);
  const items = itemsQuery.data?.data?.items || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.inventory.variants.remove(id),
    onSuccess: () => {
      toast.success('Variant deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'variants'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not deactivate variant.'))
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id) => api.inventory.variants.hardDelete(id),
    onSuccess: () => {
      toast.success('Variant hard-deleted');
      setHardDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'items'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not hard-delete variant.'))
  });

  const rows = listQuery.data?.data?.item_variants || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'variant',
        header: 'Variant',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.variant_name}</p>
            <p className="truncate font-mono text-xs text-ink-400">{row.sku}</p>
          </div>
        )
      },
      {
        id: 'item_name',
        header: 'Item',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.item_name || '-'}</span>
        )
      },
      {
        id: 'cost',
        header: 'Cost',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.cost, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'quantity_on_hand',
        header: 'Qty',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatStockQuantity(row.quantity_on_hand || 0, row)}
          </span>
        )
      },
      {
        id: 'selling_price',
        header: 'Price',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {row.selling_price === null || row.selling_price === undefined
              ? '-'
              : formatNumber(row.selling_price, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => (
          <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>{row.status}</Badge>
        )
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canUpdate && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(row)}>
                Edit
              </Button>
            )}
            {canDelete && row.status === 'active' && (
              <Button
                variant="ghost"
                size="icon"
                leftIcon={Trash2}
                aria-label={`Deactivate ${row.variant_name}`}
                onClick={() => setDeleteTarget(row)}
              />
            )}
            {canDelete && (
              <Button variant="danger" size="sm" onClick={() => setHardDeleteTarget(row)}>
                Hard delete
              </Button>
            )}
          </div>
        )
      }
    ],
    [canDelete, canUpdate]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
          <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>
          New product variant
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            leftIcon={Search}
            placeholder="Search by product item, name, or SKU"
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
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            value={itemId}
            onChange={(event) => {
              setItemId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All product items</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
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
            {STATUS_OPTIONS.map((option) => (
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
          title: 'No product variants match the filters',
          description: 'Packaging variants are managed from Inventory > Packaging.'
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

      <VariantFormModal open={creating} onClose={() => setCreating(false)} items={items} warehouses={warehouses} />
      <VariantFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        variant={editing || undefined}
        items={items}
        warehouses={warehouses}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate variant"
        description={
          deleteTarget
            ? `Set ${deleteTarget.variant_name} (${deleteTarget.sku}) to inactive? Variants with movement history cannot be hard-deleted.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={Boolean(hardDeleteTarget)}
        onClose={() => setHardDeleteTarget(null)}
        onConfirm={() => hardDeleteTarget && hardDeleteMutation.mutate(hardDeleteTarget.id)}
        title="Hard delete variant"
        description={
          hardDeleteTarget
            ? `Permanently delete ${hardDeleteTarget.variant_name} (${hardDeleteTarget.sku})? This cannot be undone and will fail if stock, packaging, production, purchase, or dispatch history references it.`
            : ''
        }
        confirmLabel="Hard delete"
        isLoading={hardDeleteMutation.isPending}
      />
    </div>
  );
}
