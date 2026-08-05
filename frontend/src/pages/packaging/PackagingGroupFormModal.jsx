import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select,
  Textarea
} from '@/components/ui/index.js';
import { formatCartonStockSummary } from '@/pages/inventory/stockUnits.js';
import {
  COMPONENT_ROLES,
  STATUS_OPTIONS,
  compatibleInnerPackagingItems,
  innerQuantityPerOuter,
  packagingItemLabel
} from './packaging.constants.js';

let nextComponentKey = 0;

function createComponent(component = {}, index = 0) {
  nextComponentKey += 1;
  return {
    _key: component.id || `new-${nextComponentKey}`,
    item_id: component.item_id ? String(component.item_id) : '',
    component_role: component.component_role || (index === 0 ? 'outer_sellable' : 'inner_sellable'),
    quantity_per_outer:
      component.quantity_per_outer === null || component.quantity_per_outer === undefined
        ? (index === 0 ? '1' : '1')
        : String(component.quantity_per_outer),
    notes: component.notes || ''
  };
}

function emptyForm(group) {
  return {
    name: group?.name || '',
    code: group?.code || '',
    input_item_id: group?.input_item_id ? String(group.input_item_id) : '',
    default_warehouse_id: group?.default_warehouse_id ? String(group.default_warehouse_id) : '',
    description: group?.description || '',
    status: group?.status || 'active',
    components: group?.components?.length
      ? group.components.map(createComponent)
      : [createComponent({}, 0), createComponent({}, 1)]
  };
}

function NumberInput({ value, onChange, error, ...props }) {
  return (
    <Input
      type="number"
      min="0"
      step="1"
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={error}
      {...props}
    />
  );
}

