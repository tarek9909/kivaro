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
import { useCustomersList } from './useDispatchPicker.js';

const CUSTOMERS_VIEW = 'customers.view';

export function AddDispatchCustomerModal({ open, onClose, dispatchRequest }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickCustomers = hasPermission(CUSTOMERS_VIEW);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    customer_id: '',
    receipt_number: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm({ customer_id: '', receipt_number: '', notes: '' });
    setErrors({});
  }, [open, dispatchRequest?.id]);

  const customersQuery = useCustomersList(open && canPickCustomers);
  const customers = customersQuery.data?.data?.customers || [];

  const mutation = useMutation({
    mutationFn: (payload) => api.dispatch.requests.addCustomer(dispatchRequest.id, payload),
    onSuccess: () => {
      toast.success('Customer added to dispatch');
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'request', dispatchRequest.id] });
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not add customer.'));
    }
  });

  function validate() {
    const next = {};
    const customerId = Number(form.customer_id);
    if (!form.customer_id || Number.isNaN(customerId) || customerId <= 0) {
      next.customer_id = 'Customer is required.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      customer_id: Number(form.customer_id),
      receipt_number: form.receipt_number?.trim() || undefined,
      notes: form.notes?.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Add customer to dispatch"
      description="Select the customer that will receive stock on this route. Items are added per customer once they are on the route."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-dispatch-customer-form"
            isLoading={mutation.isPending}
          >
            Add customer
          </Button>
        </>
      }
    >
      <form
        id="add-dispatch-customer-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        {canPickCustomers ? (
          <Select
            label="Customer"
            value={form.customer_id}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, customer_id: event.target.value }))
            }
            error={errors.customer_id}
            required
          >
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
                {customer.customer_code ? ` (${customer.customer_code})` : ''}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Customer ID"
            type="number"
            min="1"
            value={form.customer_id}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, customer_id: event.target.value }))
            }
            error={errors.customer_id}
            required
            description="Numeric only. Customer browsing access is needed for a picker."
          />
        )}
        <Input
          label="Receipt number"
          value={form.receipt_number}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, receipt_number: event.target.value }))
          }
          description="Optional. Auto-generated when blank."
        />
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          rows={2}
        />
      </form>
    </Modal>
  );
}
