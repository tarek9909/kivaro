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
import { STATUSES, TARGET_PERIODS } from './commissions.config.js';

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptyForm() {
  return {
    name: '',
    target_period: 'monthly',
    below_target_rate: '5',
    at_target_rate: '10',
    above_target_extra_rate: '1',
    applies_from: todayString(),
    applies_to: '',
    status: 'active'
  };
}

function fromRule(rule) {
  if (!rule) return emptyForm();
  return {
    name: rule.name || '',
    target_period: rule.target_period || 'monthly',
    below_target_rate:
      rule.below_target_rate !== undefined && rule.below_target_rate !== null
        ? String(rule.below_target_rate)
        : '5',
    at_target_rate:
      rule.at_target_rate !== undefined && rule.at_target_rate !== null
        ? String(rule.at_target_rate)
        : '10',
    above_target_extra_rate:
      rule.above_target_extra_rate !== undefined && rule.above_target_extra_rate !== null
        ? String(rule.above_target_extra_rate)
        : '1',
    applies_from: rule.applies_from
      ? String(rule.applies_from).slice(0, 10)
      : todayString(),
    applies_to: rule.applies_to ? String(rule.applies_to).slice(0, 10) : '',
    status: rule.status || 'active'
  };
}

export function CommissionRuleFormModal({ open, onClose, rule }) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(rule?.id);

  const [form, setForm] = useState(() => fromRule(rule));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(fromRule(rule));
    setErrors({});
  }, [open, rule]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.commissions.rules.update(rule.id, payload)
        : api.commissions.rules.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Commission rule updated' : 'Commission rule created');
      queryClient.invalidateQueries({ queryKey: ['commissions', 'rules'] });
      queryClient.invalidateQueries({ queryKey: ['commissions', 'options', 'rules'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save commission rule.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name?.trim()) next.name = 'Name is required.';
    if (!form.applies_from) next.applies_from = 'Start date is required.';
    if (Number.isNaN(Number(form.below_target_rate)))
      next.below_target_rate = 'Below target rate must be numeric.';
    if (Number.isNaN(Number(form.at_target_rate)))
      next.at_target_rate = 'At target rate must be numeric.';
    if (Number.isNaN(Number(form.above_target_extra_rate)))
      next.above_target_extra_rate = 'Above target rate must be numeric.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      name: form.name.trim(),
      target_period: form.target_period,
      below_target_rate: Number(form.below_target_rate),
      at_target_rate: Number(form.at_target_rate),
      above_target_extra_rate: Number(form.above_target_extra_rate),
      applies_from: form.applies_from,
      applies_to: form.applies_to || null,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit commission rule' : 'New commission rule'}
      description="Define how commission rates are computed for salesmen against their targets."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="commission-rule-form"
            isLoading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Create rule'}
          </Button>
        </>
      }
    >
      <form id="commission-rule-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Name"
          value={form.name}
          onChange={(event) => handleChange('name', event.target.value)}
          error={errors.name}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Target period"
            value={form.target_period}
            onChange={(event) => handleChange('target_period', event.target.value)}
          >
            {TARGET_PERIODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={(event) => handleChange('status', event.target.value)}
          >
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Below target rate"
            type="number"
            min="0"
            step="0.01"
            value={form.below_target_rate}
            onChange={(event) => handleChange('below_target_rate', event.target.value)}
            error={errors.below_target_rate}
            description="Percent."
          />
          <Input
            label="At target rate"
            type="number"
            min="0"
            step="0.01"
            value={form.at_target_rate}
            onChange={(event) => handleChange('at_target_rate', event.target.value)}
            error={errors.at_target_rate}
            description="Percent."
          />
          <Input
            label="Above target extra"
            type="number"
            min="0"
            step="0.01"
            value={form.above_target_extra_rate}
            onChange={(event) =>
              handleChange('above_target_extra_rate', event.target.value)
            }
            error={errors.above_target_extra_rate}
            description="Percent added beyond target."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Applies from"
            type="date"
            value={form.applies_from}
            onChange={(event) => handleChange('applies_from', event.target.value)}
            error={errors.applies_from}
            required
          />
          <Input
            label="Applies to"
            type="date"
            value={form.applies_to}
            onChange={(event) => handleChange('applies_to', event.target.value)}
            error={errors.applies_to}
            description="Optional. Open ended when blank."
          />
        </div>
      </form>
    </Modal>
  );
}
