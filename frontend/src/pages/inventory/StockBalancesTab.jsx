import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, Warehouse as WarehouseIcon } from 'lucide-react';
import { api } from '@/api/index.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { Badge, Button, DataTable, Input, Pagination, Select } from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';
import { ITEM_KINDS, STOCK_MODE_LABELS, STOCK_MODES } from './inventory.config.js';
import { formatStockQuantity, getStockMode } from './stockUnits.js';
import { useItemsOptions, useWarehousesOptions } from './useInventoryOptions.js';

function numericValue(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return Number(value) || 0;
  }
  return 0;
}

function stockKey(row) {
  return `${row.warehouse_id}-${row.item_id}`;
}

export default function StockBalancesTab() {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [itemId, setItemId] = useState('');
  const [itemKind, setItemKind] = useState('');
  const [stockMode, setStockMode] = useState('');
  const [lowStock, setLowStock] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (warehouseId) params.warehouse_id = warehouseId;
    if (itemId) params.item_id = itemId;
    if (itemKind) params.item_kind = itemKind;
    if (stockMode) params.stock_mode = stockMode;
    if (lowStock) params.low_stock = true;
    return params;
  }, [debouncedSearch, itemId, itemKind, limit, lowStock, page, stockMode, warehouseId]);

  const balancesQuery = useQuery({
    queryKey: ['inventory', 'balances', queryParams],
    queryFn: () => api.inventory.stockBalances.list(queryParams)
  });
  const warehousesQuery = useWarehousesOptions(true);
  const itemsQuery = useItemsOptions(true);

  const rows = balancesQuery.data?.data?.stock_balances || [];
  const meta = balancesQuery.data?.meta || {};
  const warehouses = warehousesQuery.data?.data?.warehouses || [];
  const items = itemsQuery.data?.data?.items || [];
  const lowStockCount = rows.filter((row) => row.stock_health === 'low').length;
  const totalStockValue = rows.reduce((sum, row) => sum + numericValue(row.stock_value), 0);

  const columns = useMemo(
    () => [
      {
        id: 'warehouse_name',
        header: 'Warehouse',
        cell: (row) => <span className="text-sm text-ink-100">{row.warehouse_name || '-'}</span>
      },
      {
        id: 'item_name',
        header: 'Item',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.item_name}</p>
            <p className="truncate font-mono text-xs text-ink-400">{row.item_code || row.code || '-'}</p>
          </div>
        )
      },
      {
        id: 'stock_mode',
        header: 'Mode',
        cell: (row) => <span className="text-sm text-ink-200">{STOCK_MODE_LABELS[getStockMode(row)] || getStockMode(row)}</span>
      },
      {
        id: 'quantity_on_hand',
        header: 'On hand',
        align: 'right',
        cell: (row) => <span className="font-mono text-sm text-ink-100">{formatStockQuantity(row.quantity_on_hand, row)}</span>
      },
      {
        id: 'quantity_reserved',
        header: 'Reserved',
        align: 'right',
        cell: (row) => <span className="font-mono text-sm text-ink-200">{formatStockQuantity(row.quantity_reserved || 0, row)}</span>
      },
      {
        id: 'quantity_available',
        header: 'Available',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-emerald-100">
            {formatStockQuantity(row.quantity_available ?? numericValue(row.quantity_on_hand) - numericValue(row.quantity_reserved), row)}
          </span>
        )
      },
      {
        id: 'carton_state',
        header: 'Carton state',
        cell: (row) => {
          if (getStockMode(row) !== 'carton_weight') return <span className="text-xs text-ink-400">-</span>;
          const openUnits = numericValue(row.open_loose_units);
          const sealedCartons = numericValue(row.sealed_cartons);
          return <span className="text-xs text-ink-200">{formatNumber(sealedCartons, { maximumFractionDigits: 0 })} sealed · {formatNumber(openUnits, { maximumFractionDigits: 0 })} loose</span>;
        }
      },
      {
        id: 'average_cost',
        header: 'WAC',
        align: 'right',
        cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.average_cost, { maximumFractionDigits: 4 })}</span>
      },
      {
        id: 'stock_value',
        header: 'Value',
        align: 'right',
        cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.stock_value, { maximumFractionDigits: 4 })}</span>
      },
      {
        id: 'stock_health',
        header: 'Health',
        cell: (row) => {
          const health = row.stock_health || 'healthy';
          return <Badge tone={health === 'low' ? 'warn' : 'success'}>{health}</Badge>;
        }
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase text-ink-400">Balance rows</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink-50">{formatNumber(meta.total ?? rows.length, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase text-ink-400">Low stock</p>
          <p className="mt-1 font-mono text-xl font-semibold text-amber-100">{formatNumber(lowStockCount, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-xs uppercase text-ink-400">Visible stock value</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink-50">{formatNumber(totalStockValue, { maximumFractionDigits: 4 })}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input leftIcon={Search} placeholder="Search by item, code, or warehouse" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </div>
        <Button variant={showFilters ? 'primary' : 'secondary'} leftIcon={SlidersHorizontal} onClick={() => setShowFilters(!showFilters)} className="w-full shrink-0 sm:w-auto">
          {showFilters ? 'Hide filters' : 'Filters'}
        </Button>
      </div>

      <div className={`transition-all duration-300 ease-in-out ${showFilters ? 'mt-3 max-h-[1000px] overflow-visible rounded-xl border border-white/5 bg-white/[0.01] p-4 opacity-100 backdrop-blur-sm' : 'max-h-0 overflow-hidden border-transparent p-0 opacity-0'}`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Select value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setPage(1); }}>
            <option value="">All warehouses</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>
          <Select value={itemId} onChange={(event) => { setItemId(event.target.value); setPage(1); }}>
            <option value="">All items</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}
          </Select>
          <Select value={itemKind} onChange={(event) => { setItemKind(event.target.value); setPage(1); }}>
            <option value="">All item kinds</option>
            {ITEM_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
          </Select>
          <Select value={stockMode} onChange={(event) => { setStockMode(event.target.value); setPage(1); }}>
            <option value="">All stock modes</option>
            {STOCK_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
          </Select>
          <Select value={lowStock} onChange={(event) => { setLowStock(event.target.value); setPage(1); }}>
            <option value="">All health states</option>
            <option value="1">Low stock only</option>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.row_key || stockKey(row)}
        isLoading={balancesQuery.isPending}
        isError={balancesQuery.isError}
        error={balancesQuery.error}
        onRetry={() => balancesQuery.refetch()}
        empty={{
          icon: WarehouseIcon,
          title: 'No stock balances found',
          description: 'Try clearing the filters or post a stock receipt or adjustment.'
        }}
        footer={meta?.totalPages ? <Pagination page={meta.page || page} totalPages={meta.totalPages || 1} total={meta.total} limit={meta.limit || limit} onChange={setPage} /> : null}
      />
    </div>
  );
}
