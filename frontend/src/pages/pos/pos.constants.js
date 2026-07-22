export const POS_PERMISSIONS = {
  ownOrders: 'pos.own_orders',
  review: 'pos.review',
  accept: 'pos.accept',
  createCustomers: 'pos.create_customers',
  requestGifts: 'pos.request_gifts',
  approveGifts: 'dispatch.gifts.approve',
  salesmanWorkspace: 'salesman_workspace.view'
};

export const POS_ORDER_STATUSES = [
  { value: 'pending', label: 'Pending', tone: 'warn' },
  { value: 'accepted', label: 'Accepted', tone: 'info' },
  { value: 'converted', label: 'Converted', tone: 'success' },
  { value: 'cancelled', label: 'Cancelled', tone: 'neutral' },
  { value: 'rejected', label: 'Rejected', tone: 'danger' }
];

export const POS_ENTRY_TYPES = {
  normal_carton: 'Carton',
  normal_loose_unit: 'Loose unit',
  normal_weight: 'Weight',
  normal_piece: 'Piece',
  ready_outer_carton: 'Ready carton',
  ready_inner_unit: 'Ready bag'
};

export const WHOLE_QUANTITY_ENTRY_TYPES = new Set([
  'normal_carton',
  'normal_loose_unit',
  'normal_piece',
  'ready_outer_carton',
  'ready_inner_unit'
]);

export function statusLabel(status) {
  return POS_ORDER_STATUSES.find((option) => option.value === status)?.label || status || '-';
}

export function statusTone(status) {
  return POS_ORDER_STATUSES.find((option) => option.value === status)?.tone || 'neutral';
}

export function offerLabel(entry) {
  if (!entry) return 'Unavailable offer';
  const type = POS_ENTRY_TYPES[entry.entry_type] || entry.entry_type;
  const unit = entry.unit_label ? ` / ${entry.unit_label}` : '';
  return `${entry.display_name || entry.catalog_display_name || entry.item_name || 'Offer'} — ${type}${unit}`;
}
