import { useEffect, useState } from 'react';
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
import { STATUSES } from './locations.config.js';
import { useLocationsList } from './useLocationsOptions.js';

function emptyForm(sublocation, defaultLocationId) {
  return {
    location_id:
      sublocation?.location_id !== null && sublocation?.location_id !== undefined
        ? String(sublocation.location_id)
        : defaultLocationId
        ? String(defaultLocationId)
        : '',
    name: sublocation?.name ?? '',
    code: sublocation?.code ?? '',
    description: sublocation?.description ?? '',
    status: sublocation?.status ?? 'active'
  };
}

export function SublocationFormModal({ open, onClose, sublocation, defaultLocationId }) {
  const isEdit = Boolean(sublocation);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(sublocation, defaultLocationId));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(sublocation, defaultLocationId));
    setErrors({});
  }, [open, sublocation, defaultLocationId]);

  const locationsQuery = useLocationsList(open);
  const locations = locationsQuery.data?.data?.locations || [];

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.locations.sublocations.update(sublocation.id, payload)
        : api.locations.sublocations.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Sublocation updated' : 'Sublocation created');
      queryClient.invalidateQueries({ queryKey: ['locations', 'sublocations'] });
      queryClient.invalidateQueries({
        queryKey: ['locations', 'options', 'sublocations']
      });
      queryClient.invalidateQueries({ queryKey: ['locations', 'location-sublocations'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save sublocation.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    const locationId = Number(form.location_id);
    if (!form.location_id || Number.isNaN(locationId) || locationId <= 0) {
      next.location_id = 'Location is required.';
    }
    if (!form.name?.trim()) next.name = 'Name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      location_id: Number(form.location_id),
      name: form.name.trim(),
      code: form.code?.trim() || null,
      description: form.description?.trim() || null,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit sublocation' : 'New sublocation'}
      description="Sublocations belong to a location. Salesmen are assigned to sublocations to receive routes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="sublocation-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create sublocation'}
          </Button>
        </>
      }
    >
      <form id="sublocation-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => handleChange('name', event.target.value)}
            error={errors.name}
            required
          />
          <Input
            label="Code"
            value={form.code || ''}
            onChange={(event) => handleChange('code', event.target.value)}
            error={errors.code}
          />
        </div>
        <Select
          label="Status"
          value={form.status}
          onChange={(event) => handleChange('status', event.target.value)}
          error={errors.status}
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Textarea
          label="Description"
          value={form.description || ''}
          onChange={(event) => handleChange('description', event.target.value)}
          rows={3}
        />
      </form>
    </Modal>
  );
}
