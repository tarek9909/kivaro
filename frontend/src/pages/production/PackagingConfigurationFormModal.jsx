import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  useUnitsOptions,
  useVariantsOptions
} from '@/pages/inventory/useInventoryOptions.js';
import { PACKAGING_TYPES } from './production.config.js';

const INVENTORY_VIEW = 'inventory.view';

function emptyForm(config) {
  return {
    config_name: config?.config_name ?? '',
    output_item_variant_id:
      config?.output_item_variant_id !== null && config?.output_item_variant_id !== undefined
        ? String(config.output_item_variant_id)
        : '',
    charcoal_variant_id:
      config?.charcoal_variant_id !== null && config?.charcoal_variant_id !== undefined
        ? String(config.charcoal_variant_id)
        : '',
    packaging_type: config?.packaging_type ?? 'carton_with_packages',
    charcoal_quantity_per_output: config?.charcoal_quantity_per_output ?? 0,
    charcoal_unit_id:
      config?.charcoal_unit_id !== null && config?.charcoal_unit_id !== undefined
        ? String(config.charcoal_unit_id)
        : '',
    packages_per_carton:
      config?.packages_per_carton !== null && config?.packages_per_carton !== undefined
        ? String(config.packages_per_carton)
        : '',
    is_active: config ? Number(config.is_active) === 1 ? '1' : '0' : '1',
    notes: config?.notes ?? ''
  };
}

export function PackagingConfigurationFormModal({ open, onClose, configuration }) {
  const isEdit = Boolean(configuration);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickInventory = hasPermission(INVENTORY_VIEW);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(() => emptyForm(configuration));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(configuration));
    setErrors({});
  }, [open, configuration]);

  const variantsQuery = useVariantsOptions(open && canPickInventory, { tracking_type: 'stocked' });
  const unitsQuery = useUnitsOptions(open && canPickInventory);
  const variants = variantsQuery.data?.data?.item_variants || [];
  const units = unitsQuery.data?.data?.units || [];

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.production.packagingConfigurations.update(configuration.id, payload)
        : api.production.packagingConfigurations.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Configuration updated' : 'Configuration created');
      queryClient.invalidateQueries({ queryKey: ['production', 'configurations'] });
      queryClient.invalidateQueries({ queryKey: ['production', 'options', 'configurations'] });
      if (configuration?.id) {
        queryClient.invalidateQueries({
          queryKey: ['production', 'configuration', configuration.id]
        });
      }
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save production recipe.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.config_name?.trim()) next.config_name = 'Name is required.';
    const outputId = Number(form.output_item_variant_id);
    if (!form.output_item_variant_id || Number.isNaN(outputId) || outputId <= 0) {
      next.output_item_variant_id = 'Output variant is required.';
    }
    if (form.charcoal_variant_id && Number.isNaN(Number(form.charcoal_variant_id))) {
      next.charcoal_variant_id = 'Charcoal variant ID must be numeric.';
    }
    if (form.charcoal_unit_id && Number.isNaN(Number(form.charcoal_unit_id))) {
      next.charcoal_unit_id = 'Charcoal unit ID must be numeric.';
    }
    if (Number(form.charcoal_quantity_per_output) < 0) {
      next.charcoal_quantity_per_output = 'Quantity cannot be negative.';
    }
    if (form.packages_per_carton) {
      const value = Number(form.packages_per_carton);
      if (!Number.isInteger(value) || value <= 0) {
        next.packages_per_carton = 'Packages per carton must be a positive integer.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      config_name: form.config_name.trim(),
      output_item_variant_id: Number(form.output_item_variant_id),
      charcoal_variant_id: form.charcoal_variant_id ? Number(form.charcoal_variant_id) : null,
      packaging_type: form.packaging_type,
      charcoal_quantity_per_output: Number(form.charcoal_quantity_per_output) || 0,
      charcoal_unit_id: form.charcoal_unit_id ? Number(form.charcoal_unit_id) : null,
      packages_per_carton: form.packages_per_carton ? Number(form.packages_per_carton) : null,
      is_active: form.is_active === '1' ? 1 : 0,
      notes: form.notes?.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit production recipe' : 'New production recipe'}
      description="Configurations describe how a finished product is built from charcoal and packaging components."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="packaging-config-form"
            isLoading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Create recipe'}
          </Button>
        </>
      }
    >
      <form id="packaging-config-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Name"
          value={form.config_name}
          onChange={(event) => handleChange('config_name', event.target.value)}
          error={errors.config_name}
          required
        />

        <div className="grid gap-4 md:grid-cols-2">
          {canPickInventory ? (
            <Select
              label="Output variant"
              value={form.output_item_variant_id}
              onChange={(event) => handleChange('output_item_variant_id', event.target.value)}
              error={errors.output_item_variant_id}
              required
            >
              <option value="">Select output variant</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.item_name} - {variant.variant_name} ({variant.sku})
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
              description="Numeric only. Catalog access is required for a variant picker."
            />
          )}
          <Select
            label="Packaging type"
            value={form.packaging_type}
            onChange={(event) => handleChange('packaging_type', event.target.value)}
            error={errors.packaging_type}
          >
            {PACKAGING_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {canPickInventory ? (
            <Select
              label="Charcoal variant"
              value={form.charcoal_variant_id}
              onChange={(event) => handleChange('charcoal_variant_id', event.target.value)}
              error={errors.charcoal_variant_id}
            >
              <option value="">No charcoal variant</option>
              {variants.map((variant) => (
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
              description="Optional. Numeric only."
            />
          )}
          <Input
            label="Charcoal qty per output (base unit)"
            type="number"
            min="0"
            step="0.0001"
            value={form.charcoal_quantity_per_output}
            onChange={(event) => handleChange('charcoal_quantity_per_output', event.target.value)}
            error={errors.charcoal_quantity_per_output}
          />
          {canPickInventory ? (
            <Select
              label="Charcoal unit"
              value={form.charcoal_unit_id}
              onChange={(event) => handleChange('charcoal_unit_id', event.target.value)}
              error={errors.charcoal_unit_id}
            >
              <option value="">No charcoal unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.symbol})
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Charcoal unit ID"
              type="number"
              min="1"
              value={form.charcoal_unit_id}
              onChange={(event) => handleChange('charcoal_unit_id', event.target.value)}
              error={errors.charcoal_unit_id}
              description="Optional. Numeric only."
            />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Packages per carton"
            type="number"
            min="1"
            step="1"
            value={form.packages_per_carton}
            onChange={(event) => handleChange('packages_per_carton', event.target.value)}
            error={errors.packages_per_carton}
            description="Optional. Used for carton with packages layouts."
          />
          <Select
            label="Active"
            value={form.is_active}
            onChange={(event) => handleChange('is_active', event.target.value)}
            error={errors.is_active}
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </Select>
        </div>

        <Textarea
          label="Notes"
          value={form.notes || ''}
          onChange={(event) => handleChange('notes', event.target.value)}
          rows={2}
        />
      </form>
    </Modal>
  );
}
