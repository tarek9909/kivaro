import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { Button, Input, Modal, Select, Textarea } from '@/components/ui/index.js';
import { PAYMENT_METHODS, PURCHASES_PERMISSIONS } from './purchases.config.js';
import {
  useCashAccountsOptions,
  usePurchaseOrdersOptions,
  useSuppliersOptions
} from './usePurchasesOptions.js';

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptyForm() {
  return {
    supplier_id: '',
    purchase_order_id: '',
    payment_date: todayString(),
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    cash_account_id: '',
    notes: ''
  };
}

const PAYABLE_PO_STATUSES = new Set(['approved', 'partially_received', 'received', 'closed']);

export function SupplierPaymentFormModal({ open, onClose }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canSeePurchaseOrders = hasPermission(PURCHASES_PERMISSIONS.view);
  const canSeeCashAccounts = hasPermission(PURCHASES_PERMISSIONS.accountingView);

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open]);

  const suppliersQuery = useSuppliersOptions(open && canSeePurchaseOrders);
  const purchaseOrdersQuery = usePurchaseOrdersOptions(open && canSeePurchaseOrders);
  const cashAccountsQuery = useCashAccountsOptions(open && canSeeCashAccounts);

  const suppliers = suppliersQuery.data?.data?.suppliers || [];
  const purchaseOrders = purchaseOrdersQuery.data?.data?.purchase_orders || [];
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];

  // If the operator has selected a supplier, narrow the PO list to that supplier.
  const filteredPurchaseOrders = form.supplier_id
    ? purchaseOrders.filter(
        (order) => String(order.supplier_id || '') === String(form.supplier_id) &&
          PAYABLE_PO_STATUSES.has(order.status)
      )
    : purchaseOrders.filter((order) => PAYABLE_PO_STATUSES.has(order.status));

  const mutation = useMutation({
    mutationFn: (payload) => api.purchases.supplierPayments.create(payload),
    onSuccess: () => {
      toast.success('Supplier payment recorded');
      queryClient.invalidateQueries({ queryKey: ['purchases', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['purchases', 'orders'] });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'options', 'purchase-orders']
      });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not record payment.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    const supplierId = Number(form.supplier_id);
    if (!form.supplier_id || Number.isNaN(supplierId) || supplierId <= 0) {
      next.supplier_id = 'Supplier is required.';
    }
    if (!form.payment_date) next.payment_date = 'Payment date is required.';
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      next.amount = 'Amount must be greater than zero.';
    }
    if (form.purchase_order_id && Number.isNaN(Number(form.purchase_order_id))) {
      next.purchase_order_id = 'Purchase order ID must be numeric.';
    }
    if (!form.cash_account_id) {
      next.cash_account_id = 'Cash account is required.';
    } else if (Number.isNaN(Number(form.cash_account_id))) {
      next.cash_account_id = 'Cash account ID must be numeric.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      supplier_id: Number(form.supplier_id),
      purchase_order_id: form.purchase_order_id ? Number(form.purchase_order_id) : null,
      payment_date: form.payment_date,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      reference_number: form.reference_number?.trim() || null,
      cash_account_id: Number(form.cash_account_id),
      notes: form.notes?.trim() || null
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Record supplier payment"
      description="Record a payment to a supplier and post it to a cash account."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="supplier-payment-form"
            isLoading={mutation.isPending}
          >
            Record payment
          </Button>
        </>
      }
    >
      <form id="supplier-payment-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {canSeePurchaseOrders ? (
          <Select
            label="Supplier"
            value={form.supplier_id}
            onChange={(event) => {
              handleChange('supplier_id', event.target.value);
              // Reset PO selection if it does not belong to this supplier.
              setForm((prev) => ({ ...prev, purchase_order_id: '' }));
            }}
            error={errors.supplier_id}
            required
          >
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Supplier ID"
            type="number"
            min="1"
            value={form.supplier_id}
            onChange={(event) => handleChange('supplier_id', event.target.value)}
            error={errors.supplier_id}
            required
            description="Numeric only. purchase_orders.view is needed for a supplier picker."
          />
        )}

        {canSeePurchaseOrders ? (
          <Select
            label="Purchase order"
            value={form.purchase_order_id}
            onChange={(event) => handleChange('purchase_order_id', event.target.value)}
            error={errors.purchase_order_id}
            description="Optional. Links the payment to a purchase order."
          >
            <option value="">No purchase order</option>
            {filteredPurchaseOrders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.po_number}
                {order.supplier_name ? ` - ${order.supplier_name}` : ''}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Purchase order ID"
            type="number"
            min="1"
            value={form.purchase_order_id}
            onChange={(event) => handleChange('purchase_order_id', event.target.value)}
            error={errors.purchase_order_id}
            description="Optional. Numeric only. purchase_orders.view is needed for a picker."
          />
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Payment date"
            type="date"
            value={form.payment_date}
            onChange={(event) => handleChange('payment_date', event.target.value)}
            error={errors.payment_date}
            required
          />
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.0001"
            value={form.amount}
            onChange={(event) => handleChange('amount', event.target.value)}
            error={errors.amount}
            required
          />
          <Select
            label="Method"
            value={form.payment_method}
            onChange={(event) => handleChange('payment_method', event.target.value)}
            error={errors.payment_method}
          >
            {PAYMENT_METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Reference number"
            value={form.reference_number}
            onChange={(event) => handleChange('reference_number', event.target.value)}
            error={errors.reference_number}
          />
          {canSeeCashAccounts ? (
            <Select
              label="Cash account"
              value={form.cash_account_id}
              onChange={(event) => handleChange('cash_account_id', event.target.value)}
              error={errors.cash_account_id}
              required
            >
              <option value="">Select cash account</option>
              {cashAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name || account.name || `Account #${account.id}`}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              label="Cash account ID"
              type="number"
              min="1"
              value={form.cash_account_id}
              onChange={(event) => handleChange('cash_account_id', event.target.value)}
              error={errors.cash_account_id}
              required
              description="Numeric only. accounting.view is needed for a cash account picker."
            />
          )}
        </div>

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
