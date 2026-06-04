import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { api } from '@/api/index.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal
} from '@/components/ui/index.js';
import { formatDate, formatDateTime, formatNumber } from '@/lib/formatters.js';
import {
  DISPATCH_STATUSES,
  getDispatchStatusTone
} from './dispatch.config.js';

const VARIANTS = {
  summary: {
    title: 'Dispatch summary',
    description: 'Printable summary for this dispatch route. Use Download PDF for a printable file.',
    fetcher: (id) => api.dispatch.requests.printSummary(id),
    blobFetcher: (id) => api.dispatch.requests.printSummaryPdf(id),
    suggestedFileName: (request) =>
      `dispatch-summary-${request?.dispatch_number || request?.id || 'document'}.pdf`,
    queryKey: 'summary'
  },
  receipts: {
    title: 'Customer receipts',
    description:
      'Printable receipts for each customer on the dispatch. Use Download PDF for a printable file.',
    fetcher: (id) => api.dispatch.requests.printCustomerReceipts(id),
    blobFetcher: (id) => api.dispatch.requests.printCustomerReceiptsPdf(id),
    suggestedFileName: (request) =>
      `dispatch-receipts-${request?.dispatch_number || request?.id || 'document'}.pdf`,
    queryKey: 'receipts'
  }
};

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
  if (!status) return null;
  const tone = getDispatchStatusTone(status);
  const label =
    DISPATCH_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

function DocumentField({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
        {label}
      </span>
      <span className="break-words text-sm text-ink-100">{value || '-'}</span>
    </div>
  );
}

function DocumentShell({ children }) {
  return (
    <article className="scrollbar-glass max-h-[60vh] overflow-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm shadow-inner shadow-black/20">
      {children}
    </article>
  );
}

function DocumentHeader({ eyebrow, dispatchRequest }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-400">
          {eyebrow}
        </p>
        <h3 className="mt-1 font-display text-lg font-semibold text-ink-50 text-balance">
          {dispatchRequest?.dispatch_number || `Dispatch #${dispatchRequest?.id || ''}`}
        </h3>
        <p className="mt-1 text-xs text-ink-400">
          {dispatchRequest?.request_date
            ? `Request date ${formatDate(dispatchRequest.request_date)}`
            : ''}
        </p>
      </div>
      <StatusBadge status={dispatchRequest?.status} />
    </header>
  );
}

