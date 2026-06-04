import { useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  CircleSlash,
  PackageCheck,
  Pencil,
  Send,
  X
} from 'lucide-react';
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
  PURCHASE_ORDER_STATUSES,
  PURCHASES_PERMISSIONS,
  getAvailableActions,
  getStatusTone
} from './purchases.config.js';
import { ReceivePurchaseOrderModal } from './ReceivePurchaseOrderModal.jsx';
import { PurchaseOrderHeaderEditModal } from './PurchaseOrderHeaderEditModal.jsx';

function StatusBadge({ status }) {
  const tone = getStatusTone(status);
  const label =
    PURCHASE_ORDER_STATUSES.find((entry) => entry.value === status)?.label || status;
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

export function PurchaseOrderDrawer({ open, onClose, purchaseOrderId }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(PURCHASES_PERMISSIONS.create);
  const canApprove = hasPermission(PURCHASES_PERMISSIONS.approve);
  const canCancel = hasPermission(PURCHASES_PERMISSIONS.cancel);
  const canReceive = hasPermission(PURCHASES_PERMISSIONS.receive);
  const queryClient = useQueryClient();

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [receivingOpen, setReceivingOpen] = useState(false);
  const [editingOpen, setEditingOpen] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['purchases', 'order', purchaseOrderId],
    queryFn: () => api.purchases.purchaseOrders.get(purchaseOrderId),
    enabled: Boolean(open && purchaseOrderId)
  });

  const purchaseOrder = detailQuery.data?.data?.purchase_order;
  const availableActions = getAvailableActions(purchaseOrder);

  function invalidatePOQueries() {
    queryClient.invalidateQueries({ queryKey: ['purchases', 'orders'] });
    queryClient.invalidateQueries({ queryKey: ['purchases', 'order', purchaseOrderId] });
    queryClient.invalidateQueries({ queryKey: ['purchases', 'options', 'purchase-orders'] });
  }

  const submitMutation = useMutation({
    mutationFn: () => api.purchases.purchaseOrders.submit(purchaseOrderId),
    onSuccess: () => {
      toast.success('Purchase order submitted');
      setConfirmTarget(null);
      invalidatePOQueries();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not submit order.'))
  });

  const approveMutation = useMutation({
    mutationFn: () => api.purchases.purchaseOrders.approve(purchaseOrderId),
    onSuccess: () => {
      toast.success('Purchase order approved');
      setConfirmTarget(null);
      invalidatePOQueries();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not approve order.'))
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.purchases.purchaseOrders.cancel(purchaseOrderId),
    onSuccess: () => {
      toast.success(confirmTarget === 'close' ? 'Purchase order closed' : 'Purchase order cancelled');
      setConfirmTarget(null);
      invalidatePOQueries();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not cancel order.'))
  });

  const actionConfigs = {
    submit: {
      label: 'Submit for approval',
      description: 'Submit this draft purchase order for approval. The status moves from draft to pending.',
      tone: 'primary',
      mutation: submitMutation,
      confirmLabel: 'Submit'
    },
    approve: {
      label: 'Approve',
      description: 'Mark this purchase order as approved. Receiving can begin after approval.',
      tone: 'primary',
      mutation: approveMutation,
      confirmLabel: 'Approve'
    },
    cancel: {
      label: 'Cancel order',
      description: 'Cancel this purchase order. Cancelled orders cannot be received against.',
      tone: 'danger',
      mutation: cancelMutation,
      confirmLabel: 'Cancel order'
    },
    close: {
      label: 'Close remaining',
      description: 'Close the unreceived quantities on this purchase order while keeping received stock and payment history intact.',
      tone: 'primary',
      mutation: cancelMutation,
      confirmLabel: 'Close remaining'
    }
  };

  const activeAction = confirmTarget ? actionConfigs[confirmTarget] : null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="xl"
      title={
        purchaseOrder
          ? `Purchase order ${purchaseOrder.po_number || `#${purchaseOrder.id}`}`
          : 'Purchase order'
      }
      description={purchaseOrder ? `Created ${formatDateTime(purchaseOrder.created_at)}` : undefined}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detailQuery.isPending ? (
        <LoadingState label="Loading purchase order..." />
      ) : detailQuery.isError ? (
        <ErrorState
          title="Could not load purchase order"
          description={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      ) : !purchaseOrder ? (
        <EmptyState title="Order not found" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={purchaseOrder.status} />
            {purchaseOrder.approved_at ? (
              <Badge tone="success">Approved</Badge>
            ) : (
              <Badge tone="neutral">Not approved</Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {availableActions.has('edit') && canCreate && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Pencil}
                onClick={() => setEditingOpen(true)}
              >
                Edit header
              </Button>
            )}
            {availableActions.has('submit') && canCreate && (
              <Button
                size="sm"
                leftIcon={Send}
                onClick={() => setConfirmTarget('submit')}
                isLoading={submitMutation.isPending}
              >
                Submit
              </Button>
            )}
            {availableActions.has('approve') && canApprove && (
              <Button
                size="sm"
                leftIcon={CheckCircle2}
                onClick={() => setConfirmTarget('approve')}
                isLoading={approveMutation.isPending}
              >
                Approve
              </Button>
            )}
            {availableActions.has('receive') && canReceive && (
              <Button
                size="sm"
                leftIcon={PackageCheck}
                onClick={() => setReceivingOpen(true)}
              >
                Receive
              </Button>
            )}
            {availableActions.has('cancel') && canCancel && (
              <Button
                variant="danger"
                size="sm"
                leftIcon={X}
                onClick={() => setConfirmTarget('cancel')}
                isLoading={cancelMutation.isPending}
              >
                Cancel order
              </Button>
            )}
            {availableActions.has('close') && canCancel && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={CircleSlash}
                onClick={() => setConfirmTarget('close')}
                isLoading={cancelMutation.isPending}
              >
                Close remaining
              </Button>
            )}
          </div>

          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="PO number" value={purchaseOrder.po_number} />
            <Field label="Supplier" value={purchaseOrder.supplier_name} />
            <Field label="Warehouse" value={purchaseOrder.warehouse_name} />
            <Field label="Order date" value={formatDate(purchaseOrder.order_date)} />
            <Field label="Expected date" value={formatDate(purchaseOrder.expected_date)} />
            <Field
              label="Approved"
              value={
                purchaseOrder.approved_at
                  ? formatDateTime(purchaseOrder.approved_at)
                  : 'Not approved'
              }
            />
          </section>

          <section>
            <h3 className="font-display text-sm font-semibold text-ink-50">Line items</h3>
            <div className="hidden lg:block overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] mt-2">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  <tr className="border-b border-white/5">
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 text-right font-medium">Ordered</th>
                    <th className="px-3 py-2 text-right font-medium">Received</th>
                    <th className="px-3 py-2 text-right font-medium">Unit cost</th>
                    <th className="px-3 py-2 text-right font-medium">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {(purchaseOrder.items || []).map((item) => (
                    <tr key={item.id} className="border-b border-white/5 last:border-0">
                      <td className="px-3 py-2 align-top">
                        <p className="truncate font-medium text-ink-50">{item.item_name}</p>
                        <p className="truncate font-mono text-xs text-ink-400">
                          {item.variant_name} - {item.sku}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right align-top font-mono text-ink-100">
                        {formatNumber(item.ordered_quantity, { maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-3 py-2 text-right align-top font-mono text-ink-100">
                        {formatNumber(item.received_quantity, { maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-3 py-2 text-right align-top font-mono text-ink-100">
                        {formatNumber(item.unit_cost, { maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-3 py-2 text-right align-top font-mono text-ink-100">
                        {formatNumber(item.line_total, { maximumFractionDigits: 4 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden grid gap-2 mt-2">
              {(purchaseOrder.items || []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink-50">{item.item_name}</p>
                    <p className="font-mono text-[10px] text-ink-400">
                      {item.variant_name} - {item.sku}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-white/5 font-mono text-[11px] text-ink-200">
                    <div className="flex justify-between">
                      <span className="text-ink-400">Ordered:</span>
                      <span className="text-ink-100">{formatNumber(item.ordered_quantity, { maximumFractionDigits: 4 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-400">Received:</span>
                      <span className="text-ink-100">{formatNumber(item.received_quantity, { maximumFractionDigits: 4 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-400">Cost:</span>
                      <span className="text-ink-100">{formatNumber(item.unit_cost, { maximumFractionDigits: 4 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-400">Total:</span>
                      <span className="text-ink-100">{formatNumber(item.line_total, { maximumFractionDigits: 4 })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Subtotal"
              value={formatNumber(purchaseOrder.subtotal, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Discount"
              value={formatNumber(purchaseOrder.discount_amount, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Tax"
              value={formatNumber(purchaseOrder.tax_amount, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Total"
              value={formatNumber(purchaseOrder.total_amount, { maximumFractionDigits: 4 })}
            />
            {purchaseOrder.status === 'closed' && (
              <Field
                label="Payable received"
                value={formatNumber(purchaseOrder.payable_amount, { maximumFractionDigits: 4 })}
              />
            )}
            <Field
              label="Amount paid"
              value={formatNumber(purchaseOrder.amount_paid, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Outstanding"
              value={formatNumber(
                purchaseOrder.outstanding_amount ??
                  Number(purchaseOrder.total_amount || 0) - Number(purchaseOrder.amount_paid || 0),
                { maximumFractionDigits: 4 }
              )}
            />
          </section>

          {purchaseOrder.notes && (
            <section>
              <h3 className="font-display text-sm font-semibold text-ink-50">Notes</h3>
              <p className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 text-pretty">
                {purchaseOrder.notes}
              </p>
            </section>
          )}

          <section>
            <h3 className="font-display text-sm font-semibold text-ink-50">Receipts</h3>
            {purchaseOrder.receipts?.length ? (
              <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
                {purchaseOrder.receipts.map((receipt) => (
                  <li
                    key={receipt.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-ink-50">{receipt.receipt_number}</span>
                      <Badge tone="info">{receipt.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink-300">
                      Received {formatDate(receipt.received_date)} - {formatDateTime(receipt.created_at)}
                    </p>
                    {receipt.notes && (
                      <p className="mt-1 text-xs text-ink-300 text-pretty">{receipt.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-400">No receipts posted yet.</p>
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

      <ReceivePurchaseOrderModal
        open={receivingOpen}
        onClose={() => setReceivingOpen(false)}
        purchaseOrder={purchaseOrder}
      />

      <PurchaseOrderHeaderEditModal
        open={editingOpen}
        onClose={() => setEditingOpen(false)}
        purchaseOrder={purchaseOrder}
      />
    </Drawer>
  );
}
