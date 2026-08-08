import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Pencil,
  RefreshCcw,
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
  getDispatchEntityLabel,
  getDispatchStatusTone
} from './dispatch.config.js';
import { DispatchRequestEditModal } from './DispatchRequestEditModal.jsx';
import { CreateReturnModal } from './CreateReturnModal.jsx';
import { CreateSettlementModal } from './CreateSettlementModal.jsx';
import { SettlementWorkflowModal } from './SettlementWorkflowModal.jsx';

import { cn } from '@/lib/cn.js';

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

function Field({ label, value, highlight = false }) {
  return (
    <div className={cn(
      "min-w-0 rounded-2xl border p-3.5 transition",
      highlight
        ? "border-brand-400/30 bg-brand-400/[0.05]"
        : "border-white/10 bg-white/[0.02] hover:border-white/15"
    )}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className={cn("mt-1 break-words text-sm font-medium", highlight ? "text-brand-300 font-mono" : "text-ink-100")}>{value ?? '—'}</p>
    </div>
  );
}

function itemLabel(item) {
  return item.item_name_snapshot || item.catalog_display_name || 'Catalog line';
}

function fulfillmentLabel(type) {
  return (type || 'offer').replaceAll('_', ' ');
}

function CustomerCard({ customer, items }) {
  const customerTotal = Number(customer.customer_total_amount || 0);
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition hover:border-white/20">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-white/[0.03] to-transparent px-4 py-3.5">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-50">{customer.customer_name || `Customer #${customer.customer_id}`}</p>
          <p className="mt-0.5 truncate text-xs text-ink-400">
            {[customer.location_name, customer.sublocation_name].filter(Boolean).join(' · ') || 'Territory not recorded'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {Number(customer.discount_amount || 0) > 0 && (
            <span className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-300">
              Discount −{formatNumber(customer.discount_amount, { maximumFractionDigits: 4 })}
            </span>
          )}
          <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-1 font-mono text-xs font-semibold text-brand-300">
            {formatNumber(customerTotal, { maximumFractionDigits: 4 })}
          </span>
        </div>
      </header>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-ink-400 italic">No lines yet. Each customer needs at least one line before submission.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wider text-ink-400 font-semibold">
              <tr>
                <th className="px-4 py-2.5">Offer</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5 text-right">Qty</th>
                <th className="px-3 py-2.5 text-right">Price</th>
                <th className="px-4 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => (
                <tr key={item.id} className="transition hover:bg-white/[0.015]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-100">{itemLabel(item)}</p>
                    <p className="mt-0.5 text-[10px] text-ink-400">{fulfillmentLabel(item.fulfillment_type)}</p>
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={item.line_type === 'free_gift' ? 'warn' : 'neutral'}>
                      {item.line_type === 'free_gift' ? 'Gift' : 'Sale'}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-ink-100">
                    {formatNumber(item.quantity, { maximumFractionDigits: 4 })} {item.unit_label_snapshot || ''}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-ink-200">{formatNumber(item.unit_price, { maximumFractionDigits: 4 })}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink-50 font-medium">{formatNumber(item.line_total, { maximumFractionDigits: 4 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function DocumentChecklist({ status, checklist, customers, canPrint, isDownloading, onDownloadCustomerList, onDownloadDeliveryDocument, onDownloadAllDeliveryDocuments }) {
  const isReleaseStage = status === 'approved';
  const ready = isReleaseStage
    ? Boolean(checklist?.ready_for_dispatch)
    : Boolean(checklist?.delivery_documents_generated);
  const requiredReceiptCount = Number(checklist?.required_receipt_count || 0);
  const generatedDeliveryDocumentCount = Math.min(
    Number(checklist?.generated_delivery_receipt_count || 0),
    Number(checklist?.generated_acceptance_consent_count || 0)
  );
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-ink-50">{isReleaseStage ? 'Delivery release document' : 'Delivery closeout documents'}</h3>
          <p className="mt-0.5 text-xs text-ink-400">Recorded against current dispatch revision.</p>
        </div>
        <Badge tone={ready ? 'success' : 'warn'}>{ready ? (isReleaseStage ? 'Ready to issue delivery' : 'Ready for closeout') : 'Download required'}</Badge>
      </div>

      <div className="pt-1">
        {isReleaseStage ? (
          <DocumentRequirement
            label="Customer & quantity list"
            complete={Boolean(checklist?.customer_table_generated)}
            disabled={!canPrint || isDownloading}
            onDownload={onDownloadCustomerList}
          />
        ) : (
          <DocumentRequirement
            label="Delivery receipt & consent"
            complete={Boolean(checklist?.delivery_documents_generated)}
            detail={`${generatedDeliveryDocumentCount} / ${requiredReceiptCount} downloaded · each PDF contains a receipt page and a consent page`}
            disabled={!canPrint || isDownloading}
            onDownload={customers.length > 1 ? onDownloadAllDeliveryDocuments : undefined}
            downloadLabel="Download all customer PDFs"
            actions={customers.map((customer) => ({
              label: customers.length === 1 ? 'Combined receipt & consent' : `Combined: ${customer.customer_name || customer.name}`,
              onClick: () => onDownloadDeliveryDocument(customer)
            }))}
          />
        )}
      </div>
      {!canPrint && <p className="text-xs text-warn-300">A dispatch or invoice print permission is required to generate documents.</p>}
    </section>
  );
}

function DocumentRequirement({ label, complete, detail, disabled, onDownload, downloadLabel = 'Download PDF', actions = [] }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.015] px-3.5 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink-100">{label}</span>
          <Badge tone={complete ? 'success' : 'neutral'}>{complete ? 'Done' : 'Required'}</Badge>
        </div>
        {detail && <p className="mt-1 text-xs text-ink-400">{detail}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onDownload && (
          <Button variant="secondary" size="sm" leftIcon={Download} disabled={disabled} onClick={onDownload}>
            {downloadLabel}
          </Button>
        )}
        {actions.map((action) => (
          <Button key={action.label} variant="secondary" size="sm" leftIcon={Download} disabled={disabled} onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function InvoicesPanel({ invoices }) {
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
          {invoices.map((invoice) => (
              <div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-ink-100">{invoice.invoice_number}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-400">{invoice.customer_name || `Customer #${invoice.customer_id}`} · revision {invoice.revision}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink-200">{formatNumber(invoice.total_amount, { maximumFractionDigits: 4 })}</span>
                  <Badge tone={invoice.status === 'issued' ? 'success' : 'neutral'}>{invoice.status}</Badge>
                </div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

function SettlementsPanel({ settlements, canPost, canReopen, onPost, onReopen }) {
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
              {settlement.status === 'draft' && canReopen && <Button size="sm" variant="ghost" onClick={() => onReopen(settlement)}>Reopen</Button>}
              {settlement.status === 'draft' && canPost && <Button size="sm" variant="secondary" leftIcon={Wallet} onClick={() => onPost(settlement)}>Post</Button>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DispatchRequestDrawer({ open, onClose, dispatchRequestId }) {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canBrowse = DISPATCH_PARENT_PERMISSIONS.some((permission) => hasPermission(permission));
  const canSettle = hasPermission(DISPATCH_PERMISSIONS.settle) || hasPermission('finance.settle_deliveries');
  const canPrint = hasPermission(DISPATCH_PERMISSIONS.print) || hasPermission('invoices.print');
  const queryClient = useQueryClient();
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [reworkForEdit, setReworkForEdit] = useState(false);
  const [editing, setEditing] = useState(false);
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
  const capabilities = dispatchRequest?.capabilities || {};
  const checklist = dispatchRequest?.document_checklist || {};
  const entityLabel = getDispatchEntityLabel(dispatchRequest?.status);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
    queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequestId] });
    queryClient.invalidateQueries({ queryKey: ['dispatch', 'settlements', dispatchRequestId] });
  }

  const submitMutation = useMutation({
    mutationFn: () => api.dispatch.requests.submit(dispatchRequestId),
    onSuccess: () => { toast.success('Order submitted and invoices issued'); setConfirmTarget(null); invalidate(); },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not submit order.'))
  });
  const reworkMutation = useMutation({
    mutationFn: () => api.dispatch.requests.rework(dispatchRequestId, {}),
    onSuccess: () => {
      const shouldEdit = reworkForEdit;
      setReworkForEdit(false);
      setConfirmTarget(null);
      invalidate();
      if (shouldEdit) {
        toast.success('Approved order returned to draft for editing');
        onClose?.();
        navigate(`/pos?edit_dispatch_id=${dispatchRequestId}`);
      } else {
        toast.success('Current invoices voided; order returned to draft');
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not return order to draft.'))
  });
  const approveMutation = useMutation({
    mutationFn: () => api.dispatch.requests.approve(dispatchRequestId),
    onSuccess: () => { toast.success('Order approved and delivery inventory reserved'); setConfirmTarget(null); invalidate(); },
    onError: (error) => toast.error(getErrorMessage(error, 'Approval is blocked.'))
  });
  const dispatchMutation = useMutation({
    mutationFn: () => api.dispatch.requests.dispatchStock(dispatchRequestId),
    onSuccess: () => { toast.success('Delivery issued and stock dispatched'); setConfirmTarget(null); invalidate(); },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not issue the delivery.'))
  });
  const cancelMutation = useMutation({
    mutationFn: () => api.dispatch.requests.cancel(dispatchRequestId),
    onSuccess: () => { toast.success('Order or delivery cancelled'); setConfirmTarget(null); invalidate(); },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not cancel this record.'))
  });
  const reopenMutation = useMutation({
    mutationFn: (id) => api.dispatch.settlements.reopen(id),
    onSuccess: () => { toast.success('Draft closeout reopened'); invalidate(); },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not reopen this closeout.'))
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
  const bulkDownloadMutation = useMutation({
    mutationFn: async (customerList) => {
      const downloads = [];
      for (const customer of customerList) {
        const response = await api.dispatch.documents.deliveryDocumentPdf(dispatchRequest.id, customer.id);
        downloads.push({ customer, response });
      }
      return downloads;
    },
    onSuccess: (downloads) => {
      try {
        downloads.forEach(({ customer, response }) => {
          downloadBlob(response instanceof Blob ? response : response?.data, `delivery-document-${customer.id}.pdf`);
        });
        toast.success(`Downloaded ${downloads.length} customer PDF${downloads.length === 1 ? '' : 's'}`);
        invalidate();
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not save the customer PDFs.'));
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not generate all customer PDFs.'))
  });

  function downloadCustomerList() {
    if (!dispatchRequest) return;
    downloadMutation.mutate({ request: () => api.dispatch.documents.customerTablePdf(dispatchRequest.id), filename: `dispatch-${dispatchRequest.dispatch_number}-customers-quantities.pdf` });
  }
  function downloadDeliveryDocument(customer) {
    if (!dispatchRequest || !customer) return;
    downloadMutation.mutate({
      request: () => api.dispatch.documents.deliveryDocumentPdf(dispatchRequest.id, customer.id),
      filename: `delivery-document-${customer.id}.pdf`
    });
  }
  function downloadAllDeliveryDocuments() {
    if (!customers.length) return;
    bulkDownloadMutation.mutate(customers);
  }
  function downloadReturnCreditNote(creditNote) {
    if (!creditNote) return;
    downloadMutation.mutate({
      request: () => api.dispatch.returnCreditNotes.pdf(creditNote.id),
      filename: `return-credit-note-${creditNote.credit_note_number || creditNote.id}.pdf`
    });
  }

  const approvedRework = dispatchRequest?.status === 'approved';
  const actionConfigs = {
    submit: { label: 'Submit order for approval', description: 'Issue one invoice per customer and lock the order until it is reworked.', mutation: submitMutation, confirmLabel: 'Submit order' },
    rework: {
      label: approvedRework ? 'Edit approved order' : 'Return order to draft',
      description: approvedRework
        ? 'Release the reserved inventory, void the current invoices, and reopen this order in Mini POS for correction.'
        : 'Void all current invoices and reset the document checklist. You can then correct the order and submit a new revision.',
      mutation: reworkMutation,
      confirmLabel: approvedRework ? 'Edit order' : 'Return to draft'
    },
    approve: { label: 'Approve order', description: 'This reserves the available inventory for its delivery.', mutation: approveMutation, confirmLabel: 'Approve order' },
    dispatchStock: { label: 'Issue delivery', description: 'Consume the reserved cartons, shelf units, or ready containers from inventory. The customer and quantity list must be downloaded first.', mutation: dispatchMutation, confirmLabel: 'Issue delivery' },
    cancel: { label: `Cancel ${entityLabel.toLowerCase()}`, description: `Cancel this ${entityLabel.toLowerCase()}. Any reserved inventory is released.`, mutation: cancelMutation, confirmLabel: 'Cancel', tone: 'danger' }
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
      title={dispatchRequest ? `${entityLabel} ${dispatchRequest.dispatch_number || `#${dispatchRequest.id}`}` : 'Order or delivery'}
      description={dispatchRequest ? `Revision ${dispatchRequest.revision || 1} · created ${formatDateTime(dispatchRequest.created_at)}` : undefined}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      {!canBrowse ? (
        <GlassPanel><GlassPanelBody><EmptyState title="Detail view is restricted" description="Ask an administrator for an order or delivery workflow permission." /></GlassPanelBody></GlassPanel>
      ) : detailQuery.isPending ? (
        <LoadingState label="Loading order or delivery…" />
      ) : detailQuery.isError ? (
        <ErrorState title="Could not load order or delivery" description={getErrorMessage(detailQuery.error)} onRetry={() => detailQuery.refetch()} />
      ) : !dispatchRequest ? (
        <EmptyState title="Order or delivery not found" />
      ) : (
        <div className="space-y-5">
          {/* Header Action & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={dispatchRequest.status} />
              {dispatchRequest.submitted_at && <Badge tone="info">Submitted {formatDate(dispatchRequest.submitted_at)}</Badge>}
              {dispatchRequest.approved_at && <Badge tone="brand">Approved {formatDate(dispatchRequest.approved_at)}</Badge>}
              {dispatchRequest.dispatched_at && <Badge tone="warn">Issued {formatDate(dispatchRequest.dispatched_at)}</Badge>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {availableActions.has('edit') && capabilities.can_edit && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={Pencil}
                  onClick={() => {
                    onClose?.();
                    navigate(`/pos?edit_dispatch_id=${dispatchRequest.id}`);
                  }}
                >
                  Edit order
                </Button>
              )}
              {availableActions.has('submit') && capabilities.can_submit && <Button size="sm" leftIcon={Send} onClick={() => setConfirmTarget('submit')} isLoading={submitMutation.isPending}>Submit order</Button>}
              {availableActions.has('rework') && capabilities.can_rework && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={approvedRework ? Pencil : RefreshCcw}
                  onClick={() => {
                    setReworkForEdit(approvedRework);
                    setConfirmTarget('rework');
                  }}
                  isLoading={reworkMutation.isPending}
                >
                  {approvedRework ? 'Edit order' : 'Rework order'}
                </Button>
              )}
              {availableActions.has('approve') && capabilities.can_release && <Button size="sm" leftIcon={CheckCircle2} onClick={() => setConfirmTarget('approve')} isLoading={approveMutation.isPending}>Approve order</Button>}
              {availableActions.has('dispatchStock') && capabilities.can_dispatch && <Button size="sm" leftIcon={Truck} onClick={() => setConfirmTarget('dispatchStock')} isLoading={dispatchMutation.isPending} disabled={!checklist.ready_for_dispatch}>Issue delivery</Button>}
              {availableActions.has('createReturn') && capabilities.can_record_returns && !hasDraftCloseout && <Button variant="secondary" size="sm" leftIcon={RotateCcw} onClick={() => setReturningStock(true)}>Record return</Button>}
              {availableActions.has('createCloseout') && capabilities.can_closeout && !hasDraftCloseout && <Button variant="secondary" size="sm" leftIcon={Wallet} onClick={() => setOpeningCloseout(true)} disabled={!checklist.delivery_documents_generated}>Delivery closeout</Button>}
              {availableActions.has('cancel') && capabilities.can_cancel && <Button variant="danger" size="sm" leftIcon={X} onClick={() => setConfirmTarget('cancel')} isLoading={cancelMutation.isPending}>Cancel {entityLabel.toLowerCase()}</Button>}
            </div>
          </div>

          {dispatchRequest.status === 'approved' && !checklist.ready_for_dispatch && (
            <div className="flex gap-2 rounded-xl border border-warn-400/30 bg-warn-500/10 p-3 text-sm text-warn-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Download the customer and quantity list before issuing delivery.</div>
          )}
          {['delivery', 'partially_settled'].includes(dispatchRequest.status) && !checklist.delivery_documents_generated && (
            <div className="flex gap-2 rounded-xl border border-warn-400/30 bg-warn-500/10 p-3 text-sm text-warn-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Download the combined delivery receipt and consent PDF for every customer before closing the delivery.</div>
          )}

          {/* Unified Overview Panel (Replaces 8 isolated boxes) */}
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            {/* Top Half: Route & Logistics */}
            <div className="grid gap-4 border-b border-white/5 p-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Salesman</p>
                <p className="mt-1 text-sm font-medium text-ink-100">{dispatchRequest.salesman_name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Warehouse</p>
                <p className="mt-1 text-sm font-medium text-ink-100">{dispatchRequest.warehouse_name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{entityLabel === 'Order' ? 'Order Date' : 'Delivery Date'}</p>
                <p className="mt-1 text-sm font-medium text-ink-100">{formatDate(dispatchRequest.request_date) || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Customers / Lines</p>
                <p className="mt-1 font-mono text-sm font-medium text-ink-100">{customers.length} / {(dispatchRequest.items || []).length}</p>
              </div>
            </div>

            {/* Bottom Half: Financial Summary Bar */}
            <div className="grid gap-4 bg-white/[0.015] p-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Sales Total</p>
                <p className="mt-1 font-mono text-base font-bold text-ink-50">{formatNumber(dispatchRequest.total_amount, { maximumFractionDigits: 4 })}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Gift COGS</p>
                <p className="mt-1 font-mono text-sm font-medium text-ink-200">{formatNumber(dispatchRequest.gift_cost || 0, { maximumFractionDigits: 4 })}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Allocated COGS</p>
                <p className="mt-1 font-mono text-sm font-medium text-ink-200">{formatNumber(dispatchRequest.total_cost || 0, { maximumFractionDigits: 4 })}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Collected Cash</p>
                <p className="mt-1 font-mono text-sm font-semibold text-emerald-400">{formatNumber(dispatchRequest.total_collected || 0, { maximumFractionDigits: 4 })}</p>
              </div>
            </div>
          </section>

          {dispatchRequest.notes && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Notes</h3>
              <p className="mt-1 text-sm text-ink-200 whitespace-pre-wrap">{dispatchRequest.notes}</p>
            </section>
          )}

          {['approved', 'delivery', 'partially_settled', 'completed'].includes(dispatchRequest.status) && (
            <DocumentChecklist status={dispatchRequest.status} checklist={checklist} customers={customers} canPrint={canPrint} isDownloading={downloadMutation.isPending || bulkDownloadMutation.isPending} onDownloadCustomerList={downloadCustomerList} onDownloadDeliveryDocument={downloadDeliveryDocument} onDownloadAllDeliveryDocuments={downloadAllDeliveryDocuments} />
          )}

          {(dispatchRequest.return_credit_notes || []).length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <h3 className="font-display text-sm font-semibold text-ink-50">Return credit notes</h3>
              <p className="mt-1 text-xs text-ink-400">Immutable return adjustments are available for review and printing.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {dispatchRequest.return_credit_notes.map((creditNote) => (
                  <Button key={creditNote.id} variant="secondary" size="sm" leftIcon={Download} disabled={!canPrint || downloadMutation.isPending} onClick={() => downloadReturnCreditNote(creditNote)}>
                    {creditNote.credit_note_number} · {creditNote.customer_name}
                  </Button>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between gap-3 px-1 mb-2.5">
              <h3 className="font-display text-sm font-semibold text-ink-50">{entityLabel === 'Order' ? 'Customers and order lines' : 'Delivery customers and lines'}</h3>
              <span className="font-mono text-xs text-ink-400">{customers.length} customers</span>
            </div>
            {customers.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-ink-400 italic">No customers or order lines yet. Use Edit order to build this draft in Mini POS.</p>
            ) : (
              <div className="space-y-3">
                {customers.map((customer) => <CustomerCard key={customer.id} customer={customer} items={itemsByCustomer.get(Number(customer.id)) || []} />)}
              </div>
            )}
          </section>

          <InvoicesPanel invoices={dispatchRequest.invoices || []} />
          <SettlementsPanel settlements={settlements} canPost={capabilities.can_settle} canReopen={capabilities.can_closeout} onPost={setActiveSettlement} onReopen={(settlement) => reopenMutation.mutate(settlement.id)} />
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
      <DispatchRequestEditModal open={editing} onClose={() => setEditing(false)} dispatchRequest={dispatchRequest} />
      <CreateReturnModal open={returningStock} onClose={() => setReturningStock(false)} dispatchRequest={dispatchRequest} />
      <CreateSettlementModal open={openingCloseout} onClose={() => setOpeningCloseout(false)} dispatchRequest={dispatchRequest} onCreated={(settlement) => { if (settlement && canSettle) setActiveSettlement(settlement); }} />
      <SettlementWorkflowModal open={Boolean(activeSettlement)} onClose={() => setActiveSettlement(null)} settlement={activeSettlement} dispatchRequest={dispatchRequest} onPosted={() => setActiveSettlement(null)} />
    </Drawer>
  );
}
