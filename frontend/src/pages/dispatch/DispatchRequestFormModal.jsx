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
import { useSalesmenList } from '@/pages/locations/useLocationsOptions.js';
import { useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import { LOCATIONS_PERMISSIONS } from '@/pages/locations/locations.config.js';

const INVENTORY_VIEW = 'inventory.view';

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptyForm() {
  return {
    dispatch_number: '',
    salesman_id: '',
    warehouse_id: '',
    request_date: todayString(),
    notes: ''
  };
}

export function DispatchRequestFormModal({ open, onClose }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickSalesmen = hasPermission(LOCATIONS_PERMISSIONS.salesmen);
  const canPickInventory = hasPermission(INVENTORY_VIEW);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open]);

  const salesmenQuery = useSalesmenList(open && canPickSalesmen);
  const warehousesQuery = useWarehousesOptions(open && canPickInventory);

  const salesmen = salesmenQuery.data?.data?.salesmen || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];

  const mutation = useMutation({
    mutationFn: (payload) => api.dispatch.requests.create(payload),
    onSuccess: () => {
      toast.success('Dispatch request created');
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not create dispatch request.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    const salesmanId = Number(form.salesman_id);
    if (!form.salesman_id || Number.isNaN(salesmanId) || salesmanId <= 0) {
      next.salesman_id = 'Salesman is required.';
    }
    const warehouseId = Number(form.warehouse_id);
    if (!form.warehouse_id || Number.isNaN(warehouseId) || warehouseId <= 0) {
      next.warehouse_id = 'Warehouse is required.';
    }
    if (!form.request_date) next.request_date = 'Request date is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      dispatch_number: form.dispatch_number?.trim() || undefined,
      salesman_id: Number(form.salesman_id),
      warehouse_id: Number(form.warehouse_id),
      request_date: form.request_date,
      notes: form.notes?.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="New dispatch request"
      description="Plan a route for a salesman to take stock to customers."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="dispatch-create-form" isLoading={mutation.isPending}>
            Create request
          </Button>
        </>
      }
    >
      <form id="dispatch-create-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Dispatch number"
          value={form.dispatch_number}
          onChange={(event) => handleChange('dispatch_number', event.target.value)}
          error={errors.dispatch_number}
          description="Optional. Auto-generated when blank."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {canPickSalesmen ? (
            <Select
              label="Salesman"
              value={form.salesman_id}
              onChange={(event) => handleChange('salesman_id', event.target.value)}
              error={errors.salesman_id}
              required
            >
              <option value="">Select salesman</option>
              {salesmen.map((salesman) => (
                <option key={salesman.id} value={salesman.id}>
                  {salesman.full_name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Salesman ID"
              type="number"
              min="1"
              value={form.salesman_id}
              onChange={(event) => handleChange('salesman_id', event.target.value)}
              error={errors.salesman_id}
              required
              description="Numeric only."
            />
          )}
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
        </div>
        <Input
          label="Request date"
          type="date"
          value={form.request_date}
          onChange={(event) => handleChange('request_date', event.target.value)}
          error={errors.request_date}
          required
        />
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
