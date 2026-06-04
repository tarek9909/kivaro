import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select
} from '@/components/ui/index.js';
import { STATUSES } from './locations.config.js';

function emptyForm(salesman) {
  return {
    full_name: salesman?.full_name ?? '',
    user_id:
      salesman?.user_id !== null && salesman?.user_id !== undefined
        ? String(salesman.user_id)
        : '',
    phone: salesman?.phone ?? '',
    email: salesman?.email ?? '',
    vehicle_number: salesman?.vehicle_number ?? '',
    national_id: salesman?.national_id ?? '',
    joined_at: salesman?.joined_at ? String(salesman.joined_at).slice(0, 10) : '',
    status: salesman?.status ?? 'active'
  };
}

export function SalesmanFormModal({ open, onClose, salesman }) {
  const isEdit = Boolean(salesman);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(salesman));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(salesman));
    setErrors({});
  }, [open, salesman]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.locations.salesmen.update(salesman.id, payload)
        : api.locations.salesmen.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Salesman updated' : 'Salesman created');
      queryClient.invalidateQueries({ queryKey: ['locations', 'salesmen'] });
      queryClient.invalidateQueries({ queryKey: ['locations', 'options', 'salesmen'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save salesman.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.full_name?.trim()) next.full_name = 'Full name is required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Invalid email address.';
    }
    if (form.user_id && Number.isNaN(Number(form.user_id))) {
      next.user_id = 'User ID must be numeric.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      user_id: form.user_id ? Number(form.user_id) : null,
      full_name: form.full_name.trim(),
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      vehicle_number: form.vehicle_number?.trim() || null,
      national_id: form.national_id?.trim() || null,
      joined_at: form.joined_at || null,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit salesman' : 'New salesman'}
      description="Salesmen are the field operators that cover sublocations and serve customer routes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="salesman-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create salesman'}
          </Button>
        </>
      }
    >
      <form id="salesman-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          value={form.full_name}
          onChange={(event) => handleChange('full_name', event.target.value)}
          error={errors.full_name}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            value={form.phone || ''}
            onChange={(event) => handleChange('phone', event.target.value)}
            error={errors.phone}
          />
          <Input
            label="Email"
            type="email"
            value={form.email || ''}
            onChange={(event) => handleChange('email', event.target.value)}
            error={errors.email}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Vehicle number"
            value={form.vehicle_number || ''}
            onChange={(event) => handleChange('vehicle_number', event.target.value)}
            error={errors.vehicle_number}
          />
          <Input
            label="National ID"
            value={form.national_id || ''}
            onChange={(event) => handleChange('national_id', event.target.value)}
            error={errors.national_id}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="User ID"
            type="number"
            min="1"
            value={form.user_id}
            onChange={(event) => handleChange('user_id', event.target.value)}
            error={errors.user_id}
            description="Optional. Link to a system user account."
          />
          <Input
            label="Joined date"
            type="date"
            value={form.joined_at || ''}
            onChange={(event) => handleChange('joined_at', event.target.value)}
            error={errors.joined_at}
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
      </form>
    </Modal>
  );
}
