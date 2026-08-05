import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Calendar, FileText, Hash, Truck, User } from 'lucide-react';
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
      size="lg"
      title="New Orders & Delivery Request"
      description="Plan a route and assign inventory to a salesman for customer deliveries."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="dispatch-create-form" leftIcon={Truck} isLoading={mutation.isPending}>
            Create Order Request
          </Button>
        </>
      }
    >
      <form id="dispatch-create-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Logistics & Assignment Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4.5 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
            <Truck className="h-4 w-4 text-brand-400" />
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-ink-200">
              Logistics & Assignment
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {canPickSalesmen ? (
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-300 font-medium">
                  <User className="h-3.5 w-3.5 text-ink-400" />
                  <span>Salesman *</span>
                </div>
                <Select
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
              </div>
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
              <div>
                <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-300 font-medium">
                  <Building2 className="h-3.5 w-3.5 text-ink-400" />
                  <span>Warehouse *</span>
                </div>
                <Select
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
              </div>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-300 font-medium">
                <Calendar className="h-3.5 w-3.5 text-ink-400" />
                <span>Request Date *</span>
              </div>
              <Input
                type="date"
                value={form.request_date}
                onChange={(event) => handleChange('request_date', event.target.value)}
                error={errors.request_date}
                required
              />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs text-ink-300 font-medium">
                <Hash className="h-3.5 w-3.5 text-ink-400" />
                <span>Dispatch Reference #</span>
              </div>
              <Input
                placeholder="Auto-generated if left blank"
                value={form.dispatch_number}
                onChange={(event) => handleChange('dispatch_number', event.target.value)}
                error={errors.dispatch_number}
              />
            </div>
          </div>
        </div>

        {/* Notes Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4.5 space-y-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <FileText className="h-4 w-4 text-brand-400" />
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-ink-200">
              Route Instructions & Notes
            </h3>
          </div>
          <Textarea
            placeholder="Add any special instructions or route notes..."
            value={form.notes}
            onChange={(event) => handleChange('notes', event.target.value)}
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}
