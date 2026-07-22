/**
 * Backend enums and route metadata for the inventory module. Kept in one
 * place so forms, filters, and tabs stay in sync with the backend schema.
 */

/**
 * The inventory model is item-based.  `item_kind` tells us whether an item
 * is normal stock or a packaging material; `stock_mode` tells us how normal
 * stock is physically handled.  Keep these values in sync with the inventory
 * API rather than reintroducing item variants in a client form.
 */
export const ITEM_KINDS = [
  { value: 'normal', label: 'Normal item' },
  { value: 'packaging', label: 'Packaging item' }
];

export const STOCK_MODES = [
  {
    value: 'carton_weight',
    label: 'Cartons with loose units',
    description: 'Received as cartons, stocked by kg, and opened into loose units when needed.'
  },
  {
    value: 'weight',
    label: 'Weight',
    description: 'Received, stored, and sold by weight.'
  },
  {
    value: 'piece',
    label: 'Piece',
    description: 'Received, stored, and sold as whole pieces.'
  }
];

export const STOCK_MODE_LABELS = Object.fromEntries(
  STOCK_MODES.map((option) => [option.value, option.label])
);

export const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

export const UNIT_TYPES = [
  { value: 'quantity', label: 'Quantity' },
  { value: 'weight', label: 'Weight' },
  { value: 'volume', label: 'Volume' },
  { value: 'length', label: 'Length' },
  { value: 'other', label: 'Other' }
];

export const PACKAGING_UNITS = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'ton', label: 'ton' },
  { value: 'pc', label: 'pc' }
];

export const PACKAGING_LEVELS = [
  { value: 'category', label: 'Category' },
  { value: 'item', label: 'Item' },
  { value: 'sub_item', label: 'Sub item' },
  { value: 'sub_sub_item', label: 'Sub sub item' }
];

export const PACKAGING_LEVEL_PARENT = {
  category: null,
  item: 'category',
  sub_item: 'item',
  sub_sub_item: 'sub_item'
};

export const MOVEMENT_TYPES = [
  { value: 'purchase_receive', label: 'Purchase receive' },
  { value: 'opening_balance', label: 'Opening balance' },
  { value: 'stock_adjustment', label: 'Stock adjustment' },
  { value: 'carton_open', label: 'Carton opened' },
  { value: 'packaging_consume', label: 'Packaging consume' },
  { value: 'packaging_output', label: 'Packaging output' },
  { value: 'dispatch_reserve', label: 'Dispatch reserve' },
  { value: 'dispatch_unreserve', label: 'Dispatch unreserve' },
  { value: 'dispatch_out', label: 'Dispatch sale' },
  { value: 'free_gift', label: 'Free gift' },
  { value: 'dispatch_return', label: 'Dispatch return' },
  { value: 'damage', label: 'Damage' },
  { value: 'transfer_in', label: 'Transfer in' },
  { value: 'transfer_out', label: 'Transfer out' }
];

export const REFERENCE_TYPES = [
  { value: 'purchase_receipt', label: 'Purchase receipt' },
  { value: 'stock_receipt', label: 'Stock receipt' },
  { value: 'packaging_operation', label: 'Packaging operation' },
  { value: 'dispatch_request', label: 'Dispatch request' },
  { value: 'dispatch_return', label: 'Dispatch return' },
  { value: 'stock_adjustment', label: 'Stock adjustment' }
];

/**
 * Permission helpers. Mirrors backend permission strings exactly so that
 * the same checks are easy to verify against the route table.
 */
export const INVENTORY_PERMISSIONS = {
  view: 'inventory.view',
  create: 'inventory.create',
  update: 'inventory.update',
  delete: 'inventory.delete',
  movements: 'stock.movements',
  adjust: 'stock.adjust'
};

/**
 * Permissions accepted by the parent /inventory route guard. A user with any
 * of these can land on the inventory workspace; child routes do their own,
 * stricter checks.
 */
export const INVENTORY_PARENT_PERMISSIONS = [
  INVENTORY_PERMISSIONS.view,
  INVENTORY_PERMISSIONS.movements,
  INVENTORY_PERMISSIONS.adjust
];

export const INVENTORY_TABS = [
  {
    id: 'items',
    featureKey: 'inventory.items',
    label: 'Items',
    to: '/inventory/items',
    anyOfPermissions: [INVENTORY_PERMISSIONS.view]
  },
  {
    id: 'categories',
    featureKey: 'inventory.categories',
    label: 'Categories',
    to: '/inventory/categories',
    anyOfPermissions: [INVENTORY_PERMISSIONS.view]
  },
  {
    id: 'warehouses',
    featureKey: 'inventory.warehouses',
    label: 'Warehouses',
    to: '/inventory/warehouses',
    anyOfPermissions: [INVENTORY_PERMISSIONS.view]
  },
  {
    id: 'balances',
    featureKey: 'inventory.balances',
    label: 'Stock balances',
    to: '/inventory/balances',
    anyOfPermissions: [INVENTORY_PERMISSIONS.view]
  },
  {
    id: 'movements',
    featureKey: 'inventory.movements',
    label: 'Stock movements',
    to: '/inventory/movements',
    anyOfPermissions: [INVENTORY_PERMISSIONS.movements]
  },
  {
    id: 'adjustments',
    featureKey: 'inventory.adjustments',
    label: 'Adjustments',
    to: '/inventory/adjustments',
    anyOfPermissions: [INVENTORY_PERMISSIONS.adjust, INVENTORY_PERMISSIONS.movements]
  }
];

/**
 * Pure helper used by the nav and the /inventory index redirect. Given a
 * function that answers `hasPermission(permissionKey)`, return the path of
 * the first inventory tab the user is allowed to see, or null when they
 * have none of the inventory permissions at all.
 */
export function pickFirstAllowedInventoryTab(hasPermission, hasModule = () => true) {
  if (typeof hasPermission !== 'function') return null;
  for (const tab of INVENTORY_TABS) {
    if (hasModule(tab.featureKey) && tab.anyOfPermissions.some((permission) => hasPermission(permission))) {
      return tab.to;
    }
  }
  return null;
}
