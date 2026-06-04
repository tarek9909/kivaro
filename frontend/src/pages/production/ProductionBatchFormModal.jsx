import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Button,
  Input,
  Modal,
  Select,
  Textarea
} from '@/components/ui/index.js';
import {
  useVariantsOptions,
  useWarehousesOptions
} from '@/pages/inventory/useInventoryOptions.js';
import { PRODUCTION_PERMISSIONS } from './production.config.js';
import { usePackagingConfigurationsList } from './useProductionOptions.js';

const INVENTORY_VIEW = 'inventory.view';

function emptyForm() {
  return {
    production_source: 'packaging_group',
    batch_number: '',
    packaging_configuration_id: '',
    packaging_group_id: '',
    warehouse_id: '',
    charcoal_variant_id: '',
    output_item_variant_id: '',
    planned_quantity: '',
    notes: ''
  };
}

export function ProductionBatchFormModal({ open, onClose }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickConfigurations = hasPermission(PRODUCTION_PERMISSIONS.view);
  const canPickInventory = hasPermission(INVENTORY_VIEW);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open]);

  const configurationsQuery = usePackagingConfigurationsList(open && canPickConfigurations);
  const groupsQuery = useQuery({
    queryKey: ['inventory', 'packaging', 'groups', 'production-options'],
    queryFn: () => api.inventory.packagingGroups.list({ page: 1, limit: 100, status: 'active' }),
    staleTime: 60_000,
    enabled: open && canPickInventory
  });
  const warehousesQuery = useWarehousesOptions(open && canPickInventory);
  const variantsQuery = useVariantsOptions(open && canPickInventory, { tracking_type: 'stocked' });

  const configurations = configurationsQuery.data?.data?.packaging_configurations || [];
  const groups = groupsQuery.data?.data?.packaging_groups || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];
  const variants = variantsQuery.data?.data?.item_variants || [];
  const finishedProductVariants = variants.filter((variant) => variant.item_type === 'finished_product');
  const charcoalVariants = variants.filter((variant) => variant.item_type !== 'packaging');

  const selectedConfig = useMemo(
    () =>
      configurations.find(
        (config) => String(config.id) === String(form.packaging_configuration_id)
      ),
    [configurations, form.packaging_configuration_id]
  );
  const selectedGroup = useMemo(
    () => groups.find((group) => String(group.id) === String(form.packaging_group_id)),
    [groups, form.packaging_group_id]
  );

  const mutation = useMutation({
    mutationFn: (payload) => api.production.productionBatches.create(payload),
    onSuccess: () => {
      toast.success('Production batch created');
      queryClient.invalidateQueries({ queryKey: ['production', 'batches'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not create production batch.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSourceChange(value) {
    setForm((prev) => ({
      ...prev,
      production_source: value,
      packaging_configuration_id: '',
      packaging_group_id: '',
      charcoal_variant_id: '',
      output_item_variant_id: '',
      warehouse_id: ''
    }));
    setErrors({});
  }

  function handleGroupChange(value) {
    const group = groups.find((entry) => String(entry.id) === String(value));
    setForm((prev) => ({
      ...prev,
      packaging_group_id: value,
      warehouse_id: group?.default_warehouse_id ? String(group.default_warehouse_id) : prev.warehouse_id,
      charcoal_variant_id: group?.charcoal_variant_id ? String(group.charcoal_variant_id) : prev.charcoal_variant_id
    }));
    setErrors((prev) => ({
      ...prev,
      packaging_group_id: undefined,
      warehouse_id: undefined,
      charcoal_variant_id: undefined
    }));
  }

  function validate() {
    const next = {};
    const usesGroup = form.production_source === 'packaging_group';
    if (usesGroup) {
      const groupId = Number(form.packaging_group_id);
      if (!form.packaging_group_id || Number.isNaN(groupId) || groupId <= 0) {
        next.packaging_group_id = 'Packaging group is required.';
      }
      if (!form.charcoal_variant_id || Number.isNaN(Number(form.charcoal_variant_id))) {
        next.charcoal_variant_id = 'Charcoal variant is required.';
      }
      if (!form.output_item_variant_id || Number.isNaN(Number(form.output_item_variant_id))) {
        next.output_item_variant_id = 'Output variant is required.';
      }
    } else {
      const configId = Number(form.packaging_configuration_id);
      if (!form.packaging_configuration_id || Number.isNaN(configId) || configId <= 0) {
        next.packaging_configuration_id = 'Production recipe is required.';
      }
    }
    const warehouseId = Number(form.warehouse_id);
    if (!form.warehouse_id || Number.isNaN(warehouseId) || warehouseId <= 0) {
      next.warehouse_id = 'Warehouse is required.';
    }
    if (form.output_item_variant_id && Number.isNaN(Number(form.output_item_variant_id))) {
      next.output_item_variant_id = 'Output variant ID must be numeric.';
    }
    const qty = Number(form.planned_quantity);
    if (!form.planned_quantity || Number.isNaN(qty) || qty <= 0) {
      next.planned_quantity = usesGroup ? 'Charcoal kg must be greater than zero.' : 'Planned quantity must be greater than zero.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    const usesGroup = form.production_source === 'packaging_group';
    const payload = {
      batch_number: form.batch_number?.trim() || undefined,
      warehouse_id: Number(form.warehouse_id),
      planned_quantity: Number(form.planned_quantity),
      notes: form.notes?.trim() || null
    };
    if (usesGroup) {
      payload.packaging_group_id = Number(form.packaging_group_id);
      payload.charcoal_variant_id = Number(form.charcoal_variant_id);
      payload.output_item_variant_id = Number(form.output_item_variant_id);
    } else {
      payload.packaging_configuration_id = Number(form.packaging_configuration_id);
    }
    if (!usesGroup && form.output_item_variant_id) {
      payload.output_item_variant_id = Number(form.output_item_variant_id);
    }
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="New production batch"
      description="Plan a batch using an active production recipe. Components are consumed when the batch is completed."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="production-batch-form"
            isLoading={mutation.isPending}
          >
            Create batch
          </Button>
        </>
      }
    >
      <form
        id="production-batch-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        <Input
          label="Batch number"
          value={form.batch_number}
          onChange={(event) => handleChange('batch_number', event.target.value)}
          error={errors.batch_number}
          description="Optional. Auto-generated when blank."
        />

        <Select
          label="Production source"
          value={form.production_source}
          onChange={(event) => handleSourceChange(event.target.value)}
        >
          <option value="packaging_group">Packaging group</option>
          <option value="production_recipe">Production recipe</option>
        </Select>

        {form.production_source === 'production_recipe' && canPickConfigurations ? (
          <Select
            label="Production recipe"
            value={form.packaging_configuration_id}
            onChange={(event) => handleChange('packaging_configuration_id', event.target.value)}
            error={errors.packaging_configuration_id}
            required
          >
            <option value="">Select production recipe</option>
            {configurations.map((config) => (
              <option key={config.id} value={config.id}>
                {config.config_name}
              </option>
            ))}
          </Select>
        ) : form.production_source === 'production_recipe' ? (
          <Input
            label="Production recipe ID"
            type="number"
            min="1"
            value={form.packaging_configuration_id}
            onChange={(event) =>
              handleChange('packaging_configuration_id', event.target.value)
            }
            error={errors.packaging_configuration_id}
            required
            description="Numeric only. Production view is needed for a picker."
          />
        ) : canPickInventory ? (
          <Select
            label="Packaging group"
            value={form.packaging_group_id}
            onChange={(event) => handleGroupChange(event.target.value)}
            error={errors.packaging_group_id}
            required
          >
            <option value="">Select packaging group</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Packaging group ID"
            type="number"
            min="1"
            value={form.packaging_group_id}
            onChange={(event) => handleChange('packaging_group_id', event.target.value)}
            error={errors.packaging_group_id}
            required
            description="Numeric only. Inventory view is needed for a picker."
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {canPickInventory ? (
            <Select
              label="Warehouse"
              value={form.warehouse_id}
              onChange={(event) => handleChange('warehouse_id', event.target.value)}
              error={errors.warehouse_id}
              required
            >
              <option value="">Select warehouse</option>
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
              value={form.warehouse_id}
              onChange={(event) => handleChange('warehouse_id', event.target.value)}
              error={errors.warehouse_id}
              required
              description="Numeric only."
            />
          )}
          <Input
            label={form.production_source === 'packaging_group' ? 'Charcoal kg' : 'Planned quantity (base unit)'}
            type="number"
            min="0"
            step="0.0001"
            value={form.planned_quantity}
            onChange={(event) => handleChange('planned_quantity', event.target.value)}
            error={errors.planned_quantity}
            required
          />
        </div>

        {form.production_source === 'packaging_group' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {canPickInventory ? (
              <Select
                label="Charcoal variant"
                value={form.charcoal_variant_id}
                onChange={(event) => handleChange('charcoal_variant_id', event.target.value)}
                error={errors.charcoal_variant_id}
                required
              >
                <option value="">Select charcoal</option>
                {charcoalVariants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.item_name} - {variant.variant_name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Charcoal variant ID"
                type="number"
                min="1"
                value={form.charcoal_variant_id}
                onChange={(event) => handleChange('charcoal_variant_id', event.target.value)}
                error={errors.charcoal_variant_id}
                required
              />
            )}
            {canPickInventory ? (
              <Select
                label="Finished output"
                value={form.output_item_variant_id}
                onChange={(event) => handleChange('output_item_variant_id', event.target.value)}
                error={errors.output_item_variant_id}
                description={
                  selectedGroup
                    ? 'Output stock quantity will be the calculated primary container count.'
                    : 'Select the finished product that receives the produced containers.'
                }
                required
              >
                <option value="">Select finished output</option>
                {finishedProductVariants.map((variant) => (
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
                value={form.output_item_variant_id}
                onChange={(event) => handleChange('output_item_variant_id', event.target.value)}
                error={errors.output_item_variant_id}
                required
              />
            )}
          </div>
        )}

        {form.production_source === 'production_recipe' && (
          canPickInventory ? (
            <Select
              label="Output variant override"
              value={form.output_item_variant_id}
              onChange={(event) => handleChange('output_item_variant_id', event.target.value)}
              error={errors.output_item_variant_id}
              description={
                selectedConfig
                  ? `Defaults to ${selectedConfig.output_variant_name}.`
                  : 'Optional. Defaults to the recipe output variant.'
              }
            >
              <option value="">Use recipe default</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.item_name} - {variant.variant_name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Output variant ID override"
              type="number"
              min="1"
              value={form.output_item_variant_id}
              onChange={(event) => handleChange('output_item_variant_id', event.target.value)}
              error={errors.output_item_variant_id}
              description="Optional. Numeric only."
            />
          )
        )}

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(event) => handleChange('notes', event.target.value)}
          rows={3}
        />
      </form>
    </Modal>
  );
}
