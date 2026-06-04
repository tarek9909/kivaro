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
  EmptyState,
  GlassPanel,
  GlassPanelBody,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import { useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import {
  BATCH_STATUSES,
  BATCH_STATUS_FILTER_OPTIONS,
  PRODUCTION_PARENT_PERMISSIONS,
  PRODUCTION_PERMISSIONS,
  getBatchStatusTone
} from './production.config.js';
import { usePackagingConfigurationsList } from './useProductionOptions.js';
import { ProductionBatchFormModal } from './ProductionBatchFormModal.jsx';
import { ProductionBatchDrawer } from './ProductionBatchDrawer.jsx';

const INVENTORY_VIEW = 'inventory.view';

function StatusBadge({ status }) {
  const tone = getBatchStatusTone(status);
  const label = BATCH_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

export default function BatchesTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canView = hasPermission(PRODUCTION_PERMISSIONS.view);
  const canCreate = hasPermission(PRODUCTION_PERMISSIONS.create);
  const canComplete = hasPermission(PRODUCTION_PERMISSIONS.complete);
  const canBrowseBatches = PRODUCTION_PARENT_PERMISSIONS.some((permission) => hasPermission(permission));
  const canPickInventory = hasPermission(INVENTORY_VIEW);

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [packagingConfigurationId, setPackagingConfigurationId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [openBatchId, setOpenBatchId] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (warehouseId) params.warehouse_id = warehouseId;
    if (packagingConfigurationId) params.packaging_configuration_id = packagingConfigurationId;
    return params;
  }, [debouncedSearch, status, warehouseId, packagingConfigurationId, page, limit]);

  const listQuery = useQuery({
    queryKey: ['production', 'batches', queryParams],
    queryFn: () => api.production.productionBatches.list(queryParams),
    enabled: canBrowseBatches
  });

  const warehousesQuery = useWarehousesOptions(canBrowseBatches && canPickInventory);
  const configurationsQuery = usePackagingConfigurationsList(canView);

  const warehouses = warehousesQuery.data?.data?.warehouses || [];
  const configurations = configurationsQuery.data?.data?.packaging_configurations || [];

  const rows = listQuery.data?.data?.production_batches || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'batch_number',
        header: 'Batch',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.batch_number}</p>
            <p className="truncate text-xs text-ink-400">{formatDate(row.created_at)}</p>
          </div>
        )
      },
      {
        id: 'config_name',
        header: 'Source',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.packaging_group_name || row.config_name || '-'}</span>
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
        id: 'output_variant_name',
        header: 'Output',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.output_variant_name || '-'}</span>
        )
      },
      {
        id: 'planned_quantity',
        header: 'Planned',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.planned_quantity, { maximumFractionDigits: 4 })}
            {row.packaging_group_id ? ' kg' : ''}
          </span>
        )
      },
      {
        id: 'produced_quantity',
        header: 'Produced',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {row.produced_quantity
              ? `${formatNumber(row.produced_quantity, { maximumFractionDigits: 4 })}${row.packaging_group_id ? ' kg' : ''}`
              : '-'}
          </span>
        )
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.status} />
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <Button variant="secondary" size="sm" onClick={() => setOpenBatchId(row.id)}>
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
          New batch
        </Button>
      </div>

      {!canBrowseBatches ? (
        <GlassPanel>
          <GlassPanelBody>
            <EmptyState
              title="Batch browsing is restricted"
              description={
                canCreate
                  ? 'Use New batch above to plan a batch.'
                  : canComplete
                  ? 'You can browse batches ready for completion.'
                  : 'Ask an administrator for production permissions to access batches.'
              }
            />
          </GlassPanelBody>
        </GlassPanel>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input
              containerClassName="xl:col-span-2"
              leftIcon={Search}
              placeholder="Search by batch number or recipe"
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
              {BATCH_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              value={packagingConfigurationId}
              onChange={(event) => {
                setPackagingConfigurationId(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All production recipes</option>
              {configurations.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.config_name}
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
              title: 'No batches match the filters',
              description: canCreate
                ? 'Adjust your filters or plan a new production batch.'
                : 'Adjust your filters to find existing batches.'
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

      <ProductionBatchFormModal open={creating} onClose={() => setCreating(false)} />
      {canBrowseBatches && (
        <ProductionBatchDrawer
          open={Boolean(openBatchId)}
          onClose={() => setOpenBatchId(null)}
          batchId={openBatchId}
        />
      )}
    </div>
  );
}
