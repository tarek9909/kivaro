import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackagePlus, Plus, Trash2 } from 'lucide-react';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { formatCurrency } from '@/lib/formatters.js';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui/index.js';
import { offerLabel } from './pos.constants.js';
import {
  buildLineFromOffer,
  buildLineFromOrder,
  isWholeQuantity,
  lineTotal,
  orderPayloadFromForm,
  todayInputValue
} from './pos.utils.js';

function blankForm(order, defaultWarehouseId) {
  return {
    warehouse_id: String(order?.warehouse_id || defaultWarehouseId || ''),
    customer_id: String(order?.customer_id || ''),
    order_date: order?.order_date ? String(order.order_date).slice(0, 10) : todayInputValue(),
    notes: order?.notes || '',
    lines: (order?.lines || []).map(buildLineFromOrder)
  };
}

function mergeWarehouseOptions(warehouses, order) {
  const known = new Map((warehouses || []).map((warehouse) => [String(warehouse.id), warehouse]));
  if (order?.warehouse_id && !known.has(String(order.warehouse_id))) {
    known.set(String(order.warehouse_id), {
      id: order.warehouse_id,
      name: order.warehouse_name || `Warehouse #${order.warehouse_id}`
    });
  }
  return [...known.values()];
}

function estimateTotal(lines) {
  return lines.reduce((total, line) => total + lineTotal(line), 0);
}

/**
 * Pending POS orders are editable intent only: this form never reserves
 * stock. The server rechecks catalogue availability when a manager accepts
 * selected orders for a combined dispatch.
 */
