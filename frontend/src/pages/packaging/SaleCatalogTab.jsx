import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ListPlus, Pencil, Plus, Search } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { Badge, Button, DataTable, Input, Pagination, Select } from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';
import { useItemsOptions, useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import { CATALOG_ENTRY_TYPES, STATUS_OPTIONS, catalogTypeLabel, statusTone } from './packaging.constants.js';
import { SaleCatalogFormModal } from './SaleCatalogFormModal.jsx';

const PAGE_SIZE = 20;

export function SaleCatalogTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission('inventory.create');
  const canUpdate = hasPermission('inventory.update');
  const [search, setSearch] = useState('');
  const [entryType, setEntryType] = useState('');
  const [status, setStatus] = useState('active');
  const [warehouseId, setWarehouseId] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const debouncedSearch = useDebouncedValue(search, 250);

  const params = useMemo(() => {
    const next = { page, limit: PAGE_SIZE };
    if (debouncedSearch) next.search = debouncedSearch;
    if (entryType) next.entry_type = entryType;
    if (status) next.status = status;
    if (warehouseId) next.warehouse_id = warehouseId;
    return next;
  }, [debouncedSearch, entryType, page, status, warehouseId]);
  const catalogQuery = useQuery({
    queryKey: ['packaging', 'sale-catalog', params],
    queryFn: () => api.packaging.saleCatalog.list(params)
  });
  const itemsQuery = useItemsOptions(true);
  const groupsQuery = useQuery({
    queryKey: ['packaging', 'groups', 'sale-catalog-options'],
    queryFn: () => api.packaging.groups.list({ page: 1, limit: 100 })
  });
  const warehousesQuery = useWarehousesOptions(true);
  const rows = catalogQuery.data?.data?.sale_catalog_entries || [];
  const meta = catalogQuery.data?.meta || {};
  const items = itemsQuery.data?.data?.items || [];
  const groups = groupsQuery.data?.data?.packaging_groups || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];

  const columns = useMemo(() => [
    {
      id: 'display_name',
      header: 'Offer',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-50">{row.display_name}</p>
          <p className="truncate text-xs text-ink-400">{row.item_name || row.packaging_group_name || '-'}</p>
        </div>
      )
    },
    {
      id: 'entry_type',
      header: 'Fulfillment',
      cell: (row) => <span className="text-sm text-ink-200">{catalogTypeLabel(row.entry_type)}</span>
    },
    {
      id: 'default_price',
      header: 'Default price',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm">{formatNumber(row.default_price, { maximumFractionDigits: 4 })} / {row.unit_label}</span>
    },
    {
      id: 'vat_rate',
      header: 'VAT',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm">{formatNumber(row.vat_rate, { maximumFractionDigits: 2 })}%</span>
    },
    {
      id: 'availability',
      header: 'Availability',
      cell: (row) => {
        if (!warehouseId) return <span className="text-xs text-ink-400">Choose warehouse</span>;
        return <Badge tone={row.available ? 'success' : 'danger'}>{row.available ? `${formatNumber(row.available_quantity, { maximumFractionDigits: 4 })} available` : 'unavailable'}</Badge>;
      }
    },
    {
      id: 'is_pos_active',
      header: 'Mini POS',
      cell: (row) => <Badge tone={row.is_pos_active ? 'brand' : 'neutral'}>{row.is_pos_active ? 'active' : 'off'}</Badge>
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (row) => canUpdate ? <Button variant="secondary" size="sm" leftIcon={Pencil} onClick={() => setEditing(row)}>Edit</Button> : null
    }
  ], [canUpdate, warehouseId]);

  function setFilter(setter) {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-ink-50">Unified sale catalog</h2>
          <p className="mt-1 max-w-3xl text-sm text-ink-300">Configure direct normal-item offers and ready-carton/bag offers. Prices are controlled here; dispatch and POS consume the server-selected offer and allocation source.</p>
        </div>
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>New offer</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input leftIcon={Search} placeholder="Search offer, item, or group" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <Select value={entryType} onChange={setFilter(setEntryType)}>
          <option value="">All fulfillment types</option>
          {CATALOG_ENTRY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </Select>
        <Select value={warehouseId} onChange={setFilter(setWarehouseId)}>
          <option value="">Availability warehouse</option>
          {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </Select>
        <Select value={status} onChange={setFilter(setStatus)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={catalogQuery.isPending}
        isError={catalogQuery.isError}
        error={catalogQuery.error}
        onRetry={() => catalogQuery.refetch()}
        empty={{ icon: ListPlus, title: 'No sale offers found', description: canCreate ? 'Create the direct-item and ready-stock offers that your dispatch and Mini POS will use.' : 'Try another filter.' }}
        footer={meta.totalPages ? <Pagination page={meta.page || page} totalPages={meta.totalPages} total={meta.total} limit={meta.limit || PAGE_SIZE} onChange={setPage} /> : null}
      />

      <SaleCatalogFormModal open={creating} onClose={() => setCreating(false)} items={items} groups={groups} />
      <SaleCatalogFormModal open={Boolean(editing)} onClose={() => setEditing(null)} entry={editing || undefined} items={items} groups={groups} />
    </div>
  );
}
