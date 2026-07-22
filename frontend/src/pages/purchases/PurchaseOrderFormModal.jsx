import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
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
import { formatNumber } from '@/lib/formatters.js';
import { useCashAccountsOptions, useSuppliersOptions } from './usePurchasesOptions.js';
import { PAYMENT_METHODS, PURCHASES_PERMISSIONS } from './purchases.config.js';
import {
  useItemsOptions,
  useWarehousesOptions
} from '@/pages/inventory/useInventoryOptions.js';
import {
  formatStockQuantity,
  getEntryUnitLabel
} from '@/pages/inventory/stockUnits.js';

const INVENTORY_VIEW = 'inventory.view';

function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptyItem() {
  return {
    item_id: '',
    ordered_quantity: '',
    unit_cost: '',
    notes: ''
  };
}

function emptyForm() {
  return {
    po_number: '',
    supplier_id: '',
    warehouse_id: '',
    cash_account_id: '',
    payment_method: 'cash',
    order_date: todayString(),
    expected_date: '',
    discount_amount: 0,
    notes: '',
    items: [emptyItem()]
  };
}

function parseLineTotal(item) {
  const qty = Number(item.ordered_quantity);
  const cost = Number(item.unit_cost);
  if (Number.isNaN(qty) || Number.isNaN(cost)) return 0;
  return qty * cost;
}

function stockEquivalent(quantity, item) {
  const qty = Number(quantity);
  if (!item || Number.isNaN(qty) || qty <= 0) {
    return '';
  }
  if (item.stock_mode === 'carton_weight') {
    const kg = qty * Number(item.kg_per_carton || 0);
    const looseUnits = qty * Number(item.loose_units_per_carton || 0);
    return `${formatNumber(kg, { maximumFractionDigits: 4 })} kg (${formatNumber(looseUnits)} loose units)`;
  }
  if (item.base_unit_type !== 'weight') return '';
  return formatStockQuantity(qty * Number(item.base_unit_conversion_to_base || 1), item);
}

