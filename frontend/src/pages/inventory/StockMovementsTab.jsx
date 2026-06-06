import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Search , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatDateTime, formatNumber } from '@/lib/formatters.js';
import { MOVEMENT_TYPES, REFERENCE_TYPES, INVENTORY_PERMISSIONS } from './inventory.config.js';
import { formatStockQuantity } from './stockUnits.js';
import {
  useVariantsOptions,
  useWarehousesOptions
} from './useInventoryOptions.js';

const MOVEMENT_TYPE_OPTIONS = [{ value: '', label: 'All movement types' }, ...MOVEMENT_TYPES];
const REFERENCE_TYPE_OPTIONS = [{ value: '', label: 'All references' }, ...REFERENCE_TYPES];
const MOVEMENT_TYPE_LABELS = new Map(MOVEMENT_TYPES.map((option) => [option.value, option.label]));

export default function StockMovementsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canView = hasPermission(INVENTORY_PERMISSIONS.movements);
  // Loading the warehouse / variant option lists hits inventory.view-only
  // endpoints. We must not call them unless the user has inventory.view,
  // even if they have stock.movements.
  const canLoadInventoryOptions = hasPermission(INVENTORY_PERMISSIONS.view);

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [movementType, setMovementType] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedReferenceType = useDebouncedValue(referenceType, 300);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (warehouseId) params.warehouse_id = warehouseId;
    if (variantId) params.item_variant_id = variantId;
    if (movementType) params.movement_type = movementType;
    if (debouncedReferenceType) params.reference_type = debouncedReferenceType;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [
    debouncedSearch,
    warehouseId,
    variantId,
    movementType,
    debouncedReferenceType,
    dateFrom,
    dateTo,
    page,
    limit
  ]);

  const movementsQuery = useQuery({
    queryKey: ['inventory', 'movements', queryParams],
    queryFn: () => api.inventory.stockMovements.list(queryParams),
    enabled: canView
  });

  // These two queries hit inventory.view endpoints and stay disabled when
  // the user lacks that permission.
  const warehousesQuery = useWarehousesOptions(canView && canLoadInventoryOptions);
  const variantsQuery = useVariantsOptions(canView && canLoadInventoryOptions);

  const warehouses = warehousesQuery.data?.data?.warehouses || [];
  const variants = variantsQuery.data?.data?.item_variants || [];

  const rows = movementsQuery.data?.data?.stock_movements || [];
  const meta = movementsQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'created_at',
        header: 'When',
        cell: (row) => (
          <span className="whitespace-nowrap text-xs text-ink-200">
            {formatDateTime(row.created_at)}
          </span>
        )
      },
      {
        id: 'warehouse_name',
        header: 'Warehouse',
        cell: (row) => (
          <span className="text-sm text-ink-100">{row.warehouse_name || '-'}</span>
        )
      },
      {
        id: 'item',
        header: 'Item / Variant',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-ink-50">{row.item_name}</p>
            <p className="truncate font-mono text-xs text-ink-400">
              {row.variant_name} - {row.sku}
            </p>
          </div>
        )
      },
      {
        id: 'movement_type',
        header: 'Type',
        cell: (row) => <Badge tone="brand">{MOVEMENT_TYPE_LABELS.get(row.movement_type) || row.movement_type}</Badge>
      },
      {
        id: 'quantity_change',
        header: 'Change',
        align: 'right',
        cell: (row) => {
          const value = Number(row.quantity_change);
          const isPositive = value >= 0;
          const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
          return (
            <span
              className={`inline-flex items-center justify-end gap-1 font-mono text-sm ${
                isPositive ? 'text-emerald-200' : 'text-rose-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {formatStockQuantity(Math.abs(value), row)}
            </span>
          );
        }
      },
      {
        id: 'quantity_after',
        header: 'On hand after',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatStockQuantity(row.quantity_after, row)}
          </span>
        )
      },
      {
        id: 'reserved_quantity_change',
        header: 'Reserved change',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatStockQuantity(row.reserved_quantity_change || 0, row)}
          </span>
        )
      },
      {
        id: 'reserved_quantity_after',
        header: 'Reserved after',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatStockQuantity(row.reserved_quantity_after || 0, row)}
          </span>
        )
      },
      {
        id: 'unit_cost',
        header: 'Unit cost',
        align: 'right',
        cell: (row) =>
          row.unit_cost === null || row.unit_cost === undefined ? (
            <span className="text-xs text-ink-400">-</span>
          ) : (
            <span className="font-mono text-sm text-ink-100">
              {formatNumber(row.unit_cost, { maximumFractionDigits: 4 })}
            </span>
          )
      },
      {
        id: 'reference',
        header: 'Reference',
        cell: (row) =>
          row.reference_type ? (
            <span className="font-mono text-xs text-ink-200">
              {row.reference_type}
              {row.reference_id ? ` #${row.reference_id}` : ''}
            </span>
          ) : (
            <span className="text-xs text-ink-400">-</span>
          )
      }
    ],
    []
  );

  if (!canView) {
    return (
      <EmptyState
        title="Permission required"
        description="Your role does not have stock.movements. Ask an administrator to grant it."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          containerClassName="xl:col-span-2"
          leftIcon={Search}
          placeholder="Search by item, variant, SKU, or reference"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        {canLoadInventoryOptions && (
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
        )}
        <Select
          value={movementType}
          onChange={(event) => {
            setMovementType(event.target.value);
            setPage(1);
          }}
        >
          {MOVEMENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Select
            value={referenceType}
            onChange={(event) => {
              setReferenceType(event.target.value);
              setPage(1);
            }}
          >
            {REFERENCE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
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
          {canLoadInventoryOptions && (
          <Select
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All variants</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.item_name} - {variant.variant_name} ({variant.sku})
              </option>
            ))}
          </Select>
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
        isLoading={movementsQuery.isPending}
        isError={movementsQuery.isError}
        error={movementsQuery.error}
        onRetry={() => movementsQuery.refetch()}
        empty={{
          title: 'No movements match the filters',
          description: 'Adjust your filters or post a stock adjustment to record an entry.'
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
    </div>
  );
}
