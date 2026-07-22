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
import {
  INVENTORY_PERMISSIONS,
  ITEM_KINDS,
  STATUSES,
  STOCK_MODE_LABELS,
  STOCK_MODES
} from './inventory.config.js';
import { useCategoriesOptions, useUnitsOptions, useWarehousesOptions } from './useInventoryOptions.js';
import { formatStockQuantity, getEntryUnitLabel } from './stockUnits.js';

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...STATUSES];
const ITEM_KIND_OPTIONS = [{ value: '', label: 'All item kinds' }, ...ITEM_KINDS];
const STOCK_MODE_OPTIONS = [{ value: '', label: 'All stock modes' }, ...STOCK_MODES];

function inferItemKind(item) {
  return item?.item_kind || 'normal';
}

function inferStockMode(item) {
  if (item?.stock_mode) return item.stock_mode;
  return item?.base_unit_type === 'weight' ? 'weight' : 'piece';
}

function emptyForm(item) {
  const itemKind = inferItemKind(item);
  return {
    name: item?.name ?? '',
    code: item?.code ?? '',
    category_id: item?.category_id ?? '',
    base_unit_id: item?.base_unit_id ?? '',
    item_kind: itemKind,
    stock_mode: itemKind === 'packaging' ? 'piece' : inferStockMode(item),
    kg_per_carton: item?.kg_per_carton ?? '',
    loose_units_per_carton: item?.loose_units_per_carton ?? '',
    max_content_weight_kg: item?.max_content_weight_kg ?? '',
    description: item?.description ?? '',
    default_cost: item?.default_cost ?? 0,
    default_selling_price: item?.default_selling_price ?? '',
    carton_selling_price: item?.carton_selling_price ?? '',
    loose_unit_selling_price: item?.loose_unit_selling_price ?? '',
    reorder_level: item?.reorder_level ?? 0,
    status: item?.status ?? 'active',
    warehouse_id: '',
    initial_quantity: '',
    initial_unit_cost: '',
    initial_cartons: '',
    initial_cost_per_carton: ''
  };
}

function requiredUnitType(form) {
  return form.item_kind === 'packaging' || form.stock_mode === 'piece'
    ? 'quantity'
    : 'weight';
}

function stockModeHelp(stockMode) {
  return STOCK_MODES.find((option) => option.value === stockMode)?.description;
}

function numberOrNull(value) {
  return value === '' || value === null || value === undefined ? null : Number(value);
}

function itemConfigurationLabel(item) {
  const itemKind = inferItemKind(item);
  const stockMode = inferStockMode(item);
  if (itemKind === 'packaging') {
    const capacity = item.max_content_weight_kg;
    return capacity === null || capacity === undefined
      ? 'Piece stock'
      : `${formatNumber(capacity, { maximumFractionDigits: 4 })} kg capacity`;
  }
  if (stockMode === 'carton_weight') {
    const kgPerCarton = formatNumber(item.kg_per_carton, { maximumFractionDigits: 4 });
    const looseUnits = formatNumber(item.loose_units_per_carton, { maximumFractionDigits: 0 });
    return `${kgPerCarton} kg/carton · ${looseUnits} loose units`;
  }
  return stockMode === 'weight' ? 'Stocked in kg' : 'Whole pieces only';
}

