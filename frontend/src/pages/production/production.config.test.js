import { describe, expect, it } from 'vitest';
import {
  ACTIVE_FILTER_OPTIONS,
  BATCH_STATUSES,
  BATCH_STATUS_FILTER_OPTIONS,
  COMPONENT_ROLES,
  PACKAGING_TYPES,
  PRODUCTION_PARENT_PERMISSIONS,
  PRODUCTION_PERMISSIONS,
  PRODUCTION_TABS,
  getAvailableBatchActions,
  getBatchStatusTone,
  pickFirstAllowedProductionTab
} from './production.config.js';

describe('production config', () => {
  it('locks permission strings to backend keys', () => {
    expect(PRODUCTION_PERMISSIONS).toEqual({
      view: 'production.view',
      create: 'production.create',
      complete: 'production.complete'
    });
  });

  it('locks parent guard permissions', () => {
    expect(PRODUCTION_PARENT_PERMISSIONS).toEqual([
      'production.view',
      'production.create',
      'production.complete'
    ]);
  });

  it('lists every backend packaging type and component role enum', () => {
    expect(PACKAGING_TYPES.map((entry) => entry.value)).toEqual([
      'carton_with_packages',
      'carton_direct',
      'loose_shawl',
      'custom'
    ]);
    expect(COMPONENT_ROLES.map((entry) => entry.value)).toEqual([
      'charcoal',
      'carton',
      'package_bag',
      'sticker',
      'other'
    ]);
  });

  it('lists every batch status', () => {
    expect(BATCH_STATUSES.map((entry) => entry.value)).toEqual([
      'draft',
      'in_progress',
      'batched',
      'consumed',
      'completed',
      'cancelled'
    ]);
    expect(BATCH_STATUS_FILTER_OPTIONS[0]).toEqual({
      value: '',
      label: 'All statuses'
    });
  });

  it('exposes an active filter that maps to backend is_active values', () => {
    expect(ACTIVE_FILTER_OPTIONS.map((entry) => entry.value)).toEqual(['', '1', '0']);
  });

  it('declares production tabs with stable IDs and per-tab permission gates', () => {
    expect(PRODUCTION_TABS.map((tab) => tab.id)).toEqual([
      'batches'
    ]);
    expect(
      PRODUCTION_TABS.find((tab) => tab.id === 'batches').anyOfPermissions
    ).toEqual(['production.view', 'production.create', 'production.complete']);
  });
});

describe('getBatchStatusTone', () => {
  it('maps each status to a glassmorphism tone', () => {
    expect(getBatchStatusTone('draft')).toBe('neutral');
    expect(getBatchStatusTone('in_progress')).toBe('info');
    expect(getBatchStatusTone('completed')).toBe('success');
    expect(getBatchStatusTone('cancelled')).toBe('danger');
    expect(getBatchStatusTone('mystery')).toBe('neutral');
  });
});

describe('getAvailableBatchActions', () => {
  it('returns an empty set for missing input', () => {
    expect(getAvailableBatchActions(undefined)).toEqual(new Set());
    expect(getAvailableBatchActions(null)).toEqual(new Set());
  });

  it('offers start/complete/cancel for a draft batch', () => {
    const actions = getAvailableBatchActions({ status: 'draft' });
    expect(actions).toEqual(new Set(['start', 'complete', 'cancel']));
  });

  it('offers complete/cancel only for an in-progress batch', () => {
    const actions = getAvailableBatchActions({ status: 'in_progress' });
    expect(actions).toEqual(new Set(['complete', 'cancel']));
  });

  it('locks down a completed batch', () => {
    expect(getAvailableBatchActions({ status: 'completed' })).toEqual(new Set());
  });

  it('locks down a cancelled batch', () => {
    expect(getAvailableBatchActions({ status: 'cancelled' })).toEqual(new Set());
  });
});

describe('pickFirstAllowedProductionTab', () => {
  function makeHas(permissions) {
    const set = new Set(permissions);
    return (permission) => set.has(permission);
  }

  it('returns null when the user has no production permissions', () => {
    expect(pickFirstAllowedProductionTab(makeHas([]))).toBeNull();
  });

  it('routes production.view users to /production/batches first', () => {
    expect(pickFirstAllowedProductionTab(makeHas(['production.view']))).toBe(
      '/production/batches'
    );
  });

  it('routes production.create-only users to /production/batches', () => {
    expect(pickFirstAllowedProductionTab(makeHas(['production.create']))).toBe(
      '/production/batches'
    );
  });

  it('routes production.complete-only users to /production/batches', () => {
    expect(pickFirstAllowedProductionTab(makeHas(['production.complete']))).toBe(
      '/production/batches'
    );
  });

  it('returns null for non-function input', () => {
    expect(pickFirstAllowedProductionTab(undefined)).toBeNull();
    expect(pickFirstAllowedProductionTab(null)).toBeNull();
  });
});
