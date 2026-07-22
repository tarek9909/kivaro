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
import { useSalesmenList } from '@/pages/locations/useLocationsOptions.js';
import { LOCATIONS_PERMISSIONS } from '@/pages/locations/locations.config.js';
import { ACCOUNTING_PERMISSIONS } from '@/pages/accounting/accounting.config.js';
import { formatNumber } from '@/lib/formatters.js';
import { PAYMENT_METHODS } from './payments.config.js';

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptyForm(debt) {
  return {
    payment_date: todayString(),
    amount: debt?.remaining_amount ? String(debt.remaining_amount) : '',
    payment_method: 'cash',
    reference_number: '',
    collected_by_salesman_id: debt?.salesman_id ? String(debt.salesman_id) : '',
    cash_account_id: '',
    notes: ''
  };
}

export function DebtPaymentFormModal({ open, onClose, debt }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickSalesmen = hasPermission(LOCATIONS_PERMISSIONS.salesmen);
  const canPickCashAccounts = hasPermission(ACCOUNTING_PERMISSIONS.view);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(() => emptyForm(debt));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(debt));
    setErrors({});
  }, [open, debt?.id]);

  const salesmenQuery = useSalesmenList(open && canPickSalesmen);
  const cashAccountsQuery = useCashAccountsList(open && canPickCashAccounts, { cash_flow_direction: 'incoming' });
  const salesmen = salesmenQuery.data?.data?.salesmen || [];
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
    if (!form.payment_date) next.payment_date = 'Payment date is required.';
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      next.amount = 'Amount must be greater than zero.';
    } else if (remaining > 0 && amount > remaining + 1e-9) {
      next.amount = `At most ${formatNumber(remaining, {
        maximumFractionDigits: 4
      })} is still outstanding on this debt.`;
    }
    if (
      form.collected_by_salesman_id &&
      Number.isNaN(Number(form.collected_by_salesman_id))
    ) {
      next.collected_by_salesman_id = 'Salesman ID must be numeric.';
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
      payment_date: form.payment_date,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      reference_number: form.reference_number?.trim() || null,
      collected_by_salesman_id: form.collected_by_salesman_id
        ? Number(form.collected_by_salesman_id)
        : null,
      cash_account_id: Number(form.cash_account_id),
      notes: form.notes?.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={debt ? `Record payment on debt #${debt.id}` : 'Record debt payment'}
      description="Record a payment against this debt. Remaining balance updates automatically."
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
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-ink-300">
          Original{' '}
          <span className="font-mono text-ink-100">
            {formatNumber(debt.original_amount, { maximumFractionDigits: 4 })}
          </span>
          {'  '}
          Remaining{' '}
          <span className="font-mono text-ink-100">
            {formatNumber(debt.remaining_amount, { maximumFractionDigits: 4 })}
          </span>
        </div>
      )}
      <form id="debt-payment-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            required
          />
          <Select
            label="Method"
            value={form.payment_method}
            onChange={(event) => handleChange('payment_method', event.target.value)}
            error={errors.payment_method}
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
          {canPickSalesmen ? (
            <Select
              label="Collected by salesman"
              value={form.collected_by_salesman_id}
              onChange={(event) =>
                handleChange('collected_by_salesman_id', event.target.value)
              }
              error={errors.collected_by_salesman_id}
              description="Optional."
            >
              <option value="">No salesman</option>
              {salesmen.map((salesman) => (
                <option key={salesman.id} value={salesman.id}>
                  {salesman.full_name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Salesman ID"
              type="number"
              min="1"
              value={form.collected_by_salesman_id}
              onChange={(event) =>
                handleChange('collected_by_salesman_id', event.target.value)
              }
              error={errors.collected_by_salesman_id}
              description="Optional. Numeric only."
            />
          )}
        </div>

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
