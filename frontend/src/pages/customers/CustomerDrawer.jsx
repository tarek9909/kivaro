import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  LoadingState,
  Pagination
} from '@/components/ui/index.js';
import { formatDate, formatDateTime, formatNumber } from '@/lib/formatters.js';
import {
  CUSTOMER_STATUSES,
  getCustomerStatusTone
} from './customers.config.js';
import { cn } from '@/lib/cn.js';

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'debts', label: 'Debts' },
  { id: 'payments', label: 'Payments' }
];

function StatusBadge({ status }) {
  const tone = getCustomerStatusTone(status);
  const label =
    CUSTOMER_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span className="break-words text-sm text-ink-100">{value || '-'}</span>
    </div>
  );
}

function HistoryList({ items, getKey, render, isPending, isError, error, onRetry, emptyTitle, emptyDescription, footer }) {
  if (isPending) return <LoadingState label="Loading..." />;
  if (isError) {
    return (
      <ErrorState
        title="Could not load history"
        description={getErrorMessage(error)}
        onRetry={onRetry}
      />
    );
  }
  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <>
      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
        {items.map((item) => (
          <li
            key={getKey(item)}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm"
          >
            {render(item)}
          </li>
        ))}
      </ul>
      {footer}
    </>
  );
}

function ReceiptsTab({ customerId }) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryParams = useMemo(() => ({ page, limit }), [page]);
  const query = useQuery({
    queryKey: ['customers', 'receipts', customerId, queryParams],
    queryFn: () => api.customers.receipts(customerId, queryParams),
    enabled: Boolean(customerId)
  });
  const items = query.data?.data?.customer_receipts || [];
  const meta = query.data?.meta || {};
  return (
    <HistoryList
      items={items}
      getKey={(item) => item.id}
      isPending={query.isPending}
      isError={query.isError}
      error={query.error}
      onRetry={() => query.refetch()}
      emptyTitle="No receipts yet"
      emptyDescription="Receipts appear here after customer dispatches are settled."
      render={(item) => (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">
              {item.receipt_number || `Receipt #${item.id}`}
            </p>
            <p className="truncate text-xs text-ink-400">
              {formatDateTime(item.created_at || item.receipt_date)}
            </p>
          </div>
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(item.total_amount ?? item.amount, { maximumFractionDigits: 4 })}
          </span>
        </div>
      )}
      footer={
        meta?.totalPages ? (
          <Pagination
            page={meta.page || page}
            totalPages={meta.totalPages || 1}
            total={meta.total}
            limit={meta.limit || limit}
            onChange={setPage}
          />
        ) : null
      }
    />
  );
}

