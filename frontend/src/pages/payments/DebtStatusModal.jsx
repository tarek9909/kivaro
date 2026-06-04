import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Modal,
  Select
} from '@/components/ui/index.js';
import { DEBT_STATUSES } from './payments.config.js';

export function DebtStatusModal({ open, onClose, debt }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(debt?.status || 'pending');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setStatus(debt?.status || 'pending');
    setErrors({});
  }, [open, debt?.id, debt?.status]);

  const mutation = useMutation({
    mutationFn: (payload) => api.payments.debts.updateStatus(debt.id, payload),
    onSuccess: () => {
      toast.success('Debt status updated');
      queryClient.invalidateQueries({ queryKey: ['payments', 'debts'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'debt', debt.id] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not update debt status.'));
    }
  });

  function handleSubmit(event) {
    event.preventDefault();
    mutation.mutate({ status });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={debt ? `Update status for debt #${debt.id}` : 'Update debt status'}
      description="Change the debt status without recording a new payment."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="debt-status-form" isLoading={mutation.isPending}>
            Save status
          </Button>
        </>
      }
    >
      <form id="debt-status-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Select
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          error={errors.status}
        >
          {DEBT_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}
