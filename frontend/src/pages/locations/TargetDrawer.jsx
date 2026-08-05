import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { Badge, Button, Drawer, EmptyState, ErrorState, Input, LoadingState, Modal } from '@/components/ui/index.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { LOCATIONS_PERMISSIONS, getTargetStatusTone } from './locations.config.js';

function Progress({ value, total }) {
  const percent = total ? Math.max(0, (Number(value || 0) / Number(total)) * 100) : 0;
  return <div className="mt-2"><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-brand-500" style={{ width: `${Math.min(percent, 100)}%` }} /></div><p className="mt-1 text-xs text-ink-300">{formatNumber(value || 0, { maximumFractionDigits: 4 })} collected of {formatNumber(total || 0, { maximumFractionDigits: 4 })} · {percent.toFixed(2)}%</p></div>;
}

function TargetAssignmentModal({ target, open, onClose }) {
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState({});
  const [errors, setErrors] = useState({});
  const setupQuery = useQuery({ queryKey: ['locations', 'target-setup', target?.location_id], queryFn: () => api.locations.locationTargets.setup(target.location_id), enabled: open && Boolean(target?.location_id) });
  const rows = useMemo(() => (setupQuery.data?.data?.setup?.sublocations || []).map((row) => ({ ...row, selection: allocations[row.id] || { included: false, target_amount: '', salesman_ids: [] } })), [setupQuery.data, allocations]);
  useEffect(() => {
    if (!open || !target) return;
    const initial = {};
    for (const sub of target.sublocation_targets || []) initial[sub.sublocation_id] = { included: sub.status === 'active', target_amount: sub.target_amount, salesman_ids: (sub.salesman_targets || []).filter((item) => item.status === 'active').map((item) => item.salesman_id) };
    setAllocations(initial); setErrors({});
  }, [open, target]);
  const total = rows.reduce((sum, row) => row.selection.included ? sum + (Number(row.selection.target_amount) || 0) : sum, 0);
  const mutation = useMutation({ mutationFn: (payload) => api.locations.locationTargets.updateAssignment(target.id, payload), onSuccess: () => { toast.success('Target assignment updated'); queryClient.invalidateQueries({ queryKey: ['locations', 'target', target.id] }); queryClient.invalidateQueries({ queryKey: ['locations', 'targets'] }); onClose?.(); }, onError: (error) => { setErrors(mapFieldErrors(error)); toast.error(getErrorMessage(error, 'Could not update assignment.')); } });
  function change(id, patch) { setAllocations((current) => ({ ...current, [id]: { included: false, target_amount: '', salesman_ids: [], ...current[id], ...patch } })); }
  function toggleSalesman(id, salesmanId) { const selected = new Set(allocations[id]?.salesman_ids || []); selected.has(salesmanId) ? selected.delete(salesmanId) : selected.add(salesmanId); change(id, { salesman_ids: [...selected] }); }
  function submit(event) { event.preventDefault(); const selected = rows.filter((row) => row.selection.included).map((row) => ({ sublocation_id: row.id, target_amount: Number(row.selection.target_amount) || 0, salesman_ids: row.selection.salesman_ids || [] })); const next = {}; if (Math.abs(total - Number(target.target_amount)) > .00001) next.sublocation_targets = 'The allocation must equal the location target exactly.'; if (!selected.length) next.sublocation_targets = 'At least one sublocation is required.'; setErrors(next); if (!Object.keys(next).length) mutation.mutate({ target_amount: Number(target.target_amount), sublocation_targets: selected }); }
  return <Modal open={open} onClose={onClose} size="xl" title="Edit assignment" description="Redistribute the existing target and choose participating salesmen." footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="assignment-form" isLoading={mutation.isPending}>Save assignment</Button></>}><form id="assignment-form" onSubmit={submit} className="space-y-3"><p className="text-sm text-ink-300">Allocated {total.toFixed(4)} / {Number(target?.target_amount || 0).toFixed(4)}</p>{rows.map((row) => <div key={row.id} className="rounded-lg border border-white/10 p-3"><label className="flex gap-2 text-sm font-medium"><input type="checkbox" checked={row.selection.included} onChange={(event) => change(row.id, { included: event.target.checked })} />{row.name}</label>{row.selection.included && <div className="mt-3"><Input label="Sublocation target" type="number" min="0" step="0.0001" value={row.selection.target_amount} onChange={(event) => change(row.id, { target_amount: event.target.value })} />{row.salesmen.length ? <div className="mt-2 grid gap-1 sm:grid-cols-2">{row.salesmen.map((salesman) => <label key={salesman.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={(row.selection.salesman_ids || []).includes(salesman.id)} onChange={() => toggleSalesman(row.id, salesman.id)} />{salesman.full_name}</label>)}</div> : <p className="mt-2 text-xs text-amber-300">No active salesman is assigned; this allocation remains unassigned.</p>}</div>}</div>)}{errors.sublocation_targets && <p className="text-sm text-red-300">{errors.sublocation_targets}</p>}</form></Modal>;
}