export function PurchaseOrderFormModal({ open, onClose }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canLoadInventoryOptions = hasPermission(INVENTORY_VIEW);
  const canSeeCashAccounts = hasPermission(PURCHASES_PERMISSIONS.accountingView);
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setErrors({});
  }, [open]);

  const suppliersQuery = useSuppliersOptions(open);
  const warehousesQuery = useWarehousesOptions(open && canLoadInventoryOptions);
  const itemsQuery = useItemsOptions(open && canLoadInventoryOptions, { tracking_type: 'stocked' });
  const cashAccountsQuery = useCashAccountsOptions(open && canSeeCashAccounts, { cash_flow_direction: 'outgoing' });

  const suppliers = suppliersQuery.data?.data?.suppliers || [];
  const warehouses = warehousesQuery.data?.data?.warehouses || [];
  const items = itemsQuery.data?.data?.items || [];
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];

  const subtotal = useMemo(
    () => form.items.reduce((sum, item) => sum + parseLineTotal(item), 0),
    [form.items]
  );
  const total = subtotal - Number(form.discount_amount || 0);

  const mutation = useMutation({
    mutationFn: (payload) => api.purchases.purchaseOrders.create(payload),
    onSuccess: () => {
      toast.success('Purchase order created');
      queryClient.invalidateQueries({ queryKey: ['purchases', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchases', 'options', 'purchase-orders'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not create purchase order.'));
    }
  });

  function handleField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function updateItem(index, field, value) {
    setForm((prev) => {
      const items = prev.items.slice();
      const nextItem = { ...items[index], [field]: value };
      if (field === 'item_id') {
        const selected = itemsQuery.data?.data?.items?.find((option) => String(option.id) === String(value));
        if (selected && nextItem.unit_cost === '') {
          nextItem.unit_cost = selected.default_cost ?? '';
        }
      }
      items[index] = nextItem;
      return { ...prev, items };
    });
    const errorKey = `items.${index}.${field}`;
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: undefined }));
    }
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  }

  function removeItem(index) {
    setForm((prev) => {
      const items = prev.items.filter((_, idx) => idx !== index);
      return {
        ...prev,
        items: items.length === 0 ? [emptyItem()] : items
      };
    });
  }

  function validate() {
    const next = {};
    const warehouseId = Number(form.warehouse_id);
    if (!form.warehouse_id || Number.isNaN(warehouseId) || warehouseId <= 0) {
      next.warehouse_id = 'Warehouse is required.';
    }
    if (!form.supplier_id) {
      next.supplier_id = 'Supplier is required.';
    }
    const cashAccountId = Number(form.cash_account_id);
    if (!form.cash_account_id || Number.isNaN(cashAccountId) || cashAccountId <= 0) {
      next.cash_account_id = 'Cash account is required.';
    }
    if (!form.order_date) {
      next.order_date = 'Order date is required.';
    }
    if (form.discount_amount && Number(form.discount_amount) < 0) {
      next.discount_amount = 'Discount cannot be negative.';
    }
    if (!form.items.length) {
      next.items = 'At least one line item is required.';
    } else {
      form.items.forEach((item, index) => {
        const itemId = Number(item.item_id);
        const selected = items.find((option) => String(option.id) === String(item.item_id));
        if (!item.item_id || Number.isNaN(itemId) || itemId <= 0) {
          next[`items.${index}.item_id`] = 'Item is required.';
        }
        const qty = Number(item.ordered_quantity);
        if (!item.ordered_quantity || Number.isNaN(qty) || qty <= 0) {
          next[`items.${index}.ordered_quantity`] = 'Quantity must be greater than zero.';
        } else if (selected?.stock_mode === 'carton_weight' && !Number.isInteger(qty)) {
          next[`items.${index}.ordered_quantity`] = 'Carton count must be a whole number.';
        }
        const cost = Number(item.unit_cost);
        if (item.unit_cost === '' || Number.isNaN(cost) || cost < 0) {
          next[`items.${index}.unit_cost`] = 'Unit cost cannot be negative.';
        }
      });
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      po_number: form.po_number?.trim() || undefined,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      warehouse_id: Number(form.warehouse_id),
      cash_account_id: Number(form.cash_account_id),
      payment_method: form.payment_method,
      order_date: form.order_date,
      expected_date: form.expected_date || null,
      discount_amount: Number(form.discount_amount) || 0,
      tax_amount: 0,
      notes: form.notes?.trim() || null,
      items: form.items.map((item) => {
        const selected = items.find((option) => String(option.id) === String(item.item_id));
        const common = { item_id: Number(item.item_id), notes: item.notes?.trim() || null };
        return selected?.stock_mode === 'carton_weight'
          ? { ...common, carton_count: Number(item.ordered_quantity), cost_per_carton: Number(item.unit_cost) }
          : { ...common, quantity: Number(item.ordered_quantity), unit_cost: Number(item.unit_cost) };
      })
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="New purchase order"
      description="Define header details, then add at least one line item. Carton-weight items use cartons and cost per carton; other items use their base stock unit."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="po-form" isLoading={mutation.isPending}>
            Create order
          </Button>
        </>
      }
    >
      <form id="po-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Input
            label="PO number"
            value={form.po_number}
            onChange={(event) => handleField('po_number', event.target.value)}
            error={errors.po_number}
            description="Optional. Auto-generated when blank."
          />
          <Select
            label="Supplier"
            value={form.supplier_id}
            onChange={(event) => handleField('supplier_id', event.target.value)}
            error={errors.supplier_id}
            required
            description="Used for the automatic supplier payment on approval."
          >
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
          {canLoadInventoryOptions ? (
            <Select
              label="Warehouse"
              value={form.warehouse_id}
              onChange={(event) => handleField('warehouse_id', event.target.value)}
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
              onChange={(event) => handleField('warehouse_id', event.target.value)}
              error={errors.warehouse_id}
              required
              description="Numeric only. inventory.view is needed for a warehouse picker."
            />
          )}
          <Input
            label="Order date"
            type="date"
            value={form.order_date}
            onChange={(event) => handleField('order_date', event.target.value)}
            error={errors.order_date}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {canSeeCashAccounts ? (
            <Select
              label="Payment cash account"
              value={form.cash_account_id}
              onChange={(event) => handleField('cash_account_id', event.target.value)}
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
              label="Payment cash account ID"
              type="number"
              min="1"
              value={form.cash_account_id}
              onChange={(event) => handleField('cash_account_id', event.target.value)}
              error={errors.cash_account_id}
              required
              description="Numeric only. accounting.view is needed for a picker."
            />
          )}
          <Select
            label="Payment method"
            value={form.payment_method}
            onChange={(event) => handleField('payment_method', event.target.value)}
          >
            {PAYMENT_METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Expected date"
            type="date"
            value={form.expected_date}
            onChange={(event) => handleField('expected_date', event.target.value)}
            error={errors.expected_date}
          />
          <Input
            label="Discount amount"
            type="number"
            min="0"
            step="0.0001"
            value={form.discount_amount}
            onChange={(event) => handleField('discount_amount', event.target.value)}
            error={errors.discount_amount}
          />
        </div>

        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(event) => handleField('notes', event.target.value)}
          rows={2}
        />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold text-ink-50">Line items</h3>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={Plus}
              onClick={addItem}
            >
              Add line
            </Button>
          </div>
          {errors.items && (
            <p className="text-xs text-rose-300">{errors.items}</p>
          )}
          <div className="space-y-3">
            {form.items.map((item, index) => {
              const itemError = errors[`items.${index}.item_id`];
              const qtyError = errors[`items.${index}.ordered_quantity`];
              const costError = errors[`items.${index}.unit_cost`];
              const selectedItem = items.find((option) => String(option.id) === String(item.item_id));
              const isCartonWeight = selectedItem?.stock_mode === 'carton_weight';
              const unitLabel = getEntryUnitLabel(selectedItem);
              const storedQuantity = stockEquivalent(item.ordered_quantity, selectedItem);
              return (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <p className="text-xs uppercase tracking-wider text-ink-400">
                      Line {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      leftIcon={Trash2}
                      aria-label={`Remove line ${index + 1}`}
                      onClick={() => removeItem(index)}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {canLoadInventoryOptions ? (
                      <Select
                        label="Item"
                        value={item.item_id}
                        onChange={(event) =>
                          updateItem(index, 'item_id', event.target.value)
                        }
                        error={itemError}
                        required
                      >
                        <option value="">Select item</option>
                        {items.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}{option.code ? ` (${option.code})` : ''}{getEntryUnitLabel(option) ? ` - ${getEntryUnitLabel(option)}` : ''}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        label="Item ID"
                        type="number"
                        min="1"
                        value={item.item_id}
                        onChange={(event) =>
                          updateItem(index, 'item_id', event.target.value)
                        }
                        error={itemError}
                        required
                      />
                    )}
                    <Input
                      label={isCartonWeight ? 'Carton count' : `Quantity${unitLabel ? ` (${unitLabel})` : ''}`}
                      type="number"
                      min="0"
                      step={isCartonWeight ? '1' : '0.0001'}
                      value={item.ordered_quantity}
                      onChange={(event) =>
                        updateItem(index, 'ordered_quantity', event.target.value)
                      }
                      error={qtyError}
                      required
                      description={
                        storedQuantity
                          ? `Stock will show as ${storedQuantity}.`
                          : unitLabel
                            ? isCartonWeight
                              ? `Each carton is ${selectedItem.kg_per_carton} kg and contains ${selectedItem.loose_units_per_carton} loose units.`
                              : `Item base unit: ${unitLabel}.`
                            : undefined
                      }
                    />
                    <Input
                      label={isCartonWeight ? 'Cost per carton' : 'Unit cost'}
                      type="number"
                      min="0"
                      step="0.0001"
                      value={item.unit_cost}
                      onChange={(event) =>
                        updateItem(index, 'unit_cost', event.target.value)
                      }
                      error={costError}
                      required
                    />
                    <Input
                      label="Line notes"
                      value={item.notes || ''}
                      onChange={(event) => updateItem(index, 'notes', event.target.value)}
                    />
                  </div>
                  <p className="mt-2 text-right text-xs text-ink-300">
                    Line total{' '}
                    <span className="font-mono text-ink-100">
                      {formatNumber(parseLineTotal(item), { maximumFractionDigits: 4 })}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-300">Subtotal</span>
            <span className="font-mono text-ink-100">
              {formatNumber(subtotal, { maximumFractionDigits: 4 })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-300">Discount</span>
            <span className="font-mono text-ink-100">
              -{formatNumber(Number(form.discount_amount || 0), { maximumFractionDigits: 4 })}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 font-display text-base font-semibold">
            <span>Total</span>
            <span className="font-mono">
              {formatNumber(total, { maximumFractionDigits: 4 })}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}
