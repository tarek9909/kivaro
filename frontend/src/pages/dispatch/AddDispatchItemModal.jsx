import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Button, Input, Modal, Select } from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';

const ENTRY_LABELS = {
  normal_carton: 'Normal — sealed carton',
  normal_loose_unit: 'Normal — loose unit',
  normal_weight: 'Normal — weight',
  normal_piece: 'Normal — piece',
  ready_outer_carton: 'Ready stock — outer carton',
  ready_inner_unit: 'Ready stock — inner bag'
};

const WHOLE_QUANTITY_TYPES = new Set([
  'normal_carton',
  'normal_loose_unit',
  'normal_piece',
  'ready_outer_carton',
  'ready_inner_unit'
]);

function emptyForm(dispatchItem = null) {
  return {
    sale_catalog_entry_id: dispatchItem?.sale_catalog_entry_id ? String(dispatchItem.sale_catalog_entry_id) : '',
    quantity: dispatchItem?.quantity === undefined || dispatchItem?.quantity === null ? '' : String(dispatchItem.quantity),
    unit_price: dispatchItem?.unit_price === undefined || dispatchItem?.unit_price === null ? '' : String(dispatchItem.unit_price),
    line_type: dispatchItem?.line_type || 'sale'
  };
}

function offerName(offer) {
  return offer?.display_name || offer?.item_name || offer?.packaging_group_name || `Offer #${offer?.id}`;
}

/**
 * Lines identify a sale-catalog entry only.  The backend selects and locks
 * actual cartons, shelf units, or ready containers during approval, so a
 * draft never claims a client-calculated source or availability quantity.
 */
