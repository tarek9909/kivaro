import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, CheckCircle2, Layers3, PackagePlus, Pencil, Plus, Save, Search, Trash2 } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { formatNumber } from '@/lib/formatters.js';
import {
  Badge,
  Button,
  ConfirmDialog,
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
import {
  INVENTORY_PERMISSIONS,
  PACKAGING_LEVELS,
  PACKAGING_LEVEL_PARENT,
  PACKAGING_UNITS,
  STATUSES
} from './inventory.config.js';
import {
  useCategoriesOptions,
  useItemsOptions,
  useVariantsOptions,
  useWarehousesOptions
} from './useInventoryOptions.js';

const PAGE_SIZE = 20;
const VIEW_OPTIONS = [
  { value: 'materials', label: 'Materials' },
  { value: 'groups', label: 'Groups' },
  { value: 'assignments', label: 'Assignments' }
];
const ASSIGNMENT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'batched', label: 'Batched' },
  { value: 'consumed', label: 'Consumed' },
  { value: 'cancelled', label: 'Cancelled' }
];
const PACKAGING_UNIT_SPECS = {
  g: { name: 'Gram', unit_type: 'weight', conversion_to_base: 0.001 },
  kg: { name: 'Kilogram', unit_type: 'weight', conversion_to_base: 1 },
  ton: { name: 'Ton', unit_type: 'weight', conversion_to_base: 1000 },
  pc: { name: 'Piece', unit_type: 'quantity', conversion_to_base: 1 }
};
const WEIGHT_UNITS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' }
];
const CAPACITY_UNIT_TO_KG = {
  g: 0.001,
  kg: 1,
  ton: 1000,
  pc: 1
};

function optionLabelForVariant(variant) {
  return `${variant.item_name || 'Item'} - ${variant.variant_name} (${variant.sku})`;
}

function levelLabel(value) {
  return PACKAGING_LEVELS.find((entry) => entry.value === value)?.label || value;
}

function hasRequirementShortage(requirements = []) {
  return requirements.some((requirement) => Number(requirement.shortage_quantity || 0) > 0);
}

function assignmentHasShortage(assignment) {
  return hasRequirementShortage(assignment?.calculation_json?.requirements || []);
}

function variantAttributes(variant) {
  if (!variant?.attributes_json) return {};
  if (typeof variant.attributes_json === 'object') return variant.attributes_json;
  try {
    return JSON.parse(variant.attributes_json);
  } catch {
    return {};
  }
}

function packagingCapacityKg(variant) {
  const value = variantAttributes(variant).capacity_kg;
  return value === undefined || value === null || value === '' ? null : Number(value);
}

function capacityToKg(value, unitSymbol = 'kg') {
  if (value === undefined || value === null || value === '') return null;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return numericValue * (CAPACITY_UNIT_TO_KG[unitSymbol] || 1);
}

function capacityFromKg(value, unitSymbol = 'kg') {
  if (value === undefined || value === null || value === '') return '';
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '';
  return String(numericValue / (CAPACITY_UNIT_TO_KG[unitSymbol] || 1));
}

function emptyMaterialForm(material, item) {
  const capacity = packagingCapacityKg(material);
  return {
    name: item?.name ?? material?.item_name ?? '',
    code: item?.code ?? '',
    category_id: item?.category_id ? String(item.category_id) : '',
    unit_symbol: 'pc',
    capacity_kg: capacity === null ? '' : String(capacity),
    variant_name: material?.variant_name ?? '',
    sku: material?.sku ?? '',
    cost: material?.cost ?? 0,
    description: item?.description ?? ''
  };
}

async function ensurePackagingUnit(symbol) {
  const listResponse = await api.inventory.units.list({ page: 1, limit: 100, search: symbol });
  const existing = (listResponse?.data?.units || []).find((unit) => unit.symbol === symbol);
  if (existing) return existing;

  const spec = PACKAGING_UNIT_SPECS[symbol];
  const unitResponse = await api.inventory.units.create({
    name: spec.name,
    symbol,
    unit_type: spec.unit_type,
    base_unit_id: null,
    conversion_to_base: spec.conversion_to_base
  });
  return unitResponse?.data?.unit;
}

