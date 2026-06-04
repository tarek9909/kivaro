import { useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Play, X } from 'lucide-react';
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
import { formatDateTime, formatNumber } from '@/lib/formatters.js';
import {
  BATCH_STATUSES,
  PRODUCTION_PERMISSIONS,
  getAvailableBatchActions,
  getBatchStatusTone
} from './production.config.js';
import { CompleteBatchModal } from './CompleteBatchModal.jsx';

function StatusBadge({ status }) {
  const tone = getBatchStatusTone(status);
  const label = BATCH_STATUSES.find((entry) => entry.value === status)?.label || status;
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

export function ProductionBatchDrawer({ open, onClose, batchId }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(PRODUCTION_PERMISSIONS.create);
  const canComplete = hasPermission(PRODUCTION_PERMISSIONS.complete);
  const queryClient = useQueryClient();

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [completing, setCompleting] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['production', 'batch', batchId],
    queryFn: () => api.production.productionBatches.get(batchId),
    enabled: Boolean(open && batchId)
  });

  const batch = detailQuery.data?.data?.production_batch;
  const components = batch?.components || [];
  const availableActions = getAvailableBatchActions(batch);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['production', 'batches'] });
    queryClient.invalidateQueries({ queryKey: ['production', 'batch', batchId] });
  }

  const startMutation = useMutation({
    mutationFn: () => api.production.productionBatches.start(batchId),
    onSuccess: () => {
      toast.success('Production batch started');
      setConfirmTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not start batch.'))
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.production.productionBatches.cancel(batchId),
    onSuccess: () => {
      toast.success('Production batch cancelled');
      setConfirmTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not cancel batch.'))
  });

  const actionConfigs = {
    start: {
      label: 'Start production',
      description: 'Mark this batch as in progress so the floor team knows it is active.',
      tone: 'primary',
      mutation: startMutation,
      confirmLabel: 'Start'
    },
    cancel: {
      label: 'Cancel batch',
      description: 'Cancel this production batch. Cancelled batches cannot be completed.',
      tone: 'danger',
      mutation: cancelMutation,
      confirmLabel: 'Cancel batch'
    }
  };

  const activeAction = confirmTarget ? actionConfigs[confirmTarget] : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="xl"
      title={
        batch
          ? `Production batch ${batch.batch_number || `#${batch.id}`}`
          : 'Production batch'
      }
      description={
        batch ? `Created ${formatDateTime(batch.created_at)}` : undefined
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detailQuery.isPending ? (
        <LoadingState label="Loading batch..." />
      ) : detailQuery.isError ? (
        <ErrorState
          title="Could not load batch"
          description={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      ) : !batch ? (
        <EmptyState title="Batch not found" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={batch.status} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {availableActions.has('start') && canCreate && (
              <Button
                size="sm"
                leftIcon={Play}
                onClick={() => setConfirmTarget('start')}
                isLoading={startMutation.isPending}
              >
                Start
              </Button>
            )}
            {availableActions.has('complete') && canComplete && (
              <Button
                size="sm"
                leftIcon={CheckCircle2}
                onClick={() => setCompleting(true)}
              >
                Complete
              </Button>
            )}
            {availableActions.has('cancel') && canCreate && (
              <Button
                variant="danger"
                size="sm"
                leftIcon={X}
                onClick={() => setConfirmTarget('cancel')}
                isLoading={cancelMutation.isPending}
              >
                Cancel batch
              </Button>
            )}
          </div>

          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Batch number" value={batch.batch_number} />
            <Field label="Source" value={batch.packaging_group_name || batch.config_name} />
            <Field label="Warehouse" value={batch.warehouse_name} />
            {batch.packaging_group_id && <Field label="Charcoal" value={batch.charcoal_variant_name} />}
            <Field label="Output" value={batch.output_variant_name} />
            <Field
              label={batch.packaging_group_id ? 'Planned charcoal kg' : 'Planned quantity'}
              value={`${formatNumber(batch.planned_quantity, { maximumFractionDigits: 4 })}${batch.packaging_group_id ? ' kg' : ''}`}
            />
            <Field
              label={batch.packaging_group_id ? 'Produced charcoal kg' : 'Produced quantity'}
              value={
                batch.produced_quantity
                  ? `${formatNumber(batch.produced_quantity, { maximumFractionDigits: 4 })}${batch.packaging_group_id ? ' kg' : ''}`
                  : null
              }
            />
            <Field
              label="Total component cost"
              value={
                batch.total_component_cost
                  ? formatNumber(batch.total_component_cost, { maximumFractionDigits: 4 })
                  : null
              }
            />
            <Field
              label="Cost per output"
              value={
                batch.cost_per_output
                  ? formatNumber(batch.cost_per_output, { maximumFractionDigits: 4 })
                  : null
              }
            />
            <Field
              label="Started"
              value={batch.started_at ? formatDateTime(batch.started_at) : null}
            />
            <Field
              label="Completed"
              value={batch.completed_at ? formatDateTime(batch.completed_at) : null}
            />
          </section>

          {batch.notes && (
            <section>
              <h3 className="font-display text-sm font-semibold text-ink-50">Notes</h3>
              <p className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 text-pretty">
                {batch.notes}
              </p>
            </section>
          )}

          <section>
            <h3 className="font-display text-sm font-semibold text-ink-50">Components consumed</h3>
            {components.length === 0 ? (
              <p className="mt-2 text-sm text-ink-300">
                Components are recorded when the batch is completed.
              </p>
            ) : (
              <>
                <div className="hidden lg:block overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                  <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                    <thead className="text-[11px] uppercase tracking-[0.18em] text-ink-400">
                      <tr className="border-b border-white/5">
                        <th className="px-3 py-2 font-medium">Component</th>
                        <th className="px-3 py-2 text-right font-medium">Planned</th>
                        <th className="px-3 py-2 text-right font-medium">Consumed</th>
                        <th className="px-3 py-2 text-right font-medium">Unit cost</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {components.map((component) => (
                        <tr key={component.id} className="border-b border-white/5 last:border-0">
                          <td className="px-3 py-2 font-mono text-xs text-ink-200">
                            #{component.component_item_variant_id}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-ink-100">
                            {formatNumber(component.planned_quantity, {
                              maximumFractionDigits: 4
                            })}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-ink-100">
                            {formatNumber(component.consumed_quantity, {
                              maximumFractionDigits: 4
                            })}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-ink-100">
                            {formatNumber(component.unit_cost, { maximumFractionDigits: 4 })}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-ink-100">
                            {formatNumber(component.total_cost, { maximumFractionDigits: 4 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden grid gap-2">
                  {components.map((component) => (
                    <div
                      key={component.id}
                      className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2 text-xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-mono text-ink-200">
                          Variant #{component.component_item_variant_id}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-white/5 font-mono text-[11px] text-ink-200">
                        <div className="flex justify-between">
                          <span className="text-ink-400">Planned:</span>
                          <span className="text-ink-100">{formatNumber(component.planned_quantity, { maximumFractionDigits: 4 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-400">Consumed:</span>
                          <span className="text-ink-100">{formatNumber(component.consumed_quantity, { maximumFractionDigits: 4 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-400">Unit Cost:</span>
                          <span className="text-ink-100">{formatNumber(component.unit_cost, { maximumFractionDigits: 4 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-400">Total:</span>
                          <span className="text-ink-100">{formatNumber(component.total_cost, { maximumFractionDigits: 4 })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(activeAction)}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => activeAction?.mutation.mutate()}
        title={activeAction?.label || ''}
        description={activeAction?.description || ''}
        confirmLabel={activeAction?.confirmLabel}
        tone={activeAction?.tone === 'danger' ? 'danger' : 'primary'}
        isLoading={Boolean(activeAction?.mutation.isPending)}
      />
      <CompleteBatchModal
        open={completing}
        onClose={() => setCompleting(false)}
        batch={batch}
      />
    </Drawer>
  );
}
