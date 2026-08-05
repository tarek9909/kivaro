import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { formatCurrency, formatDate } from '@/lib/formatters.js';
import { Button, DataTable, Input, Modal, Select, Textarea } from '@/components/ui/index.js';
import { useCashAccountPaymentOptions } from '@/pages/accounting/useAccountingOptions.js';
import { PAYMENT_METHODS } from './commissions.config.js';

function monthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function todayValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function PayrollPayModal({ row, periodMonth, open, onClose }) {
  const queryClient = useQueryClient();
  const cashAccountsQuery = useCashAccountPaymentOptions('outgoing', open);
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];
  const [form, setForm] = useState({ payment_date: todayValue(), payment_method: 'cash', reference_number: '', cash_account_id: '', notes: '' });
  const [errors, setErrors] = useState({});
  const mutation = useMutation({
    mutationFn: (payload) => api.commissions.payroll.pay(row.salesman_id, payload),
    onSuccess: () => {
      toast.success('Monthly payroll paid');
      queryClient.invalidateQueries({ queryKey: ['commissions', 'payroll'] });
      queryClient.invalidateQueries({ queryKey: ['commissions', 'calculations'] });
      queryClient.invalidateQueries({ queryKey: ['accounting', 'transactions'] });
      onClose();
    },
    onError: (error) => { setErrors(mapFieldErrors(error)); toast.error(getErrorMessage(error, 'Could not pay monthly payroll.')); }
  });
  const change = (field, value) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: undefined })); };
  const submit = (event) => {
    event.preventDefault();
    if (!form.payment_date || !form.cash_account_id) {
      setErrors({ ...(form.payment_date ? {} : { payment_date: 'Payment date is required.' }), ...(form.cash_account_id ? {} : { cash_account_id: 'Cash account is required.' }) });
      return;
    }
    mutation.mutate({ period_month: `${periodMonth}-01`, payment_date: form.payment_date, payment_method: form.payment_method, cash_account_id: Number(form.cash_account_id), reference_number: form.reference_number || null, notes: form.notes || null });
  };
  const isTopUp = Number(row?.salary_due || 0) <= 0 && Number(row?.commission_due || 0) > 0;
  return <Modal open={open} onClose={onClose} title={`${isTopUp ? 'Add commission to' : 'Pay'} ${row?.salesman_name || 'salesman'} payroll`} description={isTopUp ? `The base salary for ${periodMonth} is already paid. This payout includes only commissions approved afterwards.` : `One base salary for ${periodMonth}, plus approved commissions ending in that month.`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="monthly-payroll-form" isLoading={mutation.isPending}>Pay {formatCurrency(row?.total_due || 0)}</Button></>}>
    <form id="monthly-payroll-form" onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-3">
        <div><p className="text-xs text-ink-400">Prorated salary</p><p className="font-mono text-ink-100">{formatCurrency(row?.salary_due || 0)}</p><p className="text-xs text-ink-400">{row?.salary_proration_days || 0}/{row?.salary_proration_period_days || 0} calendar days</p></div>
        <div><p className="text-xs text-ink-400">Approved commission</p><p className="font-mono text-ink-100">{formatCurrency(row?.commission_due || 0)}</p></div>
        <div><p className="text-xs text-ink-400">Total payable</p><p className="font-mono font-semibold text-emerald-300">{formatCurrency(row?.total_due || 0)}</p></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3"><Input label="Payment date" type="date" value={form.payment_date} onChange={(event) => change('payment_date', event.target.value)} error={errors.payment_date} required /><Select label="Method" value={form.payment_method} onChange={(event) => change('payment_method', event.target.value)}>{PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</Select><Input label="Reference" value={form.reference_number} onChange={(event) => change('reference_number', event.target.value)} /></div>
      <Select label="Cash account" value={form.cash_account_id} onChange={(event) => change('cash_account_id', event.target.value)} error={errors.cash_account_id} required><option value="">Select cash account</option>{cashAccounts.map((account) => <option key={account.id} value={account.id}>{account.display_name}</option>)}</Select>
      <Textarea label="Notes" value={form.notes} onChange={(event) => change('notes', event.target.value)} rows={3} />
    </form>
  </Modal>;
}

export default function CommissionPayrollTab() {
  const [periodMonth, setPeriodMonth] = useState(monthValue());
  const [payingRow, setPayingRow] = useState(null);
  const payrollQuery = useQuery({ queryKey: ['commissions', 'payroll', periodMonth], queryFn: () => api.commissions.payroll.list({ period_month: `${periodMonth}-01` }) });
  const rows = payrollQuery.data?.data?.payroll || [];
  const columns = useMemo(() => [
    { id: 'salesman_name', header: 'Salesman', cell: (row) => <span className="font-medium text-ink-100">{row.salesman_name}{row.salesman_status === 'inactive' ? <span className="ml-2 text-xs font-normal text-warn-200">Inactive</span> : null}</span> },
    { id: 'base_salary', header: 'Salary basis', align: 'right', cell: (row) => <span className="font-mono">{formatCurrency(row.prorated_base_salary ?? row.base_salary)}<span className="ml-1 text-xs text-ink-400">({row.salary_proration_days}/{row.salary_proration_period_days}d)</span></span> },
    { id: 'commission_due', header: 'Approved commission', align: 'right', cell: (row) => <span className="font-mono">{formatCurrency(row.commission_due)}</span> },
    { id: 'total_due', header: 'Payable now', align: 'right', cell: (row) => <span className="font-mono font-semibold text-emerald-300">{formatCurrency(row.total_due)}</span> },
    { id: 'paid', header: 'Paid', cell: (row) => Number(row.total_paid || 0) > 0 ? <span className="text-xs text-ink-300">{formatDate(row.payment_date)} · {formatCurrency(row.total_paid)}</span> : <span className="text-xs text-warn-200">Not paid</span> },
    { id: 'actions', header: '', align: 'right', cell: (row) => <Button size="sm" leftIcon={Wallet} disabled={Number(row.total_due || 0) <= 0} onClick={() => setPayingRow(row)}>{row.payroll_payment_id ? 'Pay commission' : 'Pay'}</Button> }
  ], []);
  return <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-lg font-semibold text-ink-50">Monthly salary and commission payroll</h2><p className="mt-1 text-sm text-ink-400">Salary is prorated by calendar days for a salesman’s first and last employment month. Inactive salesmen remain visible so earned salary and commissions can be settled.</p></div><Input label="Payroll month" type="month" max={monthValue()} value={periodMonth} onChange={(event) => setPeriodMonth(event.target.value)} /></div><DataTable columns={columns} rows={rows} rowKey={(row) => row.salesman_id} isLoading={payrollQuery.isPending} isError={payrollQuery.isError} error={payrollQuery.error} onRetry={() => payrollQuery.refetch()} empty={{ icon: Wallet, title: 'No salesmen', description: 'Add salesmen to prepare monthly payroll.' }} /><PayrollPayModal row={payingRow || {}} periodMonth={periodMonth} open={Boolean(payingRow)} onClose={() => setPayingRow(null)} /></div>;
}
