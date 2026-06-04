import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  Bell,
  Boxes,
  ChevronRight,
  Factory,
  Layers,
  MapPinned,
  PieChart,
  Receipt,
  ScrollText,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wallet
} from 'lucide-react';
import { api, ApiError } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import {
  GlassPanel,
  GlassPanelBody,
  GlassPanelHeader
} from '@/components/ui/GlassPanel.jsx';
import { PageHeader } from '@/components/ui/PageHeader.jsx';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton.jsx';
import { EmptyState, ErrorState } from '@/components/ui/StateViews.jsx';
import { formatDate, formatDateTime, formatNumber } from '@/lib/formatters.js';

const QUICK_LINKS = [
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Items, variants, warehouses, and stock balances.',
    icon: Boxes,
    to: '/inventory',
    moduleKey: 'inventory',
    anyOfPermissions: ['inventory.view', 'stock.movements', 'stock.adjust']
  },
  {
    id: 'production',
    label: 'Production',
    description: 'Production recipes and batches.',
    icon: Factory,
    to: '/production',
    moduleKey: 'production',
    anyOfPermissions: ['production.view', 'production.create', 'production.complete']
  },
  {
    id: 'purchases',
    label: 'Purchases',
    description: 'Suppliers, purchase orders, and supplier payments.',
    icon: ShoppingCart,
    to: '/purchases',
    moduleKey: 'purchases',
    anyOfPermissions: [
      'purchase_orders.view',
      'accounting.view',
      'accounting.manage'
    ]
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    description: 'Plan, approve, and settle outbound stock movements.',
    icon: Truck,
    to: '/dispatch',
    moduleKey: 'dispatch',
    anyOfPermissions: [
      'dispatch.view',
      'dispatch.create',
      'dispatch.approve',
      'dispatch.settle',
      'dispatch.print'
    ]
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Directory, history, debts, and payments per customer.',
    icon: Users,
    to: '/customers',
    moduleKey: 'customers',
    anyOfPermissions: [
      'customers.view',
      'customers.create',
      'customers.update',
      'customers.delete'
    ]
  },
  {
    id: 'locations',
    label: 'Locations',
    description: 'Areas, sublocations, salesmen, and route targets.',
    icon: MapPinned,
    to: '/locations',
    moduleKey: 'locations',
    anyOfPermissions: ['locations.manage', 'salesmen.manage', 'targets.manage']
  },
  {
    id: 'commissions',
    label: 'Commissions',
    description: 'Calculate, approve, and pay salesman commissions.',
    icon: Receipt,
    to: '/commissions',
    moduleKey: 'commissions',
    anyOfPermissions: ['commissions.manage']
  },
  {
    id: 'accounting',
    label: 'Accounting',
    description: 'Expenses, cash accounts, and financial transactions.',
    icon: Wallet,
    to: '/accounting',
    moduleKey: 'accounting',
    anyOfPermissions: ['accounting.view', 'accounting.manage']
  },
  {
    id: 'payments',
    label: 'Debts and Payments',
    description: 'Customer debts, payments, and printable receipts.',
    icon: ScrollText,
    to: '/payments',
    moduleKey: 'payments',
    anyOfPermissions: [
      'debts.manage',
      'accounting.view',
      'accounting.manage',
      'dispatch.print'
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Sales, profit and loss, debts, and operational reports.',
    icon: PieChart,
    to: '/reports',
    moduleKey: 'reports',
    anyOfPermissions: ['reports.view']
  }
];

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasModule = useAuthStore((state) => state.hasModule);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', user?.store_id],
    queryFn: () => api.dashboard.get(),
    enabled: hasPermission('dashboard.view'),
    staleTime: 60_000
  });

  const dashboard = dashboardQuery.data?.data?.dashboard;
  const summary = dashboard?.summary || {};
  const benchmarks = dashboard?.benchmarks || [];
  const activeLedgerItems = dashboard?.activity || [];
  const notifications = dashboard?.notifications || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Welcome${user?.full_name ? ',' : ''}`}
        title={user?.full_name || user?.username || 'Operator'}
        description={user?.store?.name ? `${user.store.name} operational dashboard.` : 'Your operational pulse at a glance.'}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Monthly collections" value={summary.monthly_collections} type="money" icon={TrendingUp} tone="brand" isLoading={dashboardQuery.isPending} />
        <MetricCard label="Cash balance" value={summary.cash_balance} type="money" icon={Wallet} tone="success" isLoading={dashboardQuery.isPending} />
        <MetricCard label="Open receivables" value={summary.open_receivables} type="money" icon={Receipt} tone="warn" isLoading={dashboardQuery.isPending} />
        <MetricCard label="Active dispatches" value={summary.active_dispatches} icon={Truck} tone="neutral" isLoading={dashboardQuery.isPending} />
        <MetricCard label="Active batches" value={summary.active_batches} icon={Factory} tone="neutral" isLoading={dashboardQuery.isPending} />
        <MetricCard label="Unavailable stock" value={summary.unavailable_stock_variants} icon={Boxes} tone="danger" isLoading={dashboardQuery.isPending} />
        <SecurityClearanceCard user={user} />
      </section>

      {/* Dashboard Grid Layout (Quick Navigation full-width, others in 3-column grid) */}
      <div className="space-y-4">
        {/* Quick Navigation grid */}
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
                      (allowed
                        ? 'hover:border-white/20 hover:bg-white/[0.06]'
                        : 'opacity-70')
                    }
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/30 to-accent-500/30 text-brand-100">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-display text-sm font-semibold text-ink-50">
                          {link.label}
                        </p>
                        <Badge tone={allowed ? 'brand' : 'neutral'}>
                          {allowed ? 'Available' : 'Locked'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-300 text-pretty">
                        {link.description}
                      </p>
                    </div>
                  </div>
                );
                if (allowed) {
                  return (
                    <Link
                      key={link.id}
                      to={link.to}
                      aria-label={`Open ${link.label}`}
                      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 rounded-xl"
                    >
                      {card}
                    </Link>
                  );
                }
                return (
                  <div
                    key={link.id}
                    aria-label={`${link.label} is restricted by your permissions`}
                  >
                    {card}
                  </div>
                );
              })}
            </div>
          </GlassPanelBody>
        </GlassPanel>

        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          
          <GlassPanel>
            <GlassPanelHeader
              icon={Layers}
              title="Operational Benchmarks"
              subtitle="Current month completion and target progress from backend data."
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
                    detail={item.total ? `${item.done}/${item.total}` : undefined}
                    color={['bg-brand-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-indigo-500'][index % 4]}
                  />
                ))
              )}
            </GlassPanelBody>
          </GlassPanel>

          <GlassPanel>
            <GlassPanelHeader
              icon={ScrollText}
              title="Workspace Activity"
              subtitle="Latest stock movements logged in the backend ledger."
            />
            <GlassPanelBody>
              <ActivityLedger items={activeLedgerItems} isLoading={dashboardQuery.isPending} />
            </GlassPanelBody>
          </GlassPanel>

          <GlassPanel>
            <GlassPanelHeader
              icon={Bell}
              title="Notifications"
              subtitle="Latest alerts from across the workspace."
            />
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

        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, type, icon: Icon, tone = 'neutral', isLoading }) {
  const formatted = type === 'money'
    ? formatNumber(value || 0, { style: 'currency', currency: 'USD' })
    : formatNumber(value || 0);

  return (
    <GlassPanel>
      <GlassPanelBody className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            {label}
          </p>
          <Badge tone={tone} leftIcon={Icon} className="gap-1">Live</Badge>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <p className="font-display text-2xl font-bold text-ink-50">
            {formatted}
          </p>
        )}
      </GlassPanelBody>
    </GlassPanel>
  );
}

/* User role and clearance levels card */
function SecurityClearanceCard({ user }) {
  return (
    <GlassPanel>
      <GlassPanelBody className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Security clearance
          </p>
          <Badge tone="brand" leftIcon={Award}>
            {user?.status || 'Active'}
          </Badge>
        </div>
        <div className="pt-1">
          <p className="font-display text-lg font-bold text-ink-50 truncate">
            {user?.role?.display_name || user?.role?.name || 'Operator'}
          </p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-[10px] text-ink-400 truncate">
              {user?.email || user?.username || '-'}
            </span>
            <span className="text-[10px] font-semibold text-brand-300">
              {user?.permissions?.length || 0} Perms
            </span>
          </div>
        </div>
      </GlassPanelBody>
    </GlassPanel>
  );
}



/* Distribution/Completion indicator progress bar component */
function DistributionBar({ label, percentage, detail, color }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink-200">{label}</span>
        <span className="font-semibold text-ink-50">
          {percentage}%{detail ? ` (${detail})` : ''}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/5 border border-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

/* Notifications Preview list element */
function NotificationsPreview({ items, isLoading, isError, onRetry, canView }) {
  if (!canView) {
    return (
      <EmptyState
        title="Notifications hidden"
        description="Your role does not include the dashboard.view permission yet."
        icon={Bell}
      />
    );
  }

  if (isLoading) return <SkeletonText lines={4} />;
  if (isError) {
    return (
      <ErrorState
        title="Could not load notifications"
        description="Try again in a moment."
        onRetry={onRetry}
      />
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <EmptyState
        title="You're all caught up"
        description="There are no notifications waiting for you."
        icon={Bell}
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2">
      {items.slice(0, 5).map((item, index) => (
        <li
          key={item.id ?? index}
          className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5"
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink-50">
              {item.title || item.subject || 'Notification'}
            </p>
            <p className="line-clamp-2 text-[11px] text-ink-300 mt-0.5">
              {item.message || item.body || ''}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* Beautiful Interactive Operational Activity Ledger */
function ActivityLedger({ items = [], isLoading }) {
  if (isLoading) return <SkeletonText lines={5} />;
  if (!items.length) {
    return (
      <EmptyState
        title="No activity yet"
        description="Stock movements will appear here as the workspace operates."
        icon={ScrollText}
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2.5">
      {items.map((item) => (
        <li
          key={item.id}
          className="group flex flex-col gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-3 hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <Badge tone="neutral" className="text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider">
              {item.tag}
            </Badge>
            <span className="text-[10px] text-ink-400 font-medium truncate max-w-[50%]">{formatDateTime(item.created_at)}</span>
          </div>
          <p className="text-xs font-semibold text-ink-100 leading-relaxed">{item.title}</p>
          <p className="text-xs text-ink-300 leading-relaxed">{item.description}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-ink-400 font-mono">{item.reference}</span>
            <span className="text-[10px] text-brand-300 font-semibold inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              Verify ledger <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
