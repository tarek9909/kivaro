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

function emptyForm(location) {
  return {
    name: location?.name ?? '',
    code: location?.code ?? '',
    description: location?.description ?? '',
    status: location?.status ?? 'active'
  };
}

export function LocationFormModal({ open, onClose, location }) {
  const isEdit = Boolean(location);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(location));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(location));
    setErrors({});
  }, [open, location]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.locations.locations.update(location.id, payload)
        : api.locations.locations.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Location updated' : 'Location created');
      queryClient.invalidateQueries({ queryKey: ['locations', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['locations', 'options', 'locations'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save location.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name?.trim()) next.name = 'Name is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
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
      title={isEdit ? 'Edit location' : 'New location'}
      description="Locations are the top-level sales territories that group sublocations, salesmen, and targets."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="location-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create location'}
          </Button>
        </>
      }
    >
      <form id="location-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
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
