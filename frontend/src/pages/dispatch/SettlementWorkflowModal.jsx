import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus, XCircle } from 'lucide-react';
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
import { formatNumber } from '@/lib/formatters.js';
import { PAYMENT_METHODS } from './dispatch.config.js';
import { useCashAccountsList } from './useDispatchPicker.js';

const ACCOUNTING_VIEW = 'accounting.view';

function settlementCustomerKey(row) {
  return [
    row.dispatch_settlement_customer_id || row.id || '',
    row.dispatch_customer_id,
    row.collected_amount,
    row.expected_amount,
    row.notes
  ].join('|');
}

/**
 * Two-stage settlement worksheet backed by settlement detail so draft
 * settlements can be resumed after a refresh.
 */
export function SettlementWorkflowModal({
  open,
  onClose,
  dispatchRequest,
  settlement
}) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickCashAccounts = hasPermission(ACCOUNTING_VIEW);
  const queryClient = useQueryClient();

  const [addedCustomers, setAddedCustomers] = useState([]);
  const [customerForm, setCustomerForm] = useState({
    dispatch_customer_id: '',
    collected_amount: '',
    notes: ''
  });
  const [customerErrors, setCustomerErrors] = useState({});
  const [completeForm, setCompleteForm] = useState({
    cash_account_id: '',
    payment_method: 'cash',
    due_date: '',
    notes: ''
  });
  const [completeErrors, setCompleteErrors] = useState({});

  const settlementDetailQuery = useQuery({
    queryKey: ['dispatch', 'settlement', settlement?.id],
    queryFn: () => api.dispatch.settlements.get(settlement.id),
    enabled: Boolean(open && settlement?.id)
  });

  const activeSettlement = settlementDetailQuery.data?.data?.dispatch_settlement || settlement;

  useEffect(() => {
    if (!open) return;
    setAddedCustomers([]);
    setCustomerForm({
      dispatch_customer_id: '',
      collected_amount: '',
      notes: ''
    });
    setCustomerErrors({});
    setCompleteForm({
      cash_account_id: '',
      payment_method: 'cash',
      due_date: '',
      notes: ''
    });
    setCompleteErrors({});
  }, [open, settlement?.id]);

  useEffect(() => {
    if (!open) return;
    const rows = activeSettlement?.customers;
    if (Array.isArray(rows)) {
      setAddedCustomers(rows);
    }
  }, [open, activeSettlement?.id, activeSettlement?.customers]);

  const dispatchCustomers = dispatchRequest?.customers || [];
  const usedCustomerIds = new Set(
    addedCustomers.map((row) => Number(row.dispatch_customer_id))
  );
  const totalCollected = addedCustomers.reduce(
    (sum, row) => sum + (Number(row.collected_amount) || 0),
    0
  );
  const needsCashAccount = totalCollected > 0;
  const availableCustomers = dispatchCustomers.filter(
    (customer) => !usedCustomerIds.has(Number(customer.id))
  );

  const cashAccountsQuery = useCashAccountsList(open && canPickCashAccounts);
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];

  const addCustomerMutation = useMutation({
    mutationFn: (payload) => api.dispatch.settlements.addCustomer(activeSettlement.id, payload),
    onSuccess: (response, payload) => {
      const row = response?.data?.dispatch_settlement_customer || {
        dispatch_customer_id: payload.dispatch_customer_id,
        collected_amount: payload.collected_amount,
        notes: payload.notes
      };
      setAddedCustomers((prev) => [...prev, row]);
      setCustomerForm({
        dispatch_customer_id: '',
        collected_amount: '',
        notes: ''
      });
      setCustomerErrors({});
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'settlement', activeSettlement.id] });
      toast.success('Customer added to settlement');
    },
    onError: (error) => {
      setCustomerErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not add customer to settlement.'));
    }
  });

  const completeMutation = useMutation({
    mutationFn: (payload) => api.dispatch.settlements.complete(activeSettlement.id, payload),
    onSuccess: () => {
      toast.success('Settlement completed');
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequest.id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      onClose?.();
    },
    onError: (error) => {
      setCompleteErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not complete settlement.'));
    }
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.dispatch.settlements.cancel(activeSettlement.id),
    onSuccess: () => {
      toast.success('Settlement cancelled');
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequest.id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      onClose?.();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Could not cancel settlement.'));
    }
  });

  function validateCustomer() {
    const next = {};
    const customerId = Number(customerForm.dispatch_customer_id);
    if (!customerForm.dispatch_customer_id || Number.isNaN(customerId) || customerId <= 0) {
      next.dispatch_customer_id = 'Select a customer to settle.';
    }
    const collected = Number(customerForm.collected_amount);
    if (
      customerForm.collected_amount === '' ||
      Number.isNaN(collected) ||
      collected < 0
    ) {
      next.collected_amount = 'Collected amount is required.';
    }
    setCustomerErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleAddCustomer(event) {
    event.preventDefault();
    if (!validateCustomer()) return;
    const payload = {
      dispatch_customer_id: Number(customerForm.dispatch_customer_id),
      collected_amount: Number(customerForm.collected_amount)
    };
    if (customerForm.notes?.trim()) payload.notes = customerForm.notes.trim();
    addCustomerMutation.mutate(payload);
  }

  function validateComplete() {
    const next = {};
    if (needsCashAccount && completeForm.cash_account_id === '') {
      next.cash_account_id = 'Cash account is required when collected amount is greater than zero.';
    } else if (
      completeForm.cash_account_id !== '' &&
      Number.isNaN(Number(completeForm.cash_account_id))
    ) {
      next.cash_account_id = 'Cash account ID must be numeric.';
    }
    setCompleteErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleComplete(event) {
    event.preventDefault();
    if (addedCustomers.length === 0) {
      toast.error('Add at least one customer before completing the settlement.');
      return;
    }
    if (!validateComplete()) return;
    const payload = {
      payment_method: completeForm.payment_method
    };
    if (completeForm.cash_account_id !== '') {
      payload.cash_account_id = Number(completeForm.cash_account_id);
    } else {
      payload.cash_account_id = null;
    }
    payload.due_date = completeForm.due_date || null;
    payload.notes = completeForm.notes?.trim() ? completeForm.notes.trim() : null;
    completeMutation.mutate(payload);
  }

  const customerLookup = new Map(
    dispatchCustomers.map((customer) => [Number(customer.id), customer])
  );
  const selectedCustomer = customerLookup.get(Number(customerForm.dispatch_customer_id));
  const selectedExpectedAmount =
    selectedCustomer?.net_total_amount ?? selectedCustomer?.customer_total_amount;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        activeSettlement
          ? `Settle ${activeSettlement.settlement_number || `#${activeSettlement.id}`}`
          : 'Settlement'
      }
      description="Record what each customer paid and how much remains. Complete the settlement to post payments and outstanding debts."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={completeMutation.isPending}>
            Close
          </Button>
          {activeSettlement?.status === 'draft' && (
            <Button
              variant="danger"
              leftIcon={XCircle}
              onClick={() => cancelMutation.mutate()}
              isLoading={cancelMutation.isPending}
              disabled={completeMutation.isPending}
            >
              Cancel settlement
            </Button>
          )}
          <Button
            type="submit"
            form="dispatch-settlement-complete-form"
            leftIcon={CheckCircle2}
            isLoading={completeMutation.isPending}
            disabled={addedCustomers.length === 0 || cancelMutation.isPending}
          >
            Complete settlement
          </Button>
        </>
      }
    >
      {!activeSettlement ? (
        <p className="text-sm text-ink-300">
          Open a settlement first to add customers.
        </p>
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="font-display text-sm font-semibold text-ink-50">
              Add customer collection
            </h3>
            <p className="mt-1 text-xs text-ink-400">
              Pick a customer that was on the dispatch and record the amount collected.
            </p>
            <form
              id="dispatch-settlement-customer-form"
              onSubmit={handleAddCustomer}
              className="mt-3 space-y-3"
              noValidate
            >
              <Select
                label="Customer"
                value={customerForm.dispatch_customer_id}
                onChange={(event) =>
                  setCustomerForm((prev) => ({
                    ...prev,
                    dispatch_customer_id: event.target.value
                  }))
                }
                error={customerErrors.dispatch_customer_id}
                required
              >
                <option value="">Select customer</option>
                {availableCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customer_name || `customer #${customer.customer_id}`}
                    {(customer.net_total_amount ?? customer.customer_total_amount)
                      ? ` (expected ${formatNumber(customer.net_total_amount ?? customer.customer_total_amount, {
                          maximumFractionDigits: 4
                        })})`
                      : ''}
                  </option>
                ))}
              </Select>
              <div className="grid gap-3 sm:grid-cols-2">
                <div
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                  aria-live="polite"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Expected amount
                  </p>
                  <p className="mt-1 font-mono text-sm text-ink-50">
                    {selectedCustomer
                      ? formatNumber(selectedExpectedAmount || 0, { maximumFractionDigits: 4 })
                      : 'Select customer'}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    Computed from dispatch net total.
                  </p>
                </div>
                <Input
                  label="Collected amount"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={customerForm.collected_amount}
                  onChange={(event) =>
                    setCustomerForm((prev) => ({
                      ...prev,
                      collected_amount: event.target.value
                    }))
                  }
                  error={customerErrors.collected_amount}
                  required
                />
              </div>
              <Textarea
                label="Notes"
                value={customerForm.notes}
                onChange={(event) =>
                  setCustomerForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={2}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  leftIcon={Plus}
                  isLoading={addCustomerMutation.isPending}
                  disabled={availableCustomers.length === 0}
                >
                  Add to settlement
                </Button>
              </div>
            </form>
          </section>

          <section>
            <h3 className="font-display text-sm font-semibold text-ink-50">
              Customers on this settlement
            </h3>
            {addedCustomers.length === 0 ? (
              <p className="mt-2 text-sm text-ink-300">
                No customers have been added to this settlement yet.
              </p>
            ) : (
              <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
                {addedCustomers.map((row) => {
                  const customer = customerLookup.get(Number(row.dispatch_customer_id));
                  return (
                    <li
                      key={settlementCustomerKey(row)}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-50">
                            {customer?.customer_name || `customer #${row.dispatch_customer_id}`}
                          </p>
                          {row.notes && (
                            <p className="truncate text-xs text-ink-400">{row.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-ink-200">
                          <span>
                            Expected{' '}
                            {formatNumber(row.expected_amount, { maximumFractionDigits: 4 })}
                          </span>
                          <span>
                            Collected{' '}
                            {formatNumber(row.collected_amount, { maximumFractionDigits: 4 })}
                          </span>
                          {row.debt_amount !== undefined && row.debt_amount !== null && (
                            <span>
                              Debt {formatNumber(row.debt_amount, { maximumFractionDigits: 4 })}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h3 className="font-display text-sm font-semibold text-ink-50">Complete settlement</h3>
            <p className="mt-1 text-xs text-ink-400">
              Post payments, outstanding debts, and receipts. The dispatch request will move to
              completed.
            </p>
            <form
              id="dispatch-settlement-complete-form"
              onSubmit={handleComplete}
              className="mt-3 space-y-3"
              noValidate
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Payment method"
                  value={completeForm.payment_method}
                  onChange={(event) =>
                    setCompleteForm((prev) => ({
                      ...prev,
                      payment_method: event.target.value
                    }))
                  }
                  error={completeErrors.payment_method}
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Due date"
                  type="date"
                  value={completeForm.due_date}
                  onChange={(event) =>
                    setCompleteForm((prev) => ({ ...prev, due_date: event.target.value }))
                  }
                  error={completeErrors.due_date}
                  description="Optional. Used for outstanding debts."
                />
              </div>

              {canPickCashAccounts ? (
                <Select
                  label="Cash account"
                  value={completeForm.cash_account_id}
                  onChange={(event) =>
                    setCompleteForm((prev) => ({
                      ...prev,
                      cash_account_id: event.target.value
                    }))
                  }
                  error={completeErrors.cash_account_id}
                  required={needsCashAccount}
                  description={needsCashAccount ? undefined : 'Not required when total collected is zero.'}
                >
                  <option value="">
                    {needsCashAccount ? 'Select cash account' : 'No cash account'}
                  </option>
                  {cashAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name || account.name || `Account #${account.id}`}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  label="Cash account ID"
                  type="number"
                  min="1"
                  value={completeForm.cash_account_id}
                  onChange={(event) =>
                    setCompleteForm((prev) => ({
                      ...prev,
                      cash_account_id: event.target.value
                    }))
                  }
                  error={completeErrors.cash_account_id}
                  required={needsCashAccount}
                  description={needsCashAccount ? 'Numeric only.' : 'Leave blank when total collected is zero.'}
                />
              )}

              <Textarea
                label="Notes"
                value={completeForm.notes}
                onChange={(event) =>
                  setCompleteForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={3}
              />
            </form>
          </section>
        </div>
      )}
    </Modal>
  );
}