function DebtsTab({ customerId }) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryParams = useMemo(() => ({ page, limit }), [page]);
  const query = useQuery({
    queryKey: ['customers', 'debts', customerId, queryParams],
    queryFn: () => api.customers.debts(customerId, queryParams),
    enabled: Boolean(customerId)
  });
  const items = query.data?.data?.customer_debts || [];
  const meta = query.data?.meta || {};
  return (
    <HistoryList
      items={items}
      getKey={(item) => item.id}
      isPending={query.isPending}
      isError={query.isError}
      error={query.error}
      onRetry={() => query.refetch()}
      emptyTitle="No debts on record"
      emptyDescription="Outstanding debts will appear here as dispatches go on credit."
      render={(item) => (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">
              {item.debt_number || `Debt #${item.id}`}
            </p>
            <p className="truncate text-xs text-ink-400">
              {formatDate(item.due_date || item.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-ink-100">
              {formatNumber(item.balance_amount ?? item.amount, {
                maximumFractionDigits: 4
              })}
            </span>
            {item.status ? <Badge tone="neutral">{item.status}</Badge> : null}
          </div>
        </div>
      )}
      footer={
        meta?.totalPages ? (
          <Pagination
            page={meta.page || page}
            totalPages={meta.totalPages || 1}
            total={meta.total}
            limit={meta.limit || limit}
            onChange={setPage}
          />
        ) : null
      }
    />
  );
}

function PaymentsTab({ customerId }) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryParams = useMemo(() => ({ page, limit }), [page]);
  const query = useQuery({
    queryKey: ['customers', 'payments', customerId, queryParams],
    queryFn: () => api.customers.payments(customerId, queryParams),
    enabled: Boolean(customerId)
  });
  const items = query.data?.data?.customer_payments || [];
  const meta = query.data?.meta || {};
  return (
    <HistoryList
      items={items}
      getKey={(item) => item.id}
      isPending={query.isPending}
      isError={query.isError}
      error={query.error}
      onRetry={() => query.refetch()}
      emptyTitle="No payments yet"
      emptyDescription="Payments collected from this customer will be listed here."
      render={(item) => (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">
              {item.reference_number || `Payment #${item.id}`}
            </p>
            <p className="truncate text-xs text-ink-400">
              {formatDate(item.payment_date || item.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-ink-100">
              {formatNumber(item.amount, { maximumFractionDigits: 4 })}
            </span>
            {item.payment_method ? <Badge tone="neutral">{item.payment_method}</Badge> : null}
          </div>
        </div>
      )}
      footer={
        meta?.totalPages ? (
          <Pagination
            page={meta.page || page}
            totalPages={meta.totalPages || 1}
            total={meta.total}
            limit={meta.limit || limit}
            onChange={setPage}
          />
        ) : null
      }
    />
  );
}

function ProfileTab({ customer }) {
  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" value={customer.name} />
        <Field label="Code" value={customer.customer_code} />
        <Field label="Phone" value={customer.phone} />
        <Field label="Secondary phone" value={customer.secondary_phone} />
        <Field label="Location" value={customer.location_name} />
        <Field label="Sublocation" value={customer.sublocation_name} />
        <Field label="Salesman" value={customer.assigned_salesman_name} />
        <Field
          label="Created"
          value={customer.created_at ? formatDateTime(customer.created_at) : null}
        />
      </section>
      {(customer.address || customer.detailed_address) && (
        <section>
          <h3 className="font-display text-sm font-semibold text-ink-50">Address</h3>
          {customer.address && (
            <p className="mt-1 text-sm text-ink-200 text-pretty">{customer.address}</p>
          )}
          {customer.detailed_address && (
            <p className="mt-1 text-xs text-ink-300 text-pretty">{customer.detailed_address}</p>
          )}
        </section>
      )}
      {customer.notes && (
        <section>
          <h3 className="font-display text-sm font-semibold text-ink-50">Notes</h3>
          <p className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 text-pretty">
            {customer.notes}
          </p>
        </section>
      )}
    </div>
  );
}

export function CustomerDrawer({ open, onClose, customerId }) {
  const [activeTab, setActiveTab] = useState('profile');

  const detailQuery = useQuery({
    queryKey: ['customers', 'customer', customerId],
    queryFn: () => api.customers.get(customerId),
    enabled: Boolean(open && customerId)
  });

  const customer = detailQuery.data?.data?.customer;

  return (
    <Drawer
      open={open}
      onClose={() => {
        onClose?.();
        setActiveTab('profile');
      }}
      width="xl"
      title={customer ? customer.name : 'Customer'}
      description={
        customer
          ? `${customer.location_name || 'Location'} - ${customer.sublocation_name || 'Sublocation'}`
          : undefined
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detailQuery.isPending ? (
        <LoadingState label="Loading customer..." />
      ) : detailQuery.isError ? (
        <ErrorState
          title="Could not load customer"
          description={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      ) : !customer ? (
        <EmptyState title="Customer not found" />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={customer.status} />
            {customer.customer_code ? (
              <Badge tone="info">{customer.customer_code}</Badge>
            ) : null}
          </div>

          <nav
            aria-label="Customer detail tabs"
            className="rounded-xl border border-white/10 bg-white/[0.03] lg:overflow-visible"
          >
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:min-w-0 lg:items-center gap-1 p-1">
              {TABS.map((tab) => (
                <li key={tab.id} className="w-full lg:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full text-center lg:w-auto rounded-lg px-3 py-1.5 text-sm font-medium transition',
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-brand-500/30 to-accent-500/15 text-ink-50 shadow-glass'
                        : 'text-ink-300 hover:bg-white/5 hover:text-ink-50'
                    )}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            {activeTab === 'profile' && <ProfileTab customer={customer} />}
            {activeTab === 'receipts' && <ReceiptsTab customerId={customer.id} />}
            {activeTab === 'debts' && <DebtsTab customerId={customer.id} />}
            {activeTab === 'payments' && <PaymentsTab customerId={customer.id} />}
          </div>
        </div>
      )}
    </Drawer>
  );
}
