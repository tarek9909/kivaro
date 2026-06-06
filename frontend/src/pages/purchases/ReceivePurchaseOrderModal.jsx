import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Button, Input, Modal, Textarea } from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';
import {
  formatStockQuantity,
  getEntryUnitLabel
} from '@/pages/inventory/stockUnits.js';

function formatEntryQuantity(value, item) {
  const unit = getEntryUnitLabel(item);
  const formatted = formatNumber(value, { maximumFractionDigits: 4 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function stockEquivalent(value, item) {
  const quantity = Number(value);
  if (!item || Number.isNaN(quantity) || item.base_unit_type !== 'weight') {
    return '';
  }
  return formatStockQuantity(quantity * Number(item.base_unit_conversion_to_base || 1), item);
}

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function buildLines(purchaseOrder) {
  const items = purchaseOrder?.items || [];
  return items.map((item) => {
    const remaining = Number(item.ordered_quantity) - Number(item.received_quantity || 0);
    return {
      purchase_order_item_id: item.id,
      item_name: item.item_name,
      base_unit_symbol: item.base_unit_symbol,
      base_unit_type: item.base_unit_type,
      base_unit_conversion_to_base: item.base_unit_conversion_to_base,
      ordered_quantity: Number(item.ordered_quantity),
      received_quantity: Number(item.received_quantity || 0),
      remaining,
      receive_quantity: remaining > 0 ? String(remaining) : '0',
      unit_cost: item.unit_cost ?? ''
    };
  });
}

export function ReceivePurchaseOrderModal({ open, onClose, purchaseOrder }) {
  const queryClient = useQueryClient();
  const [receiptNumber, setReceiptNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(todayString());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setReceiptNumber('');
    setReceivedDate(todayString());
    setNotes('');
    setLines(buildLines(purchaseOrder));
    setErrors({});
  }, [open, purchaseOrder]);

  const mutation = useMutation({
    mutationFn: (payload) => api.purchases.purchaseOrders.receive(purchaseOrder.id, payload),
    onSuccess: () => {
      toast.success('Receipt posted');
      queryClient.invalidateQueries({ queryKey: ['purchases', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchases', 'order', purchaseOrder.id] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'balances'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not post receipt.'));
    }
  });

  function updateLine(index, field, value) {
    setLines((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    const errorKey = `items.${index}.${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: undefined }));
    }
  }

  const includedLines = useMemo(
    () => lines.filter((line) => Number(line.receive_quantity) > 0),
    [lines]
  );

  function validate() {
    const next = {};
    if (!receivedDate) next.received_date = 'Received date is required.';
    if (includedLines.length === 0) {
      next.items = 'Enter a quantity above zero on at least one line.';
    } else {
      lines.forEach((line, index) => {
        const value = Number(line.receive_quantity);
        if (line.receive_quantity && value > 0) {
          if (value > line.remaining) {
            next[`items.${index}.receive_quantity`] = `Cannot exceed remaining ${line.remaining}.`;
          }
          if (line.unit_cost !== '' && line.unit_cost !== null && Number(line.unit_cost) < 0) {
            next[`items.${index}.unit_cost`] = 'Unit cost cannot be negative.';
          }
        }
      });
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      receipt_number: receiptNumber?.trim() || undefined,
      received_date: receivedDate,
      notes: notes?.trim() || null,
      items: includedLines.map((line) => {
        const item = {
          purchase_order_item_id: Number(line.purchase_order_item_id),
          received_quantity: Number(line.receive_quantity)
        };
        if (line.unit_cost !== '' && line.unit_cost !== null && line.unit_cost !== undefined) {
          item.unit_cost = Number(line.unit_cost);
        }
        return item;
      })
    };
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        purchaseOrder
          ? `Receive PO ${purchaseOrder.po_number || `#${purchaseOrder.id}`}`
          : 'Receive purchase order'
      }
      description="Post a receipt against the order. Quantities are in the item's base unit and default to the remaining amount on each line."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="receive-form" isLoading={mutation.isPending}>
            Post receipt
          </Button>
        </>
      }
    >
      <form id="receive-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Receipt number"
            value={receiptNumber}
            onChange={(event) => setReceiptNumber(event.target.value)}
            description="Optional. Auto-generated when blank."
          />
          <Input
            label="Received date"
            type="date"
            value={receivedDate}
            onChange={(event) => setReceivedDate(event.target.value)}
            error={errors.received_date}
            required
          />
          <Input
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {errors.items && <p className="text-xs text-rose-300">{errors.items}</p>}

        <div className="space-y-3">
          {lines.length === 0 && (
            <p className="text-sm text-ink-300">
              This order has no line items.
            </p>
          )}
          {lines.map((line, index) => (
            <div
              key={line.purchase_order_item_id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-50">{line.item_name}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-ink-300">
                  <span>
                    Ordered{' '}
                    <span className="font-mono text-ink-100">
                      {formatEntryQuantity(line.ordered_quantity, line)}
                    </span>
                  </span>
                  <span>
                    Received{' '}
                    <span className="font-mono text-ink-100">
                      {formatEntryQuantity(line.received_quantity, line)}
                    </span>
                  </span>
                  <span>
                    Remaining{' '}
                    <span className="font-mono text-ink-100">
                      {formatEntryQuantity(line.remaining, line)}
                    </span>
                  </span>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label={`Receive quantity${getEntryUnitLabel(line) ? ` (${getEntryUnitLabel(line)})` : ''}`}
                  type="number"
                  min="0"
                  step="0.0001"
                  value={line.receive_quantity}
                  onChange={(event) =>
                    updateLine(index, 'receive_quantity', event.target.value)
                  }
                  error={errors[`items.${index}.receive_quantity`]}
                  disabled={line.remaining <= 0}
                  description={
                    line.remaining <= 0
                      ? 'Already fully received.'
                      : stockEquivalent(line.receive_quantity, line)
                        ? `Stock will show as ${stockEquivalent(line.receive_quantity, line)}.`
                        : 'Set to 0 to skip this line.'
                  }
                />
                <Input
                  label="Unit cost"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={line.unit_cost ?? ''}
                  onChange={(event) => updateLine(index, 'unit_cost', event.target.value)}
                  error={errors[`items.${index}.unit_cost`]}
                  description="Optional. Defaults to the original unit cost."
                />
              </div>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
}
