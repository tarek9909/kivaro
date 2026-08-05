import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Wallet, User, UserCheck, Truck, Calendar, Clock } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage } from '@/lib/errors.js';
import { downloadBlob } from '@/lib/csvExport.js';
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  LoadingState
} from '@/components/ui/index.js';
import { formatDate, formatDateTime, formatNumber } from '@/lib/formatters.js';
import { ACCOUNTING_PERMISSIONS } from '@/pages/accounting/accounting.config.js';
import { DEBT_STATUSES, PAYMENTS_PERMISSIONS, getAvailableDebtActions, getDebtStatusTone } from './payments.config.js';
import { DebtPaymentFormModal } from './DebtPaymentFormModal.jsx';
import { useCustomersList } from '@/pages/accounting/useAccountingOptions.js';
import { useSalesmenList } from '@/pages/locations/useLocationsOptions.js';

function StatusBadge({ status }) {
  const tone = getDebtStatusTone(status);
  const label = DEBT_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

function SummaryMetric({ label, value, tone = 'text-ink-50' }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export function CustomerDebtDrawer({ open, onClose, debtId }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission(PAYMENTS_PERMISSIONS.debts);
  const canViewPayments = hasPermission(ACCOUNTING_PERMISSIONS.view);
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['payments', 'debt', debtId],
    queryFn: () => api.payments.debts.get(debtId),
    enabled: Boolean(open && debtId)
  });

  const customersQuery = useCustomersList(Boolean(open && debtId));
  const salesmenQuery = useSalesmenList(Boolean(open && debtId));

  const debt = detailQuery.data?.data?.customer_debt;
  const creditsQuery = useQuery({
    queryKey: ['payments', 'customer-credits', 'debt-apply', debt?.customer_id],
    queryFn: () => api.payments.customerCredits.list({ customer_id: debt.customer_id, available_for_application: true, page: 1, limit: 100 }),
    enabled: Boolean(open && canManage && debt?.customer_id && ['pending', 'partially_paid'].includes(debt.status))
  });
  const customers = customersQuery.data?.data?.customers || [];
  const salesmen = salesmenQuery.data?.data?.salesmen || [];

  const foundCustomer = customers.find((c) => Number(c.id) === Number(debt?.customer_id));
  const foundSalesman = salesmen.find((s) => Number(s.id) === Number(debt?.salesman_id));

  const customerName =
    debt?.customer_name ||
    debt?.customer?.name ||
    debt?.customer?.customer_name ||
    foundCustomer?.name ||
    (debt?.customer_id ? `Customer #${debt.customer_id}` : '-');

  const salesmanName =
    debt?.salesman_name ||
    debt?.salesman?.name ||
    debt?.salesman?.full_name ||
    foundSalesman?.name ||
    foundSalesman?.full_name ||
    (debt?.salesman_id ? `Salesman #${debt.salesman_id}` : '-');

  const dispatchCode =
    debt?.dispatch_number ||
    debt?.dispatch_request?.dispatch_number ||
    debt?.dispatch_code ||
    (debt?.dispatch_request_id ? `DISP-${debt.dispatch_request_id}` : '-');

  const availableActions = getAvailableDebtActions(debt);
  const availableCredit = (creditsQuery.data?.data?.customer_credits || []).reduce(
    (total, credit) => total + Number(credit.remaining_amount || 0),
    0
  );
  const debtPdfMutation = useMutation({
    mutationFn: () => api.payments.debts.printPdf(debt.id),
    onSuccess: (response) => {
      downloadBlob(response instanceof Blob ? response : response?.data, `customer-debt-${debt.debt_number || debt.id}.pdf`);
      toast.success('Debt statement downloaded');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not download the debt statement.'))
  });
  const applyCreditMutation = useMutation({
    mutationFn: () => api.payments.debts.applyCredit(debt.id, {
      amount: Math.min(availableCredit, Number(debt.remaining_amount || 0))
    }),
    onSuccess: (response) => {
      toast.success(`Applied ${formatNumber(response?.data?.credit_application?.applied_amount || 0, { maximumFractionDigits: 4 })} customer credit`);
      queryClient.invalidateQueries({ queryKey: ['payments', 'debt', debt.id] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'customer-credits'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'debts'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'receipts'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not apply customer credit.'))
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={debt ? `Debt #${debt.id} — ${customerName}` : 'Customer debt'}
      description={debt ? `Created ${formatDateTime(debt.created_at)}` : undefined}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detailQuery.isPending ? (
        <LoadingState label="Loading debt details..." />
      ) : detailQuery.isError ? (
        <ErrorState
          title="Could not load debt"
          description={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      ) : !debt ? (
        <EmptyState title="Debt not found" />
      ) : (
        <div className="space-y-4">
          {/* Action Toolbar Card */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2.5">
              <StatusBadge status={debt.status} />
              <span className="text-xs text-ink-300 font-mono">Record #{debt.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" leftIcon={Download} onClick={() => debtPdfMutation.mutate()} isLoading={debtPdfMutation.isPending}>
                PDF statement
              </Button>
              {availableActions.has('pay') && canManage && (
                <Button size="sm" leftIcon={Wallet} onClick={() => setPaying(true)}>
                  Record payment
                </Button>
              )}
              {availableActions.has('pay') && canManage && availableCredit > 0 && (
                <Button variant="secondary" size="sm" onClick={() => applyCreditMutation.mutate()} isLoading={applyCreditMutation.isPending}>
                  Apply {formatNumber(Math.min(availableCredit, Number(debt.remaining_amount || 0)), { maximumFractionDigits: 4 })} credit
                </Button>
              )}
            </div>
          </div>

          {/* Customer & Logistics Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="border-b border-white/5 pb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Customer & Salesman</h4>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Customer</p>
                  <p className="truncate font-medium text-ink-50">{customerName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-ink-200 border border-white/10">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Salesman</p>
                  <p className="truncate font-medium text-ink-50">{salesmanName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-ink-200 border border-white/10">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Debt Date</p>
                  <p className="text-sm font-medium text-ink-50">{formatDate(debt.debt_date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-ink-200 border border-white/10">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Due Date</p>
                  <p className="text-sm font-medium text-ink-50">{debt.due_date ? formatDate(debt.due_date) : 'Open'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:col-span-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-ink-200 border border-white/10">
                  <Truck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Dispatch Order</p>
                  <p className="font-mono text-sm font-medium text-brand-300">{dispatchCode}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <div className="border-b border-white/5 pb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Financial Balance</h4>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryMetric
                label="Original Debt"
                value={formatNumber(debt.original_amount, { maximumFractionDigits: 4 })}
              />
              <SummaryMetric
                label="Total Paid"
                value={formatNumber(debt.paid_amount, { maximumFractionDigits: 4 })}
                tone="text-emerald-300"
              />
              <SummaryMetric
                label="Remaining Due"
                value={formatNumber(debt.remaining_amount, { maximumFractionDigits: 4 })}
                tone={Number(debt.remaining_amount) > 0 ? 'text-amber-300' : 'text-ink-300'}
              />
            </div>
          </div>

          {debt.notes && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Notes & Reference</h4>
              <p className="text-sm text-ink-200 leading-relaxed text-pretty">
                {debt.notes}
              </p>
            </div>
          )}

          {canViewPayments && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Customer Payments Workspace</h4>
              <p className="text-xs text-ink-300 leading-relaxed">
                Payments recorded against this debt are linked in the customer payments workspace.{' '}
                <Link
                  to="/payments/customer-payments"
                  className="text-brand-300 font-medium underline hover:text-brand-200"
                  onClick={onClose}
                >
                  Open customer payments →
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      <DebtPaymentFormModal open={paying} onClose={() => setPaying(false)} debt={debt} />
    </Drawer>
  );
}