export function AddDispatchItemModal({
  open,
  onClose,
  dispatchCustomer,
  dispatchRequestId,
  dispatchRequest,
  dispatchItem = null
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(dispatchItem));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(dispatchItem));
    setErrors({});
  }, [open, dispatchCustomer?.id, dispatchItem]);

  const catalogQuery = useQuery({
    queryKey: ['packaging', 'sale-catalog', 'dispatch', dispatchRequest?.warehouse_id],
    queryFn: () => api.packaging.saleCatalog.list({
      page: 1,
      limit: 250,
      status: 'active',
      warehouse_id: dispatchRequest?.warehouse_id
    }),
    enabled: Boolean(open && dispatchRequest?.warehouse_id)
  });
  const offers = catalogQuery.data?.data?.sale_catalog_entries || [];
  const selectedOffer = useMemo(
    () => offers.find((offer) => String(offer.id) === String(form.sale_catalog_entry_id)),
    [form.sale_catalog_entry_id, offers]
  );
  const isWholeQuantity = WHOLE_QUANTITY_TYPES.has(selectedOffer?.entry_type);
  const isGift = form.line_type === 'free_gift';
  const quantityPreview = Number(form.quantity || 0);
  const pricePreview = isGift ? 0 : Number(form.unit_price || 0);
  const subtotal = quantityPreview * pricePreview;
  const vatRate = isGift ? 0 : Number(selectedOffer?.vat_rate || 0);
  const vat = subtotal * vatRate / 100;

  const mutation = useMutation({
    mutationFn: (payload) => (
      dispatchItem
        ? api.dispatch.items.update(dispatchItem.id, payload)
        : api.dispatch.customers.addItem(dispatchCustomer.id, payload)
    ),
    onSuccess: () => {
      toast.success(dispatchItem ? 'Dispatch line updated' : isGift ? 'Gift line added' : 'Dispatch line added');
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequestId] });
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, dispatchItem ? 'Could not update the dispatch line.' : 'Could not add the dispatch line.'));
    }
  });

  function change(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'sale_catalog_entry_id') {
        const offer = offers.find((entry) => String(entry.id) === String(value));
        next.unit_price = offer?.default_price === undefined || offer?.default_price === null
          ? ''
          : String(offer.default_price);
      }
      return next;
    });
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.sale_catalog_entry_id || !selectedOffer) {
      next.sale_catalog_entry_id = 'Choose an active sale offer.';
    }
    const parsedQuantity = Number(form.quantity);
    if (!form.quantity || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      next.quantity = 'Quantity must be greater than zero.';
    } else if (isWholeQuantity && !Number.isInteger(parsedQuantity)) {
      next.quantity = 'This offer must be sold or gifted in whole units.';
    }
    if (!isGift && (form.unit_price === '' || !Number.isFinite(Number(form.unit_price)) || Number(form.unit_price) < 0)) {
      next.unit_price = 'Enter a non-negative unit price.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      sale_catalog_entry_id: Number(form.sale_catalog_entry_id),
      quantity: Number(form.quantity),
      line_type: form.line_type
    };
    if (!isGift) payload.unit_price = Number(form.unit_price);
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={dispatchItem ? `Edit line for ${dispatchCustomer?.customer_name || 'customer'}` : dispatchCustomer ? `Add line for ${dispatchCustomer.customer_name || 'customer'}` : 'Add dispatch line'}
      description={dispatchItem ? 'Update the draft line before resubmitting. The next invoice revision snapshots the corrected offer, price, VAT, and gift status.' : 'Choose a configured sale offer. Availability, costs, carton opening, and ready-container allocation are verified by the server at approval.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="add-dispatch-item-form" isLoading={mutation.isPending}>
            {dispatchItem ? 'Save line' : isGift ? 'Add gift' : 'Add line'}
          </Button>
        </>
      }
    >
      <form id="add-dispatch-item-form" onSubmit={submit} className="space-y-4" noValidate>
        {dispatchCustomer && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">Customer</p>
            <p className="mt-1 font-medium text-ink-50">{dispatchCustomer.customer_name || `Customer #${dispatchCustomer.customer_id}`}</p>
            <p className="mt-0.5 text-xs text-ink-400">
              {[dispatchCustomer.location_name, dispatchCustomer.sublocation_name].filter(Boolean).join(' · ') || 'No territory label'}
            </p>
          </div>
        )}

        <Select
          label="Sale offer"
          value={form.sale_catalog_entry_id}
          onChange={(event) => change('sale_catalog_entry_id', event.target.value)}
          error={errors.sale_catalog_entry_id}
          required
          disabled={catalogQuery.isPending}
        >
          <option value="">{catalogQuery.isPending ? 'Loading offers…' : 'Select sale offer'}</option>
          {offers.map((offer) => (
            <option key={offer.id} value={offer.id}>
              {offerName(offer)} — {ENTRY_LABELS[offer.entry_type] || offer.entry_type}
            </option>
          ))}
        </Select>
        {catalogQuery.isError && (
          <p className="text-xs text-danger-300">
            {getErrorMessage(catalogQuery.error, 'Could not load the sale catalogue.')}
          </p>
        )}

        <Select
          label="Line type"
          value={form.line_type}
          onChange={(event) => change('line_type', event.target.value)}
          description="Free gifts remain visible on the invoice and dispatch history but are issued at zero price."
        >
          <option value="sale">Sale</option>
          <option value="free_gift">Free gift</option>
        </Select>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={`Quantity${selectedOffer?.unit_label ? ` (${selectedOffer.unit_label})` : ''}`}
            type="number"
            min="0"
            step={isWholeQuantity ? '1' : '0.0001'}
            inputMode="decimal"
            value={form.quantity}
            onChange={(event) => change('quantity', event.target.value)}
            error={errors.quantity}
            required
            description={isWholeQuantity ? 'Whole units only.' : 'Weight may use decimal quantities.'}
          />
          <Input
            label={isGift ? 'Unit price' : `Unit price${selectedOffer?.vat_rate ? ` (VAT ${formatNumber(selectedOffer.vat_rate)}%)` : ''}`}
            type="number"
            min="0"
            step="0.0001"
            inputMode="decimal"
            value={isGift ? '0' : form.unit_price}
            onChange={(event) => change('unit_price', event.target.value)}
            error={errors.unit_price}
            disabled={isGift}
            required={!isGift}
            description={isGift ? 'Zero by policy.' : 'Starts from the offer default; override only when allowed.'}
          />
        </div>

        {selectedOffer && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            <div className="flex justify-between gap-3"><span className="text-ink-300">Offer type</span><span className="text-ink-100">{ENTRY_LABELS[selectedOffer.entry_type] || selectedOffer.entry_type}</span></div>
            <div className="mt-1 flex justify-between gap-3"><span className="text-ink-300">Subtotal</span><span className="font-mono text-ink-100">{formatNumber(subtotal, { maximumFractionDigits: 4 })}</span></div>
            <div className="mt-1 flex justify-between gap-3"><span className="text-ink-300">VAT</span><span className="font-mono text-ink-100">{formatNumber(vat, { maximumFractionDigits: 4 })}</span></div>
            <div className="mt-2 flex justify-between gap-3 border-t border-white/10 pt-2"><span className="font-medium text-ink-100">Line total</span><span className="font-mono font-medium text-ink-50">{formatNumber(subtotal + vat, { maximumFractionDigits: 4 })}</span></div>
          </div>
        )}
      </form>
    </Modal>
  );
}
