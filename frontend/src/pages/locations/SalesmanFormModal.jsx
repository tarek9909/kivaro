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
  Switch
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
    base_salary: salesman?.base_salary ?? 0,
    joined_at: salesman?.joined_at ? String(salesman.joined_at).slice(0, 10) : '',
    status: salesman?.status ?? 'active',
    create_login_user: false,
    password: ''
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
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save salesman.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'create_login_user' && value ? { user_id: '' } : {}),
      ...(field === 'create_login_user' && !value ? { password: '' } : {})
    }));
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
    if (form.base_salary === '' || Number.isNaN(Number(form.base_salary)) || Number(form.base_salary) < 0) {
      next.base_salary = 'Base salary cannot be negative.';
    }
    if (!isEdit && form.create_login_user && (!form.password || form.password.length < 8)) {
      next.password = 'Password must be at least 8 characters.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      user_id: form.user_id ? Number(form.user_id) : null,
      full_name: form.full_name.trim(),
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      vehicle_number: form.vehicle_number?.trim() || null,
      national_id: form.national_id?.trim() || null,
      base_salary: Number(form.base_salary) || 0,
      joined_at: form.joined_at || null,
      status: form.status
    };
    if (!isEdit && form.create_login_user) {
      payload.create_login_user = true;
      payload.password = form.password;
    }
    mutation.mutate(payload);
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
        <Input
          label="Base salary"
          type="number"
          min="0"
          step="0.0001"
          value={form.base_salary}
          onChange={(event) => handleChange('base_salary', event.target.value)}
          error={errors.base_salary}
          description="Monthly base salary used in salesman reports."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="User ID"
            type="number"
            min="1"
            value={form.user_id}
            onChange={(event) => handleChange('user_id', event.target.value)}
            error={errors.user_id}
            description="Optional. Link to a system user account."
            disabled={!isEdit && form.create_login_user}
          />
          <Input
            label="Joined date"
            type="date"
            value={form.joined_at || ''}
            onChange={(event) => handleChange('joined_at', event.target.value)}
            error={errors.joined_at}
          />
        </div>
        {!isEdit && (
          <Switch
            checked={form.create_login_user}
            onChange={(checked) => handleChange('create_login_user', checked)}
            label="Create login user"
            description="Add this salesman to Users with the salesman role and link the records automatically."
          />
        )}
        {!isEdit && form.create_login_user && (
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(event) => handleChange('password', event.target.value)}
            error={errors.password}
            autoComplete="new-password"
            description="Minimum 8 characters."
            required
          />
        )}
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