function MaterialFormModal({ open, onClose, categories, material }) {
  const isEdit = Boolean(material);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyMaterialForm(material));
  const [errors, setErrors] = useState({});
  const itemQuery = useQuery({
    queryKey: ['inventory', 'packaging', 'material-item', material?.item_id],
    queryFn: () => api.inventory.items.get(material.item_id),
    enabled: open && isEdit && Boolean(material?.item_id)
  });
  const item = itemQuery.data?.data?.item;

  useEffect(() => {
    if (!open) return;
    setForm(emptyMaterialForm(material, item));
    setErrors({});
  }, [open, material, item]);

  const mutation = useMutation({
    mutationFn: async (payload) => {
      const unit = await ensurePackagingUnit('pc');
      const itemPayload = {
        category_id: Number(payload.category_id),
        base_unit_id: Number(unit.id),
        name: payload.name.trim(),
        code: payload.code.trim(),
        item_type: 'packaging',
        tracking_type: 'stocked',
        description: payload.description?.trim() || null,
        default_cost: Number(payload.cost) || 0,
        default_selling_price: null,
        reorder_level: 0,
        status: item?.status || 'active'
      };
      const variantPayload = {
        variant_name: payload.variant_name.trim() || payload.name.trim(),
        sku: payload.sku.trim(),
        cost: Number(payload.cost) || 0,
        selling_price: null,
        status: material?.status || 'active',
        attributes_json: {
          ...variantAttributes(material),
          packaging_unit: 'pc',
          capacity_kg: payload.capacity_kg === '' ? null : Number(payload.capacity_kg)
        }
      };

      if (isEdit) {
        await api.inventory.items.update(material.item_id, itemPayload);
        return api.inventory.variants.update(material.id, variantPayload);
      }

      const itemResponse = await api.inventory.items.create({
        ...itemPayload,
        status: 'active'
      });

      const createdItem = itemResponse?.data?.item;
      return api.inventory.variants.create({
        item_id: Number(createdItem.id),
        ...variantPayload,
        status: 'active'
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Packaging material updated' : 'Packaging material created');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'units'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'units'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, error.message || 'Could not save packaging material.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    if (!form.code.trim()) next.code = 'Code is required.';
    if (!form.category_id) next.category_id = 'Category is required.';
    if (!form.sku.trim()) next.sku = 'SKU is required.';
    if (form.capacity_kg !== '' && Number(form.capacity_kg) < 0) next.capacity_kg = 'Capacity cannot be negative.';
    if (Number(form.cost) < 0) next.cost = 'Cost cannot be negative.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate(form);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit packaging material' : 'New packaging material'}
      description={isEdit ? 'Update the stocked packaging item and its material variant.' : 'Creates a stocked packaging item and its first variant.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="packaging-material-form" isLoading={mutation.isPending || (isEdit && itemQuery.isPending)}>
            {isEdit ? 'Save changes' : 'Create material'}
          </Button>
        </>
      }
    >
      <form id="packaging-material-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(event) => handleChange('name', event.target.value)} error={errors.name} required />
          <Input label="Code" value={form.code} onChange={(event) => handleChange('code', event.target.value)} error={errors.code} required />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Select label="Category" value={form.category_id} onChange={(event) => handleChange('category_id', event.target.value)} error={errors.category_id} required>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </Select>
          <Input label="Stock unit" value="pc" disabled description="Packaging material stock is counted in pieces." />
          <Input label="Max kg per pc" type="number" min="0" step="0.0001" value={form.capacity_kg} onChange={(event) => handleChange('capacity_kg', event.target.value)} error={errors.capacity_kg} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Variant name" value={form.variant_name} onChange={(event) => handleChange('variant_name', event.target.value)} error={errors.variant_name} description="Defaults to material name." />
          <Input label="SKU" value={form.sku} onChange={(event) => handleChange('sku', event.target.value)} error={errors.sku} required />
        </div>
        <Input label="Cost per pc" type="number" min="0" step="0.0001" value={form.cost} onChange={(event) => handleChange('cost', event.target.value)} error={errors.cost} />
        <Textarea label="Description" value={form.description} onChange={(event) => handleChange('description', event.target.value)} rows={3} />
      </form>
    </Modal>
  );
}

function emptyGroupForm(group) {
  return {
    name: group?.name ?? '',
    code: group?.code ?? '',
    charcoal_variant_id: group?.charcoal_variant_id ? String(group.charcoal_variant_id) : '',
    default_warehouse_id: group?.default_warehouse_id ? String(group.default_warehouse_id) : '',
    description: group?.description ?? '',
    status: group?.status ?? 'active'
  };
}

function GroupFormModal({ open, onClose, group, charcoalVariants, warehouses }) {
  const isEdit = Boolean(group);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyGroupForm(group));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyGroupForm(group));
    setErrors({});
  }, [open, group]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? api.inventory.packagingGroups.update(group.id, payload) : api.inventory.packagingGroups.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Packaging group updated' : 'Packaging group created');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging', 'groups'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save packaging group.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    if (!form.code.trim()) next.code = 'Code is required.';
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate({
      name: form.name.trim(),
      code: form.code.trim(),
      charcoal_variant_id: form.charcoal_variant_id ? Number(form.charcoal_variant_id) : null,
      default_warehouse_id: form.default_warehouse_id ? Number(form.default_warehouse_id) : null,
      description: form.description?.trim() || null,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit packaging group' : 'New packaging group'}
      description="A group is the full packaging hierarchy used to pack charcoal."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="packaging-group-form" isLoading={mutation.isPending}>{isEdit ? 'Save changes' : 'Create group'}</Button>
        </>
      }
    >
      <form id="packaging-group-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(event) => handleChange('name', event.target.value)} error={errors.name} required />
          <Input label="Code" value={form.code} onChange={(event) => handleChange('code', event.target.value)} error={errors.code} required />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Default charcoal" value={form.charcoal_variant_id} onChange={(event) => handleChange('charcoal_variant_id', event.target.value)}>
            <option value="">Any charcoal variant</option>
            {charcoalVariants.map((variant) => (
              <option key={variant.id} value={variant.id}>{optionLabelForVariant(variant)}</option>
            ))}
          </Select>
          <Select label="Default warehouse" value={form.default_warehouse_id} onChange={(event) => handleChange('default_warehouse_id', event.target.value)}>
            <option value="">No default warehouse</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </Select>
        </div>
        <Select label="Status" value={form.status} onChange={(event) => handleChange('status', event.target.value)}>
          {STATUSES.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </Select>
        <Textarea label="Description" value={form.description} onChange={(event) => handleChange('description', event.target.value)} rows={3} />
      </form>
    </Modal>
  );
}

function emptyComponentForm(component) {
  const unitSymbol = component?.unit_symbol ?? 'kg';
  return {
    level_key: component?.level_key ?? 'category',
    parent_component_id: component?.parent_component_id ? String(component.parent_component_id) : '',
    item_variant_id: component?.item_variant_id ? String(component.item_variant_id) : '',
    unit_symbol: unitSymbol,
    quantity_per_parent:
      component?.quantity_per_parent !== null && component?.quantity_per_parent !== undefined
        ? String(component.quantity_per_parent)
        : '',
    capacity_kg:
      component?.capacity_kg !== null && component?.capacity_kg !== undefined
        ? capacityFromKg(component.capacity_kg, unitSymbol)
        : '',
    sort_order: component?.sort_order ?? 0,
    notes: component?.notes ?? ''
  };
}

