import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select
} from '@/components/ui/index.js';
import {
  LOCATIONS_PERMISSIONS,
  TARGET_PERIODS,
  TARGET_STATUSES
} from './locations.config.js';
import { useLocationsList } from './useLocationsOptions.js';

function emptyForm(target) {
  return {
    location_id:
      target?.location_id !== null && target?.location_id !== undefined
        ? String(target.location_id)
        : '',
    target_period: target?.target_period ?? 'monthly',
    period_start: target?.period_start ? String(target.period_start).slice(0, 10) : '',
    period_end: target?.period_end ? String(target.period_end).slice(0, 10) : '',
    target_amount: target?.target_amount ?? 0,
    status: target?.status ?? 'draft'
  };
}

function addMonthsClamped(date, months) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
  if (next.getUTCDate() !== date.getUTCDate()) {
    next.setUTCDate(0);
  }
  return next;
}

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

export function calculateTargetPeriodEnd(targetPeriod, periodStart) {
  if (!periodStart) return '';
  const start = new Date(`${periodStart}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return '';

  const end = new Date(start);
  if (targetPeriod === 'weekly') {
    end.setUTCDate(end.getUTCDate() + 6);
    return formatDateInput(end);
  }
  if (targetPeriod === 'monthly') {
    const next = addMonthsClamped(start, 1);
    next.setUTCDate(next.getUTCDate() - 1);
    return formatDateInput(next);
  }
  if (targetPeriod === 'quarterly') {
    const next = addMonthsClamped(start, 3);
    next.setUTCDate(next.getUTCDate() - 1);
    return formatDateInput(next);
  }
  if (targetPeriod === 'yearly') {
    const next = addMonthsClamped(start, 12);
    next.setUTCDate(next.getUTCDate() - 1);
    return formatDateInput(next);
  }
  return formatDateInput(end);
}

export function LocationTargetFormModal({ open, onClose, target }) {
  const isEdit = Boolean(target);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  // The /locations list is gated by locations.manage. A user with only
  // targets.manage cannot call it, so we fall back to a numeric Location ID
  // input in that case.
  const canPickLocations = hasPermission(LOCATIONS_PERMISSIONS.locations);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(target));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(target));
    setErrors({});
  }, [open, target]);

  const locationsQuery = useLocationsList(open && canPickLocations);
  const locations = locationsQuery.data?.data?.locations || [];

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.locations.locationTargets.update(target.id, payload)
        : api.locations.locationTargets.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Target updated' : 'Target created');
      queryClient.invalidateQueries({ queryKey: ['locations', 'targets'] });
      if (target?.id) {
        queryClient.invalidateQueries({ queryKey: ['locations', 'target', target.id] });
      }
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save target.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'target_period' || field === 'period_start') {
        next.period_end = calculateTargetPeriodEnd(next.target_period, next.period_start);
      }
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    const locationId = Number(form.location_id);
    if (!form.location_id || Number.isNaN(locationId) || locationId <= 0) {
      next.location_id = 'Location is required.';
    }
    const periodEnd = calculateTargetPeriodEnd(form.target_period, form.period_start);
    if (!form.period_start) next.period_start = 'Applies from is required.';
    if (!periodEnd) next.period_end = 'Applies to could not be calculated.';
    if (form.period_start && form.period_end && form.period_start > form.period_end) {
      next.period_end = 'Applies to must be on or after applies from.';
    }
    const amount = Number(form.target_amount);
    if (Number.isNaN(amount) || amount < 0) {
      next.target_amount = 'Target amount cannot be negative.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const periodEnd = calculateTargetPeriodEnd(form.target_period, form.period_start);
    mutation.mutate({
      location_id: Number(form.location_id),
      target_period: form.target_period,
      period_start: form.period_start,
      period_end: periodEnd,
      target_amount: Number(form.target_amount) || 0,
      status: form.status
    });
  }

  const lockedDescription = isEdit
    ? 'Location cannot change after creation.'
    : undefined;
  const numericFallbackDescription = canPickLocations
    ? undefined
    : 'Numeric only. Ask an administrator for territory access if you need a location picker.';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit target' : 'New location target'}
      description="Target plans set the sales goal for a location over a given period. Sublocation and salesman targets are derived from it."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="target-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create target'}
          </Button>
        </>
      }
    >
      <form id="target-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {canPickLocations ? (
          <Select
            label="Location"
            value={form.location_id}
            onChange={(event) => handleChange('location_id', event.target.value)}
            error={errors.location_id}
            required
            disabled={isEdit}
            description={lockedDescription}
          >
            <option value="">Select location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Location ID"
            type="number"
            min="1"
            value={form.location_id}
            onChange={(event) => handleChange('location_id', event.target.value)}
            error={errors.location_id}
            required
            disabled={isEdit}
            description={lockedDescription || numericFallbackDescription}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Period"
            value={form.target_period}
            onChange={(event) => handleChange('target_period', event.target.value)}
            error={errors.target_period}
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
            error={errors.status}
          >
            {TARGET_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Applies from"
            type="date"
            value={form.period_start || ''}
            onChange={(event) => handleChange('period_start', event.target.value)}
            error={errors.period_start}
            required
          />
          <Input
            label="Applies to"
            type="date"
            value={calculateTargetPeriodEnd(form.target_period, form.period_start)}
            readOnly
            error={errors.period_end}
            required
            description="Calculated from period and applies from."
          />
        </div>
        <Input
          label="Target amount"
          type="number"
          min="0"
          step="0.0001"
          value={form.target_amount}
          onChange={(event) => handleChange('target_amount', event.target.value)}
          error={errors.target_amount}
          required
        />
      </form>
    </Modal>
  );
}
