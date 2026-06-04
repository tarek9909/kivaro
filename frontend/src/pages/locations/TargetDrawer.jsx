import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  Select
} from '@/components/ui/index.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import {
  LOCATIONS_PERMISSIONS,
  TARGET_STATUSES,
  getTargetStatusTone
} from './locations.config.js';
import { useSublocationsList } from './useLocationsOptions.js';

function StatusBadge({ status }) {
  const tone = getTargetStatusTone(status);
  const label = TARGET_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span className="break-words text-sm text-ink-100">{value || '-'}</span>
    </div>
  );
}

function SublocationTargetFormModal({ open, onClose, locationTargetId, locationId }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickSublocations = hasPermission(LOCATIONS_PERMISSIONS.locations);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    sublocation_id: '',
    target_amount: 0,
    status: 'draft'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({ sublocation_id: '', target_amount: 0, status: 'draft' });
    setErrors({});
  }, [open]);

  const sublocationsQuery = useSublocationsList(open && canPickSublocations);
  const sublocationsAll = sublocationsQuery.data?.data?.sublocations || [];
  const sublocations = useMemo(
    () =>
      locationId
        ? sublocationsAll.filter(
            (sublocation) => Number(sublocation.location_id) === Number(locationId)
          )
        : sublocationsAll,
    [sublocationsAll, locationId]
  );

  const mutation = useMutation({
    mutationFn: (payload) =>
      api.locations.locationTargets.createSublocationTarget(locationTargetId, payload),
    onSuccess: () => {
      toast.success('Sublocation target added');
      queryClient.invalidateQueries({ queryKey: ['locations', 'target', locationTargetId] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not add sublocation target.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    const sublocationId = Number(form.sublocation_id);
    if (!form.sublocation_id || Number.isNaN(sublocationId) || sublocationId <= 0) {
      next.sublocation_id = 'Sublocation is required.';
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
    mutation.mutate({
      sublocation_id: Number(form.sublocation_id),
      target_amount: Number(form.target_amount) || 0,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Add sublocation target"
      description="Distribute part of the location target to a sublocation. Combined sublocation amounts must not exceed the location target."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="sublocation-target-form"
            isLoading={mutation.isPending}
          >
            Add target
          </Button>
        </>
      }
    >
      <form id="sublocation-target-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {canPickSublocations ? (
          <Select
            label="Sublocation"
            value={form.sublocation_id}
            onChange={(event) => handleChange('sublocation_id', event.target.value)}
            error={errors.sublocation_id}
            required
            description="Only sublocations under this location are eligible."
          >
            <option value="">Select sublocation</option>
            {sublocations.map((sublocation) => (
              <option key={sublocation.id} value={sublocation.id}>
                {sublocation.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Sublocation ID"
            type="number"
            min="1"
            value={form.sublocation_id}
            onChange={(event) => handleChange('sublocation_id', event.target.value)}
            error={errors.sublocation_id}
            required
            description="Numeric only. Ask an administrator for territory access if you need a sublocation picker."
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
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
      </form>
    </Modal>
  );
}

export function TargetDrawer({ open, onClose, targetId }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManageTargets = hasPermission(LOCATIONS_PERMISSIONS.targets);

  const [addingSubTarget, setAddingSubTarget] = useState(false);
  const [generatedTargets, setGeneratedTargets] = useState(null);
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ['locations', 'target', targetId],
    queryFn: () => api.locations.locationTargets.get(targetId),
    enabled: Boolean(open && targetId)
  });

  const target = detailQuery.data?.data?.location_target;
  const sublocationTargets = target?.sublocation_targets || [];

  useEffect(() => {
    if (!open) {
      setGeneratedTargets(null);
      setAddingSubTarget(false);
    }
  }, [open]);

  const generateMutation = useMutation({
    mutationFn: (sublocationTargetId) =>
      api.locations.sublocationTargets.generateSalesmanTargets(sublocationTargetId),
    onSuccess: (response, sublocationTargetId) => {
      const generated = response?.data?.salesman_targets || [];
      setGeneratedTargets({ sublocationTargetId, items: generated });
      toast.success(`Generated ${generated.length} salesman targets`);
      queryClient.invalidateQueries({ queryKey: ['locations', 'target', targetId] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not generate salesman targets.'))
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="xl"
      title={target ? `${target.location_name || 'Target'} - ${target.target_period}` : 'Target'}
      description={
        target
          ? `${formatDate(target.period_start)} to ${formatDate(target.period_end)}`
          : undefined
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detailQuery.isPending ? (
        <LoadingState label="Loading target..." />
      ) : detailQuery.isError ? (
        <ErrorState
          title="Could not load target"
          description={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      ) : !target ? (
        <EmptyState title="Target not found" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={target.status} />
            <Badge tone="neutral">{target.target_period}</Badge>
          </div>
          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Location" value={target.location_name} />
            <Field
              label="Target amount"
              value={formatNumber(target.target_amount, { maximumFractionDigits: 4 })}
            />
            <Field label="Period start" value={formatDate(target.period_start)} />
            <Field label="Period end" value={formatDate(target.period_end)} />
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-ink-50">
                Sublocation targets
              </h3>
              {canManageTargets && (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={Plus}
                  onClick={() => setAddingSubTarget(true)}
                  disabled={target.status === 'closed'}
                >
                  Add sublocation
                </Button>
              )}
            </div>
            {sublocationTargets.length === 0 ? (
              <EmptyState
                className="mt-2"
                title="No sublocation targets yet"
                description="Distribute the location target across sublocations to start tracking field performance."
              />
            ) : (
              <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
                {sublocationTargets.map((sub) => (
                  <li
                    key={sub.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-50">
                          {sub.sublocation_name}
                        </p>
                        <p className="truncate font-mono text-xs text-ink-400">
                          {formatNumber(sub.target_amount, { maximumFractionDigits: 4 })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={sub.status} />
                        {canManageTargets && (
                          <Button
                            size="sm"
                            leftIcon={Sparkles}
                            onClick={() => generateMutation.mutate(sub.id)}
                            isLoading={
                              generateMutation.isPending &&
                              generateMutation.variables === sub.id
                            }
                          >
                            Generate
                          </Button>
                        )}
                      </div>
                    </div>
                    {generatedTargets && generatedTargets.sublocationTargetId === sub.id && (
                      <div className="mt-3 rounded-lg border border-white/5 bg-ink-950/40 p-3">
                        <p className="text-[11px] uppercase tracking-wider text-ink-400">
                          Generated salesman targets ({generatedTargets.items.length})
                        </p>
                        {generatedTargets.items.length === 0 ? (
                          <p className="mt-1 text-xs text-ink-300">
                            The server returned an empty list. Make sure salesmen are assigned to this sublocation.
                          </p>
                        ) : (
                          <ul className="mt-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-1">
                            {generatedTargets.items.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="truncate text-ink-100">
                                  {item.salesman_name || `Salesman #${item.salesman_id}`}
                                </span>
                                <span className="font-mono text-ink-200">
                                  {formatNumber(item.target_amount, {
                                    maximumFractionDigits: 4
                                  })}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {target && (
        <SublocationTargetFormModal
          open={addingSubTarget}
          onClose={() => setAddingSubTarget(false)}
          locationTargetId={target.id}
          locationId={target.location_id}
        />
      )}
    </Drawer>
  );
}
