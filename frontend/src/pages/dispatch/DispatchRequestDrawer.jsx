import { useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  FileText,
  Pencil,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Send,
  Truck,
  Wallet,
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
  GlassPanel,
  GlassPanelBody,
  LoadingState
} from '@/components/ui/index.js';
import { formatDate, formatDateTime, formatNumber } from '@/lib/formatters.js';
import {
  DISPATCH_PARENT_PERMISSIONS,
  DISPATCH_PERMISSIONS,
  DISPATCH_STATUSES,
  getAvailableDispatchActions,
  getDispatchStatusTone
} from './dispatch.config.js';
import { DispatchRequestEditModal } from './DispatchRequestEditModal.jsx';
import { AddDispatchCustomerModal } from './AddDispatchCustomerModal.jsx';
import { AddDispatchItemModal } from './AddDispatchItemModal.jsx';
import { CreateReturnModal } from './CreateReturnModal.jsx';
import { CreateSettlementModal } from './CreateSettlementModal.jsx';
import { SettlementWorkflowModal } from './SettlementWorkflowModal.jsx';
import { DispatchPrintModal } from './DispatchPrintModal.jsx';

function StatusBadge({ status }) {
  const tone = getDispatchStatusTone(status);
  const label =
    DISPATCH_STATUSES.find((entry) => entry.value === status)?.label || status;
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

function CustomerCard({ customer, items, canAddItem, onAddItem, locked }) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-50">
            {customer.customer_name || `customer #${customer.customer_id}`}
          </p>
          <p className="truncate text-xs text-ink-400">
            {customer.location_name || ''}
            {customer.sublocation_name ? ` - ${customer.sublocation_name}` : ''}
            {customer.receipt_number ? `  ${customer.receipt_number}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right font-mono text-xs text-ink-200">
            {Number(customer.vat_amount || 0) > 0 && (
              <p>
                VAT {formatNumber(customer.vat_amount, { maximumFractionDigits: 4 })}
              </p>
            )}
            <p>
              Total{' '}
              {formatNumber(customer.net_total_amount ?? customer.customer_total_amount ?? customer.total_amount, {
                maximumFractionDigits: 4
              })}
            </p>
            {Number(customer.returned_total_amount || 0) > 0 && (
              <p>
                Returned {formatNumber(customer.returned_total_amount, { maximumFractionDigits: 4 })}
              </p>
            )}
          </div>
          {canAddItem && !locked && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Plus}
              onClick={() => onAddItem(customer)}
            >
              Add item
            </Button>
          )}
        </div>
      </div>

      {customer.notes && (
        <p className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs text-ink-300 text-pretty">
          {customer.notes}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-ink-400">No items added for this customer yet.</p>
      ) : (
        <>
          <div className="hidden lg:block overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.18em] text-ink-400">
                <tr className="border-b border-white/5">
                  <th className="px-3 py-2 font-medium">Variant</th>
                  <th className="px-3 py-2 text-right font-medium">Qty</th>
                  <th className="px-3 py-2 text-right font-medium">Returned</th>
                  <th className="px-3 py-2 text-right font-medium">Unit price</th>
                  <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                  <th className="px-3 py-2 text-right font-medium">VAT</th>
                  <th className="px-3 py-2 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 align-top">
                      <p className="truncate text-ink-50">
                        {item.item_name || ''}
                        {item.variant_name ? ` - ${item.variant_name}` : ''}
                      </p>
                      <p className="truncate font-mono text-xs text-ink-400">
                        {item.sku || `variant #${item.item_variant_id}`}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right align-top font-mono text-ink-100">
                      {formatNumber(item.quantity, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-3 py-2 text-right align-top font-mono text-ink-200">
                      {formatNumber(item.returned_quantity, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-3 py-2 text-right align-top font-mono text-ink-100">
                      {formatNumber(item.unit_price, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-3 py-2 text-right align-top font-mono text-ink-100">
                      {formatNumber(item.subtotal_amount ?? item.line_total, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-3 py-2 text-right align-top font-mono text-ink-100">
                      {formatNumber(item.vat_amount || 0, { maximumFractionDigits: 4 })}
                    </td>
                    <td className="px-3 py-2 text-right align-top font-mono text-ink-100">
                      {formatNumber(item.line_total, { maximumFractionDigits: 4 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden grid gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink-50">
                    {item.item_name || ''}
                    {item.variant_name ? ` - ${item.variant_name}` : ''}
                  </p>
                  <p className="font-mono text-[10px] text-ink-400">
                    {item.sku || `variant #${item.item_variant_id}`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-white/5 font-mono text-[11px] text-ink-200">
                  <div className="flex justify-between">
                    <span className="text-ink-400">Qty:</span>
                    <span className="text-ink-100">{formatNumber(item.quantity, { maximumFractionDigits: 4 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">Returned:</span>
                    <span className="text-ink-100">{formatNumber(item.returned_quantity, { maximumFractionDigits: 4 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">Price:</span>
                    <span className="text-ink-100">{formatNumber(item.unit_price, { maximumFractionDigits: 4 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">Subtotal:</span>
                    <span className="text-ink-100">{formatNumber(item.subtotal_amount ?? item.line_total, { maximumFractionDigits: 4 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">VAT:</span>
                    <span className="text-ink-100">{formatNumber(item.vat_amount || 0, { maximumFractionDigits: 4 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">Total:</span>
                    <span className="text-ink-100">{formatNumber(item.line_total, { maximumFractionDigits: 4 })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function DispatchRequestDrawer({ open, onClose, dispatchRequestId }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canBrowse = DISPATCH_PARENT_PERMISSIONS.some((permission) => hasPermission(permission));
  const canCreate = hasPermission(DISPATCH_PERMISSIONS.create);
  const canApprove = hasPermission(DISPATCH_PERMISSIONS.approve);
  const canSettle = hasPermission(DISPATCH_PERMISSIONS.settle);
  const canPrint = hasPermission(DISPATCH_PERMISSIONS.print);
  const queryClient = useQueryClient();

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [editing, setEditing] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addingItemFor, setAddingItemFor] = useState(null);
  const [returningStock, setReturningStock] = useState(false);
  const [openingSettlement, setOpeningSettlement] = useState(false);
  const [activeSettlement, setActiveSettlement] = useState(null);
  const [printVariant, setPrintVariant] = useState(null);

  const detailQuery = useQuery({
    queryKey: ['dispatch', 'request', dispatchRequestId],
    queryFn: () => api.dispatch.requests.get(dispatchRequestId),
    enabled: Boolean(open && dispatchRequestId && canBrowse)
  });

  const dispatchRequest = detailQuery.data?.data?.dispatch_request;
  const availableActions = getAvailableDispatchActions(dispatchRequest);
  const isLocked = ['cancelled', 'completed'].includes(dispatchRequest?.status);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
    queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequestId] });
  }

  const submitMutation = useMutation({
    mutationFn: () => api.dispatch.requests.submit(dispatchRequestId),
    onSuccess: () => {
      toast.success('Dispatch submitted');
      setConfirmTarget(null);
      invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not submit dispatch request.'))
  });

  const approveMutation = useMutation({
    mutationFn: () => api.dispatch.requests.approve(dispatchRequestId),
    onSuccess: () => {
      toast.success('Dispatch approved');
      setConfirmTarget(null);
      invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not approve dispatch request.'))
  });

  const dispatchMutation = useMutation({
    mutationFn: () => api.dispatch.requests.dispatchStock(dispatchRequestId),
    onSuccess: () => {
      toast.success('Stock dispatched');
      setConfirmTarget(null);
      invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not dispatch stock.'))
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.dispatch.requests.cancel(dispatchRequestId),
    onSuccess: () => {
      toast.success('Dispatch cancelled');
      setConfirmTarget(null);
      invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not cancel dispatch request.'))
  });

  const actionConfigs = {
    submit: {
      label: 'Submit for approval',
      description:
        'Submit this dispatch request for approval. The status moves from draft to pending approval.',
      tone: 'primary',
      mutation: submitMutation,
      confirmLabel: 'Submit'
    },
    approve: {
      label: 'Approve dispatch',
      description: 'Approve this dispatch request. The salesman can now take stock onto the route.',
      tone: 'primary',
      mutation: approveMutation,
      confirmLabel: 'Approve'
    },
    dispatchStock: {
      label: 'Dispatch stock',
      description:
        'Move stock out of the warehouse for this dispatch. This action cannot be undone here; use returns to restock.',
      tone: 'primary',
      mutation: dispatchMutation,
      confirmLabel: 'Dispatch stock'
    },
    cancel: {
      label: 'Cancel dispatch',
      description:
        'Cancel this dispatch request. Already dispatched or completed requests cannot be cancelled.',
      tone: 'danger',
      mutation: cancelMutation,
      confirmLabel: 'Cancel dispatch'
    }
  };

  const activeAction = confirmTarget ? actionConfigs[confirmTarget] : null;

  const customers = dispatchRequest?.customers || [];
  const items = dispatchRequest?.items || [];
  const itemsByCustomer = items.reduce((acc, item) => {
    const key = Number(item.dispatch_customer_id);
    if (!acc.has(key)) acc.set(key, []);
    acc.get(key).push(item);
    return acc;
  }, new Map());

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="xl"
      title={
        dispatchRequest
          ? `Dispatch ${dispatchRequest.dispatch_number || `#${dispatchRequest.id}`}`
          : 'Dispatch request'
      }
      description={
        dispatchRequest
          ? `Created ${formatDateTime(dispatchRequest.created_at)}`
          : undefined
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {!canBrowse ? (
        <GlassPanel>
          <GlassPanelBody>
            <EmptyState
              title="Detail view is restricted"
              description="Ask an administrator for a dispatch workflow permission to open dispatch requests."
            />
          </GlassPanelBody>
        </GlassPanel>
      ) : detailQuery.isPending ? (
        <LoadingState label="Loading dispatch request..." />
      ) : detailQuery.isError ? (
        <ErrorState
          title="Could not load dispatch request"
          description={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      ) : !dispatchRequest ? (
        <EmptyState title="Dispatch request not found" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={dispatchRequest.status} />
            {dispatchRequest.approved_at && (
              <Badge tone="success">Approved {formatDate(dispatchRequest.approved_at)}</Badge>
            )}
            {dispatchRequest.dispatched_at && (
              <Badge tone="info">Dispatched {formatDate(dispatchRequest.dispatched_at)}</Badge>
            )}
            {dispatchRequest.completed_at && (
              <Badge tone="success">Completed {formatDate(dispatchRequest.completed_at)}</Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {availableActions.has('edit') && canCreate && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Pencil}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            )}
            {availableActions.has('addCustomer') && canCreate && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Plus}
                onClick={() => setAddingCustomer(true)}
              >
                Add customer
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
            {availableActions.has('dispatchStock') && canApprove && (
              <Button
                size="sm"
                leftIcon={Truck}
                onClick={() => setConfirmTarget('dispatchStock')}
                isLoading={dispatchMutation.isPending}
              >
                Dispatch stock
              </Button>
            )}
            {availableActions.has('createReturn') && canSettle && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={RotateCcw}
                onClick={() => setReturningStock(true)}
              >
                Record return
              </Button>
            )}
            {availableActions.has('createSettlement') && canSettle && (
              <Button
                size="sm"
                leftIcon={Wallet}
                onClick={() => setOpeningSettlement(true)}
              >
                Open settlement
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
                Cancel dispatch
              </Button>
            )}
            {canPrint && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={Printer}
                  onClick={() => setPrintVariant('summary')}
                >
                  Print summary
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={Receipt}
                  onClick={() => setPrintVariant('receipts')}
                >
                  Customer receipts
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={FileText}
                  onClick={() => setPrintVariant('delivery_notes')}
                >
                  Delivery notes
                </Button>
              </>
            )}
          </div>

          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Dispatch number" value={dispatchRequest.dispatch_number} />
            <Field label="Salesman" value={dispatchRequest.salesman_name} />
            <Field label="Warehouse" value={dispatchRequest.warehouse_name} />
            <Field label="Request date" value={formatDate(dispatchRequest.request_date)} />
            <Field
              label="Approved"
              value={
                dispatchRequest.approved_at
                  ? formatDateTime(dispatchRequest.approved_at)
                  : 'Not approved'
              }
            />
            <Field
              label="Dispatched"
              value={
                dispatchRequest.dispatched_at
                  ? formatDateTime(dispatchRequest.dispatched_at)
                  : 'Not dispatched'
              }
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Subtotal"
              value={formatNumber(dispatchRequest.subtotal_amount ?? dispatchRequest.total_amount, { maximumFractionDigits: 4 })}
            />
            <Field
              label="VAT"
              value={formatNumber(dispatchRequest.vat_amount || 0, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Total amount"
              value={formatNumber(dispatchRequest.total_amount, { maximumFractionDigits: 4 })}
            />
            {dispatchRequest.total_cost !== undefined && dispatchRequest.total_cost !== null && (
              <Field
                label="Total cost"
                value={formatNumber(dispatchRequest.total_cost, { maximumFractionDigits: 4 })}
              />
            )}
            <Field
              label="Returned total"
              value={formatNumber(dispatchRequest.returned_total_amount || 0, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Net total"
              value={formatNumber(dispatchRequest.net_total_amount ?? dispatchRequest.total_amount, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Total collected"
              value={formatNumber(dispatchRequest.total_collected, {
                maximumFractionDigits: 4
              })}
            />
            <Field
              label="Total debt"
              value={formatNumber(dispatchRequest.total_debt, { maximumFractionDigits: 4 })}
            />
          </section>

          {dispatchRequest.notes && (
            <section>
              <h3 className="font-display text-sm font-semibold text-ink-50">Notes</h3>
              <p className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 text-pretty">
                {dispatchRequest.notes}
              </p>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-ink-50">
                Customers and items
              </h3>
              <span className="font-mono text-xs text-ink-400">
                {customers.length} customers / {items.length} items
              </span>
            </div>
            {customers.length === 0 ? (
              <p className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-ink-300">
                <FileText className="h-4 w-4" aria-hidden="true" />
                No customers added yet.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {customers.map((customer) => (
                  <CustomerCard
                    key={customer.id}
                    customer={customer}
                    items={itemsByCustomer.get(Number(customer.id)) || []}
                    canAddItem={canCreate && availableActions.has('addItem')}
                    onAddItem={(target) => setAddingItemFor(target)}
                    locked={isLocked}
                  />
                ))}
              </div>
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

      <DispatchRequestEditModal
        open={editing}
        onClose={() => setEditing(false)}
        dispatchRequest={dispatchRequest}
      />

      <AddDispatchCustomerModal
        open={addingCustomer}
        onClose={() => setAddingCustomer(false)}
        dispatchRequest={dispatchRequest}
      />

      <AddDispatchItemModal
        open={Boolean(addingItemFor)}
        onClose={() => setAddingItemFor(null)}
        dispatchCustomer={addingItemFor}
        dispatchRequestId={dispatchRequestId}
        dispatchRequest={dispatchRequest}
      />

      <CreateReturnModal
        open={returningStock}
        onClose={() => setReturningStock(false)}
        dispatchRequest={dispatchRequest}
      />

      <CreateSettlementModal
        open={openingSettlement}
        onClose={() => setOpeningSettlement(false)}
        dispatchRequest={dispatchRequest}
        onCreated={(settlement) => setActiveSettlement(settlement)}
      />

      <SettlementWorkflowModal
        open={Boolean(activeSettlement)}
        onClose={() => setActiveSettlement(null)}
        dispatchRequest={dispatchRequest}
        settlement={activeSettlement}
      />

      <DispatchPrintModal
        open={Boolean(printVariant)}
        onClose={() => setPrintVariant(null)}
        dispatchRequest={dispatchRequest}
        variant={printVariant || 'summary'}
      />
    </Drawer>
  );
}
