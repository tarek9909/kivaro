import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select,
  Textarea
} from '@/components/ui/index.js';
import { useCashAccountsList } from '@/pages/accounting/useAccountingOptions.js';
import { ACCOUNTING_PERMISSIONS } from '@/pages/accounting/accounting.config.js';
import { formatNumber } from '@/lib/formatters.js';
import { PAYMENT_METHODS } from './commissions.config.js';

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptyForm() {
  return {
    payment_date: todayString(),
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    cash_account_id: '',
    notes: ''
  };
}

export function CommissionPayModal({ open, onClose, commission }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickCashAccounts = hasPermission(ACCOUNTING_PERMISSIONS.view);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open, commission?.id]);

  const cashAccountsQuery = useCashAccountsList(open && canPickCashAccounts);
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];

  const mutation = useMutation({
    mutationFn: (payload) => api.commissions.calculations.pay(commission.id, payload),
    onSuccess: () => {
      toast.success('Commission paid');
      queryClient.invalidateQueries({ queryKey: ['commissions', 'calculations'] });
      queryClient.invalidateQueries({
        queryKey: ['commissions', 'calculation', commission.id]
      });
      queryClient.invalidateQueries({ queryKey: ['accounting', 'transactions'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not pay commission.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.payment_date) next.payment_date = 'Payment date is required.';
    if (form.amount !== '') {
      const amount = Number(form.amount);
      if (Number.isNaN(amount) || amount <= 0) {
        next.amount = 'Amount must be greater than zero.';
      }
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
    const payload = {
      payment_date: form.payment_date,
      payment_method: form.payment_method,
      reference_number: form.reference_number?.trim() || null,
      cash_account_id: Number(form.cash_account_id),
      notes: form.notes?.trim() || null
    };
    if (form.amount !== '') {
      payload.amount = Number(form.amount);
    }
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        commission
          ? `Pay commission #${commission.id}`
          : 'Pay commission'
      }
      description="Record the commission payout and post it to a cash account."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="commission-pay-form" isLoading={mutation.isPending}>
            Pay commission
          </Button>
        </>
      }
    >
      {commission && (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-ink-300">
          Calculated total{' '}
          <span className="font-mono text-ink-100">
            {formatNumber(commission.total_commission, { maximumFractionDigits: 4 })}
          </span>
        </div>
      )}
      <form id="commission-pay-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Payment date"
            type="date"
            value={form.payment_date}
            onChange={(event) => handleChange('payment_date', event.target.value)}
            error={errors.payment_date}
            required
          />
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.0001"
            value={form.amount}
            onChange={(event) => handleChange('amount', event.target.value)}
            error={errors.amount}
            description="Optional. Defaults to the calculated total."
          />
          <Select
            label="Method"
            value={form.payment_method}
            onChange={(event) => handleChange('payment_method', event.target.value)}
          >
            {PAYMENT_METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Reference number"
            value={form.reference_number}
            onChange={(event) => handleChange('reference_number', event.target.value)}
            error={errors.reference_number}
          />
          {canPickCashAccounts ? (
            <Select
              label="Cash account"
              value={form.cash_account_id}
              onChange={(event) => handleChange('cash_account_id', event.target.value)}
              error={errors.cash_account_id}
              required
            >
              <option value="">Select cash account</option>
              {cashAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name || `Account #${account.id}`}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Cash account ID"
              type="number"
              min="1"
              value={form.cash_account_id}
              onChange={(event) => handleChange('cash_account_id', event.target.value)}
              error={errors.cash_account_id}
              required
              description="Numeric only."
            />
          )}
        </div>
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(event) => handleChange('notes', event.target.value)}
          rows={3}
        />
      </form>
    </Modal>
  );
}