function ComponentFormModal({ open, onClose, group, component, packagingVariants }) {
  const isEdit = Boolean(component);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyComponentForm(component));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyComponentForm(component));
    setErrors({});
  }, [open, component]);

  const parentLevel = PACKAGING_LEVEL_PARENT[form.level_key];
  const parentOptions = (group?.components || []).filter((component) => component.level_key === parentLevel);
  const selectedParent = parentOptions.find((parent) => String(parent.id) === String(form.parent_component_id));
  const selectedVariant = packagingVariants.find((variant) => String(variant.id) === String(form.item_variant_id));
  const parentCapacityKg = selectedParent?.capacity_kg ? Number(selectedParent.capacity_kg) : null;
  const childCapacityKg = form.capacity_kg !== '' ? capacityToKg(form.capacity_kg, form.unit_symbol) : packagingCapacityKg(selectedVariant);
  const maxQuantityInsideParent = parentCapacityKg && childCapacityKg ? Math.floor(parentCapacityKg / childCapacityKg) : null;

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.inventory.packagingComponents.update(component.id, payload)
        : api.inventory.packagingGroups.addComponent(group.id, payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Packaging component updated' : 'Packaging component added');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging', 'group', group.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging', 'groups'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not add packaging component.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'level_key') next.parent_component_id = '';
      if (field === 'item_variant_id') {
        const variant = packagingVariants.find((entry) => String(entry.id) === String(value));
        const defaultCapacity = packagingCapacityKg(variant);
        if (defaultCapacity !== null && (prev.capacity_kg === '' || prev.item_variant_id !== value)) {
          next.capacity_kg = capacityFromKg(defaultCapacity, next.unit_symbol);
        }
      }
      if (field === 'unit_symbol') {
        const currentCapacityKg = capacityToKg(prev.capacity_kg, prev.unit_symbol);
        if (currentCapacityKg !== null) {
          next.capacity_kg = capacityFromKg(currentCapacityKg, value);
        }
      }
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!form.item_variant_id) next.item_variant_id = 'Packaging variant is required.';
    if (form.level_key !== 'category' && !form.parent_component_id) {
      next.parent_component_id = 'Parent is required for this level.';
    }
    if (form.quantity_per_parent && Number(form.quantity_per_parent) <= 0) {
      next.quantity_per_parent = 'Quantity must be positive.';
    }
    if (form.capacity_kg && Number(form.capacity_kg) < 0) {
      next.capacity_kg = 'Capacity cannot be negative.';
    }
    if (form.level_key !== 'category' && maxQuantityInsideParent !== null && maxQuantityInsideParent < 1) {
      next.capacity_kg = 'This material cannot fit inside the selected parent capacity.';
    }
    if (form.level_key !== 'category' && form.quantity_per_parent && maxQuantityInsideParent !== null && Number(form.quantity_per_parent) > maxQuantityInsideParent) {
      next.quantity_per_parent = `Maximum is ${maxQuantityInsideParent} based on parent and child capacities.`;
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate({
      level_key: form.level_key,
      parent_component_id: form.parent_component_id ? Number(form.parent_component_id) : null,
      item_variant_id: Number(form.item_variant_id),
      unit_symbol: form.unit_symbol,
      quantity_per_parent: form.quantity_per_parent ? Number(form.quantity_per_parent) : null,
      capacity_kg: form.capacity_kg === '' ? null : Number(form.capacity_kg),
      sort_order: Number(form.sort_order) || 0,
      notes: form.notes?.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit packaging component' : 'Add packaging component'}
      description="Build the hierarchy one direct level at a time."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="packaging-component-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Add component'}
          </Button>
        </>
      }
    >
      <form id="packaging-component-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <Select label="Level" value={form.level_key} onChange={(event) => handleChange('level_key', event.target.value)}>
            {PACKAGING_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </Select>
          {form.level_key === 'category' ? (
            <Input label="Parent" value="None" disabled />
          ) : (
            <Select label="Parent" value={form.parent_component_id} onChange={(event) => handleChange('parent_component_id', event.target.value)} error={errors.parent_component_id} required>
              <option value="">Select {levelLabel(parentLevel)}</option>
              {parentOptions.map((component) => (
                <option key={component.id} value={component.id}>{component.item_name} - {component.variant_name}</option>
              ))}
            </Select>
          )}
        </div>
        <Select label="Packaging variant" value={form.item_variant_id} onChange={(event) => handleChange('item_variant_id', event.target.value)} error={errors.item_variant_id} required>
          <option value="">Select packaging variant</option>
          {packagingVariants.map((variant) => (
            <option key={variant.id} value={variant.id}>{optionLabelForVariant(variant)}</option>
          ))}
        </Select>
        <div className="grid gap-4 md:grid-cols-4">
          <Select label="Capacity unit" value={form.unit_symbol} onChange={(event) => handleChange('unit_symbol', event.target.value)}>
            {PACKAGING_UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>{unit.label}</option>
            ))}
          </Select>
          <Input
            label="Qty inside parent"
            type="number"
            min="0"
            step="0.0001"
            value={form.quantity_per_parent}
            onChange={(event) => handleChange('quantity_per_parent', event.target.value)}
            error={errors.quantity_per_parent}
            description={
              maxQuantityInsideParent
                ? `Blank auto-calculates to ${formatNumber(maxQuantityInsideParent)} from capacities.`
                : 'Blank auto-calculates from parent and child capacity.'
            }
          />
          <Input label={`Max ${form.unit_symbol} per pc`} type="number" min="0" step="0.0001" value={form.capacity_kg} onChange={(event) => handleChange('capacity_kg', event.target.value)} error={errors.capacity_kg} description="Maximum charcoal weight one piece can hold." />
          <Input label="Sort" type="number" min="0" step="1" value={form.sort_order} onChange={(event) => handleChange('sort_order', event.target.value)} />
        </div>
        <Textarea label="Notes" value={form.notes} onChange={(event) => handleChange('notes', event.target.value)} rows={2} />
      </form>
    </Modal>
  );
}

