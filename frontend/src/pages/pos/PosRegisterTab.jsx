import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Check,
  Gift,
  Minus,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  User,
  UserPlus,
  X
} from 'lucide-react';
import { api } from '@/api/index.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { formatCurrency } from '@/lib/formatters.js';
import { Badge, Button, Input, Select } from '@/components/ui/index.js';
import { cn } from '@/lib/cn.js';
import { POS_ENTRY_TYPES } from './pos.constants.js';
import {
  buildLineFromOffer,
  isWholeQuantity,
  lineTotal,
  orderPayloadFromForm,
  todayInputValue
} from './pos.utils.js';
import {
  clearPosRegisterDraft,
  getPosRegisterDraftStorageKey,
  loadPosRegisterDraft,
  savePosRegisterDraft
} from './posDraftStorage.js';

import { useAuthStore } from '@/app/stores/authStore.js';
import { useSalesmenList } from '@/pages/locations/useLocationsOptions.js';

function customerOrderTotal(customer) {
  const lines = Array.isArray(customer?.lines) ? customer.lines : [];
  const saleLines = lines.filter((line) => line.line_type !== 'free_gift');
  const saleSubtotal = saleLines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0),
    0
  );
  const discountValue = Math.max(0, Number(customer?.discount_value || 0));
  const discount = customer?.discount_type === 'percent'
    ? saleSubtotal * Math.min(discountValue, 100) / 100
    : customer?.discount_type === 'fixed'
      ? Math.min(discountValue, saleSubtotal)
      : 0;
  let allocatedDiscount = 0;
  return lines.reduce((sum, line) => {
    if (line.line_type === 'free_gift') return sum;
    const lineSubtotal = Number(line.quantity || 0) * Number(line.unit_price || 0);
    const isLastSaleLine = line === saleLines[saleLines.length - 1];
    const lineDiscount = isLastSaleLine
      ? discount - allocatedDiscount
      : saleSubtotal > 0 ? discount * lineSubtotal / saleSubtotal : 0;
    allocatedDiscount += lineDiscount;
    return sum + (lineSubtotal - lineDiscount) * (1 + Number(line.vat_rate || 0) / 100);
  }, 0);
}

