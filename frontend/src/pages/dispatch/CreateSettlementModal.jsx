import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Button, Input, Modal, Textarea } from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function initialCustomerValues(dispatchRequest) {
  return Object.fromEntries((dispatchRequest?.customers || []).map((customer) => [
    String(customer.id),
    String(customer.collected_amount || 0)
  ]));
}

/**
 * A salesman submits delivery closeout facts; it deliberately does not post
 * cash. Posting is a separate authorized dashboard action and requires an
 * incoming cash account only if money was collected.
 */
export function CreateSettlementModal({ open, onClose, dispatchRequest, onCreated }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ settlement_number: '', settlement_date: todayString(), notes: '' });
  const [collected, setCollected] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({ settlement_number: '', settlement_date: todayString(), notes: '' });
    setCollected(initialCustomerValues(dispatchRequest));
    setErrors({});
  }, [open, dispatchRequest?.id]);

  const rows = useMemo(() => (dispatchRequest?.customers || []).map((customer) => ({
    ...customer,
    expected: Number(customer.customer_total_amount || 0),
    collected: Number(collected[String(customer.id)] || 0)
  })), [collected, dispatchRequest?.customers]);
  const totalCollected = rows.reduce((sum, row) => sum + (Number.isFinite(row.collected) ? row.collected : 0), 0);
  const totalExpected = rows.reduce((sum, row) => sum + row.expected, 0);

  const mutation = useMutation({
    mutationFn: (payload) => api.dispatch.requests.createCloseout(dispatchRequest.id, payload),
    onSuccess: (response) => {
      toast.success('Delivery closeout submitted');
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequest.id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      onCreated?.(response?.data?.dispatch_settlement);
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not submit delivery closeout.'));
    }
  });

  function validate() {
    const next = {};
    if (!form.settlement_date) next.settlement_date = 'Closeout date is required.';
    for (const row of rows) {
      if (!Number.isFinite(row.collected) || row.collected < 0 || row.collected > row.expected + 1e-9) {
        next.customers = 'Each collected amount must be between zero and that customer total.';
        break;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      settlement_number: form.settlement_number.trim() || undefined,
      settlement_date: form.settlement_date,
      notes: form.notes.trim() || null,
      customers: rows.map((row) => ({
        dispatch_customer_id: Number(row.id),
        collected_amount: row.collected
      }))
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Submit delivery closeout"
      description="Record what was delivered, collected, and left as debt. A manager posts this closeout later and selects the incoming cash account."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" form="dispatch-closeout-form" isLoading={mutation.isPending}>Submit closeout</Button>
        </>
      }
    >
      <form id="dispatch-closeout-form" onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Closeout number"
            value={form.settlement_number}
            onChange={(event) => setForm((current) => ({ ...current, settlement_number: event.target.value }))}
            description="Optional; generated when blank."
          />
          <Input
            label="Closeout date"
            type="date"
            value={form.settlement_date}
            onChange={(event) => setForm((current) => ({ ...current, settlement_date: event.target.value }))}
            error={errors.settlement_date}
            required
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-[minmax(0,1fr)_8rem_8rem] gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
            <span>Customer</span><span className="text-right">Invoice total</span><span className="text-right">Collected</span>
          </div>
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_8rem_8rem] items-center gap-2 border-b border-white/5 px-3 py-2 last:border-b-0">
              <span className="truncate text-sm text-ink-100">{row.customer_name || `Customer #${row.customer_id}`}</span>
              <span className="text-right font-mono text-xs text-ink-300">{formatNumber(row.expected, { maximumFractionDigits: 4 })}</span>
              <Input
                aria-label={`Collected for ${row.customer_name || `customer ${row.customer_id}`}`}
                type="number"
                min="0"
                max={row.expected}
                step="0.0001"
                value={collected[String(row.id)] ?? ''}
                onChange={(event) => setCollected((current) => ({ ...current, [String(row.id)]: event.target.value }))}
                containerClassName="mb-0"
              />
            </div>
          ))}
        </div>
        {errors.customers && <p className="text-xs text-danger-300">{errors.customers}</p>}

        <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm sm:grid-cols-2">
          <span className="text-ink-300">Expected {formatNumber(totalExpected, { maximumFractionDigits: 4 })}</span>
          <span className="text-right text-ink-100">Collected {formatNumber(totalCollected, { maximumFractionDigits: 4 })}</span>
        </div>
        <Textarea
          label="Closeout notes"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          rows={3}
        />
      </form>
    </Modal>
  );
}
