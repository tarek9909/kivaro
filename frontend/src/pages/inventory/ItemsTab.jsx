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
  PRODUCT_ITEM_TYPES,
  STATUSES,
  TRACKING_TYPES,
  INVENTORY_PERMISSIONS
} from './inventory.config.js';
import { useCategoriesOptions, useUnitsOptions } from './useInventoryOptions.js';

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...STATUSES];
const ITEM_TYPE_OPTIONS = [{ value: '', label: 'All product types' }, ...PRODUCT_ITEM_TYPES];

function emptyForm(item) {
  return {
    name: item?.name ?? '',
    code: item?.code ?? '',
    category_id: item?.category_id ?? '',
    base_unit_id: item?.base_unit_id ?? '',
    item_type: item?.item_type === 'packaging' ? 'finished_product' : item?.item_type ?? 'finished_product',
    tracking_type: item?.tracking_type ?? 'stocked',
    description: item?.description ?? '',
    default_cost: item?.default_cost ?? 0,
    default_selling_price: item?.default_selling_price ?? '',
    reorder_level: item?.reorder_level ?? 0,
    status: item?.status ?? 'active'
  };
}

function ItemFormModal({ open, onClose, item, categories, units }) {
  const isEdit = Boolean(item);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(item));
  const [errors, setErrors] = useState({});

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
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save item.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name?.trim()) next.name = 'Name is required.';
    if (!form.code?.trim()) next.code = 'Code is required.';
    if (!form.category_id) next.category_id = 'Category is required.';
    if (!form.base_unit_id) next.base_unit_id = 'Base unit is required.';
    if (!form.item_type) next.item_type = 'Item type is required.';
    if (form.default_cost !== '' && Number(form.default_cost) < 0) {
      next.default_cost = 'Default cost cannot be negative.';
    }
    if (form.default_selling_price !== '' && Number(form.default_selling_price) < 0) {
      next.default_selling_price = 'Selling price cannot be negative.';
    }
    if (form.reorder_level !== '' && Number(form.reorder_level) < 0) {
      next.reorder_level = 'Reorder level cannot be negative.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      category_id: Number(form.category_id),
      base_unit_id: Number(form.base_unit_id),
      name: form.name.trim(),
      code: form.code.trim(),
      item_type: form.item_type,
      tracking_type: form.tracking_type,
      description: form.description?.trim() || null,
      default_cost: Number(form.default_cost) || 0,
      default_selling_price:
        form.default_selling_price === '' ? null : Number(form.default_selling_price),
      reorder_level: Number(form.reorder_level) || 0,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit item' : 'New item'}
      description="Items represent the catalog entries. Variants live under each item."
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
            label="Base unit"
            value={form.base_unit_id || ''}
            onChange={(event) => handleChange('base_unit_id', event.target.value)}
            error={errors.base_unit_id}
            required
          >
            <option value="">Select unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.symbol})
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Select
            label="Item type"
            value={form.item_type}
            onChange={(event) => handleChange('item_type', event.target.value)}
            error={errors.item_type}
          >
            {PRODUCT_ITEM_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Tracking"
            value={form.tracking_type}
            onChange={(event) => handleChange('tracking_type', event.target.value)}
            error={errors.tracking_type}
          >
            {TRACKING_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
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

        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Default cost"
            type="number"
            min="0"
            step="0.0001"
            value={form.default_cost}
            onChange={(event) => handleChange('default_cost', event.target.value)}
            error={errors.default_cost}
          />
          <Input
            label="Default selling price"
            type="number"
            min="0"
            step="0.0001"
            value={form.default_selling_price ?? ''}
            onChange={(event) => handleChange('default_selling_price', event.target.value)}
            error={errors.default_selling_price}
            description="Optional."
          />
          <Input
            label="Reorder level"
            type="number"
            min="0"
            step="0.0001"
            value={form.reorder_level}
            onChange={(event) => handleChange('reorder_level', event.target.value)}
            error={errors.reorder_level}
          />
        </div>

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
  const [itemType, setItemType] = useState('');
  const [categoryId, setCategoryId] = useState('');
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
    if (itemType) {
      params.item_type = itemType;
    } else {
      params.exclude_item_type = 'packaging';
    }
    if (categoryId) params.category_id = categoryId;
    return params;
  }, [debouncedSearch, status, itemType, categoryId, page, limit]);

  const listQuery = useQuery({
    queryKey: ['inventory', 'items', queryParams],
    queryFn: () => api.inventory.items.list(queryParams)
  });

  const categoriesQuery = useCategoriesOptions(true);
  const unitsQuery = useUnitsOptions(true);

  const categories = categoriesQuery.data?.data?.categories || [];
  const units = unitsQuery.data?.data?.units || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.inventory.items.remove(id),
    onSuccess: () => {
      toast.success('Item deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'items'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not deactivate item.'))
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id) => api.inventory.items.hardDelete(id),
    onSuccess: () => {
      toast.success('Item hard-deleted');
      setHardDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'variants'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not hard-delete item.'))
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
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.category_name || '-'}</span>
        )
      },
      {
        id: 'item_type',
        header: 'Type',
        cell: (row) => <Badge tone="brand">{row.item_type}</Badge>
      },
      {
        id: 'tracking_type',
        header: 'Tracking',
        cell: (row) => <Badge tone="neutral">{row.tracking_type}</Badge>
      },
      {
        id: 'base_unit',
        header: 'Unit',
        cell: (row) => (
          <span className="font-mono text-xs text-ink-200">
            {row.base_unit_symbol || '-'}
          </span>
        )
      },
      {
        id: 'default_cost',
        header: 'Cost',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.default_cost, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'reorder_level',
        header: 'Reorder',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-xs text-ink-200">
            {formatNumber(row.reorder_level)}
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
                aria-label={`Deactivate ${row.name}`}
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
          New product item
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            leftIcon={Search}
            placeholder="Search by name or code"
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
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Select
            value={itemType}
            onChange={(event) => {
              setItemType(event.target.value);
              setPage(1);
            }}
          >
            {ITEM_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
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
          title: 'No product items match the filters',
          description: canCreate
            ? 'Adjust your filters or add a new item to the catalog.'
            : 'Adjust your filters to find existing items.'
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

      <ItemFormModal
        open={creating}
        onClose={() => setCreating(false)}
        categories={categories}
        units={units}
      />
      <ItemFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        item={editing || undefined}
        categories={categories}
        units={units}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate item"
        description={
          deleteTarget
            ? `Set ${deleteTarget.name} to inactive? Items with stock movement history cannot be hard-deleted; this only marks them inactive.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={Boolean(hardDeleteTarget)}
        onClose={() => setHardDeleteTarget(null)}
        onConfirm={() => hardDeleteTarget && hardDeleteMutation.mutate(hardDeleteTarget.id)}
        title="Hard delete item"
        description={
          hardDeleteTarget
            ? `Permanently delete ${hardDeleteTarget.name}? This cannot be undone and will fail if variants, stock, packaging, or history still reference it.`
            : ''
        }
        confirmLabel="Hard delete"
        isLoading={hardDeleteMutation.isPending}
      />
    </div>
  );
}