export function PosRegisterTab({
  warehouses = [],
  defaultWarehouseId,
  canRequestGifts = false,
  canCreateCustomers = false,
  onCreateCustomer,
  onSalesmanChange,
  onOrderSuccess,
  editingDispatch = null,
  isEditing = false,
  onCancelEdit
}) {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const userId = useAuthStore((state) => state.user?.id);
  const storeId = useAuthStore((state) => state.user?.store_id);
  const canManageOthers = hasPermission('pos.create_for_salesman');
  const salesmenQuery = useSalesmenList(canManageOthers);
  const salesmen = salesmenQuery.data?.data?.salesmen || [];
  const draftStorageKey = useMemo(() => getPosRegisterDraftStorageKey(userId, storeId), [storeId, userId]);
  const fallbackWarehouseId = defaultWarehouseId || warehouses[0]?.id || '';
  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    () => String(defaultWarehouseId || warehouses[0]?.id || '')
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState(() => todayInputValue());
  const [search, setSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orderNotes, setOrderNotes] = useState('');
  const [cart, setCart] = useState([]);
  const [errors, setErrors] = useState({});

  // Store customer map for multi-customer draft orders: customerId -> customer, lines, and discount.
  const [draftCustomersMap, setDraftCustomersMap] = useState({});
  const [draftRestored, setDraftRestored] = useState(false);
  const previousDraftStorageKey = useRef(draftStorageKey);

  // Persist the complete multi-customer form so a cashier can safely reload
  // the browser or return after a route change.
  useEffect(() => {
    const previousKey = previousDraftStorageKey.current;
    if (previousKey && previousKey !== draftStorageKey) {
      // Store context changed. A cashier must never carry an in-progress
      // order into another store, so discard the old scoped recovery draft.
      clearPosRegisterDraft(previousKey);
      setSelectedCustomerId('');
      setCart([]);
      setDraftCustomersMap({});
      setOrderNotes('');
    }
    previousDraftStorageKey.current = draftStorageKey;
    setDraftRestored(false);
    if (isEditing) return;
    const savedDraft = loadPosRegisterDraft(draftStorageKey);
    if (savedDraft) {
      const salesmanId = String(savedDraft.selectedSalesmanId || '');
      setSelectedSalesmanId(salesmanId);
      onSalesmanChange?.(salesmanId);
      setSelectedWarehouseId(String(savedDraft.selectedWarehouseId || fallbackWarehouseId));
      setSelectedCustomerId(String(savedDraft.selectedCustomerId || ''));
      setOrderDate(savedDraft.orderDate || todayInputValue());
      setOrderNotes(savedDraft.orderNotes || '');
      setCart(Array.isArray(savedDraft.cart) ? savedDraft.cart : []);
      setDraftCustomersMap(savedDraft.draftCustomersMap && typeof savedDraft.draftCustomersMap === 'object'
        ? savedDraft.draftCustomersMap
        : {});
    }
    setDraftRestored(true);
  }, [draftStorageKey, fallbackWarehouseId, isEditing, onSalesmanChange]);

  useEffect(() => {
    if (!draftRestored || isEditing) return;
    const hasDraftContent = Boolean(
      selectedCustomerId
      || orderNotes.trim()
      || cart.length
      || Object.values(draftCustomersMap).some((customer) => Array.isArray(customer?.lines) && customer.lines.length)
    );
    if (!hasDraftContent) {
      clearPosRegisterDraft(draftStorageKey);
      return;
    }
    savePosRegisterDraft(draftStorageKey, {
      selectedSalesmanId,
      selectedWarehouseId,
      selectedCustomerId,
      orderDate,
      orderNotes,
      cart,
      draftCustomersMap,
      savedAt: new Date().toISOString()
    });
  }, [cart, draftCustomersMap, draftRestored, draftStorageKey, isEditing, orderDate, orderNotes, selectedCustomerId, selectedSalesmanId, selectedWarehouseId]);

  // Populate form fields and customer maps when an editingDispatch is passed
  useEffect(() => {
    if (!isEditing || !editingDispatch) return;

    if (editingDispatch.salesman_id) {
      const salesmanId = String(editingDispatch.salesman_id);
      setSelectedSalesmanId(salesmanId);
      onSalesmanChange?.(salesmanId);
    }
    if (editingDispatch.warehouse_id) {
      setSelectedWarehouseId(String(editingDispatch.warehouse_id));
    }
    if (editingDispatch.request_date) {
      setOrderDate(String(editingDispatch.request_date).split('T')[0]);
    }
    if (editingDispatch.notes !== undefined) {
      setOrderNotes(editingDispatch.notes || '');
    }

    const customerList = Array.isArray(editingDispatch.customers) ? editingDispatch.customers : [];
    const linesByCustomerId = (editingDispatch.items || []).reduce((grouped, line) => {
      const customerId = String(line.dispatch_customer_id);
      if (!grouped.has(customerId)) grouped.set(customerId, []);
      grouped.get(customerId).push(line);
      return grouped;
    }, new Map());
    if (customerList.length > 0) {
      const map = {};
      customerList.forEach((c) => {
        const custId = String(c.customer_id);
        const sourceLines = linesByCustomerId.get(String(c.id)) || c.lines || [];
        const lines = sourceLines.map((line) => ({
          _key: `edit-line-${line.id || line.sale_catalog_entry_id}`,
          sale_catalog_entry_id: String(line.sale_catalog_entry_id),
          quantity: String(line.quantity),
          unit_price: line.unit_price !== undefined ? String(line.unit_price) : '',
          vat_rate: line.vat_rate !== undefined ? String(line.vat_rate) : '',
          line_type: line.line_type || 'sale',
          display_name: line.item_name_snapshot || line.catalog_display_name || line.display_name || 'Offer Item',
          unit_label: line.unit_label_snapshot || ''
        }));
        map[custId] = {
          customer_id: custId,
          customer_name: c.customer_name || c.name || `Customer #${custId}`,
          discount_type: c.discount_type || '',
          discount_value: c.discount_value ? String(c.discount_value) : '',
          lines
        };
      });
      setDraftCustomersMap(map);
      const firstCustId = String(customerList[0].customer_id);
      setSelectedCustomerId(firstCustId);
      setCart(map[firstCustId]?.lines || []);
    }
  }, [editingDispatch, isEditing]);

  // Sync warehouse choice when defaults resolve
  useEffect(() => {
    if (!selectedWarehouseId && defaultWarehouseId) {
      setSelectedWarehouseId(String(defaultWarehouseId));
    } else if (!selectedWarehouseId && warehouses.length > 0) {
      setSelectedWarehouseId(String(warehouses[0].id));
    }
  }, [defaultWarehouseId, warehouses, selectedWarehouseId]);

  const numericWarehouseId = Number(selectedWarehouseId);
  const hasWarehouse = Number.isInteger(numericWarehouseId) && numericWarehouseId > 0;

  // Data Queries
  const customersQuery = useQuery({
    queryKey: ['pos', 'customers', 'options', selectedSalesmanId || 'self', customerSearch],
    queryFn: () => api.pos.customers.list({
      page: 1,
      limit: 50,
      ...(customerSearch.trim() ? { search: customerSearch.trim() } : {}),
      ...(canManageOthers ? { salesman_id: Number(selectedSalesmanId) } : {})
    }),
    enabled: !canManageOthers || Boolean(selectedSalesmanId)
  });

  const catalogueQuery = useQuery({
    queryKey: ['pos', 'catalog', { warehouse_id: numericWarehouseId, search }],
    queryFn: () => api.pos.catalog.list({
      warehouse_id: numericWarehouseId,
      page: 1,
      limit: 100,
      ...(search.trim() ? { search: search.trim() } : {})
    }),
    enabled: hasWarehouse
  });

  const customers = customersQuery.data?.data?.customers || [];
  const offers = catalogueQuery.data?.data?.sale_catalog_entries || [];
  const selectedCustomerObj = useMemo(
    () => customers.find((customer) => String(customer.id) === String(selectedCustomerId)),
    [customers, selectedCustomerId]
  );

  // Sync current cart modifications back into draftCustomersMap for selected customer
  useEffect(() => {
    if (!selectedCustomerId) return;
    setDraftCustomersMap((prev) => {
      const existing = prev[selectedCustomerId];
      if (!existing && cart.length === 0) return prev;
      return {
        ...prev,
        [selectedCustomerId]: {
          ...(existing || { customer_id: selectedCustomerId }),
          customer_name: selectedCustomerObj?.name || existing?.customer_name || `Customer #${selectedCustomerId}`,
          lines: cart
        }
      };
    });
  }, [cart, selectedCustomerId, selectedCustomerObj]);

  // Filter categories dynamically from available catalog entries
  const availableCategories = useMemo(() => {
    const types = new Set(offers.map((offer) => offer.entry_type).filter(Boolean));
    return Array.from(types);
  }, [offers]);

  // Filter offers based on search and category
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const name = (offer.display_name || offer.catalog_display_name || offer.item_name || '').toLowerCase();
      const matchesCategory = selectedCategory === 'all' || offer.entry_type === selectedCategory;
      return matchesCategory;
    });
  }, [offers, selectedCategory]);

  // Map of cart item count by offer ID
  const cartItemCounts = useMemo(() => {
    const map = new Map();
    for (const item of cart) {
      const current = map.get(item.sale_catalog_entry_id) || 0;
      map.set(item.sale_catalog_entry_id, current + Number(item.quantity || 0));
    }
    return map;
  }, [cart]);

  // Cart Calculations
  const currentCustomerDiscount = useMemo(() => {
    if (!selectedCustomerId) return { type: '', value: '', amount: 0 };
    const current = draftCustomersMap[selectedCustomerId] || {};
    const type = current.discount_type || '';
    const value = Number(current.discount_value || 0);
    const saleSubtotal = cart
      .filter((line) => line.line_type !== 'free_gift')
      .reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_price || 0), 0);
    const amount = type === 'percent'
      ? saleSubtotal * Math.min(Math.max(value, 0), 100) / 100
      : type === 'fixed'
        ? Math.min(Math.max(value, 0), saleSubtotal)
        : 0;
    return { type, value: current.discount_value || '', amount };
  }, [cart, draftCustomersMap, selectedCustomerId]);

  const giftItemsCount = useMemo(() => {
    return cart.filter((line) => line.line_type === 'free_gift').length;
  }, [cart]);

  // Active Draft Customers List & Summary
  const activeCustomersList = useMemo(() => {
    const merged = {
      ...draftCustomersMap,
      ...(selectedCustomerId && cart.length > 0 ? {
        [selectedCustomerId]: {
          ...(draftCustomersMap[selectedCustomerId] || {}),
          customer_id: selectedCustomerId,
          customer_name: selectedCustomerObj?.name || `Customer #${selectedCustomerId}`,
          lines: cart
        }
      } : {})
    };
    return Object.values(merged).filter((c) => Array.isArray(c.lines) && c.lines.length > 0);
  }, [draftCustomersMap, selectedCustomerId, cart, selectedCustomerObj]);

  const totalLinesCount = useMemo(() => {
    return activeCustomersList.reduce((sum, c) => sum + (c.lines || []).length, 0);
  }, [activeCustomersList]);

  const orderTotal = useMemo(
    () => activeCustomersList.reduce((sum, customer) => sum + customerOrderTotal(customer), 0),
    [activeCustomersList]
  );

  function clearSavedOrder() {
    setSelectedCustomerId('');
    setOrderDate(todayInputValue());
    setOrderNotes('');
    setCart([]);
    setDraftCustomersMap({});
    setErrors({});
    clearPosRegisterDraft(draftStorageKey);
  }

  // Submit Order Mutation (Create Draft Order with 1 or multiple customers)
  const submitMutation = useMutation({
    mutationFn: (payload) => api.dispatch.requests.create(payload),
    onSuccess: () => {
      toast.success('Order draft created in Orders & deliveries');
      clearSavedOrder();
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'workspace'] });
      if (onOrderSuccess) onOrderSuccess();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Failed to create the draft order.'));
    }
  });

  // Update Order Mutation (Edit Existing Order)
  const updateMutation = useMutation({
    mutationFn: (payload) => api.dispatch.requests.update(editingDispatch.id, payload),
    onSuccess: () => {
      toast.success(`Updated order ${editingDispatch.dispatch_number || `#${editingDispatch.id}`}`);
      clearSavedOrder();
      queryClient.invalidateQueries({ queryKey: ['dispatch', 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['pos', 'workspace'] });
      if (onOrderSuccess) onOrderSuccess();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Failed to update the order.'));
    }
  });

  // Switch active customer draft
  function handleSelectCustomer(newCustId) {
    // A cashier may add lines before choosing the customer. In that case the
    // first customer selection owns the current cart; it must not clear it.
    if (!selectedCustomerId && newCustId && cart.length > 0) {
      setDraftCustomersMap((prev) => ({
        ...prev,
        [newCustId]: {
          ...(prev[newCustId] || { customer_id: newCustId }),
          customer_name: customers.find((customer) => String(customer.id) === String(newCustId))?.name || `Customer #${newCustId}`,
          lines: cart
        }
      }));
      setSelectedCustomerId(newCustId);
      return;
    }
    if (selectedCustomerId && newCustId !== selectedCustomerId) {
      setDraftCustomersMap((prev) => ({
        ...prev,
        [selectedCustomerId]: {
          ...(prev[selectedCustomerId] || { customer_id: selectedCustomerId }),
          customer_name: selectedCustomerObj?.name || `Customer #${selectedCustomerId}`,
          lines: cart
        }
      }));
    }
    setSelectedCustomerId(newCustId);
    const existing = draftCustomersMap[newCustId];
    setCart(existing?.lines || []);
  }

  function handleAddNewCustomerDraft() {
    if (selectedCustomerId && cart.length > 0) {
      setDraftCustomersMap((prev) => ({
        ...prev,
        [selectedCustomerId]: {
          ...(prev[selectedCustomerId] || { customer_id: selectedCustomerId }),
          customer_name: selectedCustomerObj?.name || `Customer #${selectedCustomerId}`,
          lines: cart
        }
      }));
    }
    setSelectedCustomerId('');
    setCart([]);
  }

  function updateCustomerDiscount(field, value) {
    if (!selectedCustomerId) return;
    setDraftCustomersMap((prev) => ({
      ...prev,
      [selectedCustomerId]: {
        ...(prev[selectedCustomerId] || { customer_id: selectedCustomerId }),
        customer_name: selectedCustomerObj?.name || prev[selectedCustomerId]?.customer_name || `Customer #${selectedCustomerId}`,
        lines: cart,
        [field]: value
      }
    }));
  }

  function handleRemoveCustomerDraft(custId) {
    setDraftCustomersMap((prev) => {
      const copy = { ...prev };
      delete copy[custId];
      return copy;
    });
    if (selectedCustomerId === custId) {
      setSelectedCustomerId('');
      setCart([]);
    }
  }

  // Cart Management Actions
  function handleAddToCart(offer) {
    const existingIndex = cart.findIndex((line) => line.sale_catalog_entry_id === String(offer.id));
    if (existingIndex >= 0) {
      const currentQty = Number(cart[existingIndex].quantity || 0);
      updateLineQuantity(existingIndex, currentQty + 1);
    } else {
      const newLine = buildLineFromOffer(offer);
      setCart((prev) => [...prev, newLine]);
    }
  }

  function updateLineQuantity(index, newQty) {
    if (newQty <= 0) {
      removeCartLine(index);
      return;
    }
    setCart((prev) =>
      prev.map((line, idx) => (idx === index ? { ...line, quantity: String(newQty) } : line))
    );
  }

  function toggleLineType(index) {
    setCart((prev) =>
      prev.map((line, idx) => {
        if (idx !== index) return line;
        const nextType = line.line_type === 'sale' ? 'free_gift' : 'sale';
        return { ...line, line_type: nextType };
      })
    );
  }

  function updateLineNote(index, note) {
    setCart((prev) =>
      prev.map((line, idx) => (idx === index ? { ...line, notes: note } : line))
    );
  }

  function removeCartLine(index) {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleClearCart() {
    setCart([]);
    setErrors({});
  }

  function validate() {
    const newErrors = {};
    if (canManageOthers && !selectedSalesmanId) newErrors.salesman_id = 'Select the salesman who will own this order.';
    if (!hasWarehouse) newErrors.warehouse_id = 'Please select a warehouse.';
    if (!selectedCustomerId) newErrors.customer_id = 'Please select a customer.';
    if (!orderDate) newErrors.order_date = 'Order date is required.';
    if (cart.length === 0) newErrors.cart = 'Add at least one item to the order.';

    const invalidQuantity = cart.find((line) => {
      const qty = Number(line.quantity);
      return !Number.isFinite(qty) || qty <= 0 || (isWholeQuantity(line) && !Number.isInteger(qty));
    });

    if (invalidQuantity) {
      newErrors.cart = 'Quantities must be positive (and whole numbers for cartons/pieces).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmitOrder() {
    const mergedMap = {
      ...draftCustomersMap,
      ...(selectedCustomerId && cart.length > 0 ? {
        [selectedCustomerId]: {
          ...(draftCustomersMap[selectedCustomerId] || {}),
          customer_id: selectedCustomerId,
          customer_name: selectedCustomerObj?.name || `Customer #${selectedCustomerId}`,
          lines: cart
        }
      } : {})
    };

    const activeCustomers = Object.values(mergedMap).filter((c) => Array.isArray(c.lines) && c.lines.length > 0);

    const newErrors = {};
    if (canManageOthers && !selectedSalesmanId) newErrors.salesman_id = 'Select the salesman who will own this order.';
    if (!hasWarehouse) newErrors.warehouse_id = 'Please select a warehouse.';
    if (!orderDate) newErrors.order_date = 'Order date is required.';
    if (activeCustomers.length === 0) newErrors.cart = 'Add at least one customer with product items to the order.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      ...(canManageOthers ? { salesman_id: Number(selectedSalesmanId) } : {}),
      warehouse_id: Number(selectedWarehouseId),
      request_date: orderDate,
      notes: orderNotes,
      customers: activeCustomers.map((c) => ({
        customer_id: Number(c.customer_id),
        discount_type: c.discount_type || undefined,
        discount_value: c.discount_type && c.discount_value !== '' ? Number(c.discount_value) : undefined,
        lines: c.lines.map((line) => ({
          sale_catalog_entry_id: Number(line.sale_catalog_entry_id),
          quantity: Number(line.quantity),
          unit_price: line.unit_price !== '' ? Number(line.unit_price) : undefined,
          vat_rate: line.vat_rate !== '' ? Number(line.vat_rate) : undefined,
          line_type: line.line_type || 'sale'
        }))
      }))
    };

    if (editingDispatch) {
      updateMutation.mutate(payload);
    } else {
      submitMutation.mutate(payload);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12 items-start">
      {/* LEFT SECTION: CATALOGUE & REGISTER GRID (7/12 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Editing Mode Banner */}
        {editingDispatch && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/15 via-indigo-500/10 to-transparent p-4 shadow-glass">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300 border border-brand-400/30">
                <Pencil className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-ink-50">
                    Editing Order {editingDispatch.dispatch_number || `#${editingDispatch.id}`}
                  </span>
                  <Badge tone="info" className="text-[10px] uppercase">
                    {editingDispatch.status}
                  </Badge>
                </div>
                <p className="text-xs text-ink-300">
                  Update quantities, customers, and order lines, then click save.
                </p>
              </div>
            </div>
            {onCancelEdit && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={X}
                onClick={onCancelEdit}
                className="text-xs text-ink-300 hover:text-ink-50"
              >
                Cancel editing
              </Button>
            )}
          </div>
        )}

        {/* Top Controls: Warehouse & Salesman Selector */}
        <div className="glass-panel p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-ink-100 font-medium">
              <Building2 className="h-5 w-5 text-brand-400" />
              <span>Register Warehouse</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {canManageOthers && (
                <div className="min-w-[180px]">
                  <Select
                    label="Assign order to salesman"
                    value={selectedSalesmanId}
                    onChange={(e) => {
                      setSelectedSalesmanId(e.target.value);
                      onSalesmanChange?.(e.target.value);
                      setSelectedCustomerId('');
                    }}
                    error={errors.salesman_id}
                  >
                    <option value="">Select salesman</option>
                    {salesmen.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.full_name || s.user_name || `Salesman #${s.id}`}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="min-w-[180px]">
                <Select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  error={errors.warehouse_id}
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Search bar & Category filter pills */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <Input
              leftIcon={Search}
              placeholder="Search product name, code, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-glass">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap',
                  selectedCategory === 'all'
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'text-ink-300 hover:bg-white/5 hover:text-ink-100'
                )}
              >
                All Products ({offers.length})
              </button>

              {availableCategories.map((type) => {
                const label = POS_ENTRY_TYPES[type]?.label || type;
                const count = offers.filter((o) => o.entry_type === type).length;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedCategory(type)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap',
                      selectedCategory === type
                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40 shadow-sm'
                        : 'text-ink-300 hover:bg-white/5 hover:text-ink-100'
                    )}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product Offers Grid */}
        {!hasWarehouse ? (
          <div className="glass-panel p-8 text-center text-ink-300 space-y-2">
            <Package className="h-10 w-10 mx-auto opacity-50 text-ink-400" />
            <p className="font-medium text-sm">Please select a register warehouse</p>
            <p className="text-xs text-ink-400">Choose a warehouse above to load sale catalogue offers.</p>
          </div>
        ) : catalogueQuery.isPending ? (
          <div className="glass-panel p-12 text-center text-xs text-ink-400 space-y-2">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
            <p>Loading catalogue offers...</p>
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="glass-panel p-8 text-center text-ink-300 space-y-2">
            <Search className="h-8 w-8 mx-auto opacity-50 text-ink-400" />
            <p className="font-medium text-sm">No products found</p>
            <p className="text-xs text-ink-400">Try adjusting your search filter or category selection.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOffers.map((offer) => {
              const inCartQty = cartItemCounts.get(String(offer.id)) || 0;
              const typeLabel = POS_ENTRY_TYPES[offer.entry_type]?.label || offer.entry_type;
              return (
                <div
                  key={offer.id}
                  onClick={() => handleAddToCart(offer)}
                  className={cn(
                    'group relative flex flex-col justify-between p-3.5 rounded-2xl border transition cursor-pointer',
                    inCartQty > 0
                      ? 'bg-gradient-to-b from-brand-500/10 to-brand-500/5 border-brand-500/30 shadow-md'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20'
                  )}
                >
                  {inCartQty > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                      <ShoppingCart className="h-3 w-3" />
                      <span>{inCartQty}</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge tone="info" className="text-[10px] px-1.5 py-0 capitalize">
                        {typeLabel}
                      </Badge>
                      {offer.unit_label && (
                        <span className="text-[11px] text-ink-400">· {offer.unit_label}</span>
                      )}
                    </div>
                    <h4 className="font-medium text-ink-50 text-sm line-clamp-2 group-hover:text-brand-300 transition">
                      {offer.display_name || offer.item_name || 'Sale Offer'}
                    </h4>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                    <span className="font-mono font-semibold text-sm text-ink-100">
                      {formatCurrency(offer.default_price || 0)}
                    </span>

                    <Button
                      size="sm"
                      variant={inCartQty > 0 ? 'primary' : 'secondary'}
                      leftIcon={Plus}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(offer);
                      }}
                      className="h-7 text-xs px-2.5"
                    >
                      {inCartQty > 0 ? 'Add more' : 'Add'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT SECTION: LIVE CART & CHECKOUT TERMINAL (5/12 cols) */}
      <div className="lg:col-span-5 space-y-4">
        <div className="glass-panel p-4 space-y-4">
          {/* Terminal Cart Header & Customer Picker */}
          <div className="space-y-3 pb-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-accent-400" />
                <h3 className="font-semibold text-ink-50">
                  {editingDispatch ? 'Order Cart' : 'Draft order'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="h-8 text-xs w-[130px]"
                />
                {cart.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={RotateCcw}
                    onClick={handleClearCart}
                    title="Clear order cart"
                    className="h-8 text-xs text-ink-300 hover:text-rose-400"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Draft Customers Pills Bar */}
            <div className="space-y-1.5 pt-1 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                  Order Customers ({Object.keys(draftCustomersMap).length || (selectedCustomerId ? 1 : 0)})
                </label>
                {!editingDispatch && (
                  <button
                    type="button"
                    onClick={handleAddNewCustomerDraft}
                    className="flex items-center gap-1 text-[11px] font-medium text-brand-300 hover:text-brand-200 transition"
                  >
                    <UserPlus className="h-3 w-3" />
                    <span>+ Add Customer</span>
                  </button>
                )}
              </div>

              {Object.keys(draftCustomersMap).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {Object.values(draftCustomersMap).map((cust) => {
                    const isSelected = String(cust.customer_id) === String(selectedCustomerId);
                    const lineCount = (cust.lines || []).length;
                    return (
                      <div
                        key={cust.customer_id}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all duration-150 border',
                          isSelected
                            ? 'bg-brand-500/25 border-brand-500/40 text-brand-200 font-semibold shadow-sm'
                            : 'bg-white/[0.04] border-white/10 text-ink-300 hover:bg-white/10 hover:text-ink-50'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectCustomer(String(cust.customer_id))}
                          className="flex items-center gap-1.5 truncate max-w-[120px]"
                        >
                          <User className="h-3 w-3 opacity-70 shrink-0" />
                          <span className="truncate">{cust.customer_name || `Customer #${cust.customer_id}`}</span>
                          <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-mono shrink-0">
                            {lineCount}
                          </span>
                        </button>
                        {!editingDispatch && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomerDraft(String(cust.customer_id));
                            }}
                            className="text-ink-400 hover:text-rose-400 transition p-0.5"
                            title="Remove customer from draft"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Picker + QUICK ADD CUSTOMER BUTTON */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-ink-300 mb-1">
                <span>Customer</span>
                {selectedCustomerObj && (
                  <span className="text-ink-400 text-[11px] truncate max-w-[150px]">
                    {selectedCustomerObj.phone || selectedCustomerObj.sublocation_name}
                  </span>
                )}
              </div>
              <Input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers by name, phone, or code..."
                leftIcon={Search}
                className="mb-2"
                disabled={canManageOthers && !selectedSalesmanId}
              />
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    error={errors.customer_id}
                    disabled={customersQuery.isPending || (canManageOthers && !selectedSalesmanId)}
                  >
                    <option value="">{canManageOthers && !selectedSalesmanId ? 'Select salesman first' : 'Select customer...'}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Quick Add Customer Button */}
                {canCreateCustomers && (
                  <Button
                    type="button"
                    variant="secondary"
                    leftIcon={UserPlus}
                    onClick={onCreateCustomer}
                    title={canManageOthers && !selectedSalesmanId ? 'Select a salesman first' : "Quick add customer in the salesman's sublocation"}
                    disabled={canManageOthers && !selectedSalesmanId}
                    className="shrink-0 whitespace-nowrap bg-brand-500/20 text-brand-300 border-brand-500/40 hover:bg-brand-500/30"
                  >
                    New
                  </Button>
                )}
              </div>
            </div>

            {selectedCustomerId && (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 pt-2">
                <Select
                  value={currentCustomerDiscount.type}
                  onChange={(e) => updateCustomerDiscount('discount_type', e.target.value)}
                  aria-label="Customer discount type"
                  className="text-xs"
                >
                  <option value="">No customer discount</option>
                  <option value="percent">Percentage discount</option>
                  <option value="fixed">Fixed discount</option>
                </Select>
                <Input
                  type="number"
                  min="0"
                  max={currentCustomerDiscount.type === 'percent' ? '100' : undefined}
                  step="0.01"
                  value={currentCustomerDiscount.value}
                  disabled={!currentCustomerDiscount.type}
                  onChange={(e) => updateCustomerDiscount('discount_value', e.target.value)}
                  placeholder={currentCustomerDiscount.type === 'percent' ? 'Percent' : 'Amount'}
                  aria-label="Customer discount value"
                  className="text-xs"
                />
              </div>
            )}
          </div>

          {/* Cart Error Notification */}
          {errors.cart && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs">
              {errors.cart}
            </div>
          )}

          {/* Cart Lines List */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scrollbar-glass">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-ink-400 space-y-2">
                <ShoppingBag className="h-10 w-10 mx-auto opacity-40 text-ink-300" />
                <p className="text-sm font-medium">Cart is currently empty</p>
                <p className="text-xs text-ink-400 max-w-xs mx-auto">
                  Click any product from the catalogue grid to start building the order.
                </p>
              </div>
            ) : (
              cart.map((line, index) => {
                const whole = isWholeQuantity(line);
                const qtyNum = Number(line.quantity || 0);
                const isGift = line.line_type === 'free_gift';
                return (
                  <div
                    key={line._key || index}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-ink-50 text-sm truncate">{line.display_name}</p>
                        <p className="text-[11px] text-ink-400">
                          {line.unit_label ? `${line.unit_label} · ` : ''}
                          {isGift ? (
                            <span className="text-amber-300 font-medium">Free Gift Request</span>
                          ) : (
                            formatCurrency(line.unit_price)
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCartLine(index)}
                        className="text-ink-400 hover:text-rose-400 p-1 transition"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Quantity Stepper & Line Type Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                      {/* Stepper (- / count / +) */}
                      <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                        <button
                          type="button"
                          onClick={() => updateLineQuantity(index, qtyNum - 1)}
                          className="h-6 w-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-ink-100 transition"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          step={whole ? '1' : '0.01'}
                          value={line.quantity}
                          onChange={(e) => updateLineQuantity(index, e.target.value)}
                          className="w-12 text-center text-xs font-mono bg-transparent text-ink-50 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateLineQuantity(index, qtyNum + 1)}
                          className="h-6 w-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-ink-100 transition"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Gift Toggle Button */}
                      {canRequestGifts && (
                        <button
                          type="button"
                          onClick={() => toggleLineType(index)}
                          className={cn(
                            'flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition',
                            isGift
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-white/5 text-ink-300 border-white/10 hover:bg-white/10'
                          )}
                          title="Toggle Gift Request"
                        >
                          <Gift className="h-3 w-3" />
                          <span>{isGift ? 'Gift' : 'Sale'}</span>
                        </button>
                      )}

                      {/* Total */}
                      <div className="font-mono text-sm font-semibold text-ink-100">
                        {isGift ? 'Free' : formatCurrency(lineTotal(line))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Optional Order Notes */}
          {cart.length > 0 && (
            <div className="pt-2 border-t border-white/10">
              <Input
                placeholder="Add optional order notes / instructions..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          )}

          {/* Order Summary & Checkout Button */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="space-y-1.5 text-xs text-ink-300">
              {giftItemsCount > 0 && (
                <div className="flex justify-between text-amber-300">
                  <span>Gift Requests ({giftItemsCount}):</span>
                  <span>Requires order approval</span>
                </div>
              )}
              {currentCustomerDiscount.amount > 0 && (
                <div className="flex justify-between text-emerald-300">
                  <span>Customer discount (before VAT):</span>
                  <span className="font-mono">−{formatCurrency(currentCustomerDiscount.amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-sm text-ink-50 pt-1 border-t border-white/5">
                <span>Estimated order total:</span>
                <span className="font-mono text-base text-brand-300">{formatCurrency(orderTotal)}</span>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              leftIcon={Check}
              onClick={handleSubmitOrder}
              isLoading={editingDispatch ? updateMutation.isPending : submitMutation.isPending}
              disabled={activeCustomersList.length === 0 || (editingDispatch ? updateMutation.isPending : submitMutation.isPending)}
              className="w-full justify-center text-sm font-semibold py-3 shadow-lg bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-400 hover:to-accent-400"
            >
              {editingDispatch
                ? `Update Order ${editingDispatch.dispatch_number || `#${editingDispatch.id}`}`
                : activeCustomersList.length > 1
                  ? `Send Combined Order (${activeCustomersList.length} Customers, ${totalLinesCount} items)`
                  : `Send Order (${totalLinesCount} items)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