export function PosOrderComposerModal({
  open,
  onClose,
  order,
  warehouses = [],
  defaultWarehouseId,
  canRequestGifts = false,
  onCreateCustomer
}) {
  const isEdit = Boolean(order?.id);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => blankForm(order, defaultWarehouseId));
  const [errors, setErrors] = useState({});
  const [offerIdToAdd, setOfferIdToAdd] = useState('');

  const warehouseOptions = useMemo(
    () => mergeWarehouseOptions(warehouses, order),
    [order, warehouses]
  );
  const selectedWarehouseId = Number(form.warehouse_id);
  const hasWarehouse = Number.isInteger(selectedWarehouseId) && selectedWarehouseId > 0;

  const customersQuery = useQuery({
    queryKey: ['pos', 'customers', 'options'],
    queryFn: () => api.pos.customers.list({ page: 1, limit: 100 }),
    enabled: open
  });
  const catalogueQuery = useQuery({
    queryKey: ['pos', 'catalog', { warehouse_id: selectedWarehouseId }],
    queryFn: () => api.pos.catalog.list({ warehouse_id: selectedWarehouseId, page: 1, limit: 100 }),
    enabled: open && hasWarehouse
  });

  const customers = customersQuery.data?.data?.customers || [];
  const offers = catalogueQuery.data?.data?.sale_catalog_entries || [];
  const offerById = useMemo(
    () => new Map(offers.map((offer) => [String(offer.id), offer])),
    [offers]
  );

  useEffect(() => {
    if (!open) return;
    setForm(blankForm(order, defaultWarehouseId));
    setErrors({});
    setOfferIdToAdd('');
  }, [defaultWarehouseId, open, order]);

  const mutation = useMutation({
    mutationFn: (payload) => (
      isEdit ? api.pos.orders.update(order.id, payload) : api.pos.orders.create(payload)
    ),
    onSuccess: () => {
      toast.success(isEdit ? 'Pending POS order updated' : 'Pending POS order created');
      queryClient.invalidateQueries({ queryKey: ['pos', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'review'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'workspace'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save the POS order.'));
    }
  });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateLine(index, field, value) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) => (
        lineIndex === index ? { ...line, [field]: value } : line
      ))
    }));
    if (errors.lines) setErrors((current) => ({ ...current, lines: undefined }));
  }

  function addOffer() {
    const offer = offerById.get(offerIdToAdd);
    if (!offer) return;
    setForm((current) => ({ ...current, lines: [...current.lines, buildLineFromOffer(offer)] }));
    setOfferIdToAdd('');
  }

  function removeLine(index) {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index)
    }));
  }

  function validate() {
    const next = {};
    if (!hasWarehouse) next.warehouse_id = 'Choose the warehouse that will fulfill this request.';
    if (!form.customer_id) next.customer_id = 'Choose one of your customers.';
    if (!form.order_date) next.order_date = 'Order date is required.';
    if (!form.lines.length) {
      next.lines = 'Add at least one currently available offer.';
    } else {
      const invalidLine = form.lines.find((line) => {
        const quantity = Number(line.quantity);
        return !Number.isFinite(quantity)
          || quantity <= 0
          || (isWholeQuantity(line) && !Number.isInteger(quantity));
      });
      if (invalidLine) {
        next.lines = 'Use a positive quantity; cartons, bags, pieces, and loose units must be whole numbers.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate(orderPayloadFromForm(form));
  }

  const estimatedTotal = estimateTotal(form.lines);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? 'Edit pending Mini POS order' : 'New Mini POS order'}
      description="Saving this order does not reserve inventory. Availability is checked again when a manager converts it into a dispatch."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="pos-order-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save pending order' : 'Submit pending order'}
          </Button>
        </>
      }
    >
      <form id="pos-order-form" className="space-y-5" onSubmit={submit} noValidate>
        <div className="grid gap-4 md:grid-cols-3">
          {warehouseOptions.length ? (
            <Select
              label="Warehouse"
              value={form.warehouse_id}
              onChange={(event) => updateField('warehouse_id', event.target.value)}
              error={errors.warehouse_id}
              description="Offers are checked in this warehouse."
            >
              <option value="">Select warehouse</option>
              {warehouseOptions.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
              ))}
            </Select>
          ) : (
            <Input
              label="Warehouse ID"
              type="number"
              min="1"
              value={form.warehouse_id}
              onChange={(event) => updateField('warehouse_id', event.target.value)}
              error={errors.warehouse_id}
              description="Enter your assigned fulfillment warehouse ID."
            />
          )}
          <Select
            label="Customer"
            value={form.customer_id}
            onChange={(event) => updateField('customer_id', event.target.value)}
            error={errors.customer_id}
            disabled={customersQuery.isPending}
          >
            <option value="">Select your customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}{customer.phone ? ` — ${customer.phone}` : ''}
              </option>
            ))}
          </Select>
          <Input
            label="Order date"
            type="date"
            value={form.order_date}
            onChange={(event) => updateField('order_date', event.target.value)}
            error={errors.order_date}
          />
        </div>

        {onCreateCustomer && (
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" leftIcon={Plus} onClick={onCreateCustomer}>
              New customer in my territory
            </Button>
          </div>
        )}

        <section className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <Select
                label="Available sale offer"
                value={offerIdToAdd}
                onChange={(event) => setOfferIdToAdd(event.target.value)}
                disabled={!hasWarehouse || catalogueQuery.isPending}
                description={
                  hasWarehouse
                    ? 'The catalogue only shows offers currently available; quantities remain hidden.'
                    : 'Choose a warehouse to load its available offers.'
                }
              >
                <option value="">Select an available offer</option>
                {offers.map((offer) => (
                  <option key={offer.id} value={offer.id}>{offerLabel(offer)}</option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              leftIcon={PackagePlus}
              onClick={addOffer}
              disabled={!offerIdToAdd}
            >
              Add line
            </Button>
          </div>

          {catalogueQuery.isError && (
            <p className="rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-100">
              The catalogue could not be loaded for this warehouse. Check the warehouse and try again.
            </p>
          )}
          {errors.lines && <p className="text-sm text-rose-300">{errors.lines}</p>}

          {form.lines.length ? (
            <div className="space-y-3">
              {form.lines.map((line, index) => {
                const currentOffer = offerById.get(line.sale_catalog_entry_id);
                const savedOfferUnavailable = !currentOffer && isEdit;
                const whole = isWholeQuantity(line);
                return (
                  <article key={line._key} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink-50">{line.display_name}</p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {line.entry_type?.replaceAll('_', ' ') || 'sale offer'}{line.unit_label ? ` · ${line.unit_label}` : ''}
                          {line.line_type === 'free_gift' ? ' · Requested gift' : ` · ${formatCurrency(line.unit_price)}`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        leftIcon={Trash2}
                        aria-label={`Remove ${line.display_name}`}
                        title="Remove line"
                        onClick={() => removeLine(index)}
                      />
                    </div>

                    {savedOfferUnavailable && (
                      <p className="mt-3 rounded-md border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                        This saved line is no longer in the currently available catalogue. It remains pending intent; a manager will need stock before it can be converted.
                      </p>
                    )}

                    <div className="mt-3 grid gap-3 sm:grid-cols-[150px_180px_minmax(0,1fr)_auto] sm:items-end">
                      <Input
                        label="Quantity"
                        type="number"
                        min="0"
                        step={whole ? '1' : '0.001'}
                        value={line.quantity}
                        onChange={(event) => updateLine(index, 'quantity', event.target.value)}
                        description={whole ? 'Whole quantity only.' : 'Decimal quantity allowed.'}
                      />
                      {canRequestGifts ? (
                        <Select
                          label="Line type"
                          value={line.line_type}
                          onChange={(event) => updateLine(index, 'line_type', event.target.value)}
                        >
                          <option value="sale">Sale</option>
                          <option value="free_gift">Request manager-approved gift</option>
                        </Select>
                      ) : (
                        <div className="pb-1 text-xs text-ink-400">Gift requests require POS gift permission.</div>
                      )}
                      <Input
                        label="Line note"
                        value={line.notes}
                        onChange={(event) => updateLine(index, 'notes', event.target.value)}
                        placeholder="Optional"
                      />
                      <p className="pb-2 text-right font-mono text-sm text-ink-100">
                        {line.line_type === 'free_gift' ? 'Gift' : formatCurrency(lineTotal(line))}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/15 px-4 py-7 text-center text-sm text-ink-400">
              Add one or more available sale offers. Pending orders never reserve their stock.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
            <p className="text-xs text-ink-400">Gift requests remain zero-priced until a manager explicitly approves or removes them.</p>
            <p className="font-mono text-sm text-ink-100">Estimated sale total: {formatCurrency(estimatedTotal)}</p>
          </div>
        </section>

        <Textarea label="Order notes" rows={2} value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
      </form>
    </Modal>
  );
}
