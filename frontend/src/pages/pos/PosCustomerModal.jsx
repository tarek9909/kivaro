import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui/index.js';

function emptyForm() {
  return {
    customer_code: '',
    name: '',
    phone: '',
    secondary_phone: '',
    territory_key: '',
    address: '',
    detailed_address: '',
    notes: ''
  };
}

function territoryKey(territory) {
  return `${territory.location_id}:${territory.sublocation_id}`;
}

/**
 * Customers created in Mini POS are intentionally limited to the signed-in
 * salesman's own territories.  The backend repeats this validation.
 */
export function PosCustomerModal({ open, onClose, territories = [], onCreated }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  const territoryOptions = useMemo(
    () => territories.map((territory) => ({
      ...territory,
      key: territoryKey(territory),
      label: `${territory.location_name} — ${territory.sublocation_name}`
    })),
    [territories]
  );

  useEffect(() => {
    if (!open) return;
    setForm((current) => ({
      ...emptyForm(),
      territory_key: territoryOptions.length === 1 ? territoryOptions[0].key : ''
    }));
    setErrors({});
  }, [open, territoryOptions]);

  const mutation = useMutation({
    mutationFn: (payload) => api.pos.customers.create(payload),
    onSuccess: (response) => {
      const customer = response?.data?.customer;
      toast.success('Customer created and assigned to you');
      queryClient.invalidateQueries({ queryKey: ['pos', 'customers'] });
      onCreated?.(customer);
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not create this customer.'));
    }
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submit(event) {
    event.preventDefault();
    const territory = territoryOptions.find((option) => option.key === form.territory_key);
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Customer name is required.';
    if (!territory) nextErrors.territory_key = 'Choose one of your assigned territories.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    mutation.mutate({
      customer_code: form.customer_code.trim() || null,
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      secondary_phone: form.secondary_phone.trim() || null,
      location_id: Number(territory.location_id),
      sublocation_id: Number(territory.sublocation_id),
      address: form.address.trim() || null,
      detailed_address: form.detailed_address.trim() || null,
      notes: form.notes.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Mini POS customer"
      description="The customer is automatically assigned to you and must be placed in one of your assigned territories."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="pos-customer-form" isLoading={mutation.isPending}>Create customer</Button>
        </>
      }
    >
      <form id="pos-customer-form" className="space-y-4" onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Customer name"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            error={errors.name}
            required
          />
          <Input
            label="Customer code"
            value={form.customer_code}
            onChange={(event) => update('customer_code', event.target.value)}
            description="Optional"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Phone" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
          <Input label="Secondary phone" value={form.secondary_phone} onChange={(event) => update('secondary_phone', event.target.value)} />
        </div>

        <Select
          label="Your territory"
          value={form.territory_key}
          onChange={(event) => update('territory_key', event.target.value)}
          error={errors.territory_key}
          description="Only territories assigned to you are available."
        >
          <option value="">Select territory</option>
          {territoryOptions.map((territory) => (
            <option key={territory.key} value={territory.key}>{territory.label}</option>
          ))}
        </Select>

        {!territoryOptions.length && (
          <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
            You do not have an active territory assignment yet. Ask a manager to assign a location before creating POS customers.
          </p>
        )}

        <Input label="Address" value={form.address} onChange={(event) => update('address', event.target.value)} />
        <Textarea label="Detailed address" rows={2} value={form.detailed_address} onChange={(event) => update('detailed_address', event.target.value)} />
        <Textarea label="Notes" rows={2} value={form.notes} onChange={(event) => update('notes', event.target.value)} />
      </form>
    </Modal>
  );
}
