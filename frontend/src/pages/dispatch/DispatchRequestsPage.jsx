import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, ShieldAlert, Truck , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
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
import { formatDate, formatNumber } from '@/lib/formatters.js';
import { useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import { useSalesmenList } from '@/pages/locations/useLocationsOptions.js';
import { LOCATIONS_PERMISSIONS } from '@/pages/locations/locations.config.js';
import {
  DISPATCH_PARENT_PERMISSIONS,
  DISPATCH_PERMISSIONS,
  DISPATCH_STATUSES,
  DISPATCH_STATUS_FILTER_OPTIONS,
  getDispatchStatusTone
} from './dispatch.config.js';
import { DispatchRequestFormModal } from './DispatchRequestFormModal.jsx';
import { DispatchRequestDrawer } from './DispatchRequestDrawer.jsx';

const INVENTORY_VIEW = 'inventory.view';

function StatusBadge({ status }) {
  const tone = getDispatchStatusTone(status);
  const label =
    DISPATCH_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

export default function DispatchRequestsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canBrowse = DISPATCH_PARENT_PERMISSIONS.some((permission) => hasPermission(permission));
  const canCreate = hasPermission(DISPATCH_PERMISSIONS.create);
  const canPickInventory = hasPermission(INVENTORY_VIEW);
  const canPickSalesmen = hasPermission(LOCATIONS_PERMISSIONS.salesmen);

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [openDispatchId, setOpenDispatchId] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (salesmanId) params.salesman_id = salesmanId;
    if (warehouseId) params.warehouse_id = warehouseId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [debouncedSearch, status, salesmanId, warehouseId, dateFrom, dateTo, page, limit]);

  const listQuery = useQuery({
    queryKey: ['dispatch', 'requests', queryParams],
    queryFn: () => api.dispatch.requests.list(queryParams),
    enabled: canBrowse
  });

  const salesmenQuery = useSalesmenList(canBrowse && canPickSalesmen);
  const warehousesQuery = useWarehousesOptions(canBrowse && canPickInventory);

  const salesmen = salesmenQuery.data?.data?.salesmen || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];

  const rows = listQuery.data?.data?.dispatch_requests || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'dispatch_number',
        header: 'Dispatch',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.dispatch_number}</p>
            <p className="truncate text-xs text-ink-400">
              Created {formatDate(row.created_at)}
            </p>
          </div>
        )
      },
      {
        id: 'salesman_name',
        header: 'Salesman',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.salesman_name || '-'}</span>
        )
      },
      {
        id: 'warehouse_name',
        header: 'Warehouse',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.warehouse_name || '-'}</span>
        )
      },
      {
        id: 'request_date',
        header: 'Request date',
        cell: (row) => (
          <span className="text-sm text-ink-200">{formatDate(row.request_date)}</span>
        )
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
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.total_amount, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'total_collected',
        header: 'Collected',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {formatNumber(row.total_collected, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <Button variant="secondary" size="sm" onClick={() => setOpenDispatchId(row.id)}>
            View
          </Button>
        )
      }
    ],
    []
  );

  const restrictedDescription = (() => {
    if (canCreate) {
      return 'Use New dispatch above to plan a route.';
    }
    return 'Ask an administrator for a dispatch workflow permission to browse dispatch requests.';
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>
          New dispatch
        </Button>
      </div>

      {!canBrowse ? (
        <GlassPanel>
          <GlassPanelBody>
            <EmptyState
              icon={ShieldAlert}
              title="Dispatch browsing is restricted"
              description={restrictedDescription}
            />
          </GlassPanelBody>
        </GlassPanel>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input
              containerClassName="xl:col-span-2"
              leftIcon={Search}
              placeholder="Search by dispatch number"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              {DISPATCH_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {canPickSalesmen ? (
              <Select
                value={salesmanId}
                onChange={(event) => {
                  setSalesmanId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All salesmen</option>
                {salesmen.map((salesman) => (
                  <option key={salesman.id} value={salesman.id}>
                    {salesman.full_name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Salesman ID"
                type="number"
                min="1"
                value={salesmanId}
                onChange={(event) => {
                  setSalesmanId(event.target.value);
                  setPage(1);
                }}
                description="Numeric only."
              />
            )}
          </div>

          <div className="flex justify-end">
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          leftIcon={SlidersHorizontal}
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0 sm:w-auto w-full"
        >
          {showFilters ? 'Hide Filters' : 'Filters'}
        </Button>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          showFilters
            ? 'max-h-[1000px] opacity-100 p-4 mt-3 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-sm overflow-visible'
            : 'max-h-0 opacity-0 p-0 border-transparent overflow-hidden'
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {canPickInventory ? (
              <Select
                value={warehouseId}
                onChange={(event) => {
                  setWarehouseId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All warehouses</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Warehouse ID"
                type="number"
                min="1"
                value={warehouseId}
                onChange={(event) => {
                  setWarehouseId(event.target.value);
                  setPage(1);
                }}
                description="Numeric only."
              />
            )}
            <Input
              label="From"
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
            <Input
              label="To"
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
        </div>
      </div>

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            isLoading={listQuery.isPending}
            isError={listQuery.isError}
            error={listQuery.error}
            onRetry={() => listQuery.refetch()}
            empty={{
              icon: Truck,
              title: 'No dispatch requests match the filters',
              description: canCreate
                ? 'Adjust your filters or create a new dispatch request.'
                : 'Adjust your filters to find existing dispatch requests.'
            }}
            footer={
              meta?.totalPages ? (
                <Pagination
                  page={meta.page || page}
                  totalPages={meta.totalPages || 1}
                  total={meta.total}
                  limit={meta.limit || limit}
                  onChange={(nextPage) => setPage(nextPage)}
                />
              ) : null
            }
          />
        </>
      )}

      <DispatchRequestFormModal open={creating} onClose={() => setCreating(false)} />
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
