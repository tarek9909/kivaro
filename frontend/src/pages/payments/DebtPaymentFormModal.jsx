import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select,
  Textarea
} from '@/components/ui/index.js';
import { useIncomingCashAccountOptions } from '@/pages/accounting/useAccountingOptions.js';
import { formatNumber } from '@/lib/formatters.js';
import { PAYMENT_METHODS } from './payments.config.js';

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    amount: '',
    cash_account_id: '',
    payment_date: todayString(),
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  };
}

export function DebtPaymentFormModal({ open, onClose, debt }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open, debt?.id]);

  const cashAccountsQuery = useIncomingCashAccountOptions(open);
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];

  const remaining = Number(debt?.remaining_amount || 0);

  const mutation = useMutation({
    mutationFn: (payload) => api.payments.debts.pay(debt.id, payload),
    onSuccess: () => {
      toast.success('Debt payment recorded');
      queryClient.invalidateQueries({ queryKey: ['payments', 'debts'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'debt', debt.id] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'customer-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'receipts'] });
      queryClient.invalidateQueries({ queryKey: ['accounting', 'transactions'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not record debt payment.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      next.amount = 'Amount must be greater than zero.';
    } else if (remaining > 0 && amount > remaining + 1e-9) {
      next.amount = `At most ${formatNumber(remaining, {
        maximumFractionDigits: 4
      })} is still outstanding on this debt.`;
    }
    if (!form.cash_account_id) {
      next.cash_account_id = 'Cash account is required.';
    } else if (Number.isNaN(Number(form.cash_account_id))) {
      next.cash_account_id = 'Cash account ID must be numeric.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      amount: Number(form.amount),
      cash_account_id: Number(form.cash_account_id),
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      reference_number: form.reference_number?.trim() || null,
      notes: form.notes?.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={debt ? `Record payment on debt #${debt.id}` : 'Record debt payment'}
      description="Enter the amount received. The debt is marked partially paid or paid automatically."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="debt-payment-form" isLoading={mutation.isPending}>
            Record payment
          </Button>
        </>
      }
    >
      {debt && (
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-3.5 text-xs text-ink-300">
          <div>
            <span className="text-ink-400">Original Debt: </span>
            <span className="font-mono font-semibold text-ink-100">
              {formatNumber(debt.original_amount, { maximumFractionDigits: 4 })}
            </span>
          </div>
          <div>
            <span className="text-ink-400">Remaining Balance: </span>
            <span className="font-mono font-semibold text-amber-300">
              {formatNumber(debt.remaining_amount, { maximumFractionDigits: 4 })}
            </span>
          </div>
        </div>
      )}
      <form id="debt-payment-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Payment Entry</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Amount received"
              type="number"
              min="0"
              step="0.0001"
              value={form.amount}
              onChange={(event) => handleChange('amount', event.target.value)}
              error={errors.amount}
              required
              placeholder="0.00"
            />
            <Select
              label="Cash account"
              value={form.cash_account_id}
              onChange={(event) => handleChange('cash_account_id', event.target.value)}
              error={errors.cash_account_id}
              required
              disabled={cashAccountsQuery.isPending}
            >
              <option value="">Select incoming cash account</option>
              {cashAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.display_name || account.account_name || `Account #${account.id}`}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Payment date"
              type="date"
              value={form.payment_date}
              onChange={(event) => handleChange('payment_date', event.target.value)}
              error={errors.payment_date}
              required
            />
            <Select
              label="Method"
              value={form.payment_method}
              onChange={(event) => handleChange('payment_method', event.target.value)}
              error={errors.payment_method}
            >
              {PAYMENT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>

          <Input
            label="Reference number"
            value={form.reference_number}
            onChange={(event) => handleChange('reference_number', event.target.value)}
            error={errors.reference_number}
            placeholder="e.g. cheque or transfer reference"
          />

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(event) => handleChange('notes', event.target.value)}
            rows={3}
            placeholder="Payment reference or notes..."
          />
        </div>
      </form>
    </Modal>
  );
}
