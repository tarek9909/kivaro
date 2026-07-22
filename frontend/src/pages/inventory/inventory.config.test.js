import { describe, expect, it } from 'vitest';
import {
  INVENTORY_PARENT_PERMISSIONS,
  INVENTORY_PERMISSIONS,
  INVENTORY_TABS,
  ITEM_KINDS,
  MOVEMENT_TYPES,
  STATUSES,
  STOCK_MODES,
  UNIT_TYPES,
  pickFirstAllowedInventoryTab
} from './inventory.config.js';

describe('inventory config', () => {
  it('exposes the canonical inventory permission strings', () => {
    expect(INVENTORY_PERMISSIONS).toEqual({
      view: 'inventory.view',
      create: 'inventory.create',
      update: 'inventory.update',
      delete: 'inventory.delete',
      movements: 'stock.movements',
      adjust: 'stock.adjust'
    });
  });

  it('models items by kind and stock mode instead of variants', () => {
    expect(ITEM_KINDS.map((option) => option.value)).toEqual(['normal', 'packaging']);
    expect(STOCK_MODES.map((option) => option.value)).toEqual([
      'carton_weight',
      'weight',
      'piece'
    ]);
  });

  it('lists the supported statuses and unit types', () => {
    expect(STATUSES.map((option) => option.value)).toEqual(['active', 'inactive']);
    expect(UNIT_TYPES.map((option) => option.value)).toEqual([
      'quantity',
      'weight',
      'volume',
      'length',
      'other'
    ]);
  });

  it('lists canonical ledger movement types without production batches', () => {
    expect(MOVEMENT_TYPES.map((option) => option.value)).toEqual([
      'purchase_receive',
      'opening_balance',
      'stock_adjustment',
      'carton_open',
      'packaging_consume',
      'packaging_output',
      'dispatch_reserve',
      'dispatch_unreserve',
      'dispatch_out',
      'free_gift',
      'dispatch_return',
      'damage',
      'transfer_in',
      'transfer_out'
    ]);
  });

  it('declares item-based inventory tabs and removes variants', () => {
    for (const tab of INVENTORY_TABS) {
      expect(tab.id).toBeTruthy();
      expect(tab.label).toBeTruthy();
      expect(tab.to.startsWith('/inventory/')).toBe(true);
      expect(Array.isArray(tab.anyOfPermissions)).toBe(true);
      expect(tab.anyOfPermissions.length).toBeGreaterThan(0);
    }
    const ids = INVENTORY_TABS.map((tab) => tab.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('variants');
  });

  it('locks per-tab permissions to backend permission strings', () => {
    const permsFor = (id) => INVENTORY_TABS.find((tab) => tab.id === id)?.anyOfPermissions;
    expect(permsFor('items')).toEqual(['inventory.view']);
    expect(permsFor('categories')).toEqual(['inventory.view']);
    expect(permsFor('warehouses')).toEqual(['inventory.view']);
    expect(permsFor('balances')).toEqual(['inventory.view']);
    expect(permsFor('movements')).toEqual(['stock.movements']);
    expect(permsFor('adjustments')).toEqual(['stock.adjust', 'stock.movements']);
  });

  it('exposes the parent guard permission set', () => {
    expect(INVENTORY_PARENT_PERMISSIONS).toEqual([
      'inventory.view',
      'stock.movements',
      'stock.adjust'
    ]);
  });
});

describe('pickFirstAllowedInventoryTab', () => {
  const makeHas = (permissions) => (permission) => new Set(permissions).has(permission);

  it('returns null when the user has no inventory permissions', () => {
    expect(pickFirstAllowedInventoryTab(makeHas([]))).toBeNull();
  });

  it('routes inventory.view users to items first', () => {
    expect(pickFirstAllowedInventoryTab(makeHas(['inventory.view']))).toBe('/inventory/items');
  });

  it('routes action-only users to their available stock tab', () => {
    expect(pickFirstAllowedInventoryTab(makeHas(['stock.movements']))).toBe('/inventory/movements');
    expect(pickFirstAllowedInventoryTab(makeHas(['stock.adjust']))).toBe('/inventory/adjustments');
  });
});
