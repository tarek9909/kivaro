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
  Select
} from '@/components/ui/index.js';
import {
  useUnitsOptions,
  useVariantsOptions
} from '@/pages/inventory/useInventoryOptions.js';
import { COMPONENT_ROLES } from './production.config.js';

const INVENTORY_VIEW = 'inventory.view';

function emptyForm(component) {
  return {
    component_item_variant_id:
      component?.component_item_variant_id !== null && component?.component_item_variant_id !== undefined
        ? String(component.component_item_variant_id)
        : '',
    quantity_per_output: component?.quantity_per_output ?? '',
    unit_id:
      component?.unit_id !== null && component?.unit_id !== undefined
        ? String(component.unit_id)
        : '',
    component_role: component?.component_role ?? 'package_bag',
    waste_percentage: component?.waste_percentage ?? 0
  };
}

/**
 * Add or edit a single component on a production recipe.
 * - Add posts to /packaging-configurations/:configId/components
 * - Edit patches /packaging-configuration-components/:componentId
 */
export function PackagingComponentFormModal({
  open,
  onClose,
  configurationId,
  component
}) {
  const isEdit = Boolean(component);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickInventory = hasPermission(INVENTORY_VIEW);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(() => emptyForm(component));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(component));
    setErrors({});
  }, [open, component]);

  const variantsQuery = useVariantsOptions(open && canPickInventory, { tracking_type: 'stocked' });
  const unitsQuery = useUnitsOptions(open && canPickInventory);
  const variants = variantsQuery.data?.data?.item_variants || [];
  const units = unitsQuery.data?.data?.units || [];

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.production.packagingComponents.update(component.id, payload)
        : api.production.packagingConfigurations.addComponent(configurationId, payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Component updated' : 'Component added');
      queryClient.invalidateQueries({
        queryKey: ['production', 'configuration', configurationId]
      });
      queryClient.invalidateQueries({ queryKey: ['production', 'configurations'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save component.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    const variantId = Number(form.component_item_variant_id);
    if (
      !form.component_item_variant_id ||
      Number.isNaN(variantId) ||
      variantId <= 0
    ) {
      next.component_item_variant_id = 'Component variant is required.';
    }
    const qty = Number(form.quantity_per_output);
    if (!form.quantity_per_output || Number.isNaN(qty) || qty <= 0) {
      next.quantity_per_output = 'Quantity must be greater than zero.';
    }
    const unitId = Number(form.unit_id);
    if (!form.unit_id || Number.isNaN(unitId) || unitId <= 0) {
      next.unit_id = 'Unit is required.';
    }
    if (Number(form.waste_percentage) < 0) {
      next.waste_percentage = 'Waste percentage cannot be negative.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      component_item_variant_id: Number(form.component_item_variant_id),
      quantity_per_output: Number(form.quantity_per_output),
      unit_id: Number(form.unit_id),
      component_role: form.component_role,
      waste_percentage: Number(form.waste_percentage) || 0
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit component' : 'Add component'}
      description="Components describe each material consumed for one output unit. Quantities are stored in the component's base unit."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="packaging-component-form"
            isLoading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Add component'}
          </Button>
        </>
      }
    >
      <form
        id="packaging-component-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        {canPickInventory ? (
          <Select
            label="Component variant"
            value={form.component_item_variant_id}
            onChange={(event) =>
              handleChange('component_item_variant_id', event.target.value)
            }
            error={errors.component_item_variant_id}
            required
          >
            <option value="">Select component variant</option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.item_name} - {variant.variant_name} ({variant.sku})
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Component variant ID"
            type="number"
            min="1"
            value={form.component_item_variant_id}
            onChange={(event) =>
              handleChange('component_item_variant_id', event.target.value)
            }
            error={errors.component_item_variant_id}
            required
            description="Numeric only."
          />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Qty per output (base unit)"
            type="number"
            min="0"
            step="0.0001"
            value={form.quantity_per_output}
            onChange={(event) => handleChange('quantity_per_output', event.target.value)}
            error={errors.quantity_per_output}
            required
          />
          {canPickInventory ? (
            <Select
              label="Unit"
              value={form.unit_id}
              onChange={(event) => handleChange('unit_id', event.target.value)}
              error={errors.unit_id}
              required
            >
              <option value="">Select unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} ({unit.symbol})
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Unit ID"
              type="number"
              min="1"
              value={form.unit_id}
              onChange={(event) => handleChange('unit_id', event.target.value)}
              error={errors.unit_id}
              required
              description="Numeric only."
            />
          )}
          <Input
            label="Waste %"
            type="number"
            min="0"
            step="0.0001"
            value={form.waste_percentage}
            onChange={(event) => handleChange('waste_percentage', event.target.value)}
            error={errors.waste_percentage}
            description="Added on top of base quantity."
          />
        </div>

        <Select
          label="Role"
          value={form.component_role}
          onChange={(event) => handleChange('component_role', event.target.value)}
          error={errors.component_role}
        >
          {COMPONENT_ROLES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </form>
    </Modal>
  );
}
