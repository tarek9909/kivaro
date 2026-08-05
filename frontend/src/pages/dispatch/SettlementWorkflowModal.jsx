import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Button, Input, Modal, Select } from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';
import { useCashAccountsList } from './useDispatchPicker.js';

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
  const cashAccountsQuery = useCashAccountsList(open);
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];

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
      next.cash_account_id = 'Select a valid cash account.';
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
      title="Post Settlement & Finalize Cash"
      description="Record the incoming cash account and finalize customer debts."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="post-dispatch-settlement" isLoading={mutation.isPending}>Post Settlement</Button>
        </>
      }
    >
      <form id="post-dispatch-settlement" onSubmit={submit} className="space-y-5" noValidate>
        {/* Metric Overview Box */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-4 space-y-2.5 text-sm">
          <div className="flex justify-between gap-3 text-xs">
            <span className="text-ink-400">Closeout Reference</span>
            <span className="font-mono text-ink-100 font-medium">{settlement?.settlement_number || `#${settlement?.id}`}</span>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <span className="text-ink-400">Total Collected Cash</span>
            <span className="font-mono text-emerald-400 font-semibold">{formatNumber(collected, { maximumFractionDigits: 4 })}</span>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <span className="text-ink-400">Remaining Debt</span>
            <span className="font-mono text-amber-400 font-medium">{formatNumber(settlement?.total_debt || 0, { maximumFractionDigits: 4 })}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <Select
            label="Incoming cash account"
            value={cashAccountId}
            onChange={(event) => setCashAccountId(event.target.value)}
            error={errors.cash_account_id}
            disabled={cashAccountsQuery.isLoading}
            description={collected > 0 ? 'Required because this closeout collected money.' : 'Optional because no money was collected.'}
          >
            <option value="">
              {cashAccountsQuery.isLoading
                ? 'Loading cash accounts…'
                : cashAccountsQuery.isError
                  ? 'Cash accounts could not be loaded'
                  : 'Select incoming cash account'}
            </option>
            {cashAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.display_name || account.account_name || account.name || `Account #${account.id}`}
              </option>
            ))}
          </Select>

          <Input
            label="Posting date"
            type="date"
            value={settlementDate}
            onChange={(event) => setSettlementDate(event.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
