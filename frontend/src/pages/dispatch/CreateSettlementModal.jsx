import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Textarea
} from '@/components/ui/index.js';

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Open a settlement on a dispatched request. The settlement object returned
 * by this call is handed back to the caller via onCreated so the next step
 * (adding settlement customers and completing the settlement) can run from
 * the in-memory result. We deliberately do not refetch a settlements list.
 */
export function CreateSettlementModal({ open, onClose, dispatchRequest, onCreated }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    settlement_number: '',
    settlement_date: todayString(),
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({
      settlement_number: '',
      settlement_date: todayString(),
      notes: ''
    });
    setErrors({});
  }, [open, dispatchRequest?.id]);

  const mutation = useMutation({
    mutationFn: (payload) => api.dispatch.requests.createSettlement(dispatchRequest.id, payload),
    onSuccess: (response) => {
      const settlement = response?.data?.dispatch_settlement;
      toast.success('Settlement opened');
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequest.id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      if (settlement) onCreated?.(settlement);
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not open settlement.'));
    }
  });

  function validate() {
    const next = {};
    if (!form.settlement_date) next.settlement_date = 'Settlement date is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      settlement_number: form.settlement_number?.trim() || undefined,
      settlement_date: form.settlement_date,
      notes: form.notes?.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Open settlement"
      description="Open a settlement to record collected and outstanding amounts for the customers on this dispatch."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="dispatch-settlement-form"
            isLoading={mutation.isPending}
          >
            Open settlement
          </Button>
        </>
      }
    >
      <form
        id="dispatch-settlement-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        <Input
          label="Settlement number"
          value={form.settlement_number}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, settlement_number: event.target.value }))
          }
          error={errors.settlement_number}
          description="Optional. Auto-generated when blank."
        />
        <Input
          label="Settlement date"
          type="date"
          value={form.settlement_date}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, settlement_date: event.target.value }))
          }
          error={errors.settlement_date}
          required
        />
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          rows={3}
        />
      </form>
    </Modal>
  );
}