function MaterialsView({ canCreate, canUpdate, canDelete, categories, packagingVariants, variantsQuery }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState(null);

  const hardDeleteMutation = useMutation({
    mutationFn: (id) => api.inventory.variants.hardDelete(id),
    onSuccess: () => {
      toast.success('Packaging material hard-deleted');
      setHardDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not hard-delete packaging material.'))
  });

  const columns = useMemo(
    () => [
      {
        id: 'variant',
        header: 'Packaging material',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.variant_name}</p>
            <p className="truncate font-mono text-xs text-ink-400">{row.sku}</p>
          </div>
        )
      },
      { id: 'item_name', header: 'Item', cell: (row) => <span className="text-sm text-ink-200">{row.item_name}</span> },
      { id: 'unit', header: 'Unit', cell: () => <span className="font-mono text-sm text-ink-100">pc</span> },
      {
        id: 'capacity',
        header: 'Max kg / pc',
        align: 'right',
        cell: (row) => {
          const capacity = packagingCapacityKg(row);
          return <span className="font-mono text-sm text-ink-100">{capacity === null ? '-' : formatNumber(capacity)}</span>;
        }
      },
      { id: 'status', header: 'Status', cell: (row) => <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>{row.status}</Badge> },
      {
        id: 'cost',
        header: 'Cost / pc',
        align: 'right',
        cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.cost, { maximumFractionDigits: 4 })}</span>
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <div className="flex justify-end gap-2">
            {canUpdate && (
              <Button
                size="icon"
                variant="ghost"
                leftIcon={Pencil}
                aria-label={`Edit ${row.variant_name}`}
                onClick={() => setEditing(row)}
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
      <div className="flex justify-end">
        <Button leftIcon={PackagePlus} onClick={() => setCreating(true)} disabled={!canCreate}>New material</Button>
      </div>
      <DataTable
        columns={columns}
        rows={packagingVariants}
        rowKey={(row) => row.id}
        isLoading={variantsQuery.isPending}
        isError={variantsQuery.isError}
        error={variantsQuery.error}
        onRetry={() => variantsQuery.refetch()}
        empty={{ title: 'No packaging materials found', description: 'Create cartons, bags, stickers, and other packaging variants here.' }}
      />
      <MaterialFormModal open={creating} onClose={() => setCreating(false)} categories={categories} />
      <MaterialFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        categories={categories}
        material={editing || undefined}
      />
      <ConfirmDialog
        open={Boolean(hardDeleteTarget)}
        onClose={() => setHardDeleteTarget(null)}
        onConfirm={() => hardDeleteTarget && hardDeleteMutation.mutate(hardDeleteTarget.id)}
        title="Hard delete packaging material"
        description={
          hardDeleteTarget
            ? `Permanently delete ${hardDeleteTarget.variant_name} (${hardDeleteTarget.sku})? This cannot be undone and will fail if stock, groups, or history reference it.`
            : ''
        }
        confirmLabel="Hard delete"
        isLoading={hardDeleteMutation.isPending}
      />
    </div>
  );
}

function GroupsView({ canCreate, canUpdate, canDelete, groupsQuery, groups, meta, page, setPage, charcoalVariants, warehouses, packagingVariants }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [addingComponent, setAddingComponent] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState(null);
  const [deleteComponentTarget, setDeleteComponentTarget] = useState(null);

  const selectedGroupQuery = useQuery({
    queryKey: ['inventory', 'packaging', 'group', selectedGroupId],
    queryFn: () => api.inventory.packagingGroups.get(selectedGroupId),
    enabled: Boolean(selectedGroupId)
  });

  const selectedGroup = selectedGroupQuery.data?.data?.packaging_group;

  const deleteMutation = useMutation({
    mutationFn: (id) => api.inventory.packagingGroups.remove(id),
    onSuccess: () => {
      toast.success('Packaging group deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging', 'groups'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not deactivate packaging group.'))
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id) => api.inventory.packagingGroups.hardDelete(id),
    onSuccess: () => {
      toast.success('Packaging group hard-deleted');
      if (hardDeleteTarget && Number(selectedGroupId) === Number(hardDeleteTarget.id)) {
        setSelectedGroupId(null);
      }
      setHardDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging', 'groups'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging', 'assignments'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not hard-delete packaging group.'))
  });

  const deleteComponentMutation = useMutation({
    mutationFn: (id) => api.inventory.packagingComponents.remove(id),
    onSuccess: () => {
      toast.success('Packaging component deleted');
      setDeleteComponentTarget(null);
      if (selectedGroupId) {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging', 'group', selectedGroupId] });
      }
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging', 'groups'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete packaging component.'))
  });

  const groupColumns = useMemo(
    () => [
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
      { id: 'charcoal', header: 'Charcoal', cell: (row) => <span className="text-sm text-ink-200">{row.charcoal_variant_name || 'Any'}</span> },
      { id: 'warehouse', header: 'Warehouse', cell: (row) => <span className="text-sm text-ink-200">{row.default_warehouse_name || '-'}</span> },
      { id: 'status', header: 'Status', cell: (row) => <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>{row.status}</Badge> },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setSelectedGroupId(row.id)}>Open</Button>
            {canUpdate && <Button size="sm" variant="ghost" onClick={() => setEditing(row)}>Edit</Button>}
            {canDelete && row.status === 'active' && (
              <Button size="icon" variant="ghost" leftIcon={Trash2} aria-label={`Deactivate ${row.name}`} onClick={() => setDeleteTarget(row)} />
            )}
            {canDelete && (
              <Button size="sm" variant="danger" onClick={() => setHardDeleteTarget(row)}>
                Hard delete
              </Button>
            )}
          </div>
        )
      }
    ],
    [canDelete, canUpdate]
  );

  const componentColumns = useMemo(
    () => [
      { id: 'level', header: 'Level', cell: (row) => <Badge tone="brand">{levelLabel(row.level_key)}</Badge> },
      {
        id: 'component',
        header: 'Component',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-50">{row.item_name} - {row.variant_name}</p>
            <p className="truncate font-mono text-xs text-ink-400">{row.sku}</p>
          </div>
        )
      },
      { id: 'parent', header: 'Parent', cell: (row) => <span className="text-sm text-ink-200">{row.parent_variant_name || '-'}</span> },
      { id: 'unit', header: 'Unit', cell: (row) => <span className="font-mono text-sm text-ink-100">{row.unit_symbol || 'pc'}</span> },
      { id: 'qty', header: 'Qty inside parent', align: 'right', cell: (row) => <span className="font-mono text-sm text-ink-100">{row.quantity_per_parent ? formatNumber(row.quantity_per_parent) : '-'}</span> },
      { id: 'capacity', header: 'Max kg / pc', align: 'right', cell: (row) => <span className="font-mono text-sm text-ink-100">{row.capacity_kg ? formatNumber(row.capacity_kg) : '-'}</span> },
      { id: 'cost', header: 'Cost', align: 'right', cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.cost, { maximumFractionDigits: 4 })}</span> },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <div className="flex justify-end gap-2">
            {canUpdate && (
              <Button
                size="icon"
                variant="ghost"
                leftIcon={Pencil}
                aria-label={`Edit ${row.variant_name}`}
                onClick={() => setEditingComponent(row)}
              />
            )}
            {canDelete && (
              <Button
                size="icon"
                variant="ghost"
                leftIcon={Trash2}
                aria-label={`Delete ${row.variant_name}`}
                onClick={() => setDeleteComponentTarget(row)}
              />
            )}
          </div>
        )
      }
    ],
    [canDelete, canUpdate]
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>New group</Button>
        </div>
        <DataTable
          columns={groupColumns}
          rows={groups}
          rowKey={(row) => row.id}
          isLoading={groupsQuery.isPending}
          isError={groupsQuery.isError}
          error={groupsQuery.error}
          onRetry={() => groupsQuery.refetch()}
          empty={{ title: 'No packaging groups found' }}
          footer={
            meta?.totalPages ? (
              <Pagination page={meta.page || page} totalPages={meta.totalPages || 1} total={meta.total} limit={meta.limit || PAGE_SIZE} onChange={setPage} />
            ) : null
          }
        />
      </div>
      <GlassPanel>
        <GlassPanelHeader
          title={selectedGroup ? selectedGroup.name : 'Group hierarchy'}
          subtitle={selectedGroup ? 'Category -> item -> sub item -> sub sub item' : 'Open a group to manage its packaging levels.'}
          actions={selectedGroup && canCreate ? <Button size="sm" leftIcon={Layers3} onClick={() => setAddingComponent(true)}>Add component</Button> : null}
        />
        <GlassPanelBody>
          {!selectedGroup ? (
            <EmptyState title="No group selected" description="Choose Open on a group to view and build the hierarchy." />
          ) : (
            <DataTable
              columns={componentColumns}
              rows={selectedGroup.components || []}
              rowKey={(row) => row.id}
              isLoading={selectedGroupQuery.isPending}
              isError={selectedGroupQuery.isError}
              error={selectedGroupQuery.error}
              onRetry={() => selectedGroupQuery.refetch()}
              empty={{ title: 'No components in this group', description: 'Add a category first, then connect each lower level to the level above it.' }}
            />
          )}
        </GlassPanelBody>
      </GlassPanel>
      <GroupFormModal open={creating} onClose={() => setCreating(false)} charcoalVariants={charcoalVariants} warehouses={warehouses} />
      <GroupFormModal open={Boolean(editing)} onClose={() => setEditing(null)} group={editing || undefined} charcoalVariants={charcoalVariants} warehouses={warehouses} />
      <ComponentFormModal open={addingComponent} onClose={() => setAddingComponent(false)} group={selectedGroup} packagingVariants={packagingVariants} />
      <ComponentFormModal
        open={Boolean(editingComponent)}
        onClose={() => setEditingComponent(null)}
        group={selectedGroup}
        component={editingComponent || undefined}
        packagingVariants={packagingVariants}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate packaging group"
        description={deleteTarget ? `Set ${deleteTarget.name} to inactive? Existing assignment history remains available.` : ''}
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={Boolean(hardDeleteTarget)}
        onClose={() => setHardDeleteTarget(null)}
        onConfirm={() => hardDeleteTarget && hardDeleteMutation.mutate(hardDeleteTarget.id)}
        title="Hard delete packaging group"
        description={
          hardDeleteTarget
            ? `Permanently delete ${hardDeleteTarget.name}? Components will be removed with it, and the delete will fail if assignments reference the group.`
            : ''
        }
        confirmLabel="Hard delete"
        isLoading={hardDeleteMutation.isPending}
      />
      <ConfirmDialog
        open={Boolean(deleteComponentTarget)}
        onClose={() => setDeleteComponentTarget(null)}
        onConfirm={() => deleteComponentTarget && deleteComponentMutation.mutate(deleteComponentTarget.id)}
        title="Delete packaging component"
        description={
          deleteComponentTarget
            ? `Remove ${deleteComponentTarget.variant_name} from this group? Components with children must have those children removed first.`
            : ''
        }
        confirmLabel="Delete"
        isLoading={deleteComponentMutation.isPending}
      />
    </div>
  );
}

