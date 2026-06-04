import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Input,
  LoadingState
} from '@/components/ui/index.js';
import { formatNumber, formatDateTime } from '@/lib/formatters.js';
import { useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import {
  COMPONENT_ROLES,
  PACKAGING_TYPES,
  PRODUCTION_PERMISSIONS
} from './production.config.js';
import { PackagingComponentFormModal } from './PackagingComponentFormModal.jsx';

const INVENTORY_VIEW = 'inventory.view';

function packagingTypeLabel(value) {
  return PACKAGING_TYPES.find((entry) => entry.value === value)?.label || value;
}

function componentRoleLabel(value) {
  return COMPONENT_ROLES.find((entry) => entry.value === value)?.label || value;
}

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span className="break-words text-sm text-ink-100">{value || '-'}</span>
    </div>
  );
}

export function PackagingConfigurationDrawer({
  open,
  onClose,
  configurationId,
  onEdit
}) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(PRODUCTION_PERMISSIONS.create);
  const canPickInventory = hasPermission(INVENTORY_VIEW);
  const queryClient = useQueryClient();

  const [addingComponent, setAddingComponent] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [deletingComponent, setDeletingComponent] = useState(null);
  const [costWarehouseId, setCostWarehouseId] = useState('');
  const [calculatedCost, setCalculatedCost] = useState(null);

  useEffect(() => {
    if (!open) {
      setAddingComponent(false);
      setEditingComponent(null);
      setDeletingComponent(null);
      setCostWarehouseId('');
      setCalculatedCost(null);
    }
  }, [open]);

  const detailQuery = useQuery({
    queryKey: ['production', 'configuration', configurationId],
    queryFn: () => api.production.packagingConfigurations.get(configurationId),
    enabled: Boolean(open && configurationId)
  });

  const warehousesQuery = useWarehousesOptions(open && canPickInventory);
  const warehouses = warehousesQuery.data?.data?.warehouses || [];

  const config = detailQuery.data?.data?.packaging_configuration;
  const components = config?.components || [];

  const deleteComponentMutation = useMutation({
    mutationFn: (id) => api.production.packagingComponents.remove(id),
    onSuccess: () => {
      toast.success('Component removed');
      setDeletingComponent(null);
      queryClient.invalidateQueries({
        queryKey: ['production', 'configuration', configurationId]
      });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not remove component.'))
  });

  const calculateMutation = useMutation({
    mutationFn: (warehouseId) =>
      api.production.packagingConfigurations.calculateCost(configurationId, {
        warehouse_id: warehouseId ? Number(warehouseId) : null
      }),
    onSuccess: (response) => {
      const cost = response?.data?.cost;
      setCalculatedCost(cost || null);
      toast.success('Cost calculated');
    },
    onError: (error) => {
      setCalculatedCost(null);
      toast.error(getErrorMessage(error, 'Could not calculate cost.'));
    }
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="xl"
      title={config ? config.config_name : 'Production recipe'}
      description={
        config
          ? `${packagingTypeLabel(config.packaging_type)} - ${formatDateTime(config.created_at)}`
          : undefined
      }
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detailQuery.isPending ? (
        <LoadingState label="Loading production recipe..." />
      ) : detailQuery.isError ? (
        <ErrorState
          title="Could not load production recipe"
          description={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      ) : !config ? (
        <EmptyState title="Configuration not found" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={Number(config.is_active) === 1 ? 'success' : 'neutral'}>
              {Number(config.is_active) === 1 ? 'Active' : 'Inactive'}
            </Badge>
            <Badge tone="brand">{packagingTypeLabel(config.packaging_type)}</Badge>
          </div>

          {canCreate && onEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => onEdit(config)}>
                Edit recipe
              </Button>
            </div>
          )}

          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Output variant" value={config.output_variant_name} />
            <Field label="Charcoal variant" value={config.charcoal_variant_name} />
            <Field
              label="Charcoal qty per output"
              value={formatNumber(config.charcoal_quantity_per_output, {
                maximumFractionDigits: 4
              })}
            />
            <Field
              label="Packages per carton"
              value={
                config.packages_per_carton
                  ? formatNumber(config.packages_per_carton)
                  : null
              }
            />
          </section>

          {config.notes && (
            <section>
              <h3 className="font-display text-sm font-semibold text-ink-50">Notes</h3>
              <p className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 text-pretty">
                {config.notes}
              </p>
            </section>
          )}

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-ink-50">Components</h3>
              {canCreate && (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={Plus}
                  onClick={() => setAddingComponent(true)}
                >
                  Add component
                </Button>
              )}
            </div>
            {components.length === 0 ? (
              <EmptyState
                className="mt-2"
                title="No components yet"
                description="Add at least one component before running batches against this recipe."
              />
            ) : (
              <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
                {components.map((component) => (
                  <li
                    key={component.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-50">
                          {component.item_name} - {component.variant_name}
                        </p>
                        <p className="truncate font-mono text-xs text-ink-400">
                          {component.sku}
                        </p>
                      </div>
                      <Badge tone="neutral">{componentRoleLabel(component.component_role)}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-300">
                      <span>
                        Qty/output{' '}
                        <span className="font-mono text-ink-100">
                          {formatNumber(component.quantity_per_output, {
                            maximumFractionDigits: 4
                          })}
                        </span>{' '}
                        {component.unit_symbol}
                      </span>
                      <span>
                        Waste{' '}
                        <span className="font-mono text-ink-100">
                          {formatNumber(component.waste_percentage, { maximumFractionDigits: 4 })}
                        </span>{' '}
                        %
                      </span>
                    </div>
                    {canCreate && (
                      <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingComponent(component)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          leftIcon={Trash2}
                          aria-label={`Remove ${component.item_name} component`}
                          onClick={() => setDeletingComponent(component)}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <h3 className="font-display text-sm font-semibold text-ink-50">Cost preview</h3>
            <p className="mt-1 text-xs text-ink-300">
              Estimate the unit cost using current variant costs. Pick a warehouse to use its
              average costs; leave blank to use catalog defaults.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
              {canPickInventory ? (
                <select
                  value={costWarehouseId}
                  onChange={(event) => setCostWarehouseId(event.target.value)}
                  className="h-10 min-w-0 appearance-none rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-ink-50 focus:border-brand-400/70 focus:outline-none"
                >
                  <option value="">No warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type="number"
                  min="1"
                  value={costWarehouseId}
                  onChange={(event) => setCostWarehouseId(event.target.value)}
                  placeholder="Warehouse ID (optional)"
                  description="Numeric only."
                />
              )}
              <Button
                leftIcon={Calculator}
                onClick={() => calculateMutation.mutate(costWarehouseId)}
                isLoading={calculateMutation.isPending}
                disabled={components.length === 0}
              >
                Calculate cost
              </Button>
            </div>
            {calculatedCost ? (
              <div className="mt-3 rounded-lg border border-white/5 bg-ink-950/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink-300">Calculated unit cost</span>
                  <span className="font-mono text-base font-semibold text-ink-50">
                    {formatNumber(calculatedCost.calculated_cost, {
                      maximumFractionDigits: 4
                    })}
                  </span>
                </div>
                {Array.isArray(calculatedCost.components) && calculatedCost.components.length > 0 && (
                  <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-1">
                    {calculatedCost.components.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-3 text-xs text-ink-200"
                      >
                        <span className="truncate">
                          {entry.item_name}
                          {entry.variant_name ? ` - ${entry.variant_name}` : ''}
                        </span>
                        <span className="font-mono text-ink-100">
                          {formatNumber(entry.total_cost, { maximumFractionDigits: 4 })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] uppercase tracking-wider text-ink-400">
                  Cost preview only. Final unit cost is recorded when a batch completes.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      )}

      <PackagingComponentFormModal
        open={addingComponent}
        onClose={() => setAddingComponent(false)}
        configurationId={configurationId}
      />
      <PackagingComponentFormModal
        open={Boolean(editingComponent)}
        onClose={() => setEditingComponent(null)}
        configurationId={configurationId}
        component={editingComponent || undefined}
      />
      <ConfirmDialog
        open={Boolean(deletingComponent)}
        onClose={() => setDeletingComponent(null)}
        onConfirm={() =>
          deletingComponent && deleteComponentMutation.mutate(deletingComponent.id)
        }
        title="Remove component"
        description={
          deletingComponent
            ? `Remove ${deletingComponent.item_name} from this recipe? Existing batches keep their recorded components.`
            : ''
        }
        confirmLabel="Remove"
        isLoading={deleteComponentMutation.isPending}
      />
    </Drawer>
  );
}
