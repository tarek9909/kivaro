import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2, Unlink } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select
} from '@/components/ui/index.js';
import { LOCATIONS_PERMISSIONS } from './locations.config.js';
import { useSublocationsList } from './useLocationsOptions.js';

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Assign or unassign a salesman to/from a sublocation.
 *
 * The backend exposes:
 *   POST   /salesmen/:id/sublocations  { sublocation_id, assigned_at }
 *   DELETE /salesmen/:id/sublocations/:sublocationId
 *
 * It does NOT expose a list of a salesman's current sublocations, so the
 * UI does not pretend to know the active set; the operator picks a
 * sublocation and chooses Assign or Unassign.
 */
export function SalesmanAssignmentModal({ open, onClose, salesman }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickSublocations = hasPermission(LOCATIONS_PERMISSIONS.locations);
  const queryClient = useQueryClient();

  const [sublocationId, setSublocationId] = useState('');
  const [assignedAt, setAssignedAt] = useState(todayString());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setSublocationId('');
    setAssignedAt(todayString());
    setErrors({});
  }, [open, salesman?.id]);

  const sublocationsQuery = useSublocationsList(open && canPickSublocations);
  const sublocations = sublocationsQuery.data?.data?.sublocations || [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['locations', 'salesmen'] });
    queryClient.invalidateQueries({ queryKey: ['locations', 'options', 'salesmen'] });
  }

  const assignMutation = useMutation({
    mutationFn: (payload) =>
      api.locations.salesmen.assignSublocation(salesman.id, payload),
    onSuccess: () => {
      toast.success('Salesman assigned');
      invalidate();
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not assign salesman.'));
    }
  });

  const unassignMutation = useMutation({
    mutationFn: (id) => api.locations.salesmen.unassignSublocation(salesman.id, id),
    onSuccess: () => {
      toast.success('Salesman unassigned');
      invalidate();
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not unassign salesman.'));
    }
  });

  function validate(forAssign) {
    const next = {};
    const id = Number(sublocationId);
    if (!sublocationId || Number.isNaN(id) || id <= 0) {
      next.sublocation_id = 'Sublocation is required.';
    }
    if (forAssign && !assignedAt) {
      next.assigned_at = 'Assignment date is required.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleAssign() {
    if (!validate(true)) return;
    assignMutation.mutate({
      sublocation_id: Number(sublocationId),
      assigned_at: assignedAt
    });
  }

  function handleUnassign() {
    if (!validate(false)) return;
    unassignMutation.mutate(Number(sublocationId));
  }

  const isPending = assignMutation.isPending || unassignMutation.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        salesman
          ? `Assignment: ${salesman.full_name}`
          : 'Salesman assignment'
      }
      description="Pick a sublocation, then assign or unassign this salesman. Assignment changes are recorded for audit history."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Close
          </Button>
          <Button
            variant="secondary"
            leftIcon={Unlink}
            onClick={handleUnassign}
            isLoading={unassignMutation.isPending}
            disabled={assignMutation.isPending}
          >
            Unassign
          </Button>
          <Button
            leftIcon={Link2}
            onClick={handleAssign}
            isLoading={assignMutation.isPending}
            disabled={unassignMutation.isPending}
          >
            Assign
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {canPickSublocations ? (
          <Select
            label="Sublocation"
            value={sublocationId}
            onChange={(event) => setSublocationId(event.target.value)}
            error={errors.sublocation_id}
            required
          >
            <option value="">Select sublocation</option>
            {sublocations.map((sublocation) => (
              <option key={sublocation.id} value={sublocation.id}>
                {sublocation.location_name
                  ? `${sublocation.location_name} - ${sublocation.name}`
                  : sublocation.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Sublocation ID"
            type="number"
            min="1"
            value={sublocationId}
            onChange={(event) => setSublocationId(event.target.value)}
            error={errors.sublocation_id}
            required
            description="Numeric only. Ask an administrator for territory access if you need a sublocation picker."
          />
        )}
        <Input
          label="Assignment date"
          type="date"
          value={assignedAt}
          onChange={(event) => setAssignedAt(event.target.value)}
          error={errors.assigned_at}
          description="Used when assigning. Ignored when unassigning."
        />
      </div>
    </Modal>
  );
}
