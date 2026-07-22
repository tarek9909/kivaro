import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, Search } from 'lucide-react';
import { api } from '@/api/index.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { Badge, DataTable, Input, Pagination, Select } from '@/components/ui/index.js';
import { formatDateTime, formatNumber } from '@/lib/formatters.js';
import { useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import { READY_STOCK_STATUSES, statusTone } from './packaging.constants.js';

const PAGE_SIZE = 20;

export function ReadyStockTab() {
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 250);

  const params = useMemo(() => {
    const next = { page, limit: PAGE_SIZE };
    if (debouncedSearch) next.search = debouncedSearch;
    if (warehouseId) next.warehouse_id = warehouseId;
    if (groupId) next.packaging_group_id = groupId;
    if (status) next.status = status;
    return next;
  }, [debouncedSearch, groupId, page, status, warehouseId]);
  const readyQuery = useQuery({
    queryKey: ['packaging', 'ready-stock', params],
    queryFn: () => api.packaging.readyStock.list(params)
  });
  const groupsQuery = useQuery({
    queryKey: ['packaging', 'groups', 'ready-stock-options'],
    queryFn: () => api.packaging.groups.list({ page: 1, limit: 100 })
  });
  const warehousesQuery = useWarehousesOptions(true);
  const rows = readyQuery.data?.data?.ready_stock_containers || [];
  const meta = readyQuery.data?.meta || {};
  const groups = groupsQuery.data?.data?.packaging_groups || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];

  const columns = useMemo(() => [
    {
      id: 'id',
      header: 'Container',
      cell: (row) => (
        <div>
          <p className="font-mono text-sm font-medium text-ink-50">#{row.id}</p>
          <p className="text-xs text-ink-400">{row.operation_number || 'Ready stock'}</p>
        </div>
      )
    },
    {
      id: 'packaging_group_name',
      header: 'Group / warehouse',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-100">{row.packaging_group_name || '-'}</p>
          <p className="truncate text-xs text-ink-400">{row.warehouse_name || '-'}</p>
        </div>
      )
    },
    {
      id: 'outer_name_snapshot',
      header: 'Outer / inner',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm text-ink-100">{row.outer_name_snapshot}</p>
          <p className="truncate text-xs text-ink-400">{row.inner_name_snapshot}</p>
        </div>
      )
    },
    {
      id: 'remaining_inner_quantity',
      header: 'Inner bags remaining',
      align: 'right',
      cell: (row) => (
        <div className="text-right">
          <p className="font-mono text-sm text-ink-50">{formatNumber(row.remaining_inner_quantity, { maximumFractionDigits: 0 })} / {formatNumber(row.initial_inner_quantity, { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-ink-400">{formatNumber(row.remaining_ratio, { style: 'percent', maximumFractionDigits: 0 })} remaining</p>
        </div>
      )
    },
    {
      id: 'capacity_kg',
      header: 'Capacity',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.capacity_kg, { maximumFractionDigits: 4 })} kg</span>
    },
    {
      id: 'remaining_cost',
      header: 'Remaining cost',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm text-ink-100">{formatNumber(row.remaining_cost, { maximumFractionDigits: 4 })}</span>
    },
    {
      id: 'status',
      header: 'State',
      cell: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>
    },
    {
      id: 'created_at',
      header: 'Created',
      cell: (row) => <span className="text-xs text-ink-300">{formatDateTime(row.created_at)}</span>
    }
  ], []);

  function filterChange(setter) {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-ink-50">Ready packaged containers</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-300">Each row is one produced outer carton. Selling an inner bag makes that specific container partial and permanently ineligible for a whole-carton sale.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input leftIcon={Search} placeholder="Search group, material, or operation" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <Select value={warehouseId} onChange={filterChange(setWarehouseId)}>
          <option value="">All warehouses</option>
          {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </Select>
        <Select value={groupId} onChange={filterChange(setGroupId)}>
          <option value="">All groups</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </Select>
        <Select value={status} onChange={filterChange(setStatus)}>
          {READY_STOCK_STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={readyQuery.isPending}
        isError={readyQuery.isError}
        error={readyQuery.error}
        onRetry={() => readyQuery.refetch()}
        empty={{ icon: Archive, title: 'No ready packaged stock', description: 'Complete a packaging operation to create individual ready containers.' }}
        footer={meta.totalPages ? <Pagination page={meta.page || page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit || PAGE_SIZE} onChange={setPage} /> : null}
      />
    </div>
  );
}
