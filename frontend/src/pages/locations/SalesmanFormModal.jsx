import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    phone: salesman?.phone ?? '',
    email: salesman?.email ?? '',
    vehicle_number: salesman?.vehicle_number ?? '',
    national_id: salesman?.national_id ?? '',
    base_salary: salesman?.base_salary ?? 0,
    salary_effective_from: new Date().toISOString().slice(0, 10),
    commission_rule_id: salesman?.commission_rule_id ? String(salesman.commission_rule_id) : '',
    joined_at: salesman?.joined_at ? String(salesman.joined_at).slice(0, 10) : '',
    employment_end_date: salesman?.employment_end_date ? String(salesman.employment_end_date).slice(0, 10) : '',
    status: salesman?.status ?? 'active',
    password: ''
  };
}

export function SalesmanFormModal({ open, onClose, salesman }) {
  const isEdit = Boolean(salesman);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(salesman));
  const [errors, setErrors] = useState({});
  const rulesQuery = useQuery({
    queryKey: ['commissions', 'options', 'rules'],
    queryFn: () => api.commissions.rules.list({ page: 1, limit: 100, status: 'active' }),
    enabled: open,
    staleTime: 60_000
  });
  const rules = rulesQuery.data?.data?.commission_rules || [];

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
    }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.full_name?.trim()) next.full_name = 'Full name is required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Invalid email address.';
    }
    if (form.base_salary === '' || Number.isNaN(Number(form.base_salary)) || Number(form.base_salary) < 0) {
      next.base_salary = 'Base salary cannot be negative.';
    }
    if (!form.commission_rule_id) next.commission_rule_id = 'Select a commission rule.';
    if (!isEdit && (!form.password || form.password.length < 8)) {
      next.password = 'Password must be at least 8 characters.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      vehicle_number: form.vehicle_number?.trim() || null,
      national_id: form.national_id?.trim() || null,
      base_salary: Number(form.base_salary) || 0,
      salary_effective_from: form.salary_effective_from || undefined,
      commission_rule_id: Number(form.commission_rule_id),
      joined_at: form.joined_at || null,
      employment_end_date: form.employment_end_date || null,
      status: form.status
    };
    if (!isEdit) {
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
          description="Monthly base salary. Changes are effective from the selected date."
        />
        {isEdit && (
          <Input
            label="Salary effective from"
            type="date"
            value={form.salary_effective_from}
            onChange={(event) => handleChange('salary_effective_from', event.target.value)}
            error={errors.salary_effective_from}
          />
        )}
        <Select
          label="Commission rule"
          value={form.commission_rule_id}
          onChange={(event) => handleChange('commission_rule_id', event.target.value)}
          error={errors.commission_rule_id || (rulesQuery.isError ? 'Commission rules could not be loaded.' : undefined)}
          description="Used automatically for every commission calculation for this salesman."
          required
          disabled={rulesQuery.isPending || rulesQuery.isError}
        >
          <option value="">{rulesQuery.isPending ? 'Loading commission rules...' : 'Select commission rule'}</option>
          {rules.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.name} ({rule.target_period})
            </option>
          ))}
        </Select>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Joined date"
            type="date"
            value={form.joined_at || ''}
            onChange={(event) => handleChange('joined_at', event.target.value)}
            error={errors.joined_at}
          />
          {isEdit && (
            <Input
              label="Employment end date"
              type="date"
              value={form.employment_end_date || ''}
              onChange={(event) => handleChange('employment_end_date', event.target.value)}
              error={errors.employment_end_date}
              description="Set when ending employment. Deactivation also revokes the linked login and route assignments."
            />
          )}
        </div>
        {!isEdit && (
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(event) => handleChange('password', event.target.value)}
            error={errors.password}
            autoComplete="new-password"
            description="A salesman login is created and linked automatically. Minimum 8 characters."
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
