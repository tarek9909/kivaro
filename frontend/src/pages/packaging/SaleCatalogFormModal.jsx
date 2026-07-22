import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Button, Input, Modal, Select, Switch } from '@/components/ui/index.js';
import { CATALOG_ENTRY_TYPES, STATUS_OPTIONS, catalogType, itemLabel } from './packaging.constants.js';

function emptyForm(entry) {
  return {
    entry_type: entry?.entry_type || 'normal_carton',
    item_id: entry?.item_id ? String(entry.item_id) : '',
    packaging_group_id: entry?.packaging_group_id ? String(entry.packaging_group_id) : '',
    display_name: entry?.display_name || '',
    unit_label: entry?.unit_label || '',
    default_price: entry?.default_price === null || entry?.default_price === undefined ? '' : String(entry.default_price),
    vat_rate: entry?.vat_rate === null || entry?.vat_rate === undefined ? '' : String(entry.vat_rate),
    is_pos_active: Boolean(entry?.is_pos_active),
    status: entry?.status || 'active'
  };
}

function configuredItemPrice(item, entryType) {
  if (!item) return '';
  if (entryType === 'normal_carton') return item.carton_selling_price ?? '';
  if (entryType === 'normal_loose_unit') return item.loose_unit_selling_price ?? '';
  return item.default_selling_price ?? '';
}

export function SaleCatalogFormModal({ open, onClose, entry, items = [], groups = [] }) {
  const isEdit = Boolean(entry?.id);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(entry));
  const [errors, setErrors] = useState({});
  const selectedType = catalogType(form.entry_type);
  const targetItems = useMemo(() => (
    selectedType?.target === 'item'
      ? items.filter((item) => item.item_kind === 'normal' && item.stock_mode === selectedType.stockMode)
      : []
  ), [items, selectedType]);
  const targetGroups = useMemo(() => groups.filter((group) => group.status === 'active' || String(group.id) === form.packaging_group_id), [form.packaging_group_id, groups]);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(entry));
    setErrors({});
  }, [entry, open]);

  const mutation = useMutation({
    mutationFn: (payload) => (
      isEdit
        ? api.packaging.saleCatalog.update(entry.id, payload)
        : api.packaging.saleCatalog.create(payload)
    ),
    onSuccess: () => {
      toast.success(isEdit ? 'Sale offer saved' : 'Sale offer created');
      queryClient.invalidateQueries({ queryKey: ['packaging', 'sale-catalog'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save the sale offer.'));
    }
  });

  function change(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'entry_type') {
        next.item_id = '';
        next.packaging_group_id = '';
      }
      if (field === 'item_id' && !isEdit && current.default_price === '') {
        const item = items.find((candidate) => String(candidate.id) === String(value));
        const configuredPrice = configuredItemPrice(item, next.entry_type);
        if (configuredPrice !== '' && configuredPrice !== null && configuredPrice !== undefined) {
          next.default_price = String(configuredPrice);
        }
      }
      return next;
    });
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!selectedType) next.entry_type = 'Choose an offer type.';
    if (selectedType?.target === 'item' && !form.item_id) next.item_id = 'Choose the normal item for this offer.';
    if (selectedType?.target === 'group' && !form.packaging_group_id) next.packaging_group_id = 'Choose the packaging group for this ready-stock offer.';
    if (form.default_price === '' || Number(form.default_price) < 0) next.default_price = 'Default price must be zero or greater.';
    if (form.vat_rate !== '' && (Number(form.vat_rate) < 0 || Number(form.vat_rate) > 100)) next.vat_rate = 'VAT must be between 0 and 100.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      entry_type: form.entry_type,
      item_id: selectedType.target === 'item' ? Number(form.item_id) : null,
      packaging_group_id: selectedType.target === 'group' ? Number(form.packaging_group_id) : null,
      default_price: Number(form.default_price),
      is_pos_active: form.is_pos_active,
      status: form.status
    };
    if (form.display_name.trim()) payload.display_name = form.display_name.trim();
    if (form.unit_label.trim()) payload.unit_label = form.unit_label.trim();
    if (form.vat_rate !== '') payload.vat_rate = Number(form.vat_rate);
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit sale offer' : 'New sale offer'}
      description="Sale offers define price, VAT, and Mini POS visibility. Physical packaging materials remain inventory inputs and are not sold directly."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="sale-catalog-form" isLoading={mutation.isPending}>{isEdit ? 'Save offer' : 'Create offer'}</Button>
        </>
      }
    >
      <form id="sale-catalog-form" onSubmit={submit} className="space-y-4" noValidate>
        <Select label="Fulfillment offer" value={form.entry_type} onChange={(event) => change('entry_type', event.target.value)} error={errors.entry_type}>
          {CATALOG_ENTRY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </Select>

        {selectedType?.target === 'item' ? (
          <Select label="Normal item" value={form.item_id} onChange={(event) => change('item_id', event.target.value)} error={errors.item_id} description={`Only normal ${selectedType.stockMode.replace('_', ' ')} items are eligible.`}>
            <option value="">Select normal item</option>
            {targetItems.map((item) => <option key={item.id} value={item.id}>{itemLabel(item)}</option>)}
          </Select>
        ) : (
          <Select label="Packaging group" value={form.packaging_group_id} onChange={(event) => change('packaging_group_id', event.target.value)} error={errors.packaging_group_id} description="Availability comes from ready containers produced by this group.">
            <option value="">Select packaging group</option>
            {targetGroups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.code})</option>)}
          </Select>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Default price" type="number" min="0" step="0.0001" inputMode="decimal" value={form.default_price} onChange={(event) => change('default_price', event.target.value)} error={errors.default_price} description={selectedType?.target === 'item' ? 'Prefilled from the item price when configured; this offer can override it.' : undefined} required />
          <Input label="VAT rate (%)" type="number" min="0" max="100" step="0.01" inputMode="decimal" value={form.vat_rate} onChange={(event) => change('vat_rate', event.target.value)} error={errors.vat_rate} placeholder="Store default" description="Leave blank on create to use the current store VAT default." />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Display name" value={form.display_name} onChange={(event) => change('display_name', event.target.value)} placeholder="Server-generated if blank" />
          <Input label="Unit label" value={form.unit_label} onChange={(event) => change('unit_label', event.target.value)} placeholder="Server-generated if blank" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Switch checked={form.is_pos_active} onChange={(value) => change('is_pos_active', value)} label="Active in Mini POS" description="POS sees only active offers with current server availability, never stock quantities." />
          <Select label="Status" value={form.status} onChange={(event) => change('status', event.target.value)}>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </div>
      </form>
    </Modal>
  );
}
