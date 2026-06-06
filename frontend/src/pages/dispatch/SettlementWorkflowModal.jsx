import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
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

function customerBaseExpected(customer) {
  return Number(customer?.net_total_amount ?? customer?.customer_total_amount ?? 0);
}

function itemReturnDeduction(item, returnedQuantity) {
  const quantity = Number(item.quantity || 0);
  const lineTotal = Number(item.line_total || 0);
  if (quantity <= 0 || returnedQuantity <= 0) return 0;
  return (lineTotal / quantity) * returnedQuantity;
}

function buildInitialRows(dispatchCustomers, itemsByCustomer, existingCustomers) {
  const existingIds = new Set((existingCustomers || []).map((row) => Number(row.dispatch_customer_id)));

  return dispatchCustomers
    .filter((customer) => !existingIds.has(Number(customer.id)))
    .map((customer) => ({
      dispatch_customer_id: String(customer.id),
      selected: true,
      settlement_status: 'completed',
      collected_amount: '',
      has_return: false,
      notes: '',
      return_items: (itemsByCustomer.get(Number(customer.id)) || []).map((item) => ({
        dispatch_item_id: String(item.id),
        returned_quantity: ''
      }))
    }));
}

function SettlementCustomerRow({
  customer,
  items,
  row,
  onChange,
  errors
}) {
  const returnByItem = new Map((row.return_items || []).map((entry) => [Number(entry.dispatch_item_id), entry]));
  const returnDeduction = items.reduce((sum, item) => {
    const returnEntry = returnByItem.get(Number(item.id));
    return sum + itemReturnDeduction(item, Number(returnEntry?.returned_quantity || 0));
  }, 0);
  const expected = Math.max(customerBaseExpected(customer) - returnDeduction, 0);
  const collected = row.settlement_status === 'completed'
    ? expected
    : Number(row.collected_amount || 0);
  const remaining = Math.max(expected - collected, 0);

  function updateReturnItem(itemId, value) {
    onChange({
      return_items: (row.return_items || []).map((entry) =>
        Number(entry.dispatch_item_id) === Number(itemId)
          ? { ...entry, returned_quantity: value }
          : entry
      )
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10"
            checked={row.selected}
            onChange={(event) => onChange({ selected: event.target.checked })}
          />
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink-50">
              {customer.customer_name || `customer #${customer.customer_id}`}
            </span>
            <span className="mt-1 block font-mono text-xs text-ink-400">
              Expected {formatNumber(expected, { maximumFractionDigits: 4 })}
              {returnDeduction > 0
                ? ` / Return deduction ${formatNumber(returnDeduction, { maximumFractionDigits: 4 })}`
                : ''}
            </span>
          </span>
        </label>
        <div className="font-mono text-xs text-ink-200">
          Remaining {formatNumber(remaining, { maximumFractionDigits: 4 })}
        </div>
      </div>

      {row.selected && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'completed', label: 'Completed' },
                { value: 'partial', label: 'Partial' }
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/20 bg-white/10"
                    checked={row.settlement_status === option.value}
                    onChange={() => onChange({
                      settlement_status: option.value,
                      collected_amount: option.value === 'completed' ? '' : row.collected_amount
                    })}
                    aria-label={option.label}
                  />
                  <span className="text-sm font-medium text-ink-100">{option.label}</span>
                </label>
              ))}
            </div>
            <Input
              label="Collected"
              type="number"
              min="0"
              step="0.0001"
              value={row.settlement_status === 'completed' ? expected.toFixed(4) : row.collected_amount}
              onChange={(event) => onChange({ collected_amount: event.target.value })}
              disabled={row.settlement_status === 'completed'}
              error={errors?.collected_amount}
            />
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-white/10"
                checked={row.has_return}
                onChange={(event) => onChange({ has_return: event.target.checked })}
              />
              <span className="text-sm font-medium text-ink-100">Return</span>
            </label>
          </div>

          {row.has_return && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-ink-400">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                Returned items
              </div>
              <div className="grid gap-2">
                {items.map((item) => {
                  const entry = returnByItem.get(Number(item.id));
                  const maxReturn = Math.max(Number(item.quantity || 0) - Number(item.returned_quantity || 0), 0);
                  const returnedQuantity = Number(entry?.returned_quantity || 0);
                  return (
                    <div key={item.id} className="grid gap-2 md:grid-cols-[1fr_160px_150px] md:items-end">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink-100">
                          {item.item_name || ''}
                          {item.variant_name ? ` - ${item.variant_name}` : ''}
                        </p>
                        <p className="font-mono text-xs text-ink-400">
                          Available {formatNumber(maxReturn, { maximumFractionDigits: 4 })}
                        </p>
                      </div>
                      <Input
                        label="Return qty"
                        type="number"
                        min="0"
                        max={maxReturn}
                        step="0.0001"
                        value={entry?.returned_quantity || ''}
                        onChange={(event) => updateReturnItem(item.id, event.target.value)}
                      />
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-ink-400">Deduction</p>
                        <p className="mt-1 font-mono text-sm text-ink-50">
                          {formatNumber(itemReturnDeduction(item, returnedQuantity), { maximumFractionDigits: 4 })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Textarea
            label="Notes"
            value={row.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

export function SettlementWorkflowModal({
  open,
  onClose,
  dispatchRequest,
  settlement
}) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickCashAccounts = hasPermission(ACCOUNTING_VIEW);
  const queryClient = useQueryClient();

  const [rows, setRows] = useState([]);
  const [completeForm, setCompleteForm] = useState({
    cash_account_id: '',
    payment_method: 'cash',
    due_date: '',
    notes: ''
  });
  const [completeErrors, setCompleteErrors] = useState({});
  const [rowErrors, setRowErrors] = useState({});

  const settlementDetailQuery = useQuery({
    queryKey: ['dispatch', 'settlement', settlement?.id],
    queryFn: () => api.dispatch.settlements.get(settlement.id),
    enabled: Boolean(open && settlement?.id)
  });

  const activeSettlement = settlementDetailQuery.data?.data?.dispatch_settlement || settlement;
  const dispatchCustomers = dispatchRequest?.customers || [];
  const dispatchItems = dispatchRequest?.items || [];
  const itemsByCustomer = useMemo(
    () => dispatchItems.reduce((acc, item) => {
      const key = Number(item.dispatch_customer_id);
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key).push(item);
      return acc;
    }, new Map()),
    [dispatchItems]
  );

  useEffect(() => {
    if (!open) return;
    setRows(buildInitialRows(dispatchCustomers, itemsByCustomer, activeSettlement?.customers || []));
    setCompleteForm({
      cash_account_id: '',
      payment_method: 'cash',
      due_date: '',
      notes: ''
    });
    setCompleteErrors({});
    setRowErrors({});
  }, [open, activeSettlement?.id, activeSettlement?.customers, dispatchCustomers, itemsByCustomer]);

  const customerLookup = useMemo(
    () => new Map(dispatchCustomers.map((customer) => [Number(customer.id), customer])),
    [dispatchCustomers]
  );

  function rowExpected(row) {
    const customer = customerLookup.get(Number(row.dispatch_customer_id));
    const items = itemsByCustomer.get(Number(row.dispatch_customer_id)) || [];
    const returnByItem = new Map((row.return_items || []).map((entry) => [Number(entry.dispatch_item_id), entry]));
    const deduction = items.reduce((sum, item) => (
      sum + itemReturnDeduction(item, Number(returnByItem.get(Number(item.id))?.returned_quantity || 0))
    ), 0);
    return Math.max(customerBaseExpected(customer) - deduction, 0);
  }

  const selectedRows = rows.filter((row) => row.selected);
  const totalCollected = selectedRows.reduce((sum, row) => {
    const expected = rowExpected(row);
    return sum + (row.settlement_status === 'completed' ? expected : Number(row.collected_amount || 0));
  }, 0);
  const needsCashAccount = totalCollected > 0;

  const cashAccountsQuery = useCashAccountsList(open && canPickCashAccounts);
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];

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

  function updateRow(index, changes) {
    setRows((prev) => prev.map((row, rowIndex) => (
      rowIndex === index ? { ...row, ...changes } : row
    )));
    setRowErrors((prev) => ({ ...prev, [index]: undefined }));
  }

  function validateComplete() {
    const next = {};
    const nextRowErrors = {};

    if (selectedRows.length === 0) {
      next.customers = 'Select at least one customer to settle.';
    }
    if (needsCashAccount && completeForm.cash_account_id === '') {
      next.cash_account_id = 'Cash account is required when collected amount is greater than zero.';
    } else if (
      completeForm.cash_account_id !== '' &&
      Number.isNaN(Number(completeForm.cash_account_id))
    ) {
      next.cash_account_id = 'Cash account ID must be numeric.';
    }

    rows.forEach((row, index) => {
      if (!row.selected) return;
      const expected = rowExpected(row);
      if (row.settlement_status === 'partial') {
        const collected = Number(row.collected_amount);
        if (row.collected_amount === '' || Number.isNaN(collected) || collected < 0) {
          nextRowErrors[index] = { collected_amount: 'Collected amount is required.' };
        } else if (collected >= expected && expected > 0) {
          nextRowErrors[index] = { collected_amount: 'Partial amount must be less than expected.' };
        }
      }
      const items = itemsByCustomer.get(Number(row.dispatch_customer_id)) || [];
      const itemMap = new Map(items.map((item) => [Number(item.id), item]));
      for (const returnItem of row.return_items || []) {
        const item = itemMap.get(Number(returnItem.dispatch_item_id));
        const returnedQuantity = Number(returnItem.returned_quantity || 0);
        const maxReturn = Math.max(Number(item?.quantity || 0) - Number(item?.returned_quantity || 0), 0);
        if (returnedQuantity < 0 || returnedQuantity > maxReturn) {
          nextRowErrors[index] = { collected_amount: 'Return quantity cannot exceed available quantity.' };
        }
      }
    });

    setCompleteErrors(next);
    setRowErrors(nextRowErrors);
    return Object.keys(next).length === 0 && Object.keys(nextRowErrors).length === 0;
  }

  function handleComplete(event) {
    event.preventDefault();
    if (!validateComplete()) return;

    const payload = {
      payment_method: completeForm.payment_method,
      cash_account_id: completeForm.cash_account_id !== '' ? Number(completeForm.cash_account_id) : null,
      due_date: completeForm.due_date || null,
      notes: completeForm.notes?.trim() ? completeForm.notes.trim() : null,
      customers: selectedRows.map((row) => ({
        dispatch_customer_id: Number(row.dispatch_customer_id),
        settlement_status: row.settlement_status,
        collected_amount: row.settlement_status === 'completed'
          ? rowExpected(row)
          : Number(row.collected_amount || 0),
        notes: row.notes?.trim() || null,
        return_items: row.has_return
          ? (row.return_items || [])
              .filter((entry) => Number(entry.returned_quantity || 0) > 0)
              .map((entry) => ({
                dispatch_item_id: Number(entry.dispatch_item_id),
                returned_quantity: Number(entry.returned_quantity)
              }))
          : []
      }))
    };

    completeMutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        activeSettlement
          ? `Settle ${activeSettlement.settlement_number || `#${activeSettlement.id}`}`
          : 'Settlement'
      }
      description="Settle customers in one worksheet. Mark complete, partial, or record returned quantities before posting."
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
            disabled={selectedRows.length === 0 || cancelMutation.isPending}
          >
            Complete settlement
          </Button>
        </>
      }
    >
      {!activeSettlement ? (
        <p className="text-sm text-ink-300">Open a settlement first.</p>
      ) : (
        <form
          id="dispatch-settlement-complete-form"
          onSubmit={handleComplete}
          className="space-y-5"
          noValidate
        >
          {completeErrors.customers && (
            <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {completeErrors.customers}
            </p>
          )}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-ink-50">Customer settlement</h3>
                <p className="mt-1 text-xs text-ink-400">
                  Checked customers will be posted in this settlement.
                </p>
              </div>
              <div className="font-mono text-xs text-ink-200">
                Total collected {formatNumber(totalCollected, { maximumFractionDigits: 4 })}
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-ink-300">
                No unsettled customers are available for this dispatch.
              </p>
            ) : (
              <div className="space-y-3">
                {rows.map((row, index) => {
                  const customer = customerLookup.get(Number(row.dispatch_customer_id));
                  return (
                    <SettlementCustomerRow
                      key={row.dispatch_customer_id}
                      customer={customer}
                      items={itemsByCustomer.get(Number(row.dispatch_customer_id)) || []}
                      row={row}
                      errors={rowErrors[index]}
                      onChange={(changes) => updateRow(index, changes)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-sm font-semibold text-ink-50">Payment details</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                label="Payment method"
                value={completeForm.payment_method}
                onChange={(event) =>
                  setCompleteForm((prev) => ({ ...prev, payment_method: event.target.value }))
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
                description="Optional. Used for remaining payments."
              />
            </div>

            {canPickCashAccounts ? (
              <Select
                label="Cash account"
                value={completeForm.cash_account_id}
                onChange={(event) =>
                  setCompleteForm((prev) => ({ ...prev, cash_account_id: event.target.value }))
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
                  setCompleteForm((prev) => ({ ...prev, cash_account_id: event.target.value }))
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
          </section>
        </form>
      )}
    </Modal>
  );
}
