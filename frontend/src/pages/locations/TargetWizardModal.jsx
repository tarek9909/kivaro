import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { Button, Input, Modal, Select } from '@/components/ui/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { LOCATIONS_PERMISSIONS, TARGET_PERIODS } from './locations.config.js';
import { useLocationsList } from './useLocationsOptions.js';
import { calculateTargetPeriodEnd } from './LocationTargetFormModal.jsx';

function emptyForm() {
  return { location_id: '', target_period: 'monthly', period_start: '', target_amount: '', allocations: {} };
}

export function TargetWizardModal({ open, onClose }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickLocations = hasPermission(LOCATIONS_PERMISSIONS.locations);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const locationsQuery = useLocationsList(open && canPickLocations);
  const setupQuery = useQuery({
    queryKey: ['locations', 'target-setup', form.location_id],
    queryFn: () => api.locations.locationTargets.setup(form.location_id),
    enabled: open && Number(form.location_id) > 0
  });
  const setup = setupQuery.data?.data?.setup;

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open]);

  useEffect(() => {
    if (!setup?.sublocations) return;
    setForm((current) => ({
      ...current,
      allocations: Object.fromEntries(setup.sublocations.map((row) => [row.id, current.allocations[row.id] || { included: false, target_amount: '', salesman_ids: [] }]))
    }));
  }, [setup]);

  const allocations = useMemo(() => setup?.sublocations.map((row) => ({
    ...row,
    selection: form.allocations[row.id] || { included: false, target_amount: '', salesman_ids: [] }
  })) || [], [setup, form.allocations]);
  const allocatedTotal = allocations.reduce((sum, row) => row.selection.included ? sum + (Number(row.selection.target_amount) || 0) : sum, 0);

  const mutation = useMutation({
    mutationFn: (payload) => api.locations.locationTargets.createBundle(payload),
    onSuccess: () => {
      toast.success('Active target bundle created');
      queryClient.invalidateQueries({ queryKey: ['locations', 'targets'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not create the target bundle.'));
    }
  });

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value, ...(field === 'location_id' ? { allocations: {} } : {}) }));
  }
  function updateAllocation(id, patch) {
    setForm((current) => ({ ...current, allocations: { ...current.allocations, [id]: { included: false, target_amount: '', salesman_ids: [], ...current.allocations[id], ...patch } } }));
  }
  function toggleSalesman(sublocationId, salesmanId) {
    const selection = form.allocations[sublocationId] || { salesman_ids: [] };
    const ids = new Set(selection.salesman_ids || []);
    ids.has(salesmanId) ? ids.delete(salesmanId) : ids.add(salesmanId);
    updateAllocation(sublocationId, { salesman_ids: [...ids] });
  }
  function submit(event) {
    event.preventDefault();
    const periodEnd = calculateTargetPeriodEnd(form.target_period, form.period_start);
    const selected = allocations.filter((row) => row.selection.included).map((row) => ({
      sublocation_id: Number(row.id), target_amount: Number(row.selection.target_amount) || 0,
      salesman_ids: row.selection.salesman_ids || []
    }));
    const next = {};
    if (!Number(form.location_id)) next.location_id = 'Location is required.';
    if (!form.period_start || !periodEnd) next.period_start = 'A valid target period is required.';
    if (!selected.length) next.sublocation_targets = 'Allocate at least one sublocation.';
    if (Math.abs(allocatedTotal - (Number(form.target_amount) || 0)) > 0.00001) next.sublocation_targets = 'Sublocation totals must equal the location target exactly.';
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate({ location_id: Number(form.location_id), target_period: form.target_period, period_start: form.period_start, target_amount: Number(form.target_amount), sublocation_targets: selected });
  }

  return (
    <Modal open={open} onClose={onClose} size="xl" title="New active target" description="Allocate the full location target, then choose participating salesmen per sublocation."
      footer={<><Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button type="submit" form="target-wizard" isLoading={mutation.isPending}>Create active target</Button></>}>
      <form id="target-wizard" onSubmit={submit} className="space-y-5" noValidate>
        <div className="grid gap-3 md:grid-cols-2">
          {canPickLocations ? <Select label="Location" value={form.location_id} onChange={(event) => setField('location_id', event.target.value)} error={errors.location_id} required><option value="">Select location</option>{(locationsQuery.data?.data?.locations || []).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select> : <Input label="Location ID" type="number" min="1" value={form.location_id} onChange={(event) => setField('location_id', event.target.value)} error={errors.location_id} required />}
          <Select label="Period" value={form.target_period} onChange={(event) => setField('target_period', event.target.value)}>{TARGET_PERIODS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select>
          <Input label="Period start" type="date" value={form.period_start} onChange={(event) => setField('period_start', event.target.value)} error={errors.period_start} required />
          <Input label="Target amount" type="number" min="0" step="0.0001" value={form.target_amount} onChange={(event) => setField('target_amount', event.target.value)} required />
        </div>
        {Number(form.location_id) > 0 && <section className="space-y-3 rounded-xl border border-white/10 p-3"><div className="flex justify-between text-sm"><span className="font-medium">Sublocation allocation</span><span className={Math.abs(allocatedTotal - (Number(form.target_amount) || 0)) < 0.00001 ? 'text-emerald-300' : 'text-amber-300'}>{allocatedTotal.toFixed(4)} / {(Number(form.target_amount) || 0).toFixed(4)}</span></div>{setupQuery.isPending ? <p className="text-sm text-ink-400">Loading active sublocations and their salesmen…</p> : allocations.map((row) => <div key={row.id} className="rounded-lg border border-white/10 p-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={row.selection.included} onChange={(event) => updateAllocation(row.id, { included: event.target.checked })} />{row.name}</label>{row.selection.included && <div className="mt-3 space-y-2"><Input label="Sublocation target" type="number" min="0" step="0.0001" value={row.selection.target_amount} onChange={(event) => updateAllocation(row.id, { target_amount: event.target.value })} />{row.salesmen.length ? <div className="grid gap-1 sm:grid-cols-2">{row.salesmen.map((salesman) => <label key={salesman.id} className="flex items-center gap-2 text-xs text-ink-200"><input type="checkbox" checked={(row.selection.salesman_ids || []).includes(salesman.id)} onChange={() => toggleSalesman(row.id, salesman.id)} />{salesman.full_name}</label>)}</div> : <p className="text-xs text-amber-300">No active salesman is assigned. This target will remain unassigned until edited.</p>}</div>}</div>)}</section>}
        {errors.sublocation_targets && <p className="text-sm text-red-300">{errors.sublocation_targets}</p>}
      </form>
    </Modal>
  );
}
