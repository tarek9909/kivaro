import { useEffect, useState } from 'react';
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

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
        {label}
      </span>
      <span className="break-words text-sm text-ink-100">{value || '-'}</span>
    </div>
  );
}

/**
 * The list endpoint joins customer name and amounts; the print endpoint
 * returns the raw receipt row. Merge the two so the printable view always
 * has the richest fields available (with the print response taking
 * precedence for fields it does return).
 */
function mergeReceipt(listRow, printRow) {
  if (!listRow && !printRow) return null;
  if (!listRow) return printRow;
  if (!printRow) return listRow;
  return { ...listRow, ...printRow };
}

export function ReceiptPrintModal({ open, onClose, receipt: receiptRow }) {
  const receiptId = receiptRow?.id;
  const [downloading, setDownloading] = useState(false);

  const dataQuery = useQuery({
    queryKey: ['payments', 'receipt-print', receiptId],
    queryFn: () => api.payments.receipts.print(receiptId),
    enabled: Boolean(open && receiptId)
  });

  const pdfMutation = useMutation({
    mutationFn: () => api.payments.receipts.printPdf(receiptId),
    onSuccess: (response) => {
      // The httpClient returns the Blob directly when responseType is 'blob'.
      const blob = response instanceof Blob ? response : response?.data;
      const filename = `customer-receipt-${receiptId}.pdf`;
      try {
        downloadBlob(blob, filename);
        toast.success('Receipt PDF downloaded');
      } catch (error) {
        toast.error(getErrorMessage(error, 'Could not save receipt PDF.'));
      }
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not download receipt PDF.'))
  });

  useEffect(() => {
    if (!open) setDownloading(false);
  }, [open]);

  const printed = dataQuery.data?.data?.customer_receipt;
  const receipt = mergeReceipt(receiptRow, printed);
  const items = Array.isArray(receipt?.items) ? receipt.items : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Customer receipt"
      description="Printable receipt document. Use Download PDF for a printable file."
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
        <LoadingState label="Loading receipt..." />
      ) : dataQuery.isError ? (
        <ErrorState
          title="Could not load receipt"
          description={getErrorMessage(dataQuery.error)}
          onRetry={() => dataQuery.refetch()}
        />
      ) : !receipt ? (
        <EmptyState title="Receipt not found" />
      ) : (
        <article className="scrollbar-glass max-h-[60vh] overflow-auto rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm shadow-inner shadow-black/20">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-400">
                Receipt
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold text-ink-50 text-balance">
                {receipt.receipt_number || `Receipt #${receipt.id}`}
              </h3>
              <p className="mt-1 text-xs text-ink-400">
                {receipt.receipt_date
                  ? `Issued ${formatDate(receipt.receipt_date)}`
                  : ''}
              </p>
            </div>
            {receipt.receipt_type && <Badge tone="info">{receipt.receipt_type}</Badge>}
          </header>

          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field
              label="Customer"
              value={
                receipt.customer_name ||
                (receipt.customer_id ? `#${receipt.customer_id}` : null)
              }
            />
            <Field
              label="Dispatch"
              value={
                receipt.dispatch_request_id
                  ? `#${receipt.dispatch_request_id}`
                  : null
              }
            />
            <Field
              label="Printed at"
              value={
                receipt.printed_at ? formatDateTime(receipt.printed_at) : 'First print'
              }
            />
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-3">
            <Field
              label="Total"
              value={formatNumber(receipt.total_amount, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Paid"
              value={formatNumber(receipt.paid_amount, { maximumFractionDigits: 4 })}
            />
            <Field
              label="Remaining"
              value={formatNumber(receipt.remaining_amount, { maximumFractionDigits: 4 })}
            />
          </section>

          {items.length > 0 && (
            <section className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
              <table className="w-full min-w-[420px] border-collapse text-left text-xs">
                <thead className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
                  <tr className="border-b border-white/5">
                    <th className="px-3 py-2 font-medium">Variant</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit price</th>
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
                        {formatNumber(item.line_total, { maximumFractionDigits: 4 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {receipt.notes && (
            <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 text-pretty">
              {receipt.notes}
            </section>
          )}
        </article>
      )}
    </Modal>
  );
}
