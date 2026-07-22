import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  Bell,
  Boxes,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Layers,
  MapPinned,
  Package,
  PieChart,
  Receipt,
  ScrollText,
  ShoppingBasket,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  Wallet
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { api, ApiError } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import {
  GlassPanel,
  GlassPanelBody,
  GlassPanelHeader
} from '@/components/ui/GlassPanel.jsx';
import { Input } from '@/components/ui/Input.jsx';
import { PageHeader } from '@/components/ui/PageHeader.jsx';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '@/components/ui/StateViews.jsx';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '@/lib/formatters.js';

const QUICK_LINKS = [
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Items, warehouses, carton stock, and canonical balances.',
    icon: Boxes,
    to: '/inventory',
    moduleKey: 'inventory',
    anyOfPermissions: ['inventory.view', 'stock.movements', 'stock.adjust']
  },
  {
    id: 'packaging',
    label: 'Packaging',
    description: 'Flat packaging templates, previews, and ready stock.',
    icon: Package,
    to: '/packaging',
    moduleKey: 'inventory.packaging',
    anyOfPermissions: ['inventory.view']
  },
  {
    id: 'mini-pos',
    label: 'Mini POS',
    description: 'Salesman orders, gift requests, and manager review.',
    icon: ShoppingBasket,
    to: '/pos',
    moduleKey: 'pos',
    anyOfPermissions: ['pos.own_orders', 'pos.review', 'pos.accept', 'salesman_workspace.view']
  },
  {
    id: 'purchases',
    label: 'Purchases',
    description: 'Suppliers, purchase orders, and incoming stock.',
    icon: ShoppingCart,
    to: '/purchases',
    moduleKey: 'purchases',
    anyOfPermissions: ['purchase_orders.view', 'accounting.view', 'accounting.manage']
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    description: 'Invoices, source reservations, delivery, and settlement.',
    icon: Truck,
    to: '/dispatch',
    moduleKey: 'dispatch',
    anyOfPermissions: ['dispatch.view', 'dispatch.create', 'dispatch.approve', 'dispatch.settle', 'dispatch.print']
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Directory, invoices, debts, payments, and receipts.',
    icon: Users,
    to: '/customers',
    moduleKey: 'customers',
    anyOfPermissions: ['customers.view', 'customers.create', 'customers.update', 'customers.delete']
  },
  {
    id: 'locations',
    label: 'Locations',
    description: 'Areas, territories, salesmen, and route targets.',
    icon: MapPinned,
    to: '/locations',
    moduleKey: 'locations',
    anyOfPermissions: ['locations.manage', 'salesmen.manage', 'targets.manage']
  },
  {
    id: 'accounting',
    label: 'Accounting',
    description: 'Cash accounts, expenses, collections, and financial entries.',
    icon: Wallet,
    to: '/accounting',
    moduleKey: 'accounting',
    anyOfPermissions: ['accounting.view', 'accounting.manage']
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Inventory, ready stock, invoices, gifts, Mini POS, and P&L.',
    icon: PieChart,
    to: '/reports',
    moduleKey: 'reports',
    anyOfPermissions: ['reports.view']
  }
];

