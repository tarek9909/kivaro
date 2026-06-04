import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select,
  Textarea
} from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';

function getRemainingReturnable(item) {
  if (!item) return 0;
  const quantity = Number(item.quantity || 0);
  const returned = Number(item.returned_quantity || 0);
  const remaining = quantity - returned;
  return remaining > 0 ? remaining : 0;
}

/**
 * Record a return for a dispatched item. Items must belong to the dispatch
 * request that is open in the drawer; the picker is built from the loaded
 * request so we never need a separate items endpoint.
 */
export function CreateReturnModal({ open, onClose, dispatchRequest }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    dispatch_item_id: '',
    returned_quantity: '',
    reason: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({ dispatch_item_id: '', returned_quantity: '', reason: '' });
    setErrors({});
  }, [open, dispatchRequest?.id]);

  const items = dispatchRequest?.items || [];
  const customersById = useMemo(() => {
    const map = new Map();
    for (const customer of dispatchRequest?.customers || []) {
      map.set(Number(customer.id), customer);
    }
    return map;
  }, [dispatchRequest?.customers]);

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === String(form.dispatch_item_id)),
    [items, form.dispatch_item_id]
  );
  const remaining = getRemainingReturnable(selectedItem);

  const mutation = useMutation({
    mutationFn: (payload) => api.dispatch.requests.createReturn(dispatchRequest.id, payload),
    onSuccess: () => {
      toast.success('Return recorded');
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequest.id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not record return.'));
    }
  });

  function validate() {
    const next = {};
    const itemId = Number(form.dispatch_item_id);
    if (!form.dispatch_item_id || Number.isNaN(itemId) || itemId <= 0) {
      next.dispatch_item_id = 'Item is required.';
    }
    const qty = Number(form.returned_quantity);
    if (!form.returned_quantity || Number.isNaN(qty) || qty <= 0) {
      next.returned_quantity = 'Returned quantity must be greater than zero.';
    } else if (selectedItem && qty > remaining + 1e-9) {
      next.returned_quantity = `At most ${formatNumber(remaining, {
        maximumFractionDigits: 4
      })} can still be returned for this line.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      dispatch_item_id: Number(form.dispatch_item_id),
      returned_quantity: Number(form.returned_quantity),
      reason: form.reason?.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Record return"
      description="Record stock that came back from the salesman. Returns reverse the dispatched stock for this customer line."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="dispatch-return-form"
            isLoading={mutation.isPending}
          >
            Record return
          </Button>
        </>
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-ink-300">
          This dispatch request has no items, so there is nothing to return.
        </p>
      ) : (
        <form id="dispatch-return-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Select
            label="Item to return"
            value={form.dispatch_item_id}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, dispatch_item_id: event.target.value }))
            }
            error={errors.dispatch_item_id}
            required
          >
            <option value="">Select item</option>
            {items.map((item) => {
              const customer = customersById.get(Number(item.dispatch_customer_id));
              const remainingForOption = getRemainingReturnable(item);
              const customerLabel = customer?.customer_name || `customer #${item.dispatch_customer_id}`;
              const variantLabel =
                item.item_name && item.variant_name
                  ? `${item.item_name} - ${item.variant_name}`
                  : item.sku || `variant #${item.item_variant_id}`;
              return (
                <option key={item.id} value={item.id}>
                  {`${customerLabel} - ${variantLabel} (${formatNumber(remainingForOption, {
                    maximumFractionDigits: 4
                  })} returnable)`}
                </option>
              );
            })}
          </Select>

          {selectedItem && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-ink-300">
              Dispatched quantity:{' '}
              <span className="font-mono text-ink-100">
                {formatNumber(selectedItem.quantity, { maximumFractionDigits: 4 })}
              </span>
              {'  '}
              Already returned:{' '}
              <span className="font-mono text-ink-100">
                {formatNumber(selectedItem.returned_quantity, { maximumFractionDigits: 4 })}
              </span>
              {'  '}
              Remaining:{' '}
              <span className="font-mono text-ink-100">
                {formatNumber(remaining, { maximumFractionDigits: 4 })}
              </span>
            </div>
          )}

          <Input
            label="Returned quantity"
            type="number"
            min="0"
            step="0.0001"
            value={form.returned_quantity}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, returned_quantity: event.target.value }))
            }
            error={errors.returned_quantity}
            required
          />
          <Textarea
            label="Reason"
            value={form.reason}
            onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            rows={3}
          />
        </form>
      )}
    </Modal>
  );
}
