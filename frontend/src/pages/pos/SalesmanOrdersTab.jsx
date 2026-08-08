import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Search, ShieldAlert } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import { useSalesmenList } from '@/pages/locations/useLocationsOptions.js';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  GlassPanel,
  GlassPanelBody,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { DispatchRequestDrawer } from '@/pages/dispatch/DispatchRequestDrawer.jsx';
import { DISPATCH_STATUSES, getDispatchStatusTone } from '@/pages/dispatch/dispatch.config.js';

const ORDER_STATUS_FILTERS = [
  { value: '', label: 'All orders' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'delivery', label: 'Delivery issued' },
  { value: 'completed', label: 'Completed' }
];

function StatusBadge({ status }) {
  const entry = DISPATCH_STATUSES.find((item) => item.value === status);
  const label = status === 'delivery' ? 'Delivery issued' : entry?.label || status;
  return <Badge tone={getDispatchStatusTone(status)}>{label}</Badge>;
}

function canManageSalesmen(hasPermission) {
  return [
    'salesmen.manage',
    'pos.create_for_salesman',
    'dispatch.view',
    'dispatch.create'
  ].some((permission) => hasPermission(permission));
}

/**
 * Server-backed order history shared by the Salesmen area and Mini POS.
 * The backend replaces salesman_id with the linked salesman for ordinary
 * salesman users, so the client-side selector can never widen their scope.
 */
export function SalesmanOrdersTab({ initialSalesmanId = '' }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [selectedSalesmanId, setSelectedSalesmanId] = useState(() => String(initialSalesmanId || ''));
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openDispatchId, setOpenDispatchId] = useState(null);
  const [limit] = useState(20);
  const debouncedSearch = useDebouncedValue(search, 300);
  const canChooseSalesman = canManageSalesmen(hasPermission);

  useEffect(() => {
    setSelectedSalesmanId(String(initialSalesmanId || ''));
  }, [initialSalesmanId]);

  const salesmenQuery = useSalesmenList(canChooseSalesman);
  const salesmen = salesmenQuery.data?.data?.salesmen || [];

  const queryParams = useMemo(() => {
    const params = { page, limit, workflow_tab: 'salesman_orders' };
    if (status) params.status = status;
    if (debouncedSearch) params.search = debouncedSearch;
    if (selectedSalesmanId && canChooseSalesman) params.salesman_id = selectedSalesmanId;
    return params;
  }, [canChooseSalesman, debouncedSearch, limit, page, selectedSalesmanId, status]);

  const ordersQuery = useQuery({
    queryKey: ['pos', 'salesman-orders', queryParams],
    queryFn: () => api.dispatch.requests.list(queryParams),
    staleTime: 15_000
  });

  const rows = ordersQuery.data?.data?.dispatch_requests || [];
  const meta = ordersQuery.data?.meta || {};

  const columns = useMemo(() => [
    {
      id: 'dispatch_number',
      header: 'Order',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-50">{row.dispatch_number}</p>
          <p className="truncate text-xs text-ink-400">Created {formatDate(row.created_at)}</p>
        </div>
      )
    },
    ...(canChooseSalesman ? [{
      id: 'salesman_name',
      header: 'Salesman',
      cell: (row) => <span className="text-sm text-ink-200">{row.salesman_name || `Salesman #${row.salesman_id}`}</span>
    }] : []),
    {
      id: 'request_date',
      header: 'Order date',
      cell: (row) => <span className="text-sm text-ink-200">{formatDate(row.request_date)}</span>
    },
    {
      id: 'customer_count',
      header: 'Customers',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm text-ink-200">{formatNumber(row.customer_count || 0)}</span>
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      id: 'total_amount',
      header: 'Total',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.total_amount, { maximumFractionDigits: 4 })}</span>
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => <Button variant="secondary" size="sm" onClick={() => setOpenDispatchId(row.id)}>View</Button>
    }
  ], [canChooseSalesman]);

  const canBrowse = hasPermission('salesman_workspace.view')
    || hasPermission('pos.create_own')
    || canChooseSalesman;

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink-300">Review orders in the Mini POS workflow. Salesmen only see orders assigned to their own account.</p>
          {canChooseSalesman && <p className="mt-1 text-xs text-ink-400">Select a salesman to narrow the administrator view.</p>}
        </div>
        <Badge tone="info">{formatNumber(meta.total || rows.length)} orders</Badge>
      </div>

      {!canBrowse ? (
        <GlassPanel>
          <GlassPanelBody>
            <EmptyState icon={ShieldAlert} title="Order access is restricted" description="Ask an administrator for salesman workspace or Mini POS access." />
          </GlassPanelBody>
        </GlassPanel>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              containerClassName="md:col-span-2"
              leftIcon={Search}
              placeholder="Search by order number"
              value={search}
              onChange={(event) => updateFilter(setSearch, event.target.value)}
            />
            <Select value={status} onChange={(event) => updateFilter(setStatus, event.target.value)}>
              {ORDER_STATUS_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
            {canChooseSalesman && (
              <Select
                value={selectedSalesmanId}
                onChange={(event) => updateFilter(setSelectedSalesmanId, event.target.value)}
              >
                <option value="">All salesmen</option>
                {salesmen.map((salesman) => <option key={salesman.id} value={salesman.id}>{salesman.full_name}</option>)}
              </Select>
            )}
          </div>

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            isLoading={ordersQuery.isPending}
            isError={ordersQuery.isError}
            error={ordersQuery.error}
            onRetry={() => ordersQuery.refetch()}
            empty={{
              icon: ClipboardList,
              title: 'No orders found',
              description: 'Draft and completed orders assigned to this salesman will appear here.'
            }}
            footer={meta?.totalPages ? (
              <Pagination
                page={meta.page || page}
                totalPages={meta.totalPages || 1}
                total={meta.total}
                limit={meta.limit || limit}
                onChange={setPage}
              />
            ) : null}
          />
        </>
      )}

      {canBrowse && (
        <DispatchRequestDrawer
          open={Boolean(openDispatchId)}
          onClose={() => setOpenDispatchId(null)}
          dispatchRequestId={openDispatchId}
        />
      )}
    </div>
  );
}
