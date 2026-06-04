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
import { PAYMENT_METHODS, PURCHASES_PERMISSIONS, getAvailableActions } from './purchases.config.js';
import { useCashAccountsOptions, useSuppliersOptions } from './usePurchasesOptions.js';

function toDateInputValue(value) {
  if (!value) return '';
  // Accept either YYYY-MM-DD or full ISO timestamps the backend returns.
  const trimmed = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function emptyForm(purchaseOrder) {
  return {
    supplier_id:
      purchaseOrder?.supplier_id !== null && purchaseOrder?.supplier_id !== undefined
        ? String(purchaseOrder.supplier_id)
        : '',
    cash_account_id:
      purchaseOrder?.cash_account_id !== null && purchaseOrder?.cash_account_id !== undefined
        ? String(purchaseOrder.cash_account_id)
        : '',
    payment_method: purchaseOrder?.payment_method || 'cash',
    expected_date: toDateInputValue(purchaseOrder?.expected_date),
    notes: purchaseOrder?.notes ?? ''
  };
}

/**
 * Header-only edit modal for a purchase order. Items, totals, dates, status,
 * approval, and paid amounts are not editable here.
 */
export function PurchaseOrderHeaderEditModal({ open, onClose, purchaseOrder }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(PURCHASES_PERMISSIONS.create);
  const canSeeSuppliers = hasPermission(PURCHASES_PERMISSIONS.view);
  const canSeeCashAccounts = hasPermission(PURCHASES_PERMISSIONS.accountingView);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(() => emptyForm(purchaseOrder));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(purchaseOrder));
    setErrors({});
  }, [open, purchaseOrder]);

  // Only load supplier options while the modal is open and the user can.
  const suppliersQuery = useSuppliersOptions(open && canSeeSuppliers);
  const cashAccountsQuery = useCashAccountsOptions(open && canSeeCashAccounts);
  const suppliers = suppliersQuery.data?.data?.suppliers || [];
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];

  const editAllowed =
    canCreate && getAvailableActions(purchaseOrder).has('edit');

  const mutation = useMutation({
    mutationFn: (payload) =>
      api.purchases.purchaseOrders.update(purchaseOrder.id, payload),
    onSuccess: () => {
      toast.success('Purchase order updated');
      queryClient.invalidateQueries({ queryKey: ['purchases', 'orders'] });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'order', purchaseOrder.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['purchases', 'options', 'purchase-orders']
      });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not update purchase order.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (form.supplier_id) {
      const supplierId = Number(form.supplier_id);
      if (!Number.isInteger(supplierId) || supplierId <= 0) {
        next.supplier_id = 'Supplier ID must be a positive number.';
      }
    }
    if (form.cash_account_id) {
      const cashAccountId = Number(form.cash_account_id);
      if (!Number.isInteger(cashAccountId) || cashAccountId <= 0) {
        next.cash_account_id = 'Cash account ID must be a positive number.';
      }
    }
    if (form.expected_date) {
      // The Date input already constrains to YYYY-MM-DD; this is just a
      // belt-and-braces guard for users who paste invalid text on browsers
      // without a native picker.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(form.expected_date)) {
        next.expected_date = 'Expected date must be a valid date.';
      }
    }
    if (form.notes && form.notes.length > 2000) {
      next.notes = 'Notes are too long.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!editAllowed) return;
    if (!validate()) return;
    const payload = {};
    payload.supplier_id = form.supplier_id ? Number(form.supplier_id) : null;
    if (form.cash_account_id) {
      payload.cash_account_id = Number(form.cash_account_id);
    }
    payload.payment_method = form.payment_method || 'cash';
    payload.expected_date = form.expected_date ? form.expected_date : null;
    const trimmedNotes = form.notes?.trim();
    payload.notes = trimmedNotes ? trimmedNotes : null;
    mutation.mutate(payload);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={
        purchaseOrder
          ? `Edit header - ${purchaseOrder.po_number || `PO #${purchaseOrder.id}`}`
          : 'Edit purchase order'
      }
      description="Update supplier, payment details, expected delivery date, or notes. Other fields stay locked once the order has been created."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="po-header-edit-form"
            isLoading={mutation.isPending}
            disabled={!editAllowed}
          >
            Save changes
          </Button>
        </>
      }
    >
      {!editAllowed ? (
        <p className="text-sm text-ink-300">
          Only draft and pending orders can be edited. This order is locked at its
          current stage. Close this dialog and try again with a different order.
        </p>
      ) : (
        <form
          id="po-header-edit-form"
          onSubmit={handleSubmit}
          className="space-y-4"
          noValidate
        >
          {canSeeSuppliers ? (
            <Select
              label="Supplier"
              value={form.supplier_id}
              onChange={(event) => handleChange('supplier_id', event.target.value)}
              error={errors.supplier_id}
              description="Set to no supplier to clear the link."
            >
              <option value="">No supplier</option>
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
              description="Numeric only. Ask an administrator for catalog access if you need a supplier picker."
            />
          )}

          {canSeeCashAccounts ? (
            <Select
              label="Payment cash account"
              value={form.cash_account_id}
              onChange={(event) => handleChange('cash_account_id', event.target.value)}
              error={errors.cash_account_id}
              description="Used for the automatic supplier payment on approval."
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
              label="Payment cash account ID"
              type="number"
              min="1"
              value={form.cash_account_id}
              onChange={(event) => handleChange('cash_account_id', event.target.value)}
              error={errors.cash_account_id}
              description="Numeric only. accounting.view is needed for a picker."
            />
          )}

          <Select
            label="Payment method"
            value={form.payment_method}
            onChange={(event) => handleChange('payment_method', event.target.value)}
          >
            {PAYMENT_METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Input
            label="Expected date"
            type="date"
            value={form.expected_date || ''}
            onChange={(event) => handleChange('expected_date', event.target.value)}
            error={errors.expected_date}
            description="Leave blank to clear the expected date."
          />

          <Textarea
            label="Notes"
            value={form.notes || ''}
            onChange={(event) => handleChange('notes', event.target.value)}
            error={errors.notes}
            rows={4}
            description="Plain text notes about this order."
          />
        </form>
      )}
    </Modal>
  );
}