function SummaryDocument({ dispatchRequest }) {
  const customers = dispatchRequest?.customers || [];
  const items = dispatchRequest?.items || [];
  const itemsByCustomer = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      const key = Number(item.dispatch_customer_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }, [items]);

  if (!dispatchRequest) {
    return <EmptyState title="No dispatch data available" />;
  }

  return (
    <DocumentShell>
      <DocumentHeader eyebrow="Dispatch summary" dispatchRequest={dispatchRequest} />

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <DocumentField label="Salesman" value={dispatchRequest.salesman_name} />
        <DocumentField label="Warehouse" value={dispatchRequest.warehouse_name} />
        <DocumentField
          label="Approved"
          value={
            dispatchRequest.approved_at
              ? formatDateTime(dispatchRequest.approved_at)
              : 'Not approved'
          }
        />
        <DocumentField
          label="Dispatched"
          value={
            dispatchRequest.dispatched_at
              ? formatDateTime(dispatchRequest.dispatched_at)
              : 'Not dispatched'
          }
        />
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-4">
        <DocumentField
          label="Subtotal"
          value={formatNumber(dispatchRequest.subtotal_amount ?? dispatchRequest.total_amount, { maximumFractionDigits: 4 })}
        />
        <DocumentField
          label="VAT"
          value={formatNumber(dispatchRequest.vat_amount || 0, { maximumFractionDigits: 4 })}
        />
        <DocumentField
          label="Total amount"
          value={formatNumber(dispatchRequest.total_amount, { maximumFractionDigits: 4 })}
        />
        <DocumentField
          label="Total cost"
          value={formatNumber(dispatchRequest.total_cost, { maximumFractionDigits: 4 })}
        />
        <DocumentField
          label="Total collected"
          value={formatNumber(dispatchRequest.total_collected, { maximumFractionDigits: 4 })}
        />
        <DocumentField
          label="Total debt"
          value={formatNumber(dispatchRequest.total_debt, { maximumFractionDigits: 4 })}
        />
      </section>

      {dispatchRequest.notes && (
        <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 text-pretty">
          {dispatchRequest.notes}
        </section>
      )}

      <section className="mt-5">
        <h4 className="font-display text-sm font-semibold text-ink-50">
          Customers and items
        </h4>
        {customers.length === 0 ? (
          <p className="mt-2 text-xs text-ink-400">No customers on this dispatch.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
            {customers.map((customer) => {
              const customerItems = itemsByCustomer.get(Number(customer.id)) || [];
              return (
                <li
                  key={customer.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
                >
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
                    <span className="font-mono text-xs text-ink-200">
                      {Number(customer.vat_amount || 0) > 0
                        ? `VAT ${formatNumber(customer.vat_amount, { maximumFractionDigits: 4 })} / `
                        : ''}
                      Total {formatNumber(customer.customer_total_amount || customer.total_amount, { maximumFractionDigits: 4 })}
                    </span>
                  </div>

                  {customerItems.length === 0 ? (
                    <p className="mt-2 text-xs text-ink-400">No items.</p>
                  ) : (
                    <div className="mt-2 overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
                      <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                        <thead className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
                          <tr className="border-b border-white/5">
                            <th className="px-3 py-2 font-medium">Variant</th>
                            <th className="px-3 py-2 text-right font-medium">Qty</th>
                            <th className="px-3 py-2 text-right font-medium">Unit price</th>
                            <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                            <th className="px-3 py-2 text-right font-medium">VAT</th>
                            <th className="px-3 py-2 text-right font-medium">Line total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {customerItems.map((item) => (
                            <tr key={item.id} className="border-b border-white/5 last:border-0">
                              <td className="px-3 py-2 align-top">
                                <p className="truncate text-ink-50">
                                  {item.item_name || ''}
                                  {item.variant_name ? ` - ${item.variant_name}` : ''}
                                </p>
                                <p className="truncate font-mono text-[11px] text-ink-400">
                                  {item.sku || `variant #${item.item_variant_id}`}
                                </p>
                              </td>
                              <td className="px-3 py-2 text-right align-top font-mono text-ink-100">
                                {formatNumber(item.quantity, { maximumFractionDigits: 4 })}
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
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </DocumentShell>
  );
}

function ReceiptsDocument({ dispatchRequest, customerReceipts }) {
  const receipts = customerReceipts && customerReceipts.length > 0
    ? customerReceipts
    : (dispatchRequest?.customers || []);

  if (!dispatchRequest && receipts.length === 0) {
    return <EmptyState title="No receipt data available" />;
  }

  return (
    <DocumentShell>
      <DocumentHeader eyebrow="Customer receipts" dispatchRequest={dispatchRequest} />

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <DocumentField label="Salesman" value={dispatchRequest?.salesman_name} />
        <DocumentField label="Warehouse" value={dispatchRequest?.warehouse_name} />
      </section>

      <section className="mt-5 space-y-3">
        {receipts.length === 0 ? (
          <p className="text-xs text-ink-400">No customers on this dispatch.</p>
        ) : (
          receipts.map((receipt) => {
            const total = receipt.customer_total_amount ?? receipt.total_amount;
            const paid = receipt.collected_amount ?? receipt.paid_amount;
            const remaining =
              receipt.debt_amount ??
              receipt.remaining_amount ??
              (total !== undefined && paid !== undefined
                ? Number(total || 0) - Number(paid || 0)
                : undefined);
            return (
              <article
                key={receipt.id || receipt.dispatch_customer_id || receipt.customer_id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
                      Receipt
                    </p>
                    <p className="mt-1 font-medium text-ink-50">
                      {receipt.receipt_number || `customer #${receipt.customer_id || receipt.dispatch_customer_id}`}
                    </p>
                    <p className="mt-1 text-xs text-ink-300">
                      {receipt.customer_name || ''}
                    </p>
                    <p className="text-xs text-ink-400">
                      {receipt.location_name || ''}
                      {receipt.sublocation_name ? ` - ${receipt.sublocation_name}` : ''}
                    </p>
                  </div>
                  {receipt.payment_status && (
                    <Badge
                      tone={
                        receipt.payment_status === 'paid'
                          ? 'success'
                          : receipt.payment_status === 'debt'
                          ? 'warn'
                          : receipt.payment_status === 'partial_debt'
                          ? 'info'
                          : 'neutral'
                      }
                    >
                      {receipt.payment_status}
                    </Badge>
                  )}
                </header>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <DocumentField
                    label="Subtotal"
                    value={
                      receipt.subtotal_amount !== undefined && receipt.subtotal_amount !== null
                        ? formatNumber(receipt.subtotal_amount, { maximumFractionDigits: 4 })
                        : undefined
                    }
                  />
                  <DocumentField
                    label="VAT"
                    value={
                      receipt.vat_amount !== undefined && receipt.vat_amount !== null
                        ? formatNumber(receipt.vat_amount, { maximumFractionDigits: 4 })
                        : undefined
                    }
                  />
                  <DocumentField
                    label="Total"
                    value={
                      total !== undefined && total !== null
                        ? formatNumber(total, { maximumFractionDigits: 4 })
                        : undefined
                    }
                  />
                  <DocumentField
                    label="Paid"
                    value={
                      paid !== undefined && paid !== null
                        ? formatNumber(paid, { maximumFractionDigits: 4 })
                        : undefined
                    }
                  />
                  <DocumentField
                    label="Remaining"
                    value={
                      remaining !== undefined && remaining !== null
                        ? formatNumber(remaining, { maximumFractionDigits: 4 })
                        : undefined
                    }
                  />
                </div>

                {Array.isArray(receipt.items) && receipt.items.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
                    <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
                        <tr className="border-b border-white/5">
                          <th className="px-3 py-2 font-medium">Variant</th>
                          <th className="px-3 py-2 text-right font-medium">Qty</th>
                          <th className="px-3 py-2 text-right font-medium">Unit price</th>
                          <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                          <th className="px-3 py-2 text-right font-medium">VAT</th>
                          <th className="px-3 py-2 text-right font-medium">Line total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipt.items.map((item) => (
                          <tr key={item.id} className="border-b border-white/5 last:border-0">
                            <td className="px-3 py-2 align-top">
                              <p className="truncate text-ink-50">
                                {item.item_name || ''}
                                {item.variant_name ? ` - ${item.variant_name}` : ''}
                              </p>
                              <p className="truncate font-mono text-[11px] text-ink-400">
                                {item.sku || `variant #${item.item_variant_id}`}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-right align-top font-mono text-ink-100">
                              {formatNumber(item.quantity, { maximumFractionDigits: 4 })}
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
                )}

                {receipt.notes && (
                  <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-ink-300 text-pretty">
                    {receipt.notes}
                  </p>
                )}
              </article>
            );
          })
        )}
      </section>
    </DocumentShell>
  );
}

export function DispatchPrintModal({ open, onClose, dispatchRequest, variant = 'summary' }) {
  const config = VARIANTS[variant] || VARIANTS.summary;
  const [downloading, setDownloading] = useState(false);

  const dataQuery = useQuery({
    queryKey: ['dispatch', 'print', config.queryKey, dispatchRequest?.id],
    queryFn: () => config.fetcher(dispatchRequest.id),
    enabled: Boolean(open && dispatchRequest?.id)
  });

  const pdfMutation = useMutation({
    mutationFn: () => config.blobFetcher(dispatchRequest.id),
    onSuccess: (response) => {
      // The httpClient returns the Blob directly when responseType is 'blob'.
      const blob = response instanceof Blob ? response : response?.data;
      const filename = config.suggestedFileName(dispatchRequest);
      try {
        downloadBlob(blob, filename);
        toast.success('PDF downloaded');
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not save PDF.'));
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not download PDF.'))
  });

  useEffect(() => {
    if (!open) {
      setDownloading(false);
    }
  }, [open]);

  const payload = dataQuery.data?.data || {};
  const fetchedRequest = payload.dispatch_request || dispatchRequest;
  const customerReceipts = Array.isArray(payload.customer_receipts)
    ? payload.customer_receipts
    : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={config.title}
      description={config.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            leftIcon={Download}
            onClick={() => {
              setDownloading(true);
              pdfMutation.mutate(undefined, {
                onSettled: () => setDownloading(false)
              });
            }}
            isLoading={downloading || pdfMutation.isPending}
          >
            Download PDF
          </Button>
        </>
      }
    >
      {dataQuery.isPending ? (
        <LoadingState label="Loading printable view..." />
      ) : dataQuery.isError ? (
        <ErrorState
          title="Could not load printable view"
          description={getErrorMessage(dataQuery.error)}
          onRetry={() => dataQuery.refetch()}
        />
      ) : variant === 'receipts' ? (
        <ReceiptsDocument
          dispatchRequest={fetchedRequest}
          customerReceipts={customerReceipts}
        />
      ) : (
        <SummaryDocument dispatchRequest={fetchedRequest} />
      )}
    </Modal>
  );
}
