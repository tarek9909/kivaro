import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, ChevronRight, ClipboardCheck, PackageX, Send } from 'lucide-react';
import { api } from '@/api/index.js';
import { getErrorMessage } from '@/lib/errors.js';
import { formatCurrency, formatNumber } from '@/lib/formatters.js';
import { Badge, Button, EmptyState, GlassPanel, GlassPanelBody, Modal } from '@/components/ui/index.js';

function groupKey(salesmanId, warehouseId) {
  return `${salesmanId}:${warehouseId}`;
}

function displayGiftLine(line) {
  return line.catalog_display_name || line.item_name || line.packaging_group_name || 'Gift request';
}

function PendingOrderCard({ order, checked, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const gifts = (order.lines || []).filter((line) => line.line_type === 'free_gift');
  return (
    <article className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <div className="flex flex-wrap items-start gap-3">
        <label className="flex shrink-0 cursor-pointer items-center pt-1">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(order.id)}
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-400"
            aria-label={`Select ${order.order_number}`}
          />
        </label>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-ink-50">{order.order_number}</p>
            {order.availability?.available ? <Badge tone="success">Available now</Badge> : <Badge tone="warning">Stock review</Badge>}
            {gifts.length ? <Badge tone="warning">{gifts.length} gift request{gifts.length === 1 ? '' : 's'}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-ink-200">{order.customer_name}</p>
          <p className="text-xs text-ink-400">{order.location_name} · {order.sublocation_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-mono text-sm text-ink-100">{formatCurrency(order.total_amount)}</p>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Hide' : 'Lines'} {expanded ? <ChevronDown className="ml-1 h-3.5 w-3.5" /> : <ChevronRight className="ml-1 h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          {(order.lines || []).map((line) => (
            <div key={line.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-ink-200">{displayGiftLine(line)}</span>
              <span className="flex items-center gap-2">
                {line.line_type === 'free_gift' && <Badge tone="warning">Gift requested</Badge>}
                <span className="font-mono text-ink-100">{formatNumber(line.quantity, { maximumFractionDigits: 3 })}</span>
              </span>
            </div>
          ))}
          {order.availability?.shortages?.length ? (
            <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
              Shortage: {order.availability.shortages.map((entry) => entry.display_name).join(', ')}
            </p>
          ) : null}
        </div>
      )}
    </article>
  );
}

function SelectionPreparationModal({ open, onClose, selection, canApproveGifts }) {
  const queryClient = useQueryClient();
  const [giftDecisions, setGiftDecisions] = useState({});
  const ids = selection?.orderIds || [];
  const giftDecisionPayload = useMemo(
    () => Object.entries(giftDecisions).map(([pos_order_line_id, decision]) => ({
      pos_order_line_id: Number(pos_order_line_id),
      decision
    })),
    [giftDecisions]
  );

  useEffect(() => {
    if (open) setGiftDecisions({});
  }, [open, selection?.key]);

  const preparationQuery = useQuery({
    queryKey: ['pos', 'review', 'preparation', ids, giftDecisionPayload],
    queryFn: () => api.pos.review.prepareDispatch({
      pos_order_ids: ids,
      ...(giftDecisionPayload.length ? { gift_decisions: giftDecisionPayload } : {})
    }),
    enabled: open && ids.length > 0,
    retry: false
  });
  const preparation = preparationQuery.data?.data?.dispatch_preparation;
  const selectedOrders = preparation?.selected_orders || selection?.orders || [];
  const giftLines = selectedOrders.flatMap((order) => (order.selected_lines || order.lines || [])
    .filter((line) => line.line_type === 'free_gift')
    .map((line) => ({ ...line, order_number: order.order_number, customer_name: order.customer_name })));
  const decisionsComplete = !giftLines.length || giftLines.every((line) => giftDecisions[line.id]);

  const convertMutation = useMutation({
    mutationFn: () => api.dispatch.requests.createFromPos({
      pos_order_ids: ids,
      ...(giftDecisionPayload.length ? { gift_decisions: giftDecisionPayload } : {})
    }),
    onSuccess: (response) => {
      const dispatch = response?.data?.dispatch_request;
      toast.success(dispatch?.dispatch_number
        ? `Created combined dispatch ${dispatch.dispatch_number}`
        : 'Created combined dispatch draft');
      queryClient.invalidateQueries({ queryKey: ['pos', 'review'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      onClose?.();
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Selected orders could not be converted.'))
  });

  function decide(lineId, decision) {
    setGiftDecisions((current) => ({ ...current, [lineId]: decision }));
  }

  const canConvert = Boolean(preparation?.can_convert) && decisionsComplete;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Review selected POS orders"
      description="Only orders from one salesman and warehouse can become one combined dispatch. The server remains the source of truth for shortages and gift approval."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={convertMutation.isPending}>Cancel</Button>
          <Button
            leftIcon={Send}
            onClick={() => convertMutation.mutate()}
            disabled={!canConvert || preparationQuery.isPending}
            isLoading={convertMutation.isPending}
          >
            Create combined dispatch
          </Button>
        </>
      }
    >
      {preparationQuery.isPending ? (
        <p className="py-10 text-center text-sm text-ink-400">Checking selected orders against current stock…</p>
      ) : preparationQuery.isError ? (
        <p className="rounded-lg border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
          {getErrorMessage(preparationQuery.error, 'The selected orders could not be prepared. Re-open the review after resolving the issue.')}
        </p>
      ) : preparation ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Summary label="Salesman" value={preparation.salesman_name} />
            <Summary label="Warehouse" value={preparation.warehouse_name} />
            <Summary label="Orders" value={String(preparation.pos_order_ids?.length || 0)} />
          </div>

          {giftLines.length ? (
            <section className="space-y-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-4">
              <div>
                <h3 className="font-display text-sm font-semibold text-amber-50">Requested gifts require a decision</h3>
                <p className="mt-1 text-xs text-amber-100/80">Each request must be approved or removed before dispatch conversion.</p>
              </div>
              {!canApproveGifts && (
                <p className="rounded-md border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-100">
                  You can review this work, but gift approval requires the dispatch gift-approval permission.
                </p>
              )}
              {giftLines.map((line) => (
                <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/10 p-3">
                  <div>
                    <p className="font-medium text-ink-50">{displayGiftLine(line)}</p>
                    <p className="text-xs text-ink-300">{line.order_number} · {line.customer_name} · {formatNumber(line.quantity, { maximumFractionDigits: 3 })}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={giftDecisions[line.id] === 'approve' ? 'primary' : 'secondary'}
                      size="sm"
                      disabled={!canApproveGifts}
                      onClick={() => decide(line.id, 'approve')}
                    >Approve</Button>
                    <Button
                      variant={giftDecisions[line.id] === 'remove' ? 'danger' : 'secondary'}
                      size="sm"
                      disabled={!canApproveGifts}
                      onClick={() => decide(line.id, 'remove')}
                    >Remove</Button>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {preparation.shortages?.length ? (
            <section className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-4">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-rose-100"><PackageX className="h-4 w-4" /> Stock shortage blocks conversion</h3>
              <ul className="mt-2 space-y-1 text-sm text-rose-100/90">
                {preparation.shortages.map((shortage) => (
                  <li key={shortage.sale_catalog_entry_id}>{shortage.display_name} — requested {formatNumber(shortage.required_quantity, { maximumFractionDigits: 3 })}, available {formatNumber(shortage.available_quantity, { maximumFractionDigits: 3 })}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-rose-100/80">Pending orders remain actionable and do not reserve stock while the shortage is resolved.</p>
            </section>
          ) : (
            <section className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4" /> Current stock check passed</p>
              <p className="mt-1 text-xs text-emerald-100/80">Creating the draft converts the selected pending orders. Dispatch submission and document approval happen in the dispatch workspace.</p>
            </section>
          )}

          {preparation.gift_decisions_required && (
            <p className="text-sm text-amber-200">Make a decision for every requested gift to run the final availability check.</p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

export function PosManagerReviewTab({ canAccept, canApproveGifts }) {
  const [selected, setSelected] = useState(null);
  const [preparing, setPreparing] = useState(null);
  const reviewQuery = useQuery({
    queryKey: ['pos', 'review'],
    queryFn: () => api.pos.review.list({ page: 1, limit: 100 })
  });
  const salesmen = reviewQuery.data?.data?.salesmen || [];

  function toggleOrder(salesman, warehouseGroup, orderId) {
    const key = groupKey(salesman.salesman_id, warehouseGroup.warehouse_id);
    setSelected((current) => {
      const orderIds = current?.key === key ? new Set(current.orderIds) : new Set();
      if (orderIds.has(orderId)) orderIds.delete(orderId);
      else orderIds.add(orderId);
      return {
        key,
        salesmanId: salesman.salesman_id,
        salesmanName: salesman.salesman_name,
        warehouseId: warehouseGroup.warehouse_id,
        warehouseName: warehouseGroup.warehouse_name,
        orderIds: [...orderIds],
        orders: warehouseGroup.orders.filter((order) => orderIds.has(order.id))
      };
    });
  }

  function openPreparation() {
    if (!selected?.orderIds?.length) return;
    setPreparing(selected);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-ink-300">
          Pending Mini POS orders are grouped by salesman. Select orders from a single salesman and warehouse to create one combined dispatch; no stock is reserved before that conversion.
        </p>
        <Button leftIcon={ClipboardCheck} onClick={openPreparation} disabled={!canAccept || !selected?.orderIds?.length}>
          Review selected ({selected?.orderIds?.length || 0})
        </Button>
      </div>

      {reviewQuery.isPending ? (
        <GlassPanel><GlassPanelBody><p className="py-8 text-center text-sm text-ink-400">Loading pending POS work…</p></GlassPanelBody></GlassPanel>
      ) : reviewQuery.isError ? (
        <GlassPanel><GlassPanelBody><p className="rounded-lg border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">The grouped review could not be loaded. Try again.</p></GlassPanelBody></GlassPanel>
      ) : salesmen.length ? (
        <div className="space-y-4">
          {salesmen.map((salesman) => (
            <GlassPanel key={salesman.salesman_id}>
              <GlassPanelBody className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-base font-semibold text-ink-50">{salesman.salesman_name}</h3>
                    <p className="text-sm text-ink-400">{salesman.order_count} pending order{salesman.order_count === 1 ? '' : 's'}</p>
                  </div>
                  {selected?.salesmanId === salesman.salesman_id && selected.orderIds.length ? <Badge tone="info">{selected.orderIds.length} selected</Badge> : null}
                </div>

                {(salesman.warehouse_groups || []).map((warehouseGroup) => {
                  const key = groupKey(salesman.salesman_id, warehouseGroup.warehouse_id);
                  const isActiveSelection = selected?.key === key;
                  const stockState = warehouseGroup.authoritative_shortage_state;
                  return (
                    <section key={warehouseGroup.warehouse_id} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink-100">{warehouseGroup.warehouse_name}</p>
                          <p className="text-xs text-ink-400">{warehouseGroup.orders?.length || 0} order{warehouseGroup.orders?.length === 1 ? '' : 's'}</p>
                        </div>
                        {stockState?.available ? <Badge tone="success">Group stock available</Badge> : <Badge tone="warning">Group has shortages</Badge>}
                      </div>
                      <div className="space-y-2">
                        {(warehouseGroup.orders || []).map((order) => (
                          <PendingOrderCard
                            key={order.id}
                            order={order}
                            checked={isActiveSelection && selected.orderIds.includes(order.id)}
                            onToggle={(orderId) => toggleOrder(salesman, warehouseGroup, orderId)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </GlassPanelBody>
            </GlassPanel>
          ))}
        </div>
      ) : (
        <GlassPanel><GlassPanelBody><EmptyState icon={ClipboardCheck} title="No pending POS orders" description="New salesman orders will appear here for grouped review." /></GlassPanelBody></GlassPanel>
      )}

      {!canAccept && (
        <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">
          You can review the queue, but accepting selected orders requires the Mini POS acceptance permission.
        </p>
      )}
      <SelectionPreparationModal
        open={Boolean(preparing)}
        onClose={() => setPreparing(null)}
        selection={preparing}
        canApproveGifts={canApproveGifts}
      />
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 truncate text-sm text-ink-100">{value || '-'}</p>
    </div>
  );
}
