import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeDollarSign, ListChecks, Wallet } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage } from '@/lib/errors.js';
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
import {
  DEBT_STATUSES,
  PAYMENTS_PERMISSIONS,
  getAvailableDebtActions,
  getDebtStatusTone
} from './payments.config.js';
import { DebtPaymentFormModal } from './DebtPaymentFormModal.jsx';
import { DebtStatusModal } from './DebtStatusModal.jsx';

function StatusBadge({ status }) {
  const tone = getDebtStatusTone(status);
  const label = DEBT_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span className="break-words text-sm text-ink-100">{value || '-'}</span>
    </div>
  );
}

export function CustomerDebtDrawer({ open, onClose, debtId }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission(PAYMENTS_PERMISSIONS.debts);
  const canViewPayments = hasPermission(ACCOUNTING_PERMISSIONS.view);
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['payments', 'debt', debtId],
    queryFn: () => api.payments.debts.get(debtId),
    enabled: Boolean(open && debtId)
  });

  const debt = detailQuery.data?.data?.customer_debt;
  const availableActions = getAvailableDebtActions(debt);
  const applyCreditMutation = useMutation({
    mutationFn: () => api.payments.debts.applyCredit(debt.id, {}),
    onSuccess: () => {
      toast.success('Customer credit applied');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not apply customer credit.'))
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={debt ? `Customer debt #${debt.id}` : 'Customer debt'}
      description={debt ? `Created ${formatDateTime(debt.created_at)}` : undefined}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detailQuery.isPending ? (
        <LoadingState label="Loading debt..." />
      ) : detailQuery.isError ? (
        <ErrorState
          title="Could not load debt"
          description={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      ) : !debt ? (
        <EmptyState title="Debt not found" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={debt.status} />
            {availableActions.has('pay') && canManage && (
              <Button size="sm" leftIcon={Wallet} onClick={() => setPaying(true)}>
                Record payment
              </Button>
            )}
            {availableActions.has('pay') && canManage && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={BadgeDollarSign}
                onClick={() => applyCreditMutation.mutate()}
                isLoading={applyCreditMutation.isPending}
              >
                Apply credit
              </Button>
            )}
            {availableActions.has('updateStatus') && canManage && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={ListChecks}
                onClick={() => setUpdatingStatus(true)}
              >
                Update status
              </Button>
            )}
          </div>

          <section className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Customer"
              value={
                debt.customer_name ||
                (debt.customer_id ? `#${debt.customer_id}` : null)
              }
            />
            <Field
              label="Salesman"
              value={
                debt.salesman_name ||
                (debt.salesman_id ? `#${debt.salesman_id}` : null)
              }
            />
            <Field label="Debt date" value={formatDate(debt.debt_date)} />
            <Field
              label="Due date"
              value={debt.due_date ? formatDate(debt.due_date) : 'Open'}
            />
            <Field
              label="Dispatch"
              value={
                debt.dispatch_number ||
                (debt.dispatch_request_id
                  ? `#${debt.dispatch_request_id}`
                  : '-')
              }
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Original"
              value={formatNumber(debt.original_amount, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Paid"
              value={formatNumber(debt.paid_amount, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Remaining"
              value={formatNumber(debt.remaining_amount, { maximumFractionDigits: 4 })}
            />
          </section>

          {debt.notes && (
            <section>
              <h3 className="font-display text-sm font-semibold text-ink-50">Notes</h3>
              <p className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 text-pretty">
                {debt.notes}
              </p>
            </section>
          )}

          {canViewPayments && (
            <section>
              <h3 className="font-display text-sm font-semibold text-ink-50">Payments</h3>
              <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-300 text-pretty">
                Payments against this debt are listed in the customer payments workspace.{' '}
                <Link
                  to="/payments/customer-payments"
                  className="text-brand-200 underline hover:text-brand-100"
                  onClick={onClose}
                >
                  Open customer payments
                </Link>
                .
              </p>
            </section>
          )}
        </div>
      )}

      <DebtPaymentFormModal open={paying} onClose={() => setPaying(false)} debt={debt} />
      <DebtStatusModal
        open={updatingStatus}
        onClose={() => setUpdatingStatus(false)}
        debt={debt}
      />
    </Drawer>
  );
}
