import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, PackageSearch, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/api/index.js';
import { getErrorMessage } from '@/lib/errors.js';
import { formatCurrency, formatDate } from '@/lib/formatters.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { POS_ORDER_STATUSES, statusLabel, statusTone } from './pos.constants.js';
import { PosOrderComposerModal } from './PosOrderComposerModal.jsx';
import { PosOrderDetailModal } from './PosOrderDetailModal.jsx';

const PAGE_SIZE = 20;

function StatusBadge({ status }) {
  return <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>;
}

function AvailabilityBadge({ availability }) {
  if (!availability) return <span className="text-xs text-ink-400">Not checked</span>;
  return availability.available
    ? <Badge tone="success">Available now</Badge>
    : <Badge tone="warning">Needs stock review</Badge>;
}

export function PosMyOrdersTab({
  warehouses = [],
  defaultWarehouseId,
  canRequestGifts,
  canCreateCustomers,
  onCreateCustomer
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 250);

  const params = useMemo(() => {
    const next = { page, limit: PAGE_SIZE };
    if (debouncedSearch) next.search = debouncedSearch;
    if (status) next.status = status;
    return next;
  }, [debouncedSearch, page, status]);
  const ordersQuery = useQuery({
    queryKey: ['pos', 'orders', params],
    queryFn: () => api.pos.orders.list(params)
  });
  const orders = ordersQuery.data?.data?.pos_orders || [];
  const meta = ordersQuery.data?.meta || {};

  const cancelMutation = useMutation({
    mutationFn: (order) => api.pos.orders.cancel(order.id, { notes: 'Salesman cancelled the pending order' }),
    onSuccess: () => {
      toast.success('Pending POS order cancelled');
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ['pos', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'review'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'workspace'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not cancel this POS order.'))
  });

  const columns = useMemo(() => [
    {
      id: 'order_number',
      header: 'Order',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-50">{row.order_number}</p>
          <p className="truncate text-xs text-ink-400">{formatDate(row.order_date)}</p>
        </div>
      )
    },
    {
      id: 'customer_name',
      header: 'Customer',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-100">{row.customer_name}</p>
          <p className="truncate text-xs text-ink-400">{row.sublocation_name || row.location_name || '-'}</p>
        </div>
      )
    },
    {
      id: 'warehouse_name',
      header: 'Warehouse',
      cell: (row) => <span className="text-sm text-ink-200">{row.warehouse_name || '-'}</span>
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      id: 'availability',
      header: 'Stock state',
      cell: (row) => <AvailabilityBadge availability={row.availability} />
    },
    {
      id: 'total_amount',
      header: 'Sale total',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm text-ink-100">{formatCurrency(row.total_amount)}</span>
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="sm" leftIcon={Eye} onClick={() => setViewingId(row.id)}>View</Button>
          {row.status === 'pending' && (
            <>
              <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => setEditing(row)}>Edit</Button>
              <Button variant="ghost" size="icon" leftIcon={Trash2} title="Cancel pending order" aria-label="Cancel pending order" onClick={() => setCancelTarget(row)} />
            </>
          )}
        </div>
      )
    }
  ], []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-ink-300">
          Create and adjust your own pending orders. They remain unreserved until a manager accepts them into a dispatch.
        </p>
        <Button leftIcon={Plus} onClick={() => setCreating(true)}>New POS order</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
        <Input
          leftIcon={Search}
          placeholder="Search your order, customer, or phone"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
        />
        <Select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {POS_ORDER_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={orders}
        rowKey={(row) => row.id}
        isLoading={ordersQuery.isPending}
        isError={ordersQuery.isError}
        error={ordersQuery.error}
        onRetry={() => ordersQuery.refetch()}
        empty={{
          icon: PackageSearch,
          title: 'No Mini POS orders found',
          description: 'Start a pending order when a customer is ready to buy.'
        }}
        footer={meta.totalPages ? <Pagination page={meta.page || page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit || PAGE_SIZE} onChange={setPage} /> : null}
      />

      <PosOrderComposerModal
        open={creating}
        onClose={() => setCreating(false)}
        warehouses={warehouses}
        defaultWarehouseId={defaultWarehouseId}
        canRequestGifts={canRequestGifts}
        onCreateCustomer={canCreateCustomers ? onCreateCustomer : undefined}
      />
      <PosOrderComposerModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        order={editing || undefined}
        warehouses={warehouses}
        defaultWarehouseId={defaultWarehouseId}
        canRequestGifts={canRequestGifts}
        onCreateCustomer={canCreateCustomers ? onCreateCustomer : undefined}
      />
      <PosOrderDetailModal open={Boolean(viewingId)} onClose={() => setViewingId(null)} orderId={viewingId} />
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget)}
        title="Cancel pending POS order"
        description={cancelTarget ? `Cancel ${cancelTarget.order_number}? Its event history will be retained.` : ''}
        confirmLabel="Cancel order"
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