export function PackagingGroupFormModal({ open, onClose, group, items = [], warehouses = [] }) {
  const isEdit = Boolean(group?.id);
  const queryClient = useQueryClient();
  const detailQuery = useQuery({
    queryKey: ['packaging', 'groups', 'detail', group?.id],
    queryFn: () => api.packaging.groups.get(group.id),
    enabled: open && isEdit
  });
  const detailGroup = detailQuery.data?.data?.packaging_group || group;
  const [form, setForm] = useState(() => emptyForm(group));
  const [errors, setErrors] = useState({});

  const normalInputItems = useMemo(
    () => items.filter((item) => item.item_kind === 'normal' && ['carton', 'weight'].includes(item.stock_mode)),
    [items]
  );
  const packagingItems = useMemo(
    () => items.filter((item) => item.item_kind === 'packaging' && item.stock_mode === 'piece'),
    [items]
  );
  const selectedInputItem = normalInputItems.find((item) => String(item.id) === form.input_item_id);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(detailGroup));
    setErrors({});
  }, [detailGroup, open]);

  const mutation = useMutation({
    mutationFn: (payload) => (
      isEdit
        ? api.packaging.groups.update(group.id, payload)
        : api.packaging.groups.create(payload)
    ),
    onSuccess: () => {
      toast.success(isEdit ? 'Packaging group saved' : 'Packaging group created');
      queryClient.invalidateQueries({ queryKey: ['packaging', 'groups'] });
      queryClient.invalidateQueries({ queryKey: ['packaging', 'operations'] });
      queryClient.invalidateQueries({ queryKey: ['packaging', 'sale-catalog'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save the packaging group.'));
    }
  });

  function changeField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function changeComponent(index, field, value) {
    setForm((current) => ({
      ...current,
      components: current.components.map((component, componentIndex) => (
        componentIndex === index ? { ...component, [field]: value } : component
      ))
    }));
    if (errors.components) setErrors((current) => ({ ...current, components: undefined }));
  }

  function changeComponentItem(index, itemId) {
    setForm((current) => {
      const components = current.components.map((component) => ({ ...component }));
      const component = components[index];
      component.item_id = itemId;

      const outer = components.find((entry) => entry.component_role === 'outer_sellable');
      const inner = components.find((entry) => entry.component_role === 'inner_sellable');
      const outerItem = packagingItems.find((item) => String(item.id) === outer?.item_id);
      const innerItem = packagingItems.find((item) => String(item.id) === inner?.item_id);

      if (outer) outer.quantity_per_outer = '1';
      if (!outerItem || !inner) return { ...current, components };

      const compatibleItems = compatibleInnerPackagingItems(outerItem, packagingItems)
        .filter((item) => String(item.id) !== String(outerItem.id));
      const calculatedQuantity = innerQuantityPerOuter(outerItem, innerItem);
      if (calculatedQuantity) {
        inner.quantity_per_outer = String(calculatedQuantity);
      } else if (component.component_role === 'outer_sellable' && compatibleItems.length === 1) {
        inner.item_id = String(compatibleItems[0].id);
        inner.quantity_per_outer = String(innerQuantityPerOuter(outerItem, compatibleItems[0]));
      } else if (component.component_role === 'outer_sellable') {
        inner.item_id = '';
        inner.quantity_per_outer = '';
      }

      return { ...current, components };
    });
  }

  function addComponent() {
    setForm((current) => ({
      ...current,
      components: [...current.components, createComponent({}, current.components.length)]
    }));
  }

  function removeComponent(index) {
    setForm((current) => ({
      ...current,
      components: current.components.filter((_, componentIndex) => componentIndex !== index)
    }));
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    if (!form.code.trim()) next.code = 'Code is required.';
    if (!form.input_item_id) next.input_item_id = 'Choose the saved normal input item.';
    if (form.components.length < 2) {
      next.components = 'Add one outer sellable and one inner sellable component.';
    } else {
      const outer = form.components.filter((component) => component.component_role === 'outer_sellable');
      const inner = form.components.filter((component) => component.component_role === 'inner_sellable');
      const uniqueItems = new Set(form.components.map((component) => component.item_id).filter(Boolean));
      if (outer.length !== 1 || Number(outer[0]?.quantity_per_outer) !== 1) {
        next.components = 'Use exactly one outer sellable component with quantity 1.';
      } else if (inner.length !== 1 || !Number.isInteger(Number(inner[0]?.quantity_per_outer)) || Number(inner[0]?.quantity_per_outer) <= 0) {
        next.components = 'Use exactly one inner sellable component with a positive whole quantity.';
      } else if (form.components.some((component) => component.component_role === 'consumable' && !Number.isInteger(Number(component.quantity_per_outer)))) {
        next.components = 'Consumable quantities must be whole pieces.';
      } else if (form.components.some((component) => !component.item_id || Number(component.quantity_per_outer) <= 0)) {
        next.components = 'Every component needs a packaging item and a positive quantity.';
      } else if (uniqueItems.size !== form.components.length) {
        next.components = 'A physical packaging item can only appear once in a group.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      name: form.name.trim(),
      code: form.code.trim(),
      input_item_id: Number(form.input_item_id),
      default_warehouse_id: form.default_warehouse_id ? Number(form.default_warehouse_id) : null,
      description: form.description.trim() || null,
      status: form.status,
      components: form.components.map((component, index) => ({
        item_id: Number(component.item_id),
        component_role: component.component_role,
        quantity_per_outer: Number(component.quantity_per_outer),
        sort_order: index,
        notes: component.notes.trim() || null
      }))
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? 'Edit packaging group' : 'New packaging group'}
      description="A flat group has one outer sellable package, one inner sellable package, and optional consumables. Capacity and stock checks remain server-authoritative."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="packaging-group-form" isLoading={mutation.isPending || (isEdit && detailQuery.isPending)}>
            {isEdit ? 'Save group' : 'Create group'}
          </Button>
        </>
      }
    >
      <form id="packaging-group-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        {/* Basic & Input Source Information Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Group & Input Source</h4>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Group name"
              value={form.name}
              onChange={(event) => changeField('name', event.target.value)}
              error={errors.name}
              required
              placeholder="e.g. 5kg Premium Box Set"
            />
            <Input
              label="Group code"
              value={form.code}
              onChange={(event) => changeField('code', event.target.value)}
              error={errors.code}
              required
              placeholder="e.g. PKG-5KG-SET"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Select
                label="Saved normal input item"
                value={form.input_item_id}
                onChange={(event) => changeField('input_item_id', event.target.value)}
                error={errors.input_item_id}
                description="This can only be changed in group configuration and is snapshotted on each completed operation."
              >
                <option value="">Select normal item</option>
                {normalInputItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.stock_mode === 'carton'
                      ? formatCartonStockSummary(item.quantity_on_hand, item)
                      : item.stock_mode})
                  </option>
                ))}
              </Select>
              {selectedInputItem?.stock_mode === 'carton' && (
                <p className="text-xs text-ink-300">
                  Available across warehouses: {formatCartonStockSummary(selectedInputItem.quantity_on_hand, selectedInputItem)}. The packaging preview checks the selected warehouse.
                </p>
              )}
            </div>
            <Select
              label="Default warehouse"
              value={form.default_warehouse_id}
              onChange={(event) => changeField('default_warehouse_id', event.target.value)}
              description="Can be overridden for a preview or completion."
            >
              <option value="">No default warehouse</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </Select>
          </div>
        </div>

        {/* Description & Status Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <Textarea
              label="Description"
              value={form.description}
              onChange={(event) => changeField('description', event.target.value)}
              rows={2}
              placeholder="Optional notes or details regarding this packaging configuration..."
            />
            <Select label="Status" value={form.status} onChange={(event) => changeField('status', event.target.value)}>
              {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </Select>
          </div>
        </div>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-2.5">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Flat Physical Components</h4>
              <p className="mt-0.5 text-xs text-ink-300">Only the two sellable roles become sale offers. Consumables remain physical inputs.</p>
            </div>
            <Button variant="secondary" size="sm" leftIcon={Plus} onClick={addComponent}>Add consumable</Button>
          </div>

          {errors.components && <p className="text-sm text-rose-300">{errors.components}</p>}

          <div className="space-y-3">
            {form.components.map((component, index) => {
              const selectedItem = packagingItems.find((item) => String(item.id) === component.item_id);
              const outerComponent = form.components.find((entry) => entry.component_role === 'outer_sellable');
              const outerItem = packagingItems.find((item) => String(item.id) === outerComponent?.item_id);
              const isInnerSellable = component.component_role === 'inner_sellable';
              const isCalculatedSellable = component.component_role === 'outer_sellable' || isInnerSellable;
              const availablePackagingItems = isInnerSellable && outerItem
                ? compatibleInnerPackagingItems(outerItem, packagingItems)
                  .filter((item) => String(item.id) !== String(outerItem.id))
                : packagingItems;
              const calculatedInnerQuantity = isInnerSellable
                ? innerQuantityPerOuter(outerItem, selectedItem)
                : null;
              return (
                <div key={component._key} className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3 md:grid-cols-[minmax(180px,1.3fr)_minmax(155px,0.85fr)_130px_minmax(130px,0.8fr)_auto] md:items-end">
                  <Select
                    label={index === 0 ? 'Packaging item' : undefined}
                    value={component.item_id}
                    onChange={(event) => changeComponentItem(index, event.target.value)}
                  >
                    <option value="">Select packaging item</option>
                    {availablePackagingItems.map((item) => <option key={item.id} value={item.id}>{packagingItemLabel(item)}</option>)}
                  </Select>
                  <Select
                    label={index === 0 ? 'Role' : undefined}
                    value={component.component_role}
                    onChange={(event) => changeComponent(index, 'component_role', event.target.value)}
                  >
                    {COMPONENT_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </Select>
                  <NumberInput
                    label={index === 0 ? 'Per outer' : undefined}
                    value={component.quantity_per_outer}
                    onChange={(value) => changeComponent(index, 'quantity_per_outer', value)}
                    disabled={isCalculatedSellable}
                  />
                  <div className="space-y-1">
                    <Input
                      label={index === 0 ? 'Notes' : undefined}
                      value={component.notes}
                      onChange={(event) => changeComponent(index, 'notes', event.target.value)}
                      placeholder={selectedItem?.max_content_weight_kg ? `${selectedItem.max_content_weight_kg} kg capacity` : 'Optional'}
                    />
                    {calculatedInnerQuantity && (
                      <p className="text-xs text-ink-300">
                        Calculated: {calculatedInnerQuantity} per outer ({selectedItem.max_content_weight_kg} kg × {calculatedInnerQuantity} = {outerItem.max_content_weight_kg} kg).
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    leftIcon={Trash2}
                    title="Remove component"
                    aria-label="Remove component"
                    onClick={() => removeComponent(index)}
                  />
                </div>
              );
            })}
          </div>

          <p className="text-xs text-ink-400">The server validates outer/inner capacity, item status, exact carton loose-unit compatibility, and every final component rule.</p>
        </section>
      </form>
    </Modal>
  );
}