export function TargetDrawer({ open, onClose, targetId }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [editing, setEditing] = useState(false);
  const detailQuery = useQuery({ queryKey: ['locations', 'target', targetId], queryFn: () => api.locations.locationTargets.get(targetId), enabled: Boolean(open && targetId) });
  const target = detailQuery.data?.data?.location_target;
  useEffect(() => { if (!open) setEditing(false); }, [open]);
  return <Drawer open={open} onClose={onClose} width="xl" title={target ? `${target.location_name} target` : 'Target'} description={target ? `${formatDate(target.period_start)} to ${formatDate(target.period_end)}` : undefined} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
    {detailQuery.isPending ? <LoadingState label="Loading target…" /> : detailQuery.isError ? <ErrorState title="Could not load target" description={getErrorMessage(detailQuery.error)} onRetry={() => detailQuery.refetch()} /> : !target ? <EmptyState title="Target not found" /> : <div className="space-y-5"><section className="rounded-xl border border-white/10 p-4"><div className="flex items-center justify-between gap-2"><div><Badge tone={getTargetStatusTone(target.status)}>{target.status}</Badge><p className="mt-2 text-lg font-semibold">{formatNumber(target.target_amount, { maximumFractionDigits: 4 })}</p></div>{hasPermission(LOCATIONS_PERMISSIONS.targets) && target.capabilities?.can_edit_assignment && <Button size="sm" leftIcon={Pencil} onClick={() => setEditing(true)}>Edit assignment</Button>}</div><Progress value={target.collected_amount} total={target.target_amount} /></section><section><h3 className="font-display text-sm font-semibold">Sublocation targets</h3><div className="mt-2 space-y-2">{target.sublocation_targets?.map((sub) => <article key={sub.id} className="rounded-xl border border-white/10 p-3"><div className="flex justify-between gap-2"><div><p className="font-medium">{sub.sublocation_name}</p><p className="text-xs text-ink-400">Target {formatNumber(sub.target_amount, { maximumFractionDigits: 4 })}</p></div>{sub.is_unassigned && <Badge tone="warn">Unassigned</Badge>}</div><Progress value={sub.collected_amount} total={sub.target_amount} /><div className="mt-3 space-y-1">{sub.salesman_targets?.map((salesman) => <div key={salesman.id} className="rounded bg-white/[0.03] p-2 text-xs"><div className="flex justify-between"><span>{salesman.salesman_name}</span><span>{formatNumber(salesman.collected_amount, { maximumFractionDigits: 4 })} / {formatNumber(salesman.target_amount, { maximumFractionDigits: 4 })}</span></div><Progress value={salesman.collected_amount} total={salesman.target_amount} /></div>)}</div></article>)}</div></section><section><h3 className="font-display text-sm font-semibold">Target history</h3>{target.events?.length ? <ul className="mt-2 space-y-2">{target.events.map((event) => <li key={event.id} className="rounded border border-white/10 p-2 text-xs"><p className="text-ink-100">{event.description}</p><p className="mt-1 text-ink-400">{formatDate(event.created_at)}</p></li>)}</ul> : <p className="mt-2 text-sm text-ink-400">No workflow events yet.</p>}</section></div>}
    {target && <TargetAssignmentModal target={target} open={editing} onClose={() => setEditing(false)} />}
  </Drawer>;
}
