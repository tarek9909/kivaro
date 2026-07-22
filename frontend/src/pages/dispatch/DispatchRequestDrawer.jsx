import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Pencil,
  Plus,
  RefreshCcw,
  RotateCcw,
  Send,
  Trash2,
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

function downloadBlob(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function StatusBadge({ status }) {
  const label = DISPATCH_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={getDispatchStatusTone(status)}>{label}</Badge>;
}

function Field({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">{label}</p>
      <p className="mt-1 break-words text-sm text-ink-100">{value ?? '—'}</p>
    </div>
  );
}

function itemLabel(item) {
  return item.item_name_snapshot || item.catalog_display_name || 'Catalog line';
}

function fulfillmentLabel(type) {
  return (type || 'offer').replaceAll('_', ' ');
}

function CustomerCard({ customer, items, canAddItem, canManageItems, onAddItem, onEditItem, onRemoveItem }) {
  const customerTotal = Number(customer.customer_total_amount || 0);
  return (
    <article className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-50">{customer.customer_name || `Customer #${customer.customer_id}`}</p>
          <p className="mt-0.5 truncate text-xs text-ink-400">
            {[customer.location_name, customer.sublocation_name].filter(Boolean).join(' · ') || 'Territory not recorded'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-ink-200">{formatNumber(customerTotal, { maximumFractionDigits: 4 })}</span>
          {canAddItem && <Button variant="secondary" size="sm" leftIcon={Plus} onClick={() => onAddItem(customer)}>Add line</Button>}
        </div>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-3 text-sm text-ink-400">No lines yet. Each customer needs at least one line before submission.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.025] text-[10px] uppercase tracking-[0.13em] text-ink-400">
              <tr>
                <th className="px-4 py-2 font-semibold">Offer</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 text-right font-semibold">Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Price</th>
                <th className="px-4 py-2 text-right font-semibold">Total</th>
                {canManageItems && <th className="px-4 py-2 text-right font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-ink-100">{itemLabel(item)}</p>
                    <p className="mt-0.5 text-[10px] text-ink-400">{fulfillmentLabel(item.fulfillment_type)}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone={item.line_type === 'free_gift' ? 'warn' : 'neutral'}>
                      {item.line_type === 'free_gift' ? 'Gift' : 'Sale'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-ink-100">
                    {formatNumber(item.quantity, { maximumFractionDigits: 4 })} {item.unit_label_snapshot || ''}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-ink-200">{formatNumber(item.unit_price, { maximumFractionDigits: 4 })}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-50">{formatNumber(item.line_total, { maximumFractionDigits: 4 })}</td>
                  {canManageItems && (
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => onEditItem(item)}>Edit</Button>
                        <Button variant="ghost" size="sm" leftIcon={Trash2} onClick={() => onRemoveItem(item)}>Remove</Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function DocumentChecklist({ checklist, invoices, canPrint, isDownloading, onDownload }) {
  const ready = Boolean(checklist?.ready_for_approval);
  const pendingInvoiceCount = Math.max(0, Number(checklist?.required_invoice_count || 0) - Number(checklist?.generated_invoice_count || 0));
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-ink-50">Approval document checklist</h3>
          <p className="mt-1 text-xs text-ink-400">Every download is recorded against the current dispatch revision. Rework voids invoices and resets this checklist.</p>
        </div>
        <Badge tone={ready ? 'success' : 'warn'}>{ready ? 'Ready for approval' : 'Downloads required'}</Badge>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <DocumentRequirement
          label="Customer checklist"
          complete={Boolean(checklist?.customer_table_generated)}
          disabled={!canPrint || isDownloading}
          onDownload={() => onDownload('customer')}
        />
        <DocumentRequirement
          label="Quantity-only table"
          complete={Boolean(checklist?.quantity_table_generated)}
          disabled={!canPrint || isDownloading}
          onDownload={() => onDownload('quantity')}
        />
        <DocumentRequirement
          label="Customer invoices"
          complete={Number(checklist?.required_invoice_count || 0) > 0 && pendingInvoiceCount === 0}
          detail={`${Number(checklist?.generated_invoice_count || 0)} / ${Number(checklist?.required_invoice_count || 0)} downloaded`}
          disabled={!canPrint || isDownloading}
        />
      </div>
      {!canPrint && <p className="mt-3 text-xs text-warn-300">A dispatch or invoice print permission is required to generate the documents.</p>}
      {invoices.filter((invoice) => invoice.status === 'issued').length === 0 && (
        <p className="mt-3 text-xs text-ink-400">Invoices appear here after the draft is submitted.</p>
      )}
    </section>
  );
}

function DocumentRequirement({ label, complete, detail, disabled, onDownload }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-ink-100">{label}</span>
        <Badge tone={complete ? 'success' : 'neutral'}>{complete ? 'Done' : 'Required'}</Badge>
      </div>
      {detail && <p className="mt-1 text-xs text-ink-400">{detail}</p>}
      {onDownload && (
        <Button className="mt-3" variant="secondary" size="sm" leftIcon={Download} disabled={disabled} onClick={onDownload}>
          Download PDF
        </Button>
      )}
    </div>
  );
}

function InvoicesPanel({ invoices, dispatchRevision, canPrint, downloading, onDownload }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-sm font-semibold text-ink-50">Invoices</h3>
        <span className="text-xs text-ink-400">{invoices.length} issued across revisions</span>
      </div>
      {invoices.length === 0 ? (
        <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-ink-400">Invoices are issued automatically when this dispatch is submitted.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {invoices.map((invoice) => {
            const current = Number(invoice.revision) === Number(dispatchRevision) && invoice.status === 'issued';
            return (
              <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-ink-100">{invoice.invoice_number}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-400">{invoice.customer_name || `Customer #${invoice.customer_id}`} · revision {invoice.revision}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink-200">{formatNumber(invoice.total_amount, { maximumFractionDigits: 4 })}</span>
                  <Badge tone={invoice.status === 'issued' ? 'success' : 'neutral'}>{invoice.status}</Badge>
                  {current && <Button variant="secondary" size="sm" leftIcon={Download} disabled={!canPrint || downloading} onClick={() => onDownload(invoice)}>PDF</Button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SettlementsPanel({ settlements, canPost, onPost }) {
  if (!settlements.length) return null;
  return (
    <section>
      <h3 className="font-display text-sm font-semibold text-ink-50">Delivery closeouts</h3>
      <div className="mt-2 space-y-2">
        {settlements.map((settlement) => (
          <div key={settlement.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
            <div>
              <p className="font-mono text-sm text-ink-100">{settlement.settlement_number}</p>
              <p className="mt-0.5 text-xs text-ink-400">Collected {formatNumber(settlement.total_collected, { maximumFractionDigits: 4 })} · Debt {formatNumber(settlement.total_debt, { maximumFractionDigits: 4 })}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={settlement.status === 'posted' ? 'success' : 'warn'}>{settlement.status}</Badge>
              {settlement.status === 'draft' && canPost && <Button size="sm" variant="secondary" leftIcon={Wallet} onClick={() => onPost(settlement)}>Post</Button>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DispatchRequestDrawer({ open, onClose, dispatchRequestId }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canBrowse = DISPATCH_PARENT_PERMISSIONS.some((permission) => hasPermission(permission));
  const canCreate = hasPermission(DISPATCH_PERMISSIONS.create);
  const canApprove = hasPermission(DISPATCH_PERMISSIONS.approve);
  const canSettle = hasPermission(DISPATCH_PERMISSIONS.settle);
  const canPrint = hasPermission(DISPATCH_PERMISSIONS.print) || hasPermission('invoices.print');
  const canCloseout = canSettle || hasPermission(DISPATCH_PERMISSIONS.salesmanWorkspace);
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [editing, setEditing] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addingItemFor, setAddingItemFor] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [removingItem, setRemovingItem] = useState(null);
  const [returningStock, setReturningStock] = useState(false);
  const [openingCloseout, setOpeningCloseout] = useState(false);
  const [activeSettlement, setActiveSettlement] = useState(null);

  const detailQuery = useQuery({
    queryKey: ['dispatch', 'request', dispatchRequestId],
    queryFn: () => api.dispatch.requests.get(dispatchRequestId),
    enabled: Boolean(open && dispatchRequestId && canBrowse)
  });
  const settlementsQuery = useQuery({
    queryKey: ['dispatch', 'settlements', dispatchRequestId],
    queryFn: () => api.dispatch.requests.settlements(dispatchRequestId),
    enabled: Boolean(open && dispatchRequestId && canBrowse)
  });
  const dispatchRequest = detailQuery.data?.data?.dispatch_request;
  const settlements = settlementsQuery.data?.data?.dispatch_settlements || [];
  const hasDraftCloseout = settlements.some((settlement) => settlement.status === 'draft');
  const availableActions = getAvailableDispatchActions(dispatchRequest);
  const checklist = dispatchRequest?.document_checklist || {};

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
    queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequestId] });
    queryClient.invalidateQueries({ queryKey: ['dispatch', 'settlements', dispatchRequestId] });
  }

  const submitMutation = useMutation({
    mutationFn: () => api.dispatch.requests.submit(dispatchRequestId),
    onSuccess: () => { toast.success('Dispatch submitted and invoices issued'); setConfirmTarget(null); invalidate(); },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not submit dispatch.'))
  });
  const reworkMutation = useMutation({
    mutationFn: () => api.dispatch.requests.rework(dispatchRequestId, {}),
    onSuccess: () => { toast.success('Current invoices voided; dispatch returned to draft'); setConfirmTarget(null); invalidate(); },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not return dispatch to draft.'))
  });
  const approveMutation = useMutation({
    mutationFn: () => api.dispatch.requests.approve(dispatchRequestId),
    onSuccess: () => { toast.success('Dispatch approved and inventory sources reserved'); setConfirmTarget(null); invalidate(); },
    onError: (error) => toast.error(getErrorMessage(error, 'Approval is blocked.'))
  });
  const dispatchMutation = useMutation({
    mutationFn: () => api.dispatch.requests.dispatchStock(dispatchRequestId),
    onSuccess: () => { toast.success('Reserved stock physically dispatched'); setConfirmTarget(null); invalidate(); },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not dispatch stock.'))
  });
  const cancelMutation = useMutation({
    mutationFn: () => api.dispatch.requests.cancel(dispatchRequestId),
    onSuccess: () => { toast.success('Dispatch cancelled'); setConfirmTarget(null); invalidate(); },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not cancel dispatch.'))
  });
  const removeLineMutation = useMutation({
    mutationFn: (lineId) => api.dispatch.items.remove(lineId),
    onSuccess: () => {
      toast.success('Draft line removed');
      setRemovingItem(null);
      invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not remove the draft line.'))
  });
  const downloadMutation = useMutation({
    mutationFn: ({ request }) => request(),
    onSuccess: (response, variables) => {
      try {
        downloadBlob(response instanceof Blob ? response : response?.data, variables.filename);
        toast.success('PDF downloaded and recorded for this revision');
        invalidate();
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not save the PDF.'));
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not generate PDF.'))
  });

  function downloadDocument(kind) {
    if (!dispatchRequest) return;
    if (kind === 'customer') {
      downloadMutation.mutate({ request: () => api.dispatch.documents.customerTablePdf(dispatchRequest.id), filename: `dispatch-${dispatchRequest.dispatch_number}-customers.pdf` });
    } else {
      downloadMutation.mutate({ request: () => api.dispatch.documents.quantityTablePdf(dispatchRequest.id), filename: `dispatch-${dispatchRequest.dispatch_number}-quantities.pdf` });
    }
  }
  function downloadInvoice(invoice) {
    downloadMutation.mutate({ request: () => api.dispatch.invoices.pdf(invoice.id), filename: `invoice-${invoice.invoice_number}.pdf` });
  }

  const actionConfigs = {
    submit: { label: 'Submit for approval', description: 'Issue one invoice per customer and lock the draft until it is reworked.', mutation: submitMutation, confirmLabel: 'Submit' },
    rework: { label: 'Return to draft', description: 'Void all current invoices and reset the document checklist. You can then correct the draft and submit a new revision.', mutation: reworkMutation, confirmLabel: 'Return to draft' },
    approve: { label: 'Approve dispatch', description: 'This locks the current available inventory sources as reservations. Approval remains blocked until every required PDF is downloaded.', mutation: approveMutation, confirmLabel: 'Approve' },
    dispatchStock: { label: 'Physically dispatch stock', description: 'Consume the reserved cartons, shelf units, or ready containers from inventory.', mutation: dispatchMutation, confirmLabel: 'Dispatch stock' },
    cancel: { label: 'Cancel dispatch', description: 'Cancel this dispatch. Reserved inventory, if any, is released.', mutation: cancelMutation, confirmLabel: 'Cancel', tone: 'danger' }
  };
  const activeAction = confirmTarget ? actionConfigs[confirmTarget] : null;
  const customers = dispatchRequest?.customers || [];
  const itemsByCustomer = useMemo(() => {
    const grouped = new Map();
    for (const item of dispatchRequest?.items || []) {
      const key = Number(item.dispatch_customer_id);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    }
    return grouped;
  }, [dispatchRequest?.items]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="xl"
      title={dispatchRequest ? `Dispatch ${dispatchRequest.dispatch_number || `#${dispatchRequest.id}`}` : 'Dispatch request'}
      description={dispatchRequest ? `Revision ${dispatchRequest.revision || 1} · created ${formatDateTime(dispatchRequest.created_at)}` : undefined}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      {!canBrowse ? (
        <GlassPanel><GlassPanelBody><EmptyState title="Detail view is restricted" description="Ask an administrator for a dispatch workflow permission." /></GlassPanelBody></GlassPanel>
      ) : detailQuery.isPending ? (
        <LoadingState label="Loading dispatch workspace…" />
      ) : detailQuery.isError ? (
        <ErrorState title="Could not load dispatch" description={getErrorMessage(detailQuery.error)} onRetry={() => detailQuery.refetch()} />
      ) : !dispatchRequest ? (
        <EmptyState title="Dispatch request not found" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={dispatchRequest.status} />
            {dispatchRequest.submitted_at && <Badge tone="info">Submitted {formatDate(dispatchRequest.submitted_at)}</Badge>}
            {dispatchRequest.approved_at && <Badge tone="brand">Approved {formatDate(dispatchRequest.approved_at)}</Badge>}
            {dispatchRequest.dispatched_at && <Badge tone="warn">Issued {formatDate(dispatchRequest.dispatched_at)}</Badge>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {availableActions.has('edit') && canCreate && <Button variant="secondary" size="sm" leftIcon={Pencil} onClick={() => setEditing(true)}>Edit header</Button>}
            {availableActions.has('addCustomer') && canCreate && <Button variant="secondary" size="sm" leftIcon={Plus} onClick={() => setAddingCustomer(true)}>Add customer</Button>}
            {availableActions.has('submit') && canCreate && <Button size="sm" leftIcon={Send} onClick={() => setConfirmTarget('submit')} isLoading={submitMutation.isPending}>Submit</Button>}
            {availableActions.has('rework') && canCreate && <Button variant="secondary" size="sm" leftIcon={RefreshCcw} onClick={() => setConfirmTarget('rework')} isLoading={reworkMutation.isPending}>Rework</Button>}
            {availableActions.has('approve') && canApprove && <Button size="sm" leftIcon={CheckCircle2} onClick={() => setConfirmTarget('approve')} isLoading={approveMutation.isPending} disabled={!checklist.ready_for_approval}>Approve</Button>}
            {availableActions.has('dispatchStock') && canApprove && <Button size="sm" leftIcon={Truck} onClick={() => setConfirmTarget('dispatchStock')} isLoading={dispatchMutation.isPending}>Dispatch stock</Button>}
            {availableActions.has('createReturn') && canSettle && <Button variant="secondary" size="sm" leftIcon={RotateCcw} onClick={() => setReturningStock(true)}>Record return</Button>}
            {availableActions.has('createCloseout') && canCloseout && !hasDraftCloseout && <Button variant="secondary" size="sm" leftIcon={Wallet} onClick={() => setOpeningCloseout(true)}>Delivery closeout</Button>}
            {availableActions.has('cancel') && canCreate && <Button variant="danger" size="sm" leftIcon={X} onClick={() => setConfirmTarget('cancel')} isLoading={cancelMutation.isPending}>Cancel</Button>}
          </div>

          {dispatchRequest.status === 'pending_approval' && !checklist.ready_for_approval && (
            <div className="flex gap-2 rounded-xl border border-warn-400/30 bg-warn-500/10 p-3 text-sm text-warn-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Download the three required document types below before approval can reserve inventory.</div>
          )}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Salesman" value={dispatchRequest.salesman_name} />
            <Field label="Warehouse" value={dispatchRequest.warehouse_name} />
            <Field label="Request date" value={formatDate(dispatchRequest.request_date)} />
            <Field label="Customers / lines" value={`${customers.length} / ${(dispatchRequest.items || []).length}`} />
            <Field label="Sales total" value={formatNumber(dispatchRequest.total_amount, { maximumFractionDigits: 4 })} />
            <Field label="Gift COGS" value={formatNumber(dispatchRequest.gift_cost || 0, { maximumFractionDigits: 4 })} />
            <Field label="Allocated COGS" value={formatNumber(dispatchRequest.total_cost || 0, { maximumFractionDigits: 4 })} />
            <Field label="Collected" value={formatNumber(dispatchRequest.total_collected || 0, { maximumFractionDigits: 4 })} />
          </section>

          {dispatchRequest.notes && <section><h3 className="font-display text-sm font-semibold text-ink-50">Notes</h3><p className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 whitespace-pre-wrap">{dispatchRequest.notes}</p></section>}

          {['pending_approval', 'approved', 'dispatched', 'partially_settled', 'completed'].includes(dispatchRequest.status) && (
            <DocumentChecklist checklist={checklist} invoices={dispatchRequest.invoices || []} canPrint={canPrint} isDownloading={downloadMutation.isPending} onDownload={downloadDocument} />
          )}

          <section>
            <div className="flex items-center justify-between gap-3"><h3 className="font-display text-sm font-semibold text-ink-50">Customers and sale lines</h3><span className="font-mono text-xs text-ink-400">{customers.length} customers</span></div>
            {customers.length === 0 ? (
              <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-ink-400">Add a customer, then add their catalog-backed sale or gift lines.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {customers.map((customer) => <CustomerCard key={customer.id} customer={customer} items={itemsByCustomer.get(Number(customer.id)) || []} canAddItem={canCreate && availableActions.has('addItem')} canManageItems={canCreate && availableActions.has('addItem')} onAddItem={setAddingItemFor} onEditItem={setEditingItem} onRemoveItem={setRemovingItem} />)}
              </div>
            )}
          </section>

          <InvoicesPanel invoices={dispatchRequest.invoices || []} dispatchRevision={dispatchRequest.revision} canPrint={canPrint} downloading={downloadMutation.isPending} onDownload={downloadInvoice} />
          <SettlementsPanel settlements={settlements} canPost={canSettle} onPost={setActiveSettlement} />
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
      <ConfirmDialog
        open={Boolean(removingItem)}
        onClose={() => setRemovingItem(null)}
        onConfirm={() => removeLineMutation.mutate(removingItem?.id)}
        title="Remove draft line"
        description="Remove this line from the draft. The customer still needs at least one line when the dispatch is submitted."
        confirmLabel="Remove line"
        tone="danger"
        isLoading={removeLineMutation.isPending}
      />
      <DispatchRequestEditModal open={editing} onClose={() => setEditing(false)} dispatchRequest={dispatchRequest} />
      <AddDispatchCustomerModal open={addingCustomer} onClose={() => setAddingCustomer(false)} dispatchRequest={dispatchRequest} />
      <AddDispatchItemModal open={Boolean(addingItemFor || editingItem)} onClose={() => { setAddingItemFor(null); setEditingItem(null); }} dispatchCustomer={addingItemFor || customers.find((customer) => Number(customer.id) === Number(editingItem?.dispatch_customer_id))} dispatchRequestId={dispatchRequestId} dispatchRequest={dispatchRequest} dispatchItem={editingItem} />
      <CreateReturnModal open={returningStock} onClose={() => setReturningStock(false)} dispatchRequest={dispatchRequest} />
      <CreateSettlementModal open={openingCloseout} onClose={() => setOpeningCloseout(false)} dispatchRequest={dispatchRequest} onCreated={(settlement) => { if (settlement && canSettle) setActiveSettlement(settlement); }} />
      <SettlementWorkflowModal open={Boolean(activeSettlement)} onClose={() => setActiveSettlement(null)} settlement={activeSettlement} dispatchRequest={dispatchRequest} onPosted={() => setActiveSettlement(null)} />
    </Drawer>
  );
}
