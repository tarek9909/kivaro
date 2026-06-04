import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
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
import { formatDate, formatDateTime, formatNumber } from '@/lib/formatters.js';
import { useVariantsOptions } from '@/pages/inventory/useInventoryOptions.js';
import { PRODUCTION_PERMISSIONS } from './production.config.js';
import { usePackagingConfigurationsList } from './useProductionOptions.js';

const INVENTORY_VIEW = 'inventory.view';

export default function CostHistoryTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canView = hasPermission(PRODUCTION_PERMISSIONS.view);
  const canPickInventory = hasPermission(INVENTORY_VIEW);

  const [variantId, setVariantId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [packagingConfigurationId, setPackagingConfigurationId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (variantId) params.item_variant_id = variantId;
    if (packagingConfigurationId) params.packaging_configuration_id = packagingConfigurationId;
    return params;
  }, [variantId, packagingConfigurationId, page, limit]);

  const listQuery = useQuery({
    queryKey: ['production', 'cost-history', queryParams],
    queryFn: () => api.production.productCostHistory.list(queryParams),
    enabled: canView
  });

  const variantsQuery = useVariantsOptions(canView && canPickInventory);
  const configurationsQuery = usePackagingConfigurationsList(canView);
  const variants = variantsQuery.data?.data?.item_variants || [];
  const configurations = configurationsQuery.data?.data?.packaging_configurations || [];

  const rows = listQuery.data?.data?.product_cost_history || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'effective_from',
        header: 'Effective from',
        cell: (row) => (
          <span className="whitespace-nowrap text-xs text-ink-200">
            {formatDateTime(row.effective_from)}
          </span>
        )
      },
      {
        id: 'effective_to',
        header: 'Effective to',
        cell: (row) =>
          row.effective_to ? (
            <span className="whitespace-nowrap text-xs text-ink-200">
              {formatDateTime(row.effective_to)}
            </span>
          ) : (
            <Badge tone="success">Current</Badge>
          )
      },
      {
        id: 'variant_name',
        header: 'Variant',
        cell: (row) => (
          <span className="text-sm text-ink-100">{row.variant_name || '-'}</span>
        )
      },
      {
        id: 'packaging_configuration_id',
        header: 'Configuration',
        cell: (row) => (
          <span className="font-mono text-xs text-ink-200">
            {row.packaging_configuration_id ? `#${row.packaging_configuration_id}` : '-'}
          </span>
        )
      },
      {
        id: 'calculated_cost',
        header: 'Unit cost',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.calculated_cost, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'selling_price',
        header: 'Selling price',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {row.selling_price !== null && row.selling_price !== undefined
              ? formatNumber(row.selling_price, { maximumFractionDigits: 4 })
              : '-'}
          </span>
        )
      },
      {
        id: 'created_at',
        header: 'Recorded',
        cell: (row) => (
          <span className="text-xs text-ink-300">{formatDate(row.created_at)}</span>
        )
      }
    ],
    []
  );

  if (!canView) {
    return (
      <GlassPanel>
        <GlassPanelBody>
          <EmptyState
            icon={History}
            title="Permission required"
            description="The production view permission is required to read product cost history."
          />
        </GlassPanelBody>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
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
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All variants</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.item_name} - {variant.variant_name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Variant ID"
            type="number"
            min="1"
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setPage(1);
            }}
            description="Numeric only."
          />
        )}
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
          icon: History,
          title: 'No cost history yet',
          description: 'Cost history is recorded when a production batch is completed.'
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
