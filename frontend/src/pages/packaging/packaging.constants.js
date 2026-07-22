export const COMPONENT_ROLES = [
  {
    value: 'outer_sellable',
    label: 'Outer sellable',
    help: 'The one finished carton/container sold as a whole.'
  },
  {
    value: 'inner_sellable',
    label: 'Inner sellable',
    help: 'The one finished bag/unit sold individually from a ready carton.'
  },
  {
    value: 'consumable',
    label: 'Consumable',
    help: 'A physical packaging input that is consumed but never sold directly.'
  }
];

export const CATALOG_ENTRY_TYPES = [
  { value: 'normal_carton', label: 'Normal carton', target: 'item', stockMode: 'carton_weight' },
  { value: 'normal_loose_unit', label: 'Normal loose unit', target: 'item', stockMode: 'carton_weight' },
  { value: 'normal_weight', label: 'Normal weight', target: 'item', stockMode: 'weight' },
  { value: 'normal_piece', label: 'Normal piece', target: 'item', stockMode: 'piece' },
  { value: 'ready_outer_carton', label: 'Ready outer carton', target: 'group' },
  { value: 'ready_inner_unit', label: 'Ready inner bag', target: 'group' }
];

export const READY_STOCK_STATUSES = [
  { value: '', label: 'All states' },
  { value: 'full', label: 'Full' },
  { value: 'partial', label: 'Partial' },
  { value: 'depleted', label: 'Depleted' },
  { value: 'cancelled', label: 'Cancelled' }
];

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

export function catalogType(entryType) {
  return CATALOG_ENTRY_TYPES.find((entry) => entry.value === entryType);
}

export function catalogTypeLabel(entryType) {
  return catalogType(entryType)?.label || entryType?.replaceAll('_', ' ') || '-';
}

export function statusTone(status) {
  if (status === 'active' || status === 'full' || status === 'completed') return 'success';
  if (status === 'partial') return 'warn';
  if (status === 'depleted' || status === 'inactive' || status === 'cancelled') return 'neutral';
  return 'info';
}

export function packagingItemLabel(item) {
  const capacity = item?.max_content_weight_kg;
  const capacityLabel = capacity === null || capacity === undefined || capacity === ''
    ? 'capacity not set'
    : `${capacity} kg capacity`;
  return `${item?.name || 'Unnamed item'}${item?.code ? ` (${item.code})` : ''} — ${capacityLabel}`;
}

export function itemLabel(item) {
  return `${item?.name || 'Unnamed item'}${item?.code ? ` (${item.code})` : ''}`;
}
