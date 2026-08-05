import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useIncomingCashAccountOptions, useCustomersList } from '@/pages/accounting/useAccountingOptions.js';
import { useSalesmenList } from '@/pages/locations/useLocationsOptions.js';
import { LOCATIONS_PERMISSIONS } from '@/pages/locations/locations.config.js';
import { PAYMENT_METHODS } from './payments.config.js';

const CUSTOMERS_VIEW = 'customers.view';

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptyForm() {
  return {
    customer_id: '',
    customer_debt_id: '',
    payment_date: todayString(),
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    collected_by_salesman_id: '',
    cash_account_id: '',
    notes: ''
  };
}

export function CustomerPaymentFormModal({ open, onClose }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickCustomers = hasPermission(CUSTOMERS_VIEW);
  const canPickSalesmen = hasPermission(LOCATIONS_PERMISSIONS.salesmen);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open]);

  const customersQuery = useCustomersList(open && canPickCustomers);
  const salesmenQuery = useSalesmenList(open && canPickSalesmen);
  const cashAccountsQuery = useIncomingCashAccountOptions(open);
  const openDebtsQuery = useQuery({
    queryKey: ['payments', 'customer-payment-debts', form.customer_id],
    queryFn: () => api.payments.debts.list({ customer_id: Number(form.customer_id), page: 1, limit: 100 }),
    enabled: Boolean(open && Number(form.customer_id) > 0)
  });

  const customers = customersQuery.data?.data?.customers || [];
  const salesmen = salesmenQuery.data?.data?.salesmen || [];
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];
  const openDebts = (openDebtsQuery.data?.data?.customer_debts || []).filter((debt) => (
    ['pending', 'partially_paid'].includes(debt.status) && Number(debt.remaining_amount) > 0
  ));

  const mutation = useMutation({
    mutationFn: (payload) => api.payments.customerPayments.create(payload),
    onSuccess: () => {
      toast.success('Payment recorded');
      queryClient.invalidateQueries({ queryKey: ['payments', 'customer-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'debts'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'receipts'] });
      queryClient.invalidateQueries({ queryKey: ['accounting', 'transactions'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not record payment.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'customer_id' ? { customer_debt_id: '' } : {})
    }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    const customerId = Number(form.customer_id);
    if (!form.customer_id || Number.isNaN(customerId) || customerId <= 0) {
      next.customer_id = 'Customer is required.';
    }
    if (!form.payment_date) next.payment_date = 'Payment date is required.';
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      next.amount = 'Amount must be greater than zero.';
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
      customer_id: Number(form.customer_id),
      customer_debt_id: form.customer_debt_id ? Number(form.customer_debt_id) : null,
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
      title="Record customer payment"
      description="Record a payment received from a customer and post it to a cash account."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="customer-payment-form"
            isLoading={mutation.isPending}
          >
            Record payment
          </Button>
        </>
      }
    >
      <form id="customer-payment-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Customer & Date Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Customer & Salesman</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {canPickCustomers ? (
              <Select
                label="Customer"
                value={form.customer_id}
                onChange={(event) => handleChange('customer_id', event.target.value)}
                error={errors.customer_id}
                required
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.customer_code ? ` (${customer.customer_code})` : ''}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Customer ID"
                type="number"
                min="1"
                value={form.customer_id}
                onChange={(event) => handleChange('customer_id', event.target.value)}
                error={errors.customer_id}
                required
                description="Numeric only."
              />
            )}

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
          <Input
            label="Payment date"
            type="date"
            value={form.payment_date}
            onChange={(event) => handleChange('payment_date', event.target.value)}
            error={errors.payment_date}
            required
          />
          {Number(form.customer_id) > 0 && (
            <Select
              label="Apply to debt"
              value={form.customer_debt_id}
              onChange={(event) => handleChange('customer_debt_id', event.target.value)}
              error={errors.customer_debt_id}
              description="Optional. Leave blank to apply FIFO across this customer's open debts."
              disabled={openDebtsQuery.isPending}
            >
              <option value="">FIFO across open debts</option>
              {openDebts.map((debt) => (
                <option key={debt.id} value={debt.id}>
                  {`${debt.debt_number || `Debt #${debt.id}`} — remaining ${Number(debt.remaining_amount || 0).toFixed(4)}`}
                </option>
              ))}
            </Select>
          )}
          {Number(form.customer_id) > 0 && !openDebtsQuery.isPending && (
            <p className="text-xs text-ink-400">
              {form.customer_debt_id
                ? 'The selected debt is paid first; any remaining amount follows FIFO across the customer\'s other open debts, then becomes credit.'
                : openDebts.length
                  ? `The payment will be allocated FIFO across ${openDebts.length} open debt${openDebts.length === 1 ? '' : 's'}.`
                  : 'This customer has no open debts; the payment will become customer credit.'}
            </p>
          )}
        </div>

        {/* Payment Amount & Account Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Payment Details & Cash Account</h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Amount"
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
              placeholder="e.g. CHEQ-10492"
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

          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(event) => handleChange('notes', event.target.value)}
            rows={3}
            placeholder="Payment details or memo..."
          />
        </div>
      </form>
    </Modal>
  );
}
