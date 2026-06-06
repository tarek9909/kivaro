import { describe, expect, it } from 'vitest';
import {
  INVENTORY_PARENT_PERMISSIONS,
  INVENTORY_PERMISSIONS,
  INVENTORY_TABS,
  ITEM_TYPES,
  MOVEMENT_TYPES,
  PACKAGING_LEVELS,
  PACKAGING_UNITS,
  STATUSES,
  TRACKING_TYPES,
  UNIT_TYPES,
  pickFirstAllowedInventoryTab
} from './inventory.config.js';

describe('inventory config', () => {
  it('exposes the canonical backend permission strings', () => {
    expect(INVENTORY_PERMISSIONS).toEqual({
      view: 'inventory.view',
      create: 'inventory.create',
      update: 'inventory.update',
      delete: 'inventory.delete',
      movements: 'stock.movements',
      adjust: 'stock.adjust'
    });
  });

  it('lists every backend item type and tracking type exactly', () => {
    expect(ITEM_TYPES.map((option) => option.value)).toEqual([
      'raw_charcoal',
      'packaging',
      'finished_product',
      'service',
      'other'
    ]);
    expect(TRACKING_TYPES.map((option) => option.value)).toEqual(['stocked', 'non_stocked']);
  });

  it('lists the same statuses and unit types backend uses', () => {
    expect(STATUSES.map((option) => option.value)).toEqual(['active', 'inactive']);
    expect(UNIT_TYPES.map((option) => option.value)).toEqual([
      'quantity',
      'weight',
      'volume',
      'length',
      'other'
    ]);
  });

  it('lists every backend movement type so filters match server enums', () => {
    expect(MOVEMENT_TYPES.map((option) => option.value)).toEqual([
      'purchase_receive',
      'production_consume',
      'production_output',
      'dispatch_reserve',
      'dispatch_unreserve',
      'dispatch_out',
      'dispatch_return',
      'batch_movement',
      'sales_settle',
      'damage',
      'adjustment',
      'transfer_in',
      'transfer_out'
    ]);
  });

  it('declares inventory tabs with stable IDs, routes, and permission gates', () => {
    expect(INVENTORY_TABS.length).toBeGreaterThan(0);
    for (const tab of INVENTORY_TABS) {
      expect(tab.id).toBeTruthy();
      expect(tab.label).toBeTruthy();
      expect(tab.to.startsWith('/inventory/')).toBe(true);
      expect(Array.isArray(tab.anyOfPermissions)).toBe(true);
      expect(tab.anyOfPermissions.length).toBeGreaterThan(0);
    }
    const ids = INVENTORY_TABS.map((tab) => tab.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('locks per-tab permissions to backend permission strings', () => {
    function permsFor(id) {
      return INVENTORY_TABS.find((tab) => tab.id === id)?.anyOfPermissions;
    }
    expect(permsFor('items')).toEqual(['inventory.view']);
    expect(INVENTORY_TABS.some((tab) => tab.id === 'packaging')).toBe(false);
    expect(permsFor('variants')).toEqual(['inventory.view']);
    expect(permsFor('categories')).toEqual(['inventory.view']);
    expect(permsFor('warehouses')).toEqual(['inventory.view']);
    expect(permsFor('balances')).toEqual(['inventory.view']);
    expect(permsFor('movements')).toEqual(['stock.movements']);
    // Adjustments tab embeds both the post action and the adjustment history,
    // so either stock.adjust or stock.movements is enough to land on it.
    expect(permsFor('adjustments')).toEqual(['stock.adjust', 'stock.movements']);
  });

  it('exposes the parent guard permission set', () => {
    expect(INVENTORY_PARENT_PERMISSIONS).toEqual([
      'inventory.view',
      'stock.movements',
      'stock.adjust'
    ]);
  });

  it('locks packaging units and hierarchy levels to the packaging workflow', () => {
    expect(PACKAGING_UNITS.map((option) => option.value)).toEqual(['g', 'kg', 'ton', 'pc']);
    expect(PACKAGING_LEVELS.map((option) => option.value)).toEqual([
      'category',
      'item',
      'sub_item',
      'sub_sub_item'
    ]);
  });
});

describe('pickFirstAllowedInventoryTab', () => {
  function makeHas(permissions) {
    const set = new Set(permissions);
    return (permission) => set.has(permission);
  }

  it('returns null when the user has no inventory permissions', () => {
    expect(pickFirstAllowedInventoryTab(makeHas([]))).toBeNull();
  });

  it('routes inventory.view users to /inventory/items first', () => {
    expect(pickFirstAllowedInventoryTab(makeHas(['inventory.view']))).toBe(
      '/inventory/items'
    );
  });

  it('routes stock.movements-only users to /inventory/movements', () => {
    expect(pickFirstAllowedInventoryTab(makeHas(['stock.movements']))).toBe(
      '/inventory/movements'
    );
  });

  it('routes stock.adjust-only users to /inventory/adjustments', () => {
    expect(pickFirstAllowedInventoryTab(makeHas(['stock.adjust']))).toBe(
      '/inventory/adjustments'
    );
  });

  it('still prefers the items tab when both inventory.view and stock.adjust are present', () => {
    expect(
      pickFirstAllowedInventoryTab(makeHas(['inventory.view', 'stock.adjust']))
    ).toBe('/inventory/items');
  });

  it('returns null when given a non-function', () => {
    expect(pickFirstAllowedInventoryTab(undefined)).toBeNull();
    expect(pickFirstAllowedInventoryTab(null)).toBeNull();
  });
});
