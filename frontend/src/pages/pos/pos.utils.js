import { WHOLE_QUANTITY_ENTRY_TYPES } from './pos.constants.js';

let rowKey = 0;

export function createLineKey() {
  rowKey += 1;
  return `pos-line-${rowKey}`;
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function buildLineFromOffer(offer) {
  return {
    _key: createLineKey(),
    sale_catalog_entry_id: String(offer.id),
    display_name: offer.display_name || offer.item_name || 'Sale offer',
    entry_type: offer.entry_type,
    unit_label: offer.unit_label || '',
    unit_price: offer.default_price ?? 0,
    vat_rate: offer.vat_rate ?? 0,
    quantity: '1',
    line_type: 'sale',
    notes: ''
  };
}

export function buildLineFromOrder(line) {
  return {
    _key: createLineKey(),
    sale_catalog_entry_id: String(line.sale_catalog_entry_id),
    display_name: line.catalog_display_name || line.display_name || line.item_name || 'Saved sale offer',
    entry_type: line.fulfillment_type || line.entry_type,
    unit_label: line.catalog_unit_label || line.unit_label || '',
    unit_price: line.unit_price ?? 0,
    vat_rate: line.vat_rate ?? 0,
    quantity: String(line.quantity ?? 1),
    line_type: line.line_type || 'sale',
    notes: line.notes || ''
  };
}

export function isWholeQuantity(line) {
  return WHOLE_QUANTITY_ENTRY_TYPES.has(line.entry_type);
}

export function lineTotal(line) {
  if (line.line_type === 'free_gift') return 0;
  const quantity = Number(line.quantity || 0);
  const price = Number(line.unit_price || 0);
  const vat = Number(line.vat_rate || 0);
  if (!Number.isFinite(quantity) || !Number.isFinite(price) || !Number.isFinite(vat)) return 0;
  return quantity * price * (1 + vat / 100);
}

export function orderPayloadFromForm(form) {
  return {
    warehouse_id: Number(form.warehouse_id),
    customer_id: Number(form.customer_id),
    order_date: form.order_date,
    notes: form.notes.trim() || null,
    lines: form.lines.map((line) => ({
      sale_catalog_entry_id: Number(line.sale_catalog_entry_id),
      line_type: line.line_type,
      quantity: Number(line.quantity),
      notes: line.notes.trim() || null
    }))
  };
}
