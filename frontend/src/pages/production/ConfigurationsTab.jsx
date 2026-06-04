import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Plus, Search, Trash2 , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  GlassPanel,
  GlassPanelBody,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { useVariantsOptions } from '@/pages/inventory/useInventoryOptions.js';
import {
  ACTIVE_FILTER_OPTIONS,
  PACKAGING_TYPES,
  PRODUCTION_PERMISSIONS
} from './production.config.js';
import { PackagingConfigurationFormModal } from './PackagingConfigurationFormModal.jsx';
import { PackagingConfigurationDrawer } from './PackagingConfigurationDrawer.jsx';

const INVENTORY_VIEW = 'inventory.view';

function packagingTypeLabel(value) {
  return PACKAGING_TYPES.find((entry) => entry.value === value)?.label || value;
}

export default function ConfigurationsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canView = hasPermission(PRODUCTION_PERMISSIONS.view);
  const canCreate = hasPermission(PRODUCTION_PERMISSIONS.create);
  const canPickInventory = hasPermission(INVENTORY_VIEW);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isActive, setIsActive] = useState('');
  const [outputVariantId, setOutputVariantId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openConfigId, setOpenConfigId] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (isActive !== '') params.is_active = isActive;
    if (outputVariantId) params.output_item_variant_id = outputVariantId;
    return params;
  }, [debouncedSearch, isActive, outputVariantId, page, limit]);

  const listQuery = useQuery({
    queryKey: ['production', 'configurations', queryParams],
    queryFn: () => api.production.packagingConfigurations.list(queryParams),
    enabled: canView
  });

  const variantsQuery = useVariantsOptions(canView && canPickInventory);
  const variants = variantsQuery.data?.data?.item_variants || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.production.packagingConfigurations.remove(id),
    onSuccess: () => {
      toast.success('Configuration deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['production', 'configurations'] });
      queryClient.invalidateQueries({
        queryKey: ['production', 'options', 'configurations']
      });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not deactivate production recipe.'))
  });

  const rows = listQuery.data?.data?.packaging_configurations || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'config_name',
        header: 'Configuration',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.config_name}</p>
            <p className="truncate text-xs text-ink-400">
              {packagingTypeLabel(row.packaging_type)}
            </p>
          </div>
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
        id: 'charcoal_variant_name',
        header: 'Charcoal',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.charcoal_variant_name || '-'}</span>
        )
      },
      {
        id: 'is_active',
        header: 'Status',
        cell: (row) => (
          <Badge tone={Number(row.is_active) === 1 ? 'success' : 'neutral'}>
            {Number(row.is_active) === 1 ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Eye}
              onClick={() => setOpenConfigId(row.id)}
            >
              View
            </Button>
            {canCreate && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                Edit
              </Button>
            )}
            {canCreate && Number(row.is_active) === 1 && (
              <Button
                variant="ghost"
                size="icon"
                leftIcon={Trash2}
                aria-label={`Deactivate ${row.config_name}`}
                onClick={() => setDeleteTarget(row)}
              />
            )}
          </div>
        )
      }
    ],
    [canCreate]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>
          New recipe
        </Button>
      </div>

      {!canView ? (
        <GlassPanel>
          <GlassPanelBody>
            <EmptyState
              title="Configuration browsing is restricted"
              description={
                canCreate
                  ? 'Use New recipe above to add one. Browsing existing recipes requires the production view permission.'
                  : 'Ask an administrator for the production view permission to browse recipes.'
              }
            />
          </GlassPanelBody>
        </GlassPanel>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
              leftIcon={Search}
              placeholder="Search by name or output variant"
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
              value={isActive}
              onChange={(event) => {
                setIsActive(event.target.value);
                setPage(1);
              }}
            >
              {ACTIVE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {canPickInventory ? (
              <Select
                value={outputVariantId}
                onChange={(event) => {
                  setOutputVariantId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All output variants</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.item_name} - {variant.variant_name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Output variant ID"
                type="number"
                min="1"
                value={outputVariantId}
                onChange={(event) => {
                  setOutputVariantId(event.target.value);
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
              title: 'No production recipes match the filters',
              description: canCreate
                ? 'Adjust your filters or add a new recipe.'
                : 'Adjust your filters to find existing recipes.'
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

      <PackagingConfigurationFormModal
        open={creating}
        onClose={() => setCreating(false)}
      />
      <PackagingConfigurationFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        configuration={editing || undefined}
      />
      {canView && (
        <PackagingConfigurationDrawer
          open={Boolean(openConfigId)}
          onClose={() => setOpenConfigId(null)}
          configurationId={openConfigId}
          onEdit={(config) => {
            setOpenConfigId(null);
            setEditing(config);
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate production recipe"
        description={
          deleteTarget
            ? `Set ${deleteTarget.config_name} to inactive? Existing batches keep their reference but the recipe will be hidden from active filters.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
