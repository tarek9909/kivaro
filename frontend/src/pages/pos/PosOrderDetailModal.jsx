import { useQuery } from '@tanstack/react-query';
import { Clock3, Link2, PackageOpen } from 'lucide-react';
import { api } from '@/api/index.js';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/formatters.js';
import { Badge, EmptyState, Modal } from '@/components/ui/index.js';
import { statusLabel, statusTone } from './pos.constants.js';

function AvailabilityNotice({ availability }) {
  if (!availability) return null;
  if (availability.available) {
    return <Badge tone="success">Available when last checked</Badge>;
  }
  return <Badge tone="warning">Needs stock review</Badge>;
}

export function PosOrderDetailModal({ open, onClose, orderId }) {
  const orderQuery = useQuery({
    queryKey: ['pos', 'orders', 'detail', orderId],
    queryFn: () => api.pos.orders.get(orderId),
    enabled: open && Boolean(orderId)
  });
  const order = orderQuery.data?.data?.pos_order;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={order?.order_number || 'Mini POS order'}
      description="Order history is append-only. Pending orders do not reserve stock; availability is shown only as the server's current status."
    >
      {orderQuery.isPending ? (
        <p className="py-10 text-center text-sm text-ink-400">Loading order history…</p>
      ) : orderQuery.isError ? (
        <p className="rounded-lg border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
          The order detail could not be loaded. Try again from your order list.
        </p>
      ) : order ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Customer" value={order.customer_name} />
            <Detail label="Warehouse" value={order.warehouse_name} />
            <Detail label="Order date" value={order.order_date} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Status</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={statusTone(order.status)}>{statusLabel(order.status)}</Badge>
                <AvailabilityNotice availability={order.availability} />
              </div>
            </div>
          </div>

          {order.availability?.shortages?.length ? (
            <div className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
              <p className="font-medium">Current stock review needed</p>
              <p className="mt-1 text-xs">{order.availability.shortages.map((shortage) => shortage.display_name).join(', ')}</p>
            </div>
          ) : null}

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-ink-50"><PackageOpen className="h-4 w-4" /> Requested lines</h3>
            <div className="space-y-2">
              {order.lines?.map((line) => (
                <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-100">{line.catalog_display_name || line.item_name || 'Sale offer'}</p>
                    <p className="text-xs text-ink-400">{line.fulfillment_type?.replaceAll('_', ' ')}{line.catalog_unit_label ? ` · ${line.catalog_unit_label}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    {line.line_type === 'free_gift' && <Badge tone="warning">Gift</Badge>}
                    <span className="font-mono text-sm text-ink-100">{formatNumber(line.quantity, { maximumFractionDigits: 3 })}</span>
                    <span className="font-mono text-sm text-ink-300">{line.line_type === 'free_gift' ? 'Zero price' : formatCurrency(line.unit_price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-ink-50"><Clock3 className="h-4 w-4" /> Event history</h3>
            {order.events?.length ? (
              <ol className="space-y-2 border-l border-white/10 pl-4">
                {order.events.map((event) => (
                  <li key={event.id} className="relative text-sm text-ink-200">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-400" />
                    <p className="font-medium capitalize text-ink-100">{event.event_type?.replaceAll('_', ' ')}</p>
                    <p className="text-xs text-ink-400">{event.notes || 'Order event'} · {formatDateTime(event.created_at)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState icon={Clock3} title="No events yet" className="border-0 bg-transparent py-5" />
            )}
          </section>

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-ink-50"><Link2 className="h-4 w-4" /> Dispatch links</h3>
            {order.dispatch_links?.length ? (
              <div className="space-y-2">
                {order.dispatch_links.map((link) => (
                  <div key={link.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-sm">
                    <span className="font-mono text-ink-100">{link.dispatch_number}</span>
                    <Badge tone={link.dispatch_status === 'cancelled' ? 'neutral' : 'info'}>{link.dispatch_status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-400">This order has not been converted into a dispatch yet.</p>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 truncate text-sm text-ink-100">{value || '-'}</p>
    </div>
  );
}
