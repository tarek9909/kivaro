import { describe, expect, it } from 'vitest';
import {
  DISPATCH_PARENT_PERMISSIONS,
  DISPATCH_PERMISSIONS,
  DISPATCH_STATUSES,
  DISPATCH_STATUS_FILTER_OPTIONS,
  DISPATCH_WORKFLOW_TABS,
  DISPATCH_TABS,
  PAYMENT_METHODS,
  getAvailableDispatchActions,
  getDispatchEntityLabel,
  getDispatchStatusFilterOptions,
  getDispatchStatusTone,
  getDispatchWorkflowTab,
  pickFirstAllowedDispatchTab
} from './dispatch.config.js';

describe('dispatch config', () => {
  it('locks permission strings to backend keys', () => {
    expect(DISPATCH_PERMISSIONS).toEqual({
      view: 'dispatch.view',
      create: 'dispatch.create',
      approve: 'dispatch.approve',
      closeout: 'delivery.closeout',
      settle: 'dispatch.settle',
      print: 'dispatch.print',
      salesmanWorkspace: 'salesman_workspace.view'
    });
  });

  it('locks parent guard permissions to all dispatch capability keys', () => {
    expect(DISPATCH_PARENT_PERMISSIONS).toEqual([
      'dispatch.view',
      'dispatch.create',
      'dispatch.approve',
      'delivery.release',
      'delivery.dispatch',
      'delivery.record_returns',
      'finance.settle_deliveries',
      'delivery.closeout',
      'dispatch.settle',
      'dispatch.print',
      'salesman_workspace.view'
    ]);
  });

  it('lists the dispatch statuses available in the active UI workflow', () => {
    expect(DISPATCH_STATUSES.map((entry) => entry.value)).toEqual([
      'draft',
      'pending_approval',
      'approved',
      'delivery',
      'partially_settled',
      'completed',
      'cancelled'
    ]);
    expect(DISPATCH_STATUS_FILTER_OPTIONS[0]).toEqual({
      value: '',
      label: 'All statuses'
    });
  });

  it('lists every backend payment method enum', () => {
    expect(PAYMENT_METHODS.map((entry) => entry.value)).toEqual([
      'cash',
      'bank_transfer',
      'cheque',
      'other'
    ]);
  });

  it('declares dispatch tabs with stable IDs and broad permission gates', () => {
    expect(DISPATCH_TABS.map((tab) => tab.id)).toEqual(['requests']);
    const requestsTab = DISPATCH_TABS.find((tab) => tab.id === 'requests');
    expect(requestsTab.to).toBe('/dispatch/requests');
    expect(requestsTab.anyOfPermissions).toEqual([
      'dispatch.view',
      'dispatch.create',
      'dispatch.approve',
      'delivery.release',
      'delivery.dispatch',
      'delivery.record_returns',
      'finance.settle_deliveries',
      'delivery.closeout',
      'dispatch.settle',
      'dispatch.print',
      'salesman_workspace.view'
    ]);
  });
});

describe('getDispatchStatusTone', () => {
  it('maps each status to a glassmorphism tone', () => {
    expect(getDispatchStatusTone('draft')).toBe('neutral');
    expect(getDispatchStatusTone('pending_approval')).toBe('info');
    expect(getDispatchStatusTone('approved')).toBe('brand');
    expect(getDispatchStatusTone('delivery')).toBe('warn');
    expect(getDispatchStatusTone('partially_settled')).toBe('warn');
    expect(getDispatchStatusTone('completed')).toBe('success');
    expect(getDispatchStatusTone('cancelled')).toBe('danger');
    expect(getDispatchStatusTone('mystery')).toBe('neutral');
  });
});

