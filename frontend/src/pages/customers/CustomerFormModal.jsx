import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select,
  Textarea
} from '@/components/ui/index.js';
import {
  useLocationsList,
  useSalesmenList,
  useSublocationsList
} from '@/pages/locations/useLocationsOptions.js';
import { LOCATIONS_PERMISSIONS } from '@/pages/locations/locations.config.js';
import { CUSTOMER_STATUSES } from './customers.config.js';

function emptyForm(customer) {
  return {
    customer_code: customer?.customer_code ?? '',
    name: customer?.name ?? '',
    phone: customer?.phone ?? '',
    secondary_phone: customer?.secondary_phone ?? '',
    location_id:
      customer?.location_id !== null && customer?.location_id !== undefined
        ? String(customer.location_id)
        : '',
    sublocation_id:
      customer?.sublocation_id !== null && customer?.sublocation_id !== undefined
        ? String(customer.sublocation_id)
        : '',
    assigned_salesman_id:
      customer?.assigned_salesman_id !== null && customer?.assigned_salesman_id !== undefined
        ? String(customer.assigned_salesman_id)
        : '',
    address: customer?.address ?? '',
    detailed_address: customer?.detailed_address ?? '',
    notes: customer?.notes ?? '',
    status: customer?.status ?? 'active'
  };
}

export function CustomerFormModal({ open, onClose, customer }) {
  const isEdit = Boolean(customer);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(() => emptyForm(customer));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(customer));
    setErrors({});
  }, [open, customer]);

  const locationsQuery = useLocationsList(open);
  const sublocationsQuery = useSublocationsList(open);
  const salesmenQuery = useSalesmenList(open);

  const locations = locationsQuery.data?.data?.locations || [];
  const sublocationsAll = sublocationsQuery.data?.data?.sublocations || [];
  const salesmen = salesmenQuery.data?.data?.salesmen || [];

  // Filter sublocations to the selected location for an obvious dependency.
  const sublocations = useMemo(
    () =>
      form.location_id
        ? sublocationsAll.filter(
            (sublocation) =>
              Number(sublocation.location_id) === Number(form.location_id)
          )
        : sublocationsAll,
    [sublocationsAll, form.location_id]
  );

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.customers.update(customer.id, payload)
        : api.customers.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Customer updated' : 'Customer created');
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
      if (customer?.id) {
        queryClient.invalidateQueries({ queryKey: ['customers', 'customer', customer.id] });
      }
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save customer.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Clear sublocation when location changes so the picker re-aligns.
      if (field === 'location_id' && next.sublocation_id) {
        const stillValid = sublocationsAll.some(
          (sub) =>
            String(sub.id) === String(next.sublocation_id) &&
            String(sub.location_id) === String(value)
        );
        if (!stillValid) next.sublocation_id = '';
      }
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name?.trim()) next.name = 'Name is required.';
    const locationId = Number(form.location_id);
    if (!form.location_id || Number.isNaN(locationId) || locationId <= 0) {
      next.location_id = 'Location is required.';
    }
    const sublocationId = Number(form.sublocation_id);
    if (!form.sublocation_id || Number.isNaN(sublocationId) || sublocationId <= 0) {
      next.sublocation_id = 'Sublocation is required.';
    }
    if (
      form.assigned_salesman_id &&
      Number.isNaN(Number(form.assigned_salesman_id))
    ) {
      next.assigned_salesman_id = 'Salesman ID must be numeric.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      customer_code: form.customer_code?.trim() || null,
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      secondary_phone: form.secondary_phone?.trim() || null,
      location_id: Number(form.location_id),
      sublocation_id: Number(form.sublocation_id),
      assigned_salesman_id: form.assigned_salesman_id
        ? Number(form.assigned_salesman_id)
        : null,
      address: form.address?.trim() || null,
      detailed_address: form.detailed_address?.trim() || null,
      notes: form.notes?.trim() || null,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit customer' : 'New customer'}
      description="Customers are the consumers and shops served by salesmen on routes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create customer'}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => handleChange('name', event.target.value)}
            error={errors.name}
            required
          />
          <Input
            label="Customer code"
            value={form.customer_code || ''}
            onChange={(event) => handleChange('customer_code', event.target.value)}
            error={errors.customer_code}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Phone"
            value={form.phone || ''}
            onChange={(event) => handleChange('phone', event.target.value)}
            error={errors.phone}
          />
          <Input
            label="Secondary phone"
            value={form.secondary_phone || ''}
            onChange={(event) => handleChange('secondary_phone', event.target.value)}
            error={errors.secondary_phone}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Location"
            value={form.location_id}
            onChange={(event) => handleChange('location_id', event.target.value)}
            error={errors.location_id}
            required
          >
            <option value="">Select location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
          <Select
            label="Sublocation"
            value={form.sublocation_id}
            onChange={(event) => handleChange('sublocation_id', event.target.value)}
            error={errors.sublocation_id}
            required
            disabled={!form.location_id}
            description={
              form.location_id ? undefined : 'Select a location first.'
            }
          >
            <option value="">Select sublocation</option>
            {sublocations.map((sublocation) => (
              <option key={sublocation.id} value={sublocation.id}>
                {sublocation.name}
              </option>
            ))}
          </Select>
        </div>

        <Select
          label="Assigned salesman"
          value={form.assigned_salesman_id}
          onChange={(event) => handleChange('assigned_salesman_id', event.target.value)}
          error={errors.assigned_salesman_id}
          description="Optional. Pick the salesman that owns this customer."
        >
          <option value="">No salesman</option>
          {salesmen.map((salesman) => (
            <option key={salesman.id} value={salesman.id}>
              {salesman.full_name}
            </option>
          ))}
        </Select>

        <Input
          label="Address"
          value={form.address || ''}
          onChange={(event) => handleChange('address', event.target.value)}
          error={errors.address}
        />
        <Textarea
          label="Detailed address"
          value={form.detailed_address || ''}
          onChange={(event) => handleChange('detailed_address', event.target.value)}
          rows={2}
        />
        <Textarea
          label="Notes"
          value={form.notes || ''}
          onChange={(event) => handleChange('notes', event.target.value)}
          rows={2}
        />

        <Select
          label="Status"
          value={form.status}
          onChange={(event) => handleChange('status', event.target.value)}
          error={errors.status}
        >
          {CUSTOMER_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}
