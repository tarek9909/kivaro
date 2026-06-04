import { useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Wallet } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  LoadingState
} from '@/components/ui/index.js';
import { formatDate, formatDateTime, formatNumber } from '@/lib/formatters.js';
import {
  COMMISSIONS_PERMISSIONS,
  COMMISSION_STATUSES,
  getAvailableCommissionActions,
  getCommissionStatusTone
} from './commissions.config.js';
import { CommissionPayModal } from './CommissionPayModal.jsx';

function StatusBadge({ status }) {
  const tone = getCommissionStatusTone(status);
  const label =
    COMMISSION_STATUSES.find((entry) => entry.value === status)?.label || status;
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

export function CommissionDrawer({ open, onClose, commissionId }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission(COMMISSIONS_PERMISSIONS.manage);
  const queryClient = useQueryClient();

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [paying, setPaying] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['commissions', 'calculation', commissionId],
    queryFn: () => api.commissions.calculations.get(commissionId),
    enabled: Boolean(open && commissionId)
  });

  const commission = detailQuery.data?.data?.commission;
  const availableActions = getAvailableCommissionActions(commission);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['commissions', 'calculations'] });
    queryClient.invalidateQueries({
      queryKey: ['commissions', 'calculation', commissionId]
    });
  }

  const approveMutation = useMutation({
    mutationFn: () => api.commissions.calculations.approve(commissionId),
    onSuccess: () => {
      toast.success('Commission approved');
      setConfirmTarget(null);
      invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not approve commission.'))
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={commission ? `Commission #${commission.id}` : 'Commission'}
      description={
        commission ? `Created ${formatDateTime(commission.created_at)}` : undefined
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detailQuery.isPending ? (
        <LoadingState label="Loading commission..." />
      ) : detailQuery.isError ? (
        <ErrorState
          title="Could not load commission"
          description={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      ) : !commission ? (
        <EmptyState title="Commission not found" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={commission.status} />
            {availableActions.has('approve') && canManage && (
              <Button
                size="sm"
                leftIcon={CheckCircle2}
                onClick={() => setConfirmTarget('approve')}
                isLoading={approveMutation.isPending}
              >
                Approve
              </Button>
            )}
            {availableActions.has('pay') && canManage && (
              <Button size="sm" leftIcon={Wallet} onClick={() => setPaying(true)}>
                Pay
              </Button>
            )}
          </div>

          <section className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Salesman"
              value={
                commission.salesman_name ||
                (commission.salesman_id ? `#${commission.salesman_id}` : null)
              }
            />
            <Field
              label="Rule"
              value={
                commission.commission_rule_name ||
                (commission.commission_rule_id
                  ? `#${commission.commission_rule_id}`
                  : null)
              }
            />
            <Field
              label="Sublocation"
              value={
                commission.sublocation_name ||
                (commission.sublocation_id ? `#${commission.sublocation_id}` : null)
              }
            />
            <Field
              label="Salesman target"
              value={
                commission.salesman_target_id
                  ? `#${commission.salesman_target_id}`
                  : null
              }
            />
            <Field
              label="Period start"
              value={
                commission.period_start ? formatDate(commission.period_start) : null
              }
            />
            <Field
              label="Period end"
              value={commission.period_end ? formatDate(commission.period_end) : null}
            />
            <Field
              label="Approved"
              value={
                commission.approved_at ? formatDateTime(commission.approved_at) : null
              }
            />
            <Field
              label="Paid"
              value={commission.paid_at ? formatDateTime(commission.paid_at) : null}
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Sales amount"
              value={formatNumber(commission.sales_amount, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Target amount"
              value={formatNumber(commission.target_amount, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Total commission"
              value={formatNumber(commission.total_commission, {
                maximumFractionDigits: 4
              })}
            />
          </section>

          <section>
            <h3 className="font-display text-sm font-semibold text-ink-50">
              Commission breakdown
            </h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <Field
                label="Below target"
                value={formatNumber(commission.below_target_commission, {
                  maximumFractionDigits: 4
                })}
              />
              <Field
                label="At target"
                value={formatNumber(commission.target_commission, {
                  maximumFractionDigits: 4
                })}
              />
              <Field
                label="Above target"
                value={formatNumber(commission.above_target_commission, {
                  maximumFractionDigits: 4
                })}
              />
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmTarget === 'approve'}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => approveMutation.mutate()}
        title="Approve commission"
        description="Approve this commission so it can be paid out. Approved commissions cannot be edited."
        confirmLabel="Approve"
        tone="primary"
        isLoading={approveMutation.isPending}
      />
      <CommissionPayModal
        open={paying}
        onClose={() => setPaying(false)}
        commission={commission}
      />
    </Drawer>
  );
}
