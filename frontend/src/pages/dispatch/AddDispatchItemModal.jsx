import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Button, Input, Modal, Select } from '@/components/ui/index.js';
import { useVariantsOptions } from '@/pages/inventory/useInventoryOptions.js';
import { formatNumber } from '@/lib/formatters.js';

const INVENTORY_VIEW = 'inventory.view';

export function AddDispatchItemModal({
  open,
  onClose,
  dispatchCustomer,
  dispatchRequestId,
  dispatchRequest
}) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickInventory = hasPermission(INVENTORY_VIEW);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    packaging_assignment_id: '',
    item_variant_id: '',
    quantity: '',
    unit_price: '',
    unit_cost: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({ packaging_assignment_id: '', item_variant_id: '', quantity: '', unit_price: '', unit_cost: '' });
    setErrors({});
  }, [open, dispatchCustomer?.id]);

  const variantsQuery = useVariantsOptions(open && canPickInventory, { tracking_type: 'stocked' });
  const variants = variantsQuery.data?.data?.item_variants || [];
  const assignmentsQuery = useQuery({
    queryKey: ['inventory', 'packaging', 'assignments', 'dispatchable', dispatchRequest?.warehouse_id],
    queryFn: () => api.inventory.packagingAssignments.list({
      page: 1,
      limit: 100,
      status: 'consumed',
      warehouse_id: dispatchRequest?.warehouse_id
    }),
    enabled: Boolean(open && canPickInventory && dispatchRequest?.warehouse_id)
  });
  const assignments = assignmentsQuery.data?.data?.packaging_assignments || [];
  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => String(assignment.id) === String(form.packaging_assignment_id)),
    [assignments, form.packaging_assignment_id]
  );
  const vatQuery = useQuery({
    queryKey: ['vat-settings'],
    queryFn: () => api.settings.vat.get(),
    enabled: Boolean(open),
    staleTime: 60_000
  });
  const vat = vatQuery.data?.data?.vat;
  const vatEnabled = Boolean(vat?.enabled);
  const vatRate = vatEnabled ? Number(vat?.rate || 0) : 0;
  const subtotalPreview = Number(form.quantity || 0) * Number(form.unit_price || 0);
  const vatPreview = vatEnabled ? (subtotalPreview * vatRate) / 100 : 0;
  const totalPreview = subtotalPreview + vatPreview;

  const mutation = useMutation({
    mutationFn: (payload) => api.dispatch.customers.addItem(dispatchCustomer.id, payload),
    onSuccess: () => {
      toast.success('Item added');
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequestId] });
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not add item.'));
    }
  });

  function validate() {
    const next = {};
    const variantId = Number(form.item_variant_id);
    if (!form.item_variant_id || Number.isNaN(variantId) || variantId <= 0) {
      next.item_variant_id = 'Variant is required.';
    }
    const qty = Number(form.quantity);
    if (!form.quantity || Number.isNaN(qty) || qty <= 0) {
      next.quantity = 'Quantity must be greater than zero.';
    }
    if (selectedAssignment && qty > Number(selectedAssignment.available_quantity || 0)) {
      next.quantity = `Only ${formatNumber(selectedAssignment.available_quantity)} primary containers are available.`;
    }
    if (form.unit_price === '' || Number.isNaN(Number(form.unit_price)) || Number(form.unit_price) < 0) {
      next.unit_price = 'Unit price is required.';
    }
    if (form.unit_cost !== '' && Number(form.unit_cost) < 0) {
      next.unit_cost = 'Unit cost cannot be negative.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      item_variant_id: Number(form.item_variant_id),
      quantity: Number(form.quantity),
      unit_price: Number(form.unit_price)
    };
    if (form.packaging_assignment_id) {
      payload.packaging_assignment_id = Number(form.packaging_assignment_id);
    }
    if (form.unit_cost !== '') payload.unit_cost = Number(form.unit_cost);
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        dispatchCustomer
          ? `Add item for ${dispatchCustomer.customer_name || `customer #${dispatchCustomer.customer_id}`}`
          : 'Add dispatch item'
      }
      description="Add a line item to this customer for the route. Assignment batches are requested by primary-container count."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="add-dispatch-item-form" isLoading={mutation.isPending}>
            Add item
          </Button>
        </>
      }
    >
      <form
        id="add-dispatch-item-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        {canPickInventory && (
          <Select
            label="Assignment batch"
            value={form.packaging_assignment_id}
            onChange={(event) => {
              const assignment = assignments.find((entry) => String(entry.id) === String(event.target.value));
              setForm((prev) => ({
                ...prev,
                packaging_assignment_id: event.target.value,
                item_variant_id: assignment?.output_item_variant_id ? String(assignment.output_item_variant_id) : prev.item_variant_id
              }));
              setErrors((prev) => ({ ...prev, packaging_assignment_id: undefined, item_variant_id: undefined, quantity: undefined }));
            }}
            description={selectedAssignment ? `${formatNumber(selectedAssignment.available_quantity)} primary containers available` : undefined}
          >
            <option value="">No assignment batch</option>
            {assignments.map((assignment) => (
              <option
                key={assignment.id}
                value={assignment.id}
                disabled={Number(assignment.available_quantity || 0) <= 0}
              >
                Assignment #{assignment.id} - {assignment.output_item_name || 'Output'} {assignment.output_variant_name || ''} ({formatNumber(assignment.available_quantity)} available)
              </option>
            ))}
          </Select>
        )}
        {canPickInventory ? (
          <Select
            label="Variant"
            value={form.item_variant_id}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, item_variant_id: event.target.value, packaging_assignment_id: '' }))
            }
            error={errors.item_variant_id}
            required
            disabled={Boolean(form.packaging_assignment_id)}
          >
            <option value="">Select variant</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.item_name} - {variant.variant_name} ({variant.sku})
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Variant ID"
            type="number"
            min="1"
            value={form.item_variant_id}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, item_variant_id: event.target.value, packaging_assignment_id: '' }))
            }
            error={errors.item_variant_id}
            required
            description="Numeric only."
          />
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Quantity (base unit)"
            type="number"
            min="0"
            step="0.0001"
            value={form.quantity}
            onChange={(event) => setForm((prev) => ({ ...prev, quantity: event.target.value }))}
            error={errors.quantity}
            required
          />
          <Input
            label={vatEnabled ? 'Unit price excluding VAT' : 'Unit price'}
            type="number"
            min="0"
            step="0.0001"
            value={form.unit_price}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, unit_price: event.target.value }))
            }
            error={errors.unit_price}
            required
          />
          <Input
            label="Unit cost"
            type="number"
            min="0"
            step="0.0001"
            value={form.unit_cost}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, unit_cost: event.target.value }))
            }
            error={errors.unit_cost}
            description="Optional. Defaults to the variant cost."
          />
        </div>
        {vatEnabled && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-ink-300">Subtotal</span>
              <span className="font-mono text-ink-100">{formatNumber(subtotalPreview)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-ink-300">VAT {formatNumber(vatRate)}%</span>
              <span className="font-mono text-ink-100">{formatNumber(vatPreview)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-2">
              <span className="font-medium text-ink-100">Total</span>
              <span className="font-mono font-medium text-ink-50">{formatNumber(totalPreview)}</span>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