function ItemFormModal({ open, onClose, item, categories, units, warehouses }) {
  const isEdit = Boolean(item);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(item));
  const [errors, setErrors] = useState({});
  const unitType = requiredUnitType(form);
  const compatibleUnits = useMemo(
    () => units.filter((unit) => (
      unit.unit_type === unitType && (form.item_kind !== 'packaging' || unit.symbol === 'pc')
    )),
    [form.item_kind, unitType, units]
  );
  const selectedBaseUnit = units.find((unit) => String(unit.id) === String(form.base_unit_id));
  const isCartonWeight = form.item_kind === 'normal' && form.stock_mode === 'carton_weight';
  const isPieceStock = unitType === 'quantity';
  const entryUnitLabel = isCartonWeight ? 'carton' : getEntryUnitLabel(selectedBaseUnit || {});
  const looseUnitWeight =
    isCartonWeight && Number(form.kg_per_carton) > 0 && Number(form.loose_units_per_carton) > 0
      ? Number(form.kg_per_carton) / Number(form.loose_units_per_carton)
      : null;

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(item));
    setErrors({});
  }, [open, item]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? api.inventory.items.update(item.id, payload) : api.inventory.items.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Item updated' : 'Item created');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save item.'));
    }
  });

  function handleChange(field, value) {
    setForm((previous) => {
      const next = { ...previous, [field]: value };
      if (field === 'item_kind') {
        next.stock_mode = value === 'packaging' ? 'piece' : 'weight';
        next.base_unit_id = '';
        next.kg_per_carton = '';
        next.loose_units_per_carton = '';
        next.carton_selling_price = '';
        next.loose_unit_selling_price = '';
      }
      if (field === 'stock_mode') {
        next.base_unit_id = '';
        next.initial_quantity = '';
        next.initial_unit_cost = '';
        next.initial_cartons = '';
        next.initial_cost_per_carton = '';
        if (value !== 'carton_weight') {
          next.kg_per_carton = '';
          next.loose_units_per_carton = '';
          next.carton_selling_price = '';
          next.loose_unit_selling_price = '';
        }
      }
      return next;
    });
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name?.trim()) next.name = 'Name is required.';
    if (!form.code?.trim()) next.code = 'Code is required.';
    if (!form.category_id) next.category_id = 'Category is required.';
    if (!form.base_unit_id) next.base_unit_id = 'Base unit is required.';
    if (selectedBaseUnit && selectedBaseUnit.unit_type !== unitType) {
      next.base_unit_id = `Choose a ${unitType} unit for this stock mode.`;
    }
    if (form.item_kind === 'packaging' && selectedBaseUnit && selectedBaseUnit.symbol !== 'pc') {
      next.base_unit_id = 'Packaging items must use the pc unit.';
    }
    if (isCartonWeight) {
      if (!form.kg_per_carton || Number(form.kg_per_carton) <= 0) {
        next.kg_per_carton = 'Kg per carton must be greater than zero.';
      }
      if (!form.loose_units_per_carton || !Number.isInteger(Number(form.loose_units_per_carton)) || Number(form.loose_units_per_carton) <= 0) {
        next.loose_units_per_carton = 'Loose units per carton must be a whole number greater than zero.';
      }
    }
    if (form.item_kind === 'packaging' && (form.max_content_weight_kg === '' || Number(form.max_content_weight_kg) < 0)) {
      next.max_content_weight_kg = 'Maximum content weight must be zero or greater.';
    }
    if (form.default_cost !== '' && Number(form.default_cost) < 0) {
      next.default_cost = 'Default cost cannot be negative.';
    }
    if (form.default_selling_price !== '' && Number(form.default_selling_price) < 0) {
      next.default_selling_price = 'Selling price cannot be negative.';
    }
    if (isCartonWeight && form.carton_selling_price !== '' && Number(form.carton_selling_price) < 0) {
      next.carton_selling_price = 'Carton price cannot be negative.';
    }
    if (isCartonWeight && form.loose_unit_selling_price !== '' && Number(form.loose_unit_selling_price) < 0) {
      next.loose_unit_selling_price = 'Loose-unit price cannot be negative.';
    }
    if (form.reorder_level !== '' && Number(form.reorder_level) < 0) {
      next.reorder_level = 'Reorder level cannot be negative.';
    }
    if (!isEdit) {
      const initialAmount = Number(isCartonWeight ? form.initial_cartons || 0 : form.initial_quantity || 0);
      if (initialAmount < 0) {
        next[isCartonWeight ? 'initial_cartons' : 'initial_quantity'] = 'Opening stock cannot be negative.';
      }
      if ((isCartonWeight || isPieceStock) && initialAmount > 0 && !Number.isInteger(initialAmount)) {
        next[isCartonWeight ? 'initial_cartons' : 'initial_quantity'] = 'This stock mode requires a whole number.';
      }
      if (initialAmount > 0 && !form.warehouse_id) {
        next.warehouse_id = 'Warehouse is required when opening stock is greater than zero.';
      }
      if (isCartonWeight && form.initial_cost_per_carton !== '' && Number(form.initial_cost_per_carton) < 0) {
        next.initial_cost_per_carton = 'Cost per carton cannot be negative.';
      }
      if (!isCartonWeight && form.initial_unit_cost !== '' && Number(form.initial_unit_cost) < 0) {
        next.initial_unit_cost = 'Opening unit cost cannot be negative.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      category_id: Number(form.category_id),
      base_unit_id: Number(form.base_unit_id),
      name: form.name.trim(),
      code: form.code.trim(),
      item_kind: form.item_kind,
      stock_mode: form.item_kind === 'packaging' ? 'piece' : form.stock_mode,
      description: form.description?.trim() || null,
      default_cost: Number(form.default_cost) || 0,
      default_selling_price:
        isCartonWeight || form.default_selling_price === '' ? null : Number(form.default_selling_price),
      reorder_level: Number(form.reorder_level) || 0,
      status: form.status
    };
    if (isCartonWeight) {
      payload.kg_per_carton = Number(form.kg_per_carton);
      payload.loose_units_per_carton = Number(form.loose_units_per_carton);
      payload.carton_selling_price = numberOrNull(form.carton_selling_price);
      payload.loose_unit_selling_price = numberOrNull(form.loose_unit_selling_price);
    }
    if (form.item_kind === 'packaging') {
      payload.max_content_weight_kg = Number(form.max_content_weight_kg);
    }
    if (!isEdit) {
      const initialAmount = Number(isCartonWeight ? form.initial_cartons || 0 : form.initial_quantity || 0);
      if (initialAmount > 0) {
        payload.warehouse_id = Number(form.warehouse_id);
        if (isCartonWeight) {
          payload.initial_cartons = initialAmount;
          payload.initial_cost_per_carton = Number(form.initial_cost_per_carton) || 0;
        } else {
          payload.initial_quantity = initialAmount;
          payload.initial_unit_cost = Number(form.initial_unit_cost) || 0;
        }
      }
    }
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit item' : 'New item'}
      description="Each item owns its stock. Configure how it is physically received and consumed; variants are not used."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="item-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create item'}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => handleChange('name', event.target.value)}
            error={errors.name}
            required
          />
          <Input
            label="Code"
            value={form.code}
            onChange={(event) => handleChange('code', event.target.value)}
            error={errors.code}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Category"
            value={form.category_id || ''}
            onChange={(event) => handleChange('category_id', event.target.value)}
            error={errors.category_id}
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select
            label="Item kind"
            value={form.item_kind}
            onChange={(event) => handleChange('item_kind', event.target.value)}
            error={errors.item_kind}
            disabled={isEdit}
            description={isEdit ? 'Item kind is fixed after creation.' : 'Packaging items are always stocked as pieces.'}
          >
            {ITEM_KINDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Stock mode"
            value={form.stock_mode}
            onChange={(event) => handleChange('stock_mode', event.target.value)}
            error={errors.stock_mode}
            disabled={form.item_kind === 'packaging' || isEdit}
            description={
              form.item_kind === 'packaging'
                ? 'Packaging materials are always counted as whole pieces.'
                : isEdit
                  ? 'Stock mode is fixed after creation to preserve inventory history.'
                  : stockModeHelp(form.stock_mode)
            }
          >
            {form.item_kind === 'packaging' ? (
              <option value="piece">Piece</option>
            ) : (
              STOCK_MODES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            )}
          </Select>
          <Select
            label="Base unit"
            value={form.base_unit_id || ''}
            onChange={(event) => handleChange('base_unit_id', event.target.value)}
            error={errors.base_unit_id}
            required
            description={form.item_kind === 'packaging' ? 'Packaging materials must use the pc unit.' : `Choose a ${unitType} unit compatible with this stock mode.`}
          >
            <option value="">Select unit</option>
            {compatibleUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.symbol})
              </option>
            ))}
          </Select>
        </div>

        {isCartonWeight && (
          <div className="rounded-xl border border-brand-400/20 bg-brand-500/5 p-4">
            <p className="text-sm font-medium text-ink-100">Carton configuration</p>
            <p className="mt-1 text-xs text-ink-300">
              Loose stock is consumed before the next sealed carton is opened.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Input
                label="Kg per carton"
                type="number"
                min="0"
                step="0.0001"
                value={form.kg_per_carton}
                onChange={(event) => handleChange('kg_per_carton', event.target.value)}
                error={errors.kg_per_carton}
                required
              />
              <Input
                label="Loose units per carton"
                type="number"
                min="1"
                step="1"
                value={form.loose_units_per_carton}
                onChange={(event) => handleChange('loose_units_per_carton', event.target.value)}
                error={errors.loose_units_per_carton}
                required
              />
            </div>
            {looseUnitWeight !== null && (
              <p className="mt-3 text-xs text-brand-100">
                Derived loose-unit weight: {formatNumber(looseUnitWeight, { maximumFractionDigits: 4 })} kg.
              </p>
            )}
          </div>
        )}

        {form.item_kind === 'packaging' && (
          <Input
            label="Maximum content weight (kg)"
            type="number"
            min="0"
            step="0.0001"
            value={form.max_content_weight_kg}
            onChange={(event) => handleChange('max_content_weight_kg', event.target.value)}
            error={errors.max_content_weight_kg}
            description="Use 0 for packaging with no intrinsic capacity, such as an outer carton."
            required
          />
        )}

        <div className={`grid gap-4 ${isCartonWeight ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          <Input
            label={isCartonWeight || form.stock_mode === 'weight' ? 'Default cost per kg' : 'Default cost per piece'}
            type="number"
            min="0"
            step="0.0001"
            value={form.default_cost}
            onChange={(event) => handleChange('default_cost', event.target.value)}
            error={errors.default_cost}
          />
          {form.item_kind === 'normal' && !isCartonWeight && (
            <Input
              label="Default sale price"
              type="number"
              min="0"
              step="0.0001"
              value={form.default_selling_price ?? ''}
              onChange={(event) => handleChange('default_selling_price', event.target.value)}
              error={errors.default_selling_price}
              description="Default price per base unit; a sale offer can override it."
            />
          )}
          <Input
            label={isCartonWeight || form.stock_mode === 'weight' ? 'Reorder level (kg)' : 'Reorder level (pieces)'}
            type="number"
            min="0"
            step={isPieceStock ? '1' : '0.0001'}
            value={form.reorder_level}
            onChange={(event) => handleChange('reorder_level', event.target.value)}
            error={errors.reorder_level}
          />
        </div>

        {isCartonWeight && (
          <div className="grid gap-4 rounded-xl border border-sky-400/20 bg-sky-500/5 p-4 md:grid-cols-2">
            <Input
              label="Default sealed-carton sale price"
              type="number"
              min="0"
              step="0.0001"
              value={form.carton_selling_price ?? ''}
              onChange={(event) => handleChange('carton_selling_price', event.target.value)}
              error={errors.carton_selling_price}
              description="Used as the configured price for a whole sealed-carton offer."
            />
            <Input
              label="Default loose-unit sale price"
              type="number"
              min="0"
              step="0.0001"
              value={form.loose_unit_selling_price ?? ''}
              onChange={(event) => handleChange('loose_unit_selling_price', event.target.value)}
              error={errors.loose_unit_selling_price}
              description="Used as the configured price for an individual loose-unit offer."
            />
          </div>
        )}

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

        {!isEdit && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm font-medium text-ink-100">Optional opening stock</p>
            <p className="mt-1 text-xs text-ink-400">
              Leave this empty to receive stock later through purchases or an adjustment.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <Select
                label="Opening warehouse"
                value={form.warehouse_id || ''}
                onChange={(event) => handleChange('warehouse_id', event.target.value)}
                error={errors.warehouse_id}
              >
                <option value="">Select warehouse</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} ({warehouse.code})
                  </option>
                ))}
              </Select>
              <Input
                label={isCartonWeight ? 'Opening sealed cartons' : `Opening quantity${entryUnitLabel ? ` (${entryUnitLabel})` : ''}`}
                type="number"
                min="0"
                step={isCartonWeight || isPieceStock ? '1' : '0.0001'}
                value={isCartonWeight ? form.initial_cartons : form.initial_quantity}
                onChange={(event) => handleChange(isCartonWeight ? 'initial_cartons' : 'initial_quantity', event.target.value)}
                error={errors[isCartonWeight ? 'initial_cartons' : 'initial_quantity']}
              />
              {isCartonWeight && (
                <Input
                  label="Opening cost per carton"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.initial_cost_per_carton}
                  onChange={(event) => handleChange('initial_cost_per_carton', event.target.value)}
                  error={errors.initial_cost_per_carton}
                />
              )}
              {!isCartonWeight && (
                <Input
                  label="Opening unit cost"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={form.initial_unit_cost}
                  onChange={(event) => handleChange('initial_unit_cost', event.target.value)}
                  error={errors.initial_unit_cost}
                />
              )}
            </div>
          </div>
        )}

        <Textarea
          label="Description"
          value={form.description || ''}
          onChange={(event) => handleChange('description', event.target.value)}
          rows={3}
        />
      </form>
    </Modal>
  );
}

export default function ItemsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(INVENTORY_PERMISSIONS.create);
  const canUpdate = hasPermission(INVENTORY_PERMISSIONS.update);
  const canDelete = hasPermission(INVENTORY_PERMISSIONS.delete);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [itemKind, setItemKind] = useState('');
  const [stockMode, setStockMode] = useState('');
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
    if (itemKind) params.item_kind = itemKind;
    if (stockMode) params.stock_mode = stockMode;
    if (categoryId) params.category_id = categoryId;
    return params;
  }, [categoryId, debouncedSearch, itemKind, limit, page, status, stockMode]);

  const listQuery = useQuery({
    queryKey: ['inventory', 'items', queryParams],
    queryFn: () => api.inventory.items.list(queryParams)
  });
  const categoriesQuery = useCategoriesOptions(true);
  const unitsQuery = useUnitsOptions(true);
  const warehousesQuery = useWarehousesOptions(true);
  const categories = categoriesQuery.data?.data?.categories || [];
  const units = unitsQuery.data?.data?.units || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];

  const invalidateItems = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
    queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'items'] });
    queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => api.inventory.items.remove(id),
    onSuccess: () => {
      toast.success('Item deactivated');
      setDeleteTarget(null);
      invalidateItems();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not deactivate item.'))
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id) => api.inventory.items.hardDelete(id),
    onSuccess: () => {
      toast.success('Item permanently deleted');
      setHardDeleteTarget(null);
      invalidateItems();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete item.'))
  });

  const reactivateMutation = useMutation({
    mutationFn: (id) => api.inventory.items.update(id, { status: 'active' }),
    onSuccess: () => {
      toast.success('Item reactivated');
      invalidateItems();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not reactivate item.'))
  });

  const rows = listQuery.data?.data?.items || [];
  const meta = listQuery.data?.meta || {};
  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Item',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.name}</p>
            <p className="truncate font-mono text-xs text-ink-400">{row.code}</p>
          </div>
        )
      },
      {
        id: 'category_name',
        header: 'Category',
        cell: (row) => <span className="text-sm text-ink-200">{row.category_name || '-'}</span>
      },
      {
        id: 'item_kind',
        header: 'Kind',
        cell: (row) => <Badge tone={inferItemKind(row) === 'packaging' ? 'brand' : 'neutral'}>{inferItemKind(row)}</Badge>
      },
      {
        id: 'stock_mode',
        header: 'Stock mode',
        cell: (row) => <span className="text-sm text-ink-200">{STOCK_MODE_LABELS[inferStockMode(row)] || inferStockMode(row)}</span>
      },
      {
        id: 'configuration',
        header: 'Configuration',
        cell: (row) => <span className="text-xs text-ink-300">{itemConfigurationLabel(row)}</span>
      },
      {
        id: 'item_quantity_on_hand',
        header: 'On hand',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatStockQuantity(row.quantity_on_hand ?? row.item_quantity_on_hand ?? 0, row)}
          </span>
        )
      },
      {
        id: 'default_cost',
        header: 'Default cost',
        align: 'right',
        cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.default_cost, { maximumFractionDigits: 4 })}</span>
      },
      {
        id: 'reorder_level',
        header: 'Reorder',
        align: 'right',
        cell: (row) => <span className="font-mono text-xs text-ink-200">{formatNumber(row.reorder_level)}</span>
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>{row.status}</Badge>
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canUpdate && <Button variant="secondary" size="sm" onClick={() => setEditing(row)}>Edit</Button>}
            {canDelete && row.status === 'active' && (
              <Button
                variant="ghost"
                size="icon"
                leftIcon={Trash2}
                aria-label={`Deactivate ${row.name}`}
                onClick={() => setDeleteTarget(row)}
              />
            )}
            {canUpdate && row.status === 'inactive' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => reactivateMutation.mutate(row.id)}
                isLoading={reactivateMutation.isPending && reactivateMutation.variables === row.id}
              >
                Reactivate
              </Button>
            )}
            {canDelete && <Button variant="danger" size="sm" onClick={() => setHardDeleteTarget(row)}>Hard delete</Button>}
          </div>
        )
      }
    ],
    [canDelete, canUpdate, reactivateMutation]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>
          New item
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            leftIcon={Search}
            placeholder="Search by item name or code"
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
          className="w-full shrink-0 sm:w-auto"
        >
          {showFilters ? 'Hide filters' : 'Filters'}
        </Button>
      </div>

      <div className={`transition-all duration-300 ease-in-out ${showFilters ? 'mt-3 max-h-[1000px] overflow-visible rounded-xl border border-white/5 bg-white/[0.01] p-4 opacity-100 backdrop-blur-sm' : 'max-h-0 overflow-hidden border-transparent p-0 opacity-0'}`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
          <Select value={itemKind} onChange={(event) => { setItemKind(event.target.value); setPage(1); }}>
            {ITEM_KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={stockMode} onChange={(event) => { setStockMode(event.target.value); setPage(1); }}>
            {STOCK_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
          title: 'No items match the filters',
          description: canCreate ? 'Adjust the filters or add an item to the catalog.' : 'Adjust the filters to find existing items.'
        }}
        footer={meta?.totalPages ? <Pagination page={meta.page || page} totalPages={meta.totalPages || 1} total={meta.total} limit={meta.limit || limit} onChange={setPage} /> : null}
      />

      <ItemFormModal open={creating} onClose={() => setCreating(false)} categories={categories} units={units} warehouses={warehouses} />
      <ItemFormModal open={Boolean(editing)} onClose={() => setEditing(null)} item={editing || undefined} categories={categories} units={units} warehouses={warehouses} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate item"
        description={deleteTarget ? `Set ${deleteTarget.name} to inactive? This keeps its stock and audit history intact.` : ''}
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={Boolean(hardDeleteTarget)}
        onClose={() => setHardDeleteTarget(null)}
        onConfirm={() => hardDeleteTarget && hardDeleteMutation.mutate(hardDeleteTarget.id)}
        title="Hard delete item"
        description={hardDeleteTarget ? `Permanently delete ${hardDeleteTarget.name}? This cannot be undone and will fail when stock or history still references it.` : ''}
        confirmLabel="Hard delete"
        isLoading={hardDeleteMutation.isPending}
      />
    </div>
  );
}