describe('getDispatchEntityLabel', () => {
  it('uses order wording before approval and delivery wording afterwards', () => {
    expect(getDispatchEntityLabel('draft')).toBe('Order');
    expect(getDispatchEntityLabel('pending_approval')).toBe('Order');
    expect(getDispatchEntityLabel('approved')).toBe('Delivery');
    expect(getDispatchEntityLabel('delivery')).toBe('Delivery');
    expect(getDispatchEntityLabel('partially_settled')).toBe('Delivery');
    expect(getDispatchEntityLabel('completed')).toBe('Delivery');
    expect(getDispatchEntityLabel('cancelled')).toBe('Order');
  });

  it('groups the workflow into tabs for the page', () => {
    expect(DISPATCH_WORKFLOW_TABS).toEqual([
      { id: 'all', label: 'All', statuses: null },
      { id: 'orders', label: 'Orders', statuses: ['draft', 'pending_approval', 'cancelled'] },
      { id: 'deliveries', label: 'Deliveries', statuses: ['approved', 'delivery', 'partially_settled'] },
      { id: 'completed', label: 'Completed', statuses: ['completed'] }
    ]);
    expect(getDispatchStatusFilterOptions('all').length).toBe(8);
    expect(getDispatchStatusFilterOptions('orders').map((option) => option.value)).toEqual([
      '', 'draft', 'pending_approval', 'cancelled'
    ]);
    expect(getDispatchStatusFilterOptions('deliveries').map((option) => option.value)).toEqual([
      '', 'approved', 'delivery', 'partially_settled'
    ]);
    expect(getDispatchStatusFilterOptions('completed').map((option) => option.value)).toEqual([
      '', 'completed'
    ]);
    expect(getDispatchWorkflowTab('unknown').id).toBe('all');
  });
});

describe('getAvailableDispatchActions', () => {
  it('returns an empty set for missing input', () => {
    expect(getAvailableDispatchActions(undefined)).toEqual(new Set());
    expect(getAvailableDispatchActions(null)).toEqual(new Set());
  });

  it('offers edit/addCustomer/addItem/submit/cancel for a draft request', () => {
    expect(getAvailableDispatchActions({ status: 'draft' })).toEqual(
      new Set(['edit', 'addCustomer', 'addItem', 'submit', 'cancel'])
    );
  });

  it('offers approve/rework/cancel for a pending approval request', () => {
    expect(getAvailableDispatchActions({ status: 'pending_approval' })).toEqual(
      new Set(['approve', 'rework', 'cancel'])
    );
  });

  it('offers rework/dispatchStock/cancel for an approved request', () => {
    expect(getAvailableDispatchActions({ status: 'approved' })).toEqual(
      new Set(['rework', 'dispatchStock', 'cancel'])
    );
  });

  it('offers createReturn/createCloseout for a delivery', () => {
    expect(getAvailableDispatchActions({ status: 'delivery' })).toEqual(
      new Set(['createReturn', 'createCloseout'])
    );
  });

  it('allows a return adjustment after a completed request', () => {
    expect(getAvailableDispatchActions({ status: 'completed' })).toEqual(new Set(['createReturn']));
  });

  it('locks down a cancelled request', () => {
    expect(getAvailableDispatchActions({ status: 'cancelled' })).toEqual(new Set());
  });
});

describe('pickFirstAllowedDispatchTab', () => {
  function makeHas(permissions) {
    const set = new Set(permissions);
    return (permission) => set.has(permission);
  }

  it('returns null when the user has no dispatch permissions', () => {
    expect(pickFirstAllowedDispatchTab(makeHas([]))).toBeNull();
  });

  it('routes any dispatch capability to /dispatch/requests', () => {
    const capabilities = [
      'dispatch.view',
      'dispatch.create',
      'dispatch.approve',
      'dispatch.settle',
      'dispatch.print',
      'salesman_workspace.view'
    ];
    for (const capability of capabilities) {
      expect(pickFirstAllowedDispatchTab(makeHas([capability]))).toBe(
        '/dispatch/requests'
      );
    }
  });

  it('returns null for non-function input', () => {
    expect(pickFirstAllowedDispatchTab(undefined)).toBeNull();
    expect(pickFirstAllowedDispatchTab(null)).toBeNull();
  });
});
