import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Button, Input, Modal } from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Manager-only cash posting for an already submitted delivery closeout. */
export function SettlementWorkflowModal({ open, onClose, settlement, dispatchRequest, onPosted }) {
  const queryClient = useQueryClient();
  const [cashAccountId, setCashAccountId] = useState('');
  const [settlementDate, setSettlementDate] = useState(todayString());
  const [errors, setErrors] = useState({});
  const collected = Number(settlement?.total_collected || 0);

  useEffect(() => {
    if (!open) return;
    setCashAccountId(settlement?.cash_account_id ? String(settlement.cash_account_id) : '');
    setSettlementDate(settlement?.settlement_date?.slice?.(0, 10) || todayString());
    setErrors({});
  }, [open, settlement]);

  const mutation = useMutation({
    mutationFn: (payload) => api.dispatch.settlements.post(settlement.id, payload),
    onSuccess: () => {
      toast.success('Settlement posted');
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequest?.id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      onPosted?.();
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not post settlement.'));
    }
  });

  function submit(event) {
    event.preventDefault();
    const next = {};
    const numericAccount = cashAccountId === '' ? null : Number(cashAccountId);
    if (cashAccountId !== '' && (!Number.isInteger(numericAccount) || numericAccount <= 0)) {
      next.cash_account_id = 'Enter a valid cash account ID.';
    }
    if (collected > 0 && !numericAccount) {
      next.cash_account_id = 'An incoming cash account is required because money was collected.';
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    mutation.mutate({
      cash_account_id: numericAccount,
      settlement_date: settlementDate || undefined
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Post settlement"
      description="This records the selected cash account and finalizes customer debts. It cannot be edited after posting."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="post-dispatch-settlement" isLoading={mutation.isPending}>Post settlement</Button>
        </>
      }
    >
      <form id="post-dispatch-settlement" onSubmit={submit} className="space-y-4" noValidate>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
          <div className="flex justify-between gap-3"><span className="text-ink-300">Closeout</span><span className="text-ink-100">{settlement?.settlement_number || `#${settlement?.id}`}</span></div>
          <div className="mt-1 flex justify-between gap-3"><span className="text-ink-300">Collected</span><span className="font-mono text-ink-100">{formatNumber(collected, { maximumFractionDigits: 4 })}</span></div>
          <div className="mt-1 flex justify-between gap-3"><span className="text-ink-300">Debt</span><span className="font-mono text-ink-100">{formatNumber(settlement?.total_debt || 0, { maximumFractionDigits: 4 })}</span></div>
        </div>
        <Input
          label="Incoming cash account ID"
          type="number"
          min="1"
          value={cashAccountId}
          onChange={(event) => setCashAccountId(event.target.value)}
          error={errors.cash_account_id}
          description={collected > 0 ? 'Required because this closeout collected money. Only incoming or both accounts are accepted.' : 'Optional because no money was collected.'}
        />
        <Input
          label="Posting date"
          type="date"
          value={settlementDate}
          onChange={(event) => setSettlementDate(event.target.value)}
        />
      </form>
    </Modal>
  );
}
