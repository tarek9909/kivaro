import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Warehouse as WarehouseIcon , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import {
  Badge,
  Button,
  DataTable,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';
import { formatStockQuantity } from './stockUnits.js';
import {
  useItemsOptions,
  useVariantsOptions,
  useWarehousesOptions
} from './useInventoryOptions.js';

export default function StockBalancesTab() {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [itemId, setItemId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (warehouseId) params.warehouse_id = warehouseId;
    if (itemId) params.item_id = itemId;
    if (variantId) params.item_variant_id = variantId;
    return params;
  }, [debouncedSearch, warehouseId, itemId, variantId, page, limit]);

  const balancesQuery = useQuery({
    queryKey: ['inventory', 'balances', queryParams],
    queryFn: () => api.inventory.stockBalances.list(queryParams)
  });

  const warehousesQuery = useWarehousesOptions(true);
  const itemsQuery = useItemsOptions(true);
  const variantsQuery = useVariantsOptions(true);

  const warehouses = warehousesQuery.data?.data?.warehouses || [];
  const items = itemsQuery.data?.data?.items || [];
  const variants = variantsQuery.data?.data?.item_variants || [];

  const rows = balancesQuery.data?.data?.stock_balances || [];
  const meta = balancesQuery.data?.meta || {};
  const batchSummary = meta.batch_summary || {};

  const columns = useMemo(
    () => [
      {
        id: 'warehouse_name',
        header: 'Warehouse',
        cell: (row) => (
          <span className="text-sm text-ink-100">{row.warehouse_name || '-'}</span>
        )
      },
      {
        id: 'item_name',
        header: 'Item',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.item_name}</p>
            <p className="truncate font-mono text-xs text-ink-400">{row.sku}</p>
          </div>
        )
      },
      {
        id: 'variant_name',
        header: 'Variant',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.variant_name || '-'}</span>
        )
      },
      {
        id: 'quantity_on_hand',
        header: 'On hand',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatStockQuantity(row.quantity_on_hand, row)}
          </span>
        )
      },
      {
        id: 'quantity_reserved',
        header: 'Reserved',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {formatStockQuantity(row.quantity_reserved ?? 0, row)}
          </span>
        )
      },
      {
        id: 'available',
        header: 'Available',
        align: 'right',
        cell: (row) => {
          const available =
            Number(row.quantity_on_hand || 0) - Number(row.quantity_reserved || 0);
          return (
            <span className="font-mono text-sm text-ink-100">
              {formatStockQuantity(available, row)}
            </span>
          );
        }
      },
      {
        id: 'average_cost',
        header: 'Avg cost',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.average_cost, { maximumFractionDigits: 4 })}
          </span>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase text-ink-400">Batch stock</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink-50">
            {formatNumber(batchSummary.total_batch_stock || 0, { maximumFractionDigits: 4 })} pc
          </p>
          <p className="mt-1 text-xs text-ink-400">
            {formatNumber(batchSummary.batch_count || 0, { maximumFractionDigits: 0 })} batches
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase text-ink-400">Batch allocated</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink-50">
            {formatNumber(batchSummary.total_batch_allocated || 0, { maximumFractionDigits: 4 })} pc
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase text-ink-400">Batch remaining</p>
          <p className="mt-1 font-mono text-xl font-semibold text-emerald-100">
            {formatNumber(batchSummary.total_batch_remaining || 0, { maximumFractionDigits: 4 })} pc
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase text-ink-400">Batch value</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink-50">
            {formatNumber(batchSummary.total_batch_value || 0, { maximumFractionDigits: 4 })}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            leftIcon={Search}
            placeholder="Search by item, variant, SKU, or warehouse"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
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
          <Select
            value={itemId}
            onChange={(event) => {
              setItemId(event.target.value);
              setVariantId('');
              setPage(1);
            }}
          >
            <option value="">All items</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
          {variants.length > 0 && (
            <Select
              value={variantId}
              onChange={(event) => {
                setVariantId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All variants</option>
              {variants
                .filter((variant) => !itemId || String(variant.item_id) === String(itemId))
                .map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.item_name} - {variant.variant_name} ({variant.sku})
                  </option>
                ))}
            </Select>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.row_key || `${row.warehouse_id}-${row.item_variant_id}`}
        isLoading={balancesQuery.isPending}
        isError={balancesQuery.isError}
        error={balancesQuery.error}
        onRetry={() => balancesQuery.refetch()}
        empty={{
          icon: WarehouseIcon,
          title: 'No stock balances found',
          description: 'Try clearing the filters or post a stock adjustment to seed balances.'
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