function AssignmentsView({
  canCreate,
  canAdjust,
  canDelete,
  assignmentsQuery,
  assignments,
  assignmentMeta,
  assignmentPage,
  setAssignmentPage,
  assignmentFilters,
  setAssignmentFilters,
  groups,
  warehouses,
  charcoalVariants
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    packaging_group_id: '',
    warehouse_id: '',
    charcoal_variant_id: '',
    charcoal_quantity_kg: '',
    charcoal_quantity_unit: 'kg',
    notes: ''
  });
  const [calculation, setCalculation] = useState(null);
  const [errors, setErrors] = useState({});
  const [consumeTarget, setConsumeTarget] = useState(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState(null);

  const calculateMutation = useMutation({
    mutationFn: (payload) => api.inventory.packagingGroups.calculate(payload.packaging_group_id, {
      charcoal_quantity_kg: payload.charcoal_quantity_kg,
      charcoal_quantity_unit: payload.charcoal_quantity_unit,
      charcoal_variant_id: payload.charcoal_variant_id,
      warehouse_id: payload.warehouse_id || null
    }),
    onSuccess: (response) => {
      setCalculation(response?.data?.calculation || null);
      toast.success('Packaging requirements calculated');
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not calculate packaging requirements.'));
    }
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => api.inventory.packagingAssignments.create(payload),
    onSuccess: (response) => {
      toast.success('Packaging batch saved');
      setCalculation(response?.data?.packaging_assignment?.calculation_json || calculation);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging', 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'variants'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] });
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save packaging assignment.'));
    }
  });

  const consumeMutation = useMutation({
    mutationFn: (assignment) =>
      api.inventory.packagingAssignmentActions.consume(assignment.id, {
        notes: assignment.notes || 'Packaging assignment consumed'
      }),
    onSuccess: () => {
      toast.success('Packaging stock consumed');
      setConsumeTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging', 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not consume packaging stock.'))
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id) => api.inventory.packagingAssignments.hardDelete(id),
    onSuccess: () => {
      toast.success('Packaging assignment hard-deleted');
      setHardDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'packaging', 'assignments'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not hard-delete packaging assignment.'))
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setCalculation(null);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleGroupChange(value) {
    const selectedGroup = groups.find((group) => String(group.id) === String(value));
    setForm((prev) => ({
      ...prev,
      packaging_group_id: value,
      warehouse_id: selectedGroup?.default_warehouse_id ? String(selectedGroup.default_warehouse_id) : prev.warehouse_id,
      charcoal_variant_id: selectedGroup?.charcoal_variant_id ? String(selectedGroup.charcoal_variant_id) : prev.charcoal_variant_id
    }));
    setCalculation(null);
    setErrors((prev) => ({ ...prev, packaging_group_id: undefined, warehouse_id: undefined, charcoal_variant_id: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.packaging_group_id) next.packaging_group_id = 'Packaging group is required.';
    if (!form.warehouse_id) next.warehouse_id = 'Warehouse is required.';
    if (!form.charcoal_variant_id) next.charcoal_variant_id = 'Charcoal variant is required.';
    if (!form.charcoal_quantity_kg || Number(form.charcoal_quantity_kg) <= 0) {
      next.charcoal_quantity_kg = 'Enter a positive quantity.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function payload() {
    return {
      packaging_group_id: Number(form.packaging_group_id),
      warehouse_id: Number(form.warehouse_id),
      charcoal_variant_id: Number(form.charcoal_variant_id),
      charcoal_quantity_kg: Number(form.charcoal_quantity_kg),
      charcoal_quantity_unit: form.charcoal_quantity_unit,
      notes: form.notes?.trim() || null
    };
  }

  const assignmentColumns = useMemo(
    () => [
      { id: 'group', header: 'Group', cell: (row) => <span className="text-sm text-ink-100">{row.packaging_group_name}</span> },
      { id: 'warehouse', header: 'Warehouse', cell: (row) => <span className="text-sm text-ink-200">{row.warehouse_name}</span> },
      { id: 'charcoal', header: 'Charcoal', cell: (row) => <span className="text-sm text-ink-200">{row.charcoal_variant_name}</span> },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => (
          <Badge tone={['batched', 'consumed'].includes(row.status) ? 'success' : row.status === 'cancelled' ? 'danger' : 'neutral'}>
            {row.status || 'calculated'}
          </Badge>
        )
      },
      { id: 'qty', header: 'Kg', align: 'right', cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.charcoal_quantity_kg)}</span> },
      { id: 'containers', header: 'Primary containers', align: 'right', cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.primary_container_count)}</span> },
      { id: 'available_batch', header: 'Available', align: 'right', cell: (row) => <span className="font-mono text-sm text-ink-100">{['batched', 'consumed'].includes(row.status) ? formatNumber(row.available_quantity) : '-'}</span> },
      {
        id: 'shortage',
        header: 'Shortage',
        cell: (row) => assignmentHasShortage(row) ? <Badge tone="danger">Short</Badge> : <Badge tone="success">OK</Badge>
      },
      { id: 'batch', header: 'Batch', cell: (row) => <span className="font-mono text-xs text-ink-300">{['batched', 'consumed'].includes(row.status) ? `Batch #${row.id}` : '-'}</span> },
      { id: 'cost', header: 'Cost', align: 'right', cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.calculation_json?.total_cost ?? row.total_packaging_cost, { maximumFractionDigits: 4 })}</span> },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <div className="flex justify-end gap-2">
            {row.status === 'calculated' && canAdjust ? (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={CheckCircle2}
                onClick={() => setConsumeTarget(row)}
                disabled={assignmentHasShortage(row)}
              >
                Consume inputs
              </Button>
            ) : null}
            {canDelete && (
              <Button size="sm" variant="danger" onClick={() => setHardDeleteTarget(row)}>
                Hard delete
              </Button>
            )}
          </div>
        )
      }
    ],
    [canAdjust, canDelete]
  );

  const requirementColumns = useMemo(
    () => [
      { id: 'level', header: 'Level', cell: (row) => <Badge tone="brand">{levelLabel(row.level_key)}</Badge> },
      { id: 'material', header: 'Material', cell: (row) => <span className="text-sm text-ink-100">{row.item_name} - {row.variant_name}</span> },
      { id: 'effective_capacity', header: 'Effective kg / pc', align: 'right', cell: (row) => <span className="font-mono text-sm text-ink-100">{Number(row.effective_capacity_kg || 0) > 0 ? formatNumber(row.effective_capacity_kg) : '-'}</span> },
      { id: 'required', header: 'Required', align: 'right', cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.required_quantity)}</span> },
      { id: 'available', header: 'Available', align: 'right', cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.available_quantity)}</span> },
      {
        id: 'shortage',
        header: 'Shortage',
        align: 'right',
        cell: (row) => Number(row.shortage_quantity) > 0 ? <Badge tone="danger">{formatNumber(row.shortage_quantity)}</Badge> : <Badge tone="success">OK</Badge>
      },
      { id: 'cost', header: 'Cost', align: 'right', cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.total_cost, { maximumFractionDigits: 4 })}</span> }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <GlassPanel>
        <GlassPanelHeader title="Assign charcoal to packaging" subtitle="Calculate packaging requirements before saving the assignment." />
        <GlassPanelBody>
          <div className="grid gap-4 lg:grid-cols-5">
            <Select label="Packaging group" value={form.packaging_group_id} onChange={(event) => handleGroupChange(event.target.value)} error={errors.packaging_group_id}>
              <option value="">Select group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </Select>
            <Select label="Warehouse" value={form.warehouse_id} onChange={(event) => handleChange('warehouse_id', event.target.value)} error={errors.warehouse_id}>
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </Select>
            <Select label="Charcoal variant" value={form.charcoal_variant_id} onChange={(event) => handleChange('charcoal_variant_id', event.target.value)} error={errors.charcoal_variant_id}>
              <option value="">Select charcoal</option>
              {charcoalVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>{optionLabelForVariant(variant)}</option>
              ))}
            </Select>
            <div className="grid gap-2 sm:grid-cols-[1fr_96px]">
              <Input
                label={`Charcoal (${form.charcoal_quantity_unit})`}
                type="number"
                min="0"
                step="0.0001"
                value={form.charcoal_quantity_kg}
                onChange={(event) => handleChange('charcoal_quantity_kg', event.target.value)}
                error={errors.charcoal_quantity_kg}
                description="Converted to kg for calculation and stock."
              />
              <Select label="Unit" value={form.charcoal_quantity_unit} onChange={(event) => handleChange('charcoal_quantity_unit', event.target.value)}>
                {WEIGHT_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                className="flex-1"
                variant="secondary"
                leftIcon={Calculator}
                isLoading={calculateMutation.isPending}
                onClick={() => validate() && calculateMutation.mutate(payload())}
              >
                Calculate
              </Button>
              <Button
                size="icon"
                leftIcon={Save}
                aria-label="Save assignment"
                disabled={!canCreate || !calculation}
                isLoading={saveMutation.isPending}
                onClick={() => validate() && saveMutation.mutate(payload())}
              />
            </div>
          </div>
          <Textarea className="mt-4" label="Notes" value={form.notes} onChange={(event) => handleChange('notes', event.target.value)} rows={2} />
        </GlassPanelBody>
      </GlassPanel>

      {calculation && (
        <GlassPanel>
          <GlassPanelHeader
            title={`${formatNumber(calculation.primary_container_count)} containers`}
            subtitle={`${formatNumber(calculation.charcoal_quantity_kg)} kg assigned / total cost ${formatNumber(calculation.total_cost ?? calculation.total_packaging_cost, { maximumFractionDigits: 4 })}`}
            actions={hasRequirementShortage(calculation.requirements || []) ? <Badge tone="danger">Shortage</Badge> : <Badge tone="success">Ready</Badge>}
          />
          <GlassPanelBody className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">Item</p>
                <p className="mt-1 text-sm font-medium text-ink-100">{calculation.primary_container_item_name || '-'}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">Packaging</p>
                <p className="mt-1 text-sm font-medium text-ink-100">{calculation.primary_container_variant_name || calculation.primary_container_name || '-'}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">Kg / container</p>
                <p className="mt-1 font-mono text-sm text-ink-100">{formatNumber(calculation.primary_container_capacity_kg)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-wide text-ink-400">Cost / 1 group</p>
                <p className="mt-1 font-mono text-sm text-ink-100">{formatNumber(calculation.cost_per_primary_container || calculation.cost_per_packaging_group, { maximumFractionDigits: 4 })}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-ink-400">Charcoal cost</p>
                <p className="mt-1 font-mono text-sm text-ink-100">
                  {formatNumber(calculation.total_charcoal_cost || 0, { maximumFractionDigits: 4 })} total / {formatNumber(calculation.charcoal_unit_cost || 0, { maximumFractionDigits: 4 })} per kg
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-ink-400">Packaging cost</p>
                <p className="mt-1 font-mono text-sm text-ink-100">
                  {formatNumber(calculation.total_packaging_cost || 0, { maximumFractionDigits: 4 })} total / {formatNumber(calculation.packaging_cost_per_kg || 0, { maximumFractionDigits: 4 })} per kg
                </p>
              </div>
            </div>
            <DataTable columns={requirementColumns} rows={calculation.requirements || []} rowKey={(row) => row.component_id} empty={{ title: 'No requirements calculated' }} />
          </GlassPanelBody>
        </GlassPanel>
      )}

      <GlassPanel>
        <GlassPanelHeader title="Saved packaging assignments" subtitle="Filter saved calculations before consuming packaging stock." />
        <GlassPanelBody className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              value={assignmentFilters.status}
              onChange={(event) => {
                setAssignmentFilters((prev) => ({ ...prev, status: event.target.value }));
                setAssignmentPage(1);
              }}
            >
              {ASSIGNMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
            <Select
              value={assignmentFilters.packaging_group_id}
              onChange={(event) => {
                setAssignmentFilters((prev) => ({ ...prev, packaging_group_id: event.target.value }));
                setAssignmentPage(1);
              }}
            >
              <option value="">All packaging groups</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </Select>
            <Select
              value={assignmentFilters.warehouse_id}
              onChange={(event) => {
                setAssignmentFilters((prev) => ({ ...prev, warehouse_id: event.target.value }));
                setAssignmentPage(1);
              }}
            >
              <option value="">All warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </Select>
          </div>
          <DataTable
            columns={assignmentColumns}
            rows={assignments}
            rowKey={(row) => row.id}
            isLoading={assignmentsQuery.isPending}
            isError={assignmentsQuery.isError}
            error={assignmentsQuery.error}
            onRetry={() => assignmentsQuery.refetch()}
            empty={{ title: 'No packaging assignments match the filters' }}
            footer={
              assignmentMeta?.totalPages ? (
                <Pagination
                  page={assignmentMeta.page || assignmentPage}
                  totalPages={assignmentMeta.totalPages || 1}
                  total={assignmentMeta.total}
                  limit={assignmentMeta.limit || PAGE_SIZE}
                  onChange={setAssignmentPage}
                />
              ) : null
            }
          />
        </GlassPanelBody>
      </GlassPanel>
      <ConfirmDialog
        open={Boolean(consumeTarget)}
        onClose={() => setConsumeTarget(null)}
        onConfirm={() => consumeTarget && consumeMutation.mutate(consumeTarget)}
        title="Consume packaging stock"
        description={
          consumeTarget
            ? assignmentHasShortage(consumeTarget)
              ? 'This assignment has shortages in its saved calculation. Add stock, recalculate, and save a new assignment before consuming.'
              : `Decrease packaging materials for ${consumeTarget.packaging_group_name} from ${consumeTarget.warehouse_name}?`
            : ''
        }
        confirmLabel="Consume"
        confirmDisabled={consumeTarget ? assignmentHasShortage(consumeTarget) : false}
        isLoading={consumeMutation.isPending}
      />
      <ConfirmDialog
        open={Boolean(hardDeleteTarget)}
        onClose={() => setHardDeleteTarget(null)}
        onConfirm={() => hardDeleteTarget && hardDeleteMutation.mutate(hardDeleteTarget.id)}
        title="Hard delete packaging assignment"
        description={
          hardDeleteTarget
            ? `Permanently delete assignment #${hardDeleteTarget.id} for ${hardDeleteTarget.packaging_group_name}? This cannot be undone.`
            : ''
        }
        confirmLabel="Hard delete"
        isLoading={hardDeleteMutation.isPending}
      />
    </div>
  );
}

export default function PackagingTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(INVENTORY_PERMISSIONS.create);
  const canUpdate = hasPermission(INVENTORY_PERMISSIONS.update);
  const canDelete = hasPermission(INVENTORY_PERMISSIONS.delete);
  const canAdjust = hasPermission(INVENTORY_PERMISSIONS.adjust);
  const [view, setView] = useState('materials');
  const [search, setSearch] = useState('');
  const [groupPage, setGroupPage] = useState(1);
  const [assignmentPage, setAssignmentPage] = useState(1);
  const [assignmentFilters, setAssignmentFilters] = useState({
    status: '',
    packaging_group_id: '',
    warehouse_id: ''
  });
  const debouncedSearch = useDebouncedValue(search, 300);

  const groupParams = useMemo(() => {
    const params = { page: groupPage, limit: PAGE_SIZE };
    if (view === 'groups' && debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [debouncedSearch, groupPage, view]);

  const assignmentParams = useMemo(() => {
    const params = { page: assignmentPage, limit: PAGE_SIZE };
    if (view === 'assignments' && debouncedSearch) params.search = debouncedSearch;
    if (assignmentFilters.status) params.status = assignmentFilters.status;
    if (assignmentFilters.packaging_group_id) params.packaging_group_id = assignmentFilters.packaging_group_id;
    if (assignmentFilters.warehouse_id) params.warehouse_id = assignmentFilters.warehouse_id;
    return params;
  }, [assignmentFilters, assignmentPage, debouncedSearch, view]);

  const variantsQuery = useVariantsOptions(true, { tracking_type: 'stocked', item_type: 'packaging' });
  const packagingItemsQuery = useItemsOptions(true, { item_type: 'packaging' });
  const charcoalVariantsQuery = useVariantsOptions(true, { tracking_type: 'stocked' });
  const categoriesQuery = useCategoriesOptions(true);
  const warehousesQuery = useWarehousesOptions(true);
  const groupsQuery = useQuery({
    queryKey: ['inventory', 'packaging', 'groups', groupParams],
    queryFn: () => api.inventory.packagingGroups.list(groupParams)
  });
  const assignmentsQuery = useQuery({
    queryKey: ['inventory', 'packaging', 'assignments', assignmentParams],
    queryFn: () => api.inventory.packagingAssignments.list(assignmentParams)
  });

  const packagingVariants = variantsQuery.data?.data?.item_variants || [];
  const filteredPackagingVariants = packagingVariants.filter((variant) => {
    if (view !== 'materials' || !debouncedSearch) return true;
    const value = debouncedSearch.toLowerCase();
    return [variant.item_name, variant.variant_name, variant.sku]
      .filter(Boolean)
      .some((part) => String(part).toLowerCase().includes(value));
  });
  const packagingItems = packagingItemsQuery.data?.data?.items || [];
  const packagingItemIds = new Set(packagingItems.map((item) => Number(item.id)));
  const charcoalVariants = (charcoalVariantsQuery.data?.data?.item_variants || []).filter(
    (variant) => !packagingItemIds.has(Number(variant.item_id))
  );
  const categories = categoriesQuery.data?.data?.categories || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];
  const groups = groupsQuery.data?.data?.packaging_groups || [];
  const groupMeta = groupsQuery.data?.meta || {};
  const assignments = assignmentsQuery.data?.data?.packaging_assignments || [];
  const assignmentMeta = assignmentsQuery.data?.meta || {};

  const searchPlaceholder = {
    materials: 'Search packaging materials',
    groups: 'Search packaging groups',
    assignments: 'Search packaging assignments'
  }[view];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/5 p-1 lg:w-[360px]">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setView(option.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                view === option.value ? 'bg-white/10 text-ink-50' : 'text-ink-300 hover:text-ink-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <Input
            leftIcon={Search}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setGroupPage(1);
              setAssignmentPage(1);
            }}
            placeholder={searchPlaceholder}
          />
        </div>
      </div>

      {view === 'materials' && (
        <MaterialsView
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          categories={categories}
          packagingVariants={filteredPackagingVariants}
          variantsQuery={variantsQuery}
        />
      )}
      {view === 'groups' && (
        <GroupsView
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          groupsQuery={groupsQuery}
          groups={groups}
          meta={groupMeta}
          page={groupPage}
          setPage={setGroupPage}
          charcoalVariants={charcoalVariants}
          warehouses={warehouses}
          packagingVariants={packagingVariants}
        />
      )}
      {view === 'assignments' && (
        <AssignmentsView
          canCreate={canCreate}
          canAdjust={canAdjust}
          canDelete={canDelete}
          assignmentsQuery={assignmentsQuery}
          assignments={assignments}
          assignmentMeta={assignmentMeta}
          assignmentPage={assignmentPage}
          setAssignmentPage={setAssignmentPage}
          assignmentFilters={assignmentFilters}
          setAssignmentFilters={setAssignmentFilters}
          groups={groups}
          warehouses={warehouses}
          charcoalVariants={charcoalVariants}
        />
      )}
    </div>
  );
}
