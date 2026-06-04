import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import {
  Badge,
  Button,
  DataTable,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import { useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import { useSuppliersOptions } from './usePurchasesOptions.js';
import {
  PURCHASES_PERMISSIONS,
  PURCHASE_ORDER_STATUSES,
  PURCHASE_ORDER_STATUS_FILTER_OPTIONS,
  getStatusTone
} from './purchases.config.js';
import { PurchaseOrderFormModal } from './PurchaseOrderFormModal.jsx';
import { PurchaseOrderDrawer } from './PurchaseOrderDrawer.jsx';

const INVENTORY_VIEW = 'inventory.view';

function StatusBadge({ status }) {
  const tone = getStatusTone(status);
  const label =
    PURCHASE_ORDER_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

export default function PurchaseOrdersTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(PURCHASES_PERMISSIONS.create);
  const canViewInventory = hasPermission(INVENTORY_VIEW);

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [creating, setCreating] = useState(false);
  const [openOrderId, setOpenOrderId] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (supplierId) params.supplier_id = supplierId;
    if (warehouseId) params.warehouse_id = warehouseId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [debouncedSearch, status, supplierId, warehouseId, dateFrom, dateTo, page, limit]);

  const listQuery = useQuery({
    queryKey: ['purchases', 'orders', queryParams],
    queryFn: () => api.purchases.purchaseOrders.list(queryParams)
  });

  const suppliersQuery = useSuppliersOptions(true);
  const warehousesQuery = useWarehousesOptions(canViewInventory);

  const suppliers = suppliersQuery.data?.data?.suppliers || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];

  const rows = listQuery.data?.data?.purchase_orders || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'po_number',
        header: 'PO',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.po_number}</p>
            <p className="truncate text-xs text-ink-400">
              Created {formatDate(row.created_at)}
            </p>
          </div>
        )
      },
      {
        id: 'supplier_name',
        header: 'Supplier',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.supplier_name || '-'}</span>
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
        id: 'order_date',
        header: 'Order date',
        cell: (row) => <span className="text-sm text-ink-200">{formatDate(row.order_date)}</span>
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
        id: 'amount_paid',
        header: 'Paid',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {formatNumber(row.amount_paid, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <Button variant="secondary" size="sm" onClick={() => setOpenOrderId(row.id)}>
            View
          </Button>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>
          New purchase order
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          containerClassName="xl:col-span-2"
          leftIcon={Search}
          placeholder="Search by PO number or supplier"
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
          {PURCHASE_ORDER_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          value={supplierId}
          onChange={(event) => {
            setSupplierId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All suppliers</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </Select>
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
          {canViewInventory ? (
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
            description="Numeric only. inventory.view is needed for a warehouse picker."
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
          title: 'No purchase orders match the filters',
          description: canCreate
            ? 'Adjust your filters or create a new purchase order.'
            : 'Adjust your filters to find existing orders.'
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

      <PurchaseOrderFormModal open={creating} onClose={() => setCreating(false)} />
      <PurchaseOrderDrawer
        open={Boolean(openOrderId)}
        onClose={() => setOpenOrderId(null)}
        purchaseOrderId={openOrderId}
      />
    </div>
  );
}
