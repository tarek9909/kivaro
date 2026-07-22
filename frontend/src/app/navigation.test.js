import { describe, expect, it } from 'vitest';
import { NAV_SECTIONS, flattenNavItems } from './navigation.js';

describe('navigation config', () => {
  it('exposes at least one section with at least one item', () => {
    expect(NAV_SECTIONS.length).toBeGreaterThan(0);
    expect(flattenNavItems().length).toBeGreaterThan(0);
  });

  it('gates the notifications nav item behind dashboard.view', () => {
    const items = flattenNavItems();
    const notifications = items.find((item) => item.id === 'notifications');
    expect(notifications).toBeDefined();
    expect(notifications.to).toBe('/notifications');
    expect(notifications.anyOfPermissions).toEqual(['dashboard.view']);
  });

  it('exposes the inventory nav item to inventory.view, stock.movements, or stock.adjust users', () => {
    const items = flattenNavItems();
    const inventory = items.find((item) => item.id === 'inventory');
    expect(inventory).toBeDefined();
    expect(inventory.to).toBe('/inventory');
    expect(inventory.anyOfPermissions).toEqual([
      'inventory.view',
      'stock.movements',
      'stock.adjust'
    ]);
  });

  it('exposes packaging as its own operations nav item', () => {
    const items = flattenNavItems();
    const packaging = items.find((item) => item.id === 'packaging');
    expect(packaging).toBeDefined();
    expect(packaging.to).toBe('/packaging');
    expect(packaging.moduleKey).toBe('inventory.packaging');
    expect(packaging.anyOfPermissions).toEqual(['inventory.view']);
  });

  it('exposes the purchases nav item to purchase_orders.view, accounting.view, or accounting.manage users', () => {
    const items = flattenNavItems();
    const purchases = items.find((item) => item.id === 'purchases');
    expect(purchases).toBeDefined();
    expect(purchases.to).toBe('/purchases');
    expect(purchases.anyOfPermissions).toEqual([
      'purchase_orders.view',
      'accounting.view',
      'accounting.manage'
    ]);
  });

  it('exposes the customers nav item to view, create, update, or delete users', () => {
    const items = flattenNavItems();
    const customers = items.find((item) => item.id === 'customers');
    expect(customers).toBeDefined();
    expect(customers.to).toBe('/customers');
    expect(customers.anyOfPermissions).toEqual([
      'customers.view',
      'customers.create',
      'customers.update',
      'customers.delete'
    ]);
  });

  it('exposes the sales nav item to report viewers', () => {
    const items = flattenNavItems();
    const sales = items.find((item) => item.id === 'sales');
    expect(sales).toBeDefined();
    expect(sales.to).toBe('/sales');
    expect(sales.moduleKey).toBe('reports.salesman-target-progress');
    expect(sales.anyOfPermissions).toEqual(['reports.view']);
  });

  it('exposes the standalone salesman workspace to its dedicated module permission', () => {
    const items = flattenNavItems();
    const workspace = items.find((item) => item.id === 'salesman-workspace');
    expect(workspace).toBeDefined();
    expect(workspace.to).toBe('/salesman-workspace');
    expect(workspace.moduleKey).toBe('salesman_workspace');
    expect(workspace.anyOfPermissions).toEqual(['salesman_workspace.view']);
  });

  it('exposes the locations nav item to locations.manage, salesmen.manage, or targets.manage users', () => {
    const items = flattenNavItems();
    const locations = items.find((item) => item.id === 'locations');
    expect(locations).toBeDefined();
    expect(locations.to).toBe('/locations');
    expect(locations.anyOfPermissions).toEqual([
      'locations.manage',
      'salesmen.manage',
      'targets.manage'
    ]);
  });

  it('does not expose the retired production workspace', () => {
    const items = flattenNavItems();
    const production = items.find((item) => item.id === 'production');
    expect(production).toBeUndefined();
  });

  it('exposes the dispatch nav item to any of view/create/approve/settle/print users', () => {
    const items = flattenNavItems();
    const dispatch = items.find((item) => item.id === 'dispatch');
    expect(dispatch).toBeDefined();
    expect(dispatch.to).toBe('/dispatch');
    expect(dispatch.anyOfPermissions).toEqual([
      'dispatch.view',
      'dispatch.create',
      'dispatch.approve',
      'dispatch.settle',
      'dispatch.print'
    ]);
  });

  it('exposes the accounting nav item to accounting.view or accounting.manage users', () => {
    const items = flattenNavItems();
    const accounting = items.find((item) => item.id === 'accounting');
    expect(accounting).toBeDefined();
    expect(accounting.to).toBe('/accounting');
    expect(accounting.anyOfPermissions).toEqual(['accounting.view', 'accounting.manage']);
  });

  it('exposes the debts and payments nav item to debts/accounting/print users', () => {
    const items = flattenNavItems();
    const debts = items.find((item) => item.id === 'debts');
    expect(debts).toBeDefined();
    expect(debts.to).toBe('/payments');
    expect(debts.anyOfPermissions).toEqual([
      'debts.manage',
      'accounting.view',
      'accounting.manage',
      'dispatch.print'
    ]);
  });

  it('exposes the commissions nav item to commissions.manage users only', () => {
    const items = flattenNavItems();
    const commissions = items.find((item) => item.id === 'commissions');
    expect(commissions).toBeDefined();
    expect(commissions.to).toBe('/commissions');
    expect(commissions.anyOfPermissions).toEqual(['commissions.manage']);
  });

  it('every item has a stable id, label, route, and icon', () => {
    for (const item of flattenNavItems()) {
      expect(item.id).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.to).toMatch(/^\//);
      // lucide-react icons can be functions or forwardRef objects; just
      // make sure each item ships an icon component.
      expect(item.icon).toBeTruthy();
      expect(['function', 'object']).toContain(typeof item.icon);
    }
  });

  it('gates the dashboard nav item behind dashboard.view', () => {
    const items = flattenNavItems();
    const dashboard = items.find((item) => item.id === 'dashboard');
    expect(dashboard).toBeDefined();
    expect(dashboard.to).toBe('/');
    expect(dashboard.moduleKey).toBe('dashboard');
    expect(dashboard.anyOfPermissions).toEqual(['dashboard.view']);
  });

  it('adds module keys for store app modules and gates superadmin separately', () => {
    const items = flattenNavItems();
    const inventory = items.find((item) => item.id === 'inventory');
    const packaging = items.find((item) => item.id === 'packaging');
    const reports = items.find((item) => item.id === 'reports');
    const superadmin = items.find((item) => item.id === 'superadmin');

    expect(inventory.moduleKey).toBe('inventory');
    expect(packaging.moduleKey).toBe('inventory.packaging');
    expect(reports.moduleKey).toBe('reports');
    expect(superadmin.to).toBe('/superadmin');
    expect(superadmin.anyOfPermissions).toEqual(['superadmin.manage']);
    expect(superadmin.moduleKey).toBeUndefined();
  });
});