function dashboardParams(range) {
  return Object.fromEntries(
    Object.entries(range).filter(([, value]) => Boolean(value))
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const [dateRange, setDateRange] = useState({ date_from: '', date_to: '' });
  const params = useMemo(() => dashboardParams(dateRange), [dateRange]);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', user?.store_id, params],
    queryFn: () => api.dashboard.get(params),
    enabled: hasPermission('dashboard.view'),
    staleTime: 60_000
  });

  const dashboard = dashboardQuery.data?.data?.dashboard;
  const summary = dashboard?.summary || {};
  const financial = dashboard?.financial || {};
  const benchmarks = dashboard?.benchmarks || [];
  const activity = dashboard?.activity || [];
  const notifications = dashboard?.notifications || [];
  const pendingPosWork = dashboard?.pending_pos_work || [];
  const packagingShortages = dashboard?.packaging_shortages || [];
  const salesChart = dashboard?.sales_chart || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Welcome${user?.full_name ? ',' : ''}`}
        title={user?.full_name || user?.username || 'Operator'}
        description={user?.store?.name ? `${user.store.name} operational dashboard.` : 'Your operational pulse at a glance.'}
      />

      <DateRangeControls
        range={dateRange}
        activeRange={dashboard?.date_range}
        onChange={(key, value) => setDateRange((current) => ({ ...current, [key]: value }))}
        onReset={() => setDateRange({ date_from: '', date_to: '' })}
        isLoading={dashboardQuery.isFetching}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Collections" value={summary.collections} money icon={TrendingUp} tone="success" isLoading={dashboardQuery.isPending} />
        <MetricCard label="Open receivables" value={summary.open_receivables} money icon={Receipt} tone="warn" isLoading={dashboardQuery.isPending} />
        <MetricCard label="Raw stock value" value={summary.raw_stock_value} money icon={Boxes} tone="brand" isLoading={dashboardQuery.isPending} />
        <MetricCard label="Packaging stock value" value={summary.packaging_stock_value} money icon={Package} tone="neutral" isLoading={dashboardQuery.isPending} />
        <MetricCard label="Ready stock value" value={summary.ready_stock_value} money icon={Layers} tone="brand" isLoading={dashboardQuery.isPending} />
        <MetricCard label="Net profit" value={summary.net_profit} money icon={Number(summary.net_profit || 0) >= 0 ? TrendingUp : TrendingDown} tone={Number(summary.net_profit || 0) >= 0 ? 'success' : 'danger'} isLoading={dashboardQuery.isPending} />
        <MetricCard label="Low stock balances" value={summary.low_stock_balances} icon={CircleAlert} tone="danger" isLoading={dashboardQuery.isPending} />
        <MetricCard label="Pending Mini POS" value={summary.pending_pos_orders} icon={ClipboardList} tone="warn" isLoading={dashboardQuery.isPending} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <FinancialPulse financial={financial} isLoading={dashboardQuery.isPending} />
        <SalesAndProfitChart rows={salesChart} isLoading={dashboardQuery.isPending} />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <GlassPanel>
          <GlassPanelHeader
            icon={ClipboardList}
            title="Pending Mini POS work"
            subtitle="Grouped by salesman; these orders do not reserve stock."
          />
          <GlassPanelBody>
            <PendingPosWork rows={pendingPosWork} isLoading={dashboardQuery.isPending} />
          </GlassPanelBody>
        </GlassPanel>
        <GlassPanel>
          <GlassPanelHeader
            icon={CircleAlert}
            title="Packaging shortages"
            subtitle="Inputs currently short against saved group requirements."
          />
          <GlassPanelBody>
            <PackagingShortages rows={packagingShortages} isLoading={dashboardQuery.isPending} />
          </GlassPanelBody>
        </GlassPanel>
        <GlassPanel>
          <GlassPanelHeader
            icon={Layers}
            title="Operational benchmarks"
            subtitle="Dispatch, Mini POS, stock health, and collection progress."
          />
          <GlassPanelBody className="space-y-4">
            {dashboardQuery.isPending ? (
              <SkeletonText lines={4} />
            ) : dashboardQuery.isError ? (
              <ErrorState
                title="Could not load dashboard"
                description={dashboardQuery.error instanceof ApiError ? dashboardQuery.error.message : 'Try again in a moment.'}
                onRetry={() => dashboardQuery.refetch()}
              />
            ) : (
              benchmarks.map((item, index) => (
                <DistributionBar
                  key={item.key}
                  label={item.label}
                  percentage={item.value}
                  detail={item.total ? `${formatNumber(item.done)}/${formatNumber(item.total)}` : undefined}
                  color={['bg-brand-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-indigo-500'][index % 4]}
                />
              ))
            )}
          </GlassPanelBody>
        </GlassPanel>
      </section>

      <GlassPanel>
        <GlassPanelHeader
          icon={Activity}
          title="Quick navigation"
          subtitle="Jump straight into the modules you have access to."
        />
        <GlassPanelBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {QUICK_LINKS.filter((link) => hasModule(link.moduleKey)).map((link) => {
              const Icon = link.icon;
              const allowed = hasAnyPermission(link.anyOfPermissions);
              const card = (
                <div
                  className={
                    'group flex h-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition ' +
                    (allowed ? 'hover:border-white/20 hover:bg-white/[0.06]' : 'opacity-70')
                  }
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/30 to-accent-500/30 text-brand-100">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-sm font-semibold text-ink-50">{link.label}</p>
                      <Badge tone={allowed ? 'brand' : 'neutral'}>{allowed ? 'Available' : 'Locked'}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-300 text-pretty">{link.description}</p>
                  </div>
                </div>
              );
              return allowed ? (
                <Link
                  key={link.id}
                  to={link.to}
                  aria-label={`Open ${link.label}`}
                  className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
                >
                  {card}
                </Link>
              ) : (
                <div key={link.id} aria-label={`${link.label} is restricted by your permissions`}>{card}</div>
              );
            })}
          </div>
        </GlassPanelBody>
      </GlassPanel>

      <section className="grid gap-4 lg:grid-cols-3">
        <GlassPanel>
          <GlassPanelHeader
            icon={ScrollText}
            title="Ledger activity"
            subtitle="Latest item and ready-stock movements."
          />
          <GlassPanelBody>
            <ActivityLedger items={activity} isLoading={dashboardQuery.isPending} />
          </GlassPanelBody>
        </GlassPanel>
        <GlassPanel>
          <GlassPanelHeader icon={Bell} title="Notifications" subtitle="Latest alerts from across the workspace." />
          <GlassPanelBody>
            <NotificationsPreview
              items={notifications}
              isLoading={dashboardQuery.isPending}
              isError={dashboardQuery.isError}
              onRetry={() => dashboardQuery.refetch()}
              canView={hasPermission('dashboard.view')}
            />
          </GlassPanelBody>
        </GlassPanel>
        <SecurityClearanceCard user={user} />
      </section>
    </div>
  );
}

function DateRangeControls({ range, activeRange, onChange, onReset, isLoading }) {
  return (
    <GlassPanel>
      <GlassPanelBody className="flex flex-wrap items-end gap-3">
        <Input
          containerClassName="min-w-[180px]"
          label="From"
          type="date"
          value={range.date_from}
          onChange={(event) => onChange('date_from', event.target.value)}
        />
        <Input
          containerClassName="min-w-[180px]"
          label="To"
          type="date"
          value={range.date_to}
          onChange={(event) => onChange('date_to', event.target.value)}
        />
        <Button variant="secondary" size="sm" onClick={onReset} disabled={!range.date_from && !range.date_to}>
          Current month
        </Button>
        <span className="pb-2 text-xs text-ink-400">
          {isLoading
            ? 'Refreshing…'
            : activeRange?.date_from && activeRange?.date_to
              ? `${formatDate(activeRange.date_from)} – ${formatDate(activeRange.date_to)}`
              : 'Use a date range to refresh revenue, COGS, and collection metrics.'}
        </span>
      </GlassPanelBody>
    </GlassPanel>
  );
}

function MetricCard({ label, value, money = false, icon: Icon, tone = 'neutral', isLoading }) {
  const formatted = money ? formatCurrency(value ?? 0) : formatNumber(value ?? 0);
  return (
    <GlassPanel>
      <GlassPanelBody className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">{label}</p>
          <Badge tone={tone} leftIcon={Icon} className="gap-1">Live</Badge>
        </div>
        {isLoading ? <Skeleton className="h-8 w-32" /> : <p className="font-display text-2xl font-bold text-ink-50">{formatted}</p>}
      </GlassPanelBody>
    </GlassPanel>
  );
}

function FinancialPulse({ financial, isLoading }) {
  const cards = [
    ['Sales revenue', financial.sales_revenue, 'brand'],
    ['Sales COGS', financial.sales_cogs, 'neutral'],
    ['Gift COGS', financial.gift_cogs, 'warn'],
    ['Operating expenses', financial.operating_expenses, 'neutral'],
    ['Gross profit after gifts', financial.gross_profit_after_gifts, 'success'],
    ['Net profit', financial.net_profit, Number(financial.net_profit || 0) >= 0 ? 'success' : 'danger']
  ];
  return (
    <GlassPanel className="xl:col-span-1">
      <GlassPanelHeader icon={Wallet} title="P&L pulse" subtitle="Recognized only when stock is physically dispatched." />
      <GlassPanelBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {isLoading ? <SkeletonText lines={6} /> : cards.map(([label, value, tone]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
            <span className="text-xs text-ink-300">{label}</span>
            <Badge tone={tone}>{formatCurrency(value || 0)}</Badge>
          </div>
        ))}
      </GlassPanelBody>
    </GlassPanel>
  );
}

function SalesAndProfitChart({ rows, isLoading }) {
  const chartRows = rows.map((row) => ({
    ...row,
    label: row.chart_date ? formatDate(row.chart_date, { month: 'short', day: 'numeric' }) : '-',
    sales_revenue: Number(row.sales_revenue || 0),
    sales_cogs: Number(row.sales_cogs || 0),
    gift_cogs: Number(row.gift_cogs || 0),
    gross_profit_after_gifts: Number(row.gross_profit_after_gifts || 0)
  }));
  if (isLoading) {
    return <GlassPanel className="xl:col-span-2"><GlassPanelBody><Skeleton className="h-[330px] w-full" /></GlassPanelBody></GlassPanel>;
  }
  if (!chartRows.length) {
    return (
      <GlassPanel className="xl:col-span-2">
        <GlassPanelHeader icon={TrendingUp} title="Sales and profit trend" subtitle="Revenue and COGS appear after physical dispatch." />
        <GlassPanelBody>
          <EmptyState title="No dispatched sales in this range" description="Choose another period or dispatch stock to begin the trend." icon={TrendingUp} />
        </GlassPanelBody>
      </GlassPanel>
    );
  }
  return (
    <GlassPanel className="xl:col-span-2">
      <GlassPanelHeader icon={TrendingUp} title="Sales and profit trend" subtitle="Date-based revenue, COGS, gift cost, and profit." />
      <GlassPanelBody className="grid gap-6 xl:grid-cols-2">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} width={46} />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sales_revenue" name="Revenue" fill="#38bdf8" radius={[5, 5, 0, 0]} />
              <Bar dataKey="sales_cogs" name="Sales COGS" fill="#a78bfa" radius={[5, 5, 0, 0]} />
              <Bar dataKey="gift_cogs" name="Gift COGS" fill="#f59e0b" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} width={46} />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="gross_profit_after_gifts" name="Gross profit after gifts" stroke="#34d399" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassPanelBody>
    </GlassPanel>
  );
}

const tooltipStyle = {
  background: '#121826',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12
};

function PendingPosWork({ rows, isLoading }) {
  if (isLoading) return <SkeletonText lines={5} />;
  if (!rows.length) return <EmptyState title="No pending Mini POS work" description="Pending orders will be grouped here by salesman." icon={ClipboardList} />;
  return (
    <ul className="space-y-2.5">
      {rows.slice(0, 6).map((row) => (
        <li key={row.salesman_id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-ink-50">{row.salesman_name || `Salesman #${row.salesman_id}`}</p>
            <Badge tone="warn">{formatNumber(row.pending_order_count)} orders</Badge>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ink-300">
            <span>{formatNumber(row.pending_customer_count)} customers</span>
            <span className="text-right">{formatCurrency(row.pending_sale_total)}</span>
            <span>{formatNumber(row.requested_gift_line_count)} gift lines</span>
            <span className="text-right">{formatNumber(row.requested_gift_quantity)} gifts</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PackagingShortages({ rows, isLoading }) {
  if (isLoading) return <SkeletonText lines={5} />;
  if (!rows.length) return <EmptyState title="No packaging shortages" description="Configured inputs currently meet their saved requirements." icon={Package} />;
  return (
    <ul className="space-y-2.5">
      {rows.slice(0, 6).map((row, index) => (
        <li key={`${row.packaging_group_id}-${row.item_id}-${index}`} className="rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-ink-50">{row.item_name || 'Packaging input'}</p>
            <Badge tone="warn">Short {formatNumber(row.shortage_quantity)}</Badge>
          </div>
          <p className="mt-1 truncate text-xs text-ink-300">{row.packaging_group_name || 'Packaging group'} · {row.component_role?.replace(/_/g, ' ')}</p>
          <div className="mt-2 flex justify-between text-xs text-ink-400">
            <span>Required {formatNumber(row.required_quantity)}</span>
            <span>Available {formatNumber(row.available_quantity)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SecurityClearanceCard({ user }) {
  return (
    <GlassPanel>
      <GlassPanelBody className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">Security clearance</p>
          <Badge tone="brand" leftIcon={Award}>{user?.status || 'Active'}</Badge>
        </div>
        <div className="pt-1">
          <p className="truncate font-display text-lg font-bold text-ink-50">{user?.role?.display_name || user?.role?.name || 'Operator'}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] text-ink-400">{user?.email || user?.username || '-'}</span>
            <span className="text-[10px] font-semibold text-brand-300">{user?.permissions?.length || 0} perms</span>
          </div>
        </div>
      </GlassPanelBody>
    </GlassPanel>
  );
}

function DistributionBar({ label, percentage, detail, color }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink-200">{label}</span>
        <span className="font-semibold text-ink-50">{percentage}%{detail ? ` (${detail})` : ''}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full border border-white/5 bg-white/5">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, percentage || 0))}%` }} />
      </div>
    </div>
  );
}

function NotificationsPreview({ items, isLoading, isError, onRetry, canView }) {
  if (!canView) return <EmptyState title="Notifications hidden" description="Your role does not include dashboard access." icon={Bell} />;
  if (isLoading) return <SkeletonText lines={4} />;
  if (isError) return <ErrorState title="Could not load notifications" description="Try again in a moment." onRetry={onRetry} />;
  if (!items.length) return <EmptyState title="You're all caught up" description="There are no notifications waiting for you." icon={Bell} />;
  return (
    <ul className="grid grid-cols-1 gap-2">
      {items.slice(0, 5).map((item, index) => (
        <li key={item.id ?? index} className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink-50">{item.title || item.subject || 'Notification'}</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-300">{item.message || item.body || ''}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ActivityLedger({ items = [], isLoading }) {
  if (isLoading) return <SkeletonText lines={5} />;
  if (!items.length) return <EmptyState title="No activity yet" description="Item and ready-stock movements will appear here." icon={ScrollText} />;
  return (
    <ul className="grid grid-cols-1 gap-2.5">
      {items.slice(0, 8).map((item) => (
        <li key={`${item.source || 'stock'}-${item.id}`} className="group flex flex-col gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
          <div className="flex items-center justify-between gap-2">
            <Badge tone="neutral" className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">{item.tag}</Badge>
            <span className="max-w-[50%] truncate text-[10px] font-medium text-ink-400">{formatDateTime(item.created_at)}</span>
          </div>
          <p className="text-xs font-semibold leading-relaxed text-ink-100">{item.title}</p>
          <p className="text-xs leading-relaxed text-ink-300">{item.description}</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-[10px] text-ink-400">{item.reference}</span>
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-brand-300 opacity-0 transition-opacity group-hover:opacity-100">Ledger <ChevronRight className="h-3 w-3" /></span>
          </div>
        </li>
      ))}
    </ul>
  );
}
