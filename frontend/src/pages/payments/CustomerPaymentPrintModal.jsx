import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import { api } from '@/api/index.js';
import { downloadBlob } from '@/lib/csvExport.js';
import { getErrorMessage } from '@/lib/errors.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal
} from '@/components/ui/index.js';

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

function mergePayment(listRow, printedRow) {
  if (!listRow && !printedRow) return null;
  if (!listRow) return printedRow;
  if (!printedRow) return listRow;
  return { ...listRow, ...printedRow };
}

export function CustomerPaymentPrintModal({ open, onClose, payment: paymentRow }) {
  const paymentId = paymentRow?.id;

  const dataQuery = useQuery({
    queryKey: ['payments', 'customer-payment-print', paymentId],
    queryFn: () => api.payments.customerPayments.print(paymentId),
    enabled: Boolean(open && paymentId)
  });

  const pdfMutation = useMutation({
    mutationFn: () => api.payments.customerPayments.printPdf(paymentId),
    onSuccess: (response) => {
      const blob = response instanceof Blob ? response : response?.data;
      const filename = `customer-payment-${paymentId}.pdf`;
      if (!downloadBlob(blob, filename)) {
        toast.error('Could not save payment PDF.');
        return;
      }
      toast.success('Payment PDF downloaded');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not download payment PDF.'))
  });

  const printed = dataQuery.data?.data?.customer_payment;
  const payment = mergePayment(paymentRow, printed);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Customer payment"
      description="Review the payment, then download its PDF receipt."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button
            leftIcon={Download}
            onClick={() => pdfMutation.mutate()}
            isLoading={pdfMutation.isPending}
          >
            Download PDF
          </Button>
        </>
      }
    >
      {dataQuery.isPending ? (
        <LoadingState label="Loading payment..." />
      ) : dataQuery.isError ? (
        <ErrorState
          title="Could not load payment"
          description={getErrorMessage(dataQuery.error)}
          onRetry={() => dataQuery.refetch()}
        />
      ) : !payment ? (
        <EmptyState title="Payment not found" />
      ) : (
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm shadow-inner shadow-black/20">
          <header className="border-b border-white/10 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-400">
              Payment
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-ink-50">
              {payment.payment_number || `Payment #${payment.id}`}
            </h3>
            <p className="mt-1 text-xs text-ink-400">
              {payment.payment_date ? `Recorded ${formatDate(payment.payment_date)}` : ''}
            </p>
          </header>

          <section className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Customer" value={payment.customer_name || (payment.customer_id ? `#${payment.customer_id}` : null)} />
            <Field label="Amount" value={formatNumber(payment.amount, { maximumFractionDigits: 4 })} />
            <Field label="Method" value={payment.payment_method} />
            <Field label="Reference" value={payment.reference_number} />
            <Field label="Cash account" value={payment.cash_account_name || (payment.cash_account_id ? `#${payment.cash_account_id}` : null)} />
            <Field label="Collected by" value={payment.collected_by_salesman_name} />
          </section>

          {payment.notes && (
            <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 text-pretty">
              {payment.notes}
            </section>
          )}
        </article>
      )}
    </Modal>
  );
}
