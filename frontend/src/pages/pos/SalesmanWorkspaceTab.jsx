import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CircleDollarSign, ClipboardList, PackageCheck, Route } from 'lucide-react';
import { api } from '@/api/index.js';
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters.js';
import { Badge, Button, EmptyState, GlassPanel, GlassPanelBody, GlassPanelHeader } from '@/components/ui/index.js';

function Metric({ icon: Icon, label, value, description }) {
  return (
    <GlassPanel>
      <GlassPanelBody className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-brand-500/10 text-brand-200">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
          <p className="mt-1 font-display text-xl font-semibold text-ink-50">{value}</p>
          {description && <p className="mt-1 text-xs text-ink-400">{description}</p>}
        </div>
      </GlassPanelBody>
    </GlassPanel>
  );
}

function humanizeStatus(status) {
  if (!status) return 'Not submitted';
  return String(status)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function workflowTone(status) {
  const value = String(status || '').toLowerCase();
  if (['completed', 'paid', 'posted', 'converted'].includes(value)) return 'success';
  if (['cancelled', 'rejected', 'written_off'].includes(value)) return 'neutral';
  if (['draft', 'pending', 'pending_approval', 'open', 'partially_settled', 'partially_paid'].includes(value)) return 'warn';
  return 'info';
}

function StatusBadge({ status, fallback }) {
  return <Badge tone={workflowTone(status)}>{status ? humanizeStatus(status) : fallback}</Badge>;
}

function Amount({ value, className = '' }) {
  return <span className={`font-mono text-sm ${className}`}>{formatCurrency(value || 0)}</span>;
}

function EmptySection({ title, description }) {
  return <EmptyState icon={Route} title={title} description={description} className="border-0 bg-transparent py-8" />;
}

/**
 * The workspace is intentionally server-backed: its revenue, settlement,
 * debt, commission, and target figures are authoritative operational data,
 * rather than browser-side estimates.
 */
export function SalesmanWorkspaceTab({ initialSalesmanId = '' }) {
  const [selectedSalesmanId, setSelectedSalesmanId] = useState(() => String(initialSalesmanId || ''));
  const navigate = useNavigate();
  useEffect(() => {
    setSelectedSalesmanId(String(initialSalesmanId || ''));
  }, [initialSalesmanId]);
  const workspaceQuery = useQuery({
    queryKey: ['pos', 'workspace', selectedSalesmanId || 'self'],
    queryFn: () => api.pos.workspace.get({
      limit: 20,
      ...(selectedSalesmanId ? { salesman_id: Number(selectedSalesmanId) } : {})
    }),
    staleTime: 30_000
  });
  const workspace = workspaceQuery.data?.data?.workspace;
  const metrics = workspace?.metrics || {};
  const orders = [];
  const dispatches = workspace?.recent_dispatches || [];
  const debts = workspace?.recent_debts || [];
  const commissions = workspace?.recent_commissions || [];
  const targets = workspace?.target_progress || [];
  const territories = workspace?.territories || [];
  const availableSalesmen = workspace?.available_salesmen || [];

  if (workspaceQuery.isPending) {
    return <p className="py-12 text-center text-sm text-ink-400">Loading your salesman workspace...</p>;
  }

  if (workspaceQuery.isError) {
    return (
      <p className="rounded-lg border border-rose-400/25 bg-rose-400/10 p-4 text-sm text-rose-100">
        Your salesman workspace could not be loaded. Try again shortly or ask an administrator to confirm your salesman link.
      </p>
    );
  }

  if (workspace?.selection_required) {
    return (
      <GlassPanel>
        <GlassPanelBody className="space-y-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink-50">Choose a salesman workspace</h2>
            <p className="mt-1 text-sm text-ink-300">Select a salesman to review their orders, deliveries, settlements, debts, and targets.</p>
          </div>
          <label className="block max-w-md text-sm font-medium text-ink-200" htmlFor="workspace-salesman">
            Salesman
            <select
              id="workspace-salesman"
              className="mt-1 w-full rounded-lg border border-white/15 bg-ink-950 px-3 py-2 text-ink-50"
              value={selectedSalesmanId}
              onChange={(event) => setSelectedSalesmanId(event.target.value)}
            >
              <option value="">Select a salesman</option>
              {availableSalesmen.map((salesman) => (
                <option key={salesman.id} value={salesman.id}>
                  {salesman.full_name}{salesman.code ? ` (${salesman.code})` : ''}
                </option>
              ))}
            </select>
          </label>
        </GlassPanelBody>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="max-w-3xl text-sm text-ink-300">
            Revenue, delivery, closeout, debt, and commission figures come directly from the assigned order and delivery workflow.
          </p>
          {workspace?.salesman?.full_name && (
            <p className="mt-2 text-xs text-ink-400">
              Signed-in salesman: <span className="font-medium text-ink-200">{workspace.salesman.full_name}</span>
              {workspace.salesman.code ? ` (${workspace.salesman.code})` : ''}
            </p>
          )}
        </div>
        <Badge tone="info">{formatNumber(metrics.dispatch_count || 0)} dispatches in scope</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric icon={CircleDollarSign} label="Dispatched revenue" value={formatCurrency(metrics.dispatched_revenue || 0)} description="Dispatched, partially settled, and completed work" />
        <Metric icon={PackageCheck} label="Open deliveries" value={formatNumber(metrics.active_delivery_count || 0)} description="Dispatched work still in delivery or settlement" />
        <Metric icon={ClipboardList} label="Open orders" value={formatNumber(metrics.pending_dispatch_count || 0)} description="Draft, approval, and release-stage orders" />
        <Metric icon={Route} label="Closeouts submitted" value={formatNumber(metrics.submitted_closeout_count || 0)} description="Waiting for an authorized settlement posting" />
        <Metric icon={CircleDollarSign} label="Customer debt open" value={formatCurrency(metrics.open_balance_debt || 0)} description={`${formatNumber(metrics.open_balance_count || 0)} open salesman balance record(s)`} />
        <Metric icon={BarChart3} label="Commission pending" value={formatCurrency(metrics.pending_commission || 0)} description={`${formatCurrency(metrics.paid_commission || 0)} paid to date`} />
      </div>

      <GlassPanel>
        <GlassPanelHeader
          icon={PackageCheck}
          title="Deliveries, returns, and settlement closeout"
          subtitle="Each dispatch keeps its own delivery and latest settlement state."
        />
        <GlassPanelBody>
          {dispatches.length ? (
            <div className="space-y-2">
              {dispatches.map((dispatch) => (
                <article key={dispatch.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium text-ink-100">{dispatch.dispatch_number}</p>
                      <p className="mt-1 text-xs text-ink-400">
                        {dispatch.warehouse_name || 'Warehouse'} · {formatNumber(dispatch.customer_count || 0)} customer(s) · {formatDate(dispatch.dispatched_at || dispatch.request_date)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <StatusBadge status={dispatch.status} />
                      <StatusBadge status={dispatch.settlement_status} fallback="Closeout not submitted" />
                      <Amount value={dispatch.total_amount} className="text-ink-100" />
                      {['delivery', 'partially_settled'].includes(dispatch.status) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate('/dispatch/requests')}
                        >
                          Delivery workflow
                        </Button>
                      )}
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-ink-500">Collected in closeout</dt>
                      <dd className="mt-0.5 text-ink-200"><Amount value={dispatch.settlement_collected} /></dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Debt recorded</dt>
                      <dd className="mt-0.5 text-ink-200"><Amount value={dispatch.settlement_debt} /></dd>
                    </div>
                    <div>
                      <dt className="text-ink-500">Returned quantity</dt>
                      <dd className="mt-0.5 font-mono text-sm text-ink-200">{formatNumber(dispatch.returned_quantity || 0, { maximumFractionDigits: 3 })}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <EmptySection title="No dispatches in this period" description="Your dispatched deliveries and their closeout state will appear here." />
          )}
        </GlassPanelBody>
      </GlassPanel>

      <div className="grid gap-5 xl:grid-cols-2">
        <GlassPanel>
          <GlassPanelHeader
            icon={CircleDollarSign}
            title="Customer debts and payment status"
            subtitle={`Collected in completed settlements: ${formatCurrency(metrics.settled_collections || 0)}`}
          />
          <GlassPanelBody>
            {debts.length ? (
              <div className="space-y-2">
                {debts.map((debt) => (
                  <article key={debt.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink-100">{debt.customer_name || debt.debt_number}</p>
                        <p className="mt-1 text-xs text-ink-400">
                          {debt.debt_number || 'Debt record'}{debt.dispatch_number ? ` · ${debt.dispatch_number}` : ''} · {formatDate(debt.debt_date)}
                        </p>
                      </div>
                      <StatusBadge status={debt.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-400">
                      <span>Original <Amount value={debt.original_amount} className="text-ink-200" /></span>
                      <span>Paid <Amount value={debt.paid_amount} className="text-ink-200" /></span>
                      <span>Remaining <Amount value={debt.remaining_amount} className="text-ink-100" /></span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptySection title="No customer debt records" description="Debt created from your settled deliveries will appear here with its payment status." />
            )}
          </GlassPanelBody>
        </GlassPanel>

        <GlassPanel>
          <GlassPanelHeader
            icon={BarChart3}
            title="Commissions"
            subtitle="Calculated and paid commission records for your assigned territories."
          />
          <GlassPanelBody>
            {commissions.length ? (
              <div className="space-y-2">
                {commissions.map((commission) => {
                  const outstanding = Math.max(Number(commission.total_commission || 0) - Number(commission.paid_amount || 0), 0);
                  return (
                    <article key={commission.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink-100">{commission.sublocation_name || 'Assigned territory'}</p>
                          <p className="mt-1 text-xs text-ink-400">{formatDate(commission.period_start)} – {formatDate(commission.period_end)}</p>
                        </div>
                        <StatusBadge status={commission.status} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-400">
                        <span>Total <Amount value={commission.total_commission} className="text-ink-100" /></span>
                        <span>Paid <Amount value={commission.paid_amount} className="text-ink-200" /></span>
                        <span>Outstanding <Amount value={outstanding} className="text-ink-200" /></span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptySection title="No commission calculations yet" description="Approved and paid commission calculations will appear here." />
            )}
          </GlassPanelBody>
        </GlassPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <GlassPanel>
          <GlassPanelHeader
            icon={BarChart3}
            title="Target progress"
            subtitle="Collected cash against each assigned target."
          />
          <GlassPanelBody>
            {targets.length ? (
              <div className="space-y-3">
                {targets.map((target) => {
                  const percentage = Math.max(0, Number(target.achievement_percentage || 0));
                  return (
                    <article key={target.salesman_target_id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink-100">{target.location_name} · {target.sublocation_name}</p>
                          <p className="mt-1 text-xs text-ink-400">{formatDate(target.period_start)} – {formatDate(target.period_end)}</p>
                        </div>
                        <Badge tone={percentage >= 100 ? 'success' : 'info'}>{formatNumber(percentage, { maximumFractionDigits: 1 })}%</Badge>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" aria-label={`${target.sublocation_name} target progress`}>
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400" style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-ink-400">
                        <Amount value={target.achieved_sales_amount} className="text-ink-100" /> of <Amount value={target.target_amount} className="text-ink-200" /> target
                      </p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptySection title="No active targets" description="Targets assigned to your territories will be shown here." />
            )}
          </GlassPanelBody>
        </GlassPanel>

        <GlassPanel>
          <GlassPanelHeader icon={Route} title="Assigned territories" subtitle="Customers and orders are assigned within these areas." />
          <GlassPanelBody>
            {territories.length ? (
              <ul className="space-y-2">
                {territories.map((territory) => (
                  <li key={territory.assignment_id || `${territory.location_id}-${territory.sublocation_id}`} className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2.5">
                    <p className="font-medium text-ink-100">{territory.location_name}</p>
                    <p className="mt-0.5 text-xs text-ink-400">{territory.sublocation_name}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptySection title="No territories assigned" description="Ask an administrator to assign your location and sublocation coverage." />
            )}
          </GlassPanelBody>
        </GlassPanel>
      </div>

      <GlassPanel className="hidden">
        <GlassPanelHeader icon={ClipboardList} title="Retired Mini POS history" />
        <GlassPanelBody>
          {orders.length ? (
            <div className="space-y-2">
              {orders.map((order) => (
                <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.025] p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink-100">{order.order_number}</p>
                    <p className="mt-1 truncate text-xs text-ink-400">{order.customer_name || 'Customer'} · {formatDate(order.order_date)}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Badge tone="neutral">Retired</Badge>
                    <Amount value={order.total_amount} className="text-ink-100" />
                    <span className="text-xs text-ink-500">Retired</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptySection title="Orders are managed centrally" description="Use Orders & deliveries to review the salesman’s draft orders and deliveries." />
          )}
        </GlassPanelBody>
      </GlassPanel>

    </div>
  );
}
