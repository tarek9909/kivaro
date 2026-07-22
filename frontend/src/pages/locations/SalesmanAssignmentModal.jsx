import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Button, Input, Modal } from '@/components/ui/index.js';
import { LOCATIONS_PERMISSIONS } from './locations.config.js';
import { useSublocationsList } from './useLocationsOptions.js';

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Replaces all of a salesman's active territories in one validated server
 * transaction.  This deliberately avoids a sequence of individual
 * assign/unassign calls that could leave a route partially updated.
 */
export function SalesmanAssignmentModal({ open, onClose, salesman }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickSublocations = hasPermission(LOCATIONS_PERMISSIONS.locations);
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [assignedAt, setAssignedAt] = useState(todayString());
  const [errors, setErrors] = useState({});

  const sublocationsQuery = useSublocationsList(open && canPickSublocations);
  const assignmentsQuery = useQuery({
    queryKey: ['locations', 'salesmen', salesman?.id, 'sublocations'],
    queryFn: () => api.locations.salesmen.sublocations(salesman.id),
    enabled: Boolean(open && salesman?.id)
  });
  const sublocations = sublocationsQuery.data?.data?.sublocations || [];
  const assignments = assignmentsQuery.data?.data?.assignments || [];

  useEffect(() => {
    if (!open) return;
    setAssignedAt(todayString());
    setErrors({});
  }, [open, salesman?.id]);

  useEffect(() => {
    if (!open || !assignmentsQuery.isSuccess) return;
    setSelectedIds(assignments.filter((assignment) => assignment.status === 'active').map((assignment) => Number(assignment.sublocation_id)));
  }, [assignmentsQuery.isSuccess, assignments, open]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['locations', 'salesmen'] });
    queryClient.invalidateQueries({ queryKey: ['locations', 'options', 'salesmen'] });
    queryClient.invalidateQueries({ queryKey: ['locations', 'salesmen', salesman?.id, 'sublocations'] });
  }

  const saveMutation = useMutation({
    mutationFn: (payload) => api.locations.salesmen.replaceSublocations(salesman.id, payload),
    onSuccess: () => {
      toast.success('Salesman territories updated');
      invalidate();
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not update salesman territories.'));
    }
  });

  function toggle(id) {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id]);
    if (errors.sublocation_ids) setErrors((current) => ({ ...current, sublocation_ids: undefined }));
  }

  function handleSave() {
    if (!assignedAt) {
      setErrors({ assigned_at: 'Assignment date is required.' });
      return;
    }
    saveMutation.mutate({ sublocation_ids: selectedIds, assigned_at: assignedAt });
  }

  const manualSelection = !canPickSublocations;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={salesman ? `Territories: ${salesman.full_name}` : 'Salesman territories'}
      description="Select every active sublocation this salesman covers. Saving replaces the complete set atomically."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saveMutation.isPending}>Close</Button>
          <Button leftIcon={Save} onClick={handleSave} isLoading={saveMutation.isPending}>Save territories</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Assignment date"
          type="date"
          value={assignedAt}
          onChange={(event) => setAssignedAt(event.target.value)}
          error={errors.assigned_at}
          description="Applied to territories newly added in this update."
        />
        {manualSelection ? (
          <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-100">
            Territory selection requires the locations.manage permission.
          </p>
        ) : sublocationsQuery.isPending || assignmentsQuery.isPending ? (
          <p className="text-sm text-ink-300">Loading territories…</p>
        ) : sublocationsQuery.isError || assignmentsQuery.isError ? (
          <p className="text-sm text-rose-300">{getErrorMessage(sublocationsQuery.error || assignmentsQuery.error, 'Could not load territories.')}</p>
        ) : (
          <fieldset className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Sublocations</legend>
            {sublocations.length ? sublocations.map((sublocation) => {
              const id = Number(sublocation.id);
              return (
                <label key={id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-white/[0.05]">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(id)}
                    onChange={() => toggle(id)}
                    className="h-4 w-4 rounded border-white/30 bg-transparent accent-sky-500"
                  />
                  <span className="text-sm text-ink-100">
                    {sublocation.location_name ? `${sublocation.location_name} — ` : ''}{sublocation.name}
                  </span>
                </label>
              );
            }) : <p className="text-sm text-ink-300">No active sublocations are available.</p>}
          </fieldset>
        )}
        {errors.sublocation_ids ? <p className="text-xs text-rose-300">{errors.sublocation_ids}</p> : null}
        <p className="text-xs text-ink-400">Leave all boxes clear to remove all active territory assignments.</p>
      </div>
    </Modal>
  );
}
