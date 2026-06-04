import { describe, expect, it } from 'vitest';
import {
  LOCATIONS_PARENT_PERMISSIONS,
  LOCATIONS_PERMISSIONS,
  LOCATIONS_TABS,
  STATUSES,
  TARGET_PERIODS,
  TARGET_STATUSES,
  getTargetStatusTone,
  pickFirstAllowedLocationsTab
} from './locations.config.js';

describe('locations config', () => {
  it('locks permission strings to backend keys', () => {
    expect(LOCATIONS_PERMISSIONS).toEqual({
      locations: 'locations.manage',
      salesmen: 'salesmen.manage',
      targets: 'targets.manage'
    });
  });

  it('locks parent guard permissions', () => {
    expect(LOCATIONS_PARENT_PERMISSIONS).toEqual([
      'locations.manage',
      'salesmen.manage',
      'targets.manage'
    ]);
  });

  it('lists every backend status and target enum', () => {
    expect(STATUSES.map((entry) => entry.value)).toEqual(['active', 'inactive']);
    expect(TARGET_PERIODS.map((entry) => entry.value)).toEqual([
      'daily',
      'weekly',
      'monthly',
      'quarterly',
      'yearly'
    ]);
    expect(TARGET_STATUSES.map((entry) => entry.value)).toEqual([
      'draft',
      'active',
      'closed',
      'cancelled'
    ]);
  });

  it('declares tabs with stable IDs and per-tab permission gates', () => {
    expect(LOCATIONS_TABS.map((tab) => tab.id)).toEqual([
      'locations',
      'sublocations',
      'salesmen',
      'targets'
    ]);
    expect(
      LOCATIONS_TABS.find((tab) => tab.id === 'locations').anyOfPermissions
    ).toEqual(['locations.manage']);
    expect(
      LOCATIONS_TABS.find((tab) => tab.id === 'sublocations').anyOfPermissions
    ).toEqual(['locations.manage']);
    expect(
      LOCATIONS_TABS.find((tab) => tab.id === 'salesmen').anyOfPermissions
    ).toEqual(['salesmen.manage']);
    expect(
      LOCATIONS_TABS.find((tab) => tab.id === 'targets').anyOfPermissions
    ).toEqual(['targets.manage']);
  });
});

describe('getTargetStatusTone', () => {
  it('maps every status to a glassmorphism tone', () => {
    expect(getTargetStatusTone('draft')).toBe('neutral');
    expect(getTargetStatusTone('active')).toBe('success');
    expect(getTargetStatusTone('closed')).toBe('info');
    expect(getTargetStatusTone('cancelled')).toBe('danger');
    expect(getTargetStatusTone('mystery')).toBe('neutral');
  });
});

describe('pickFirstAllowedLocationsTab', () => {
  function makeHas(permissions) {
    const set = new Set(permissions);
    return (permission) => set.has(permission);
  }

  it('returns null when the user has no relevant permissions', () => {
    expect(pickFirstAllowedLocationsTab(makeHas([]))).toBeNull();
  });

  it('routes locations.manage users to /locations/areas first', () => {
    expect(pickFirstAllowedLocationsTab(makeHas(['locations.manage']))).toBe(
      '/locations/areas'
    );
  });

  it('routes salesmen.manage-only users to /locations/salesmen', () => {
    expect(pickFirstAllowedLocationsTab(makeHas(['salesmen.manage']))).toBe(
      '/locations/salesmen'
    );
  });

  it('routes targets.manage-only users to /locations/targets', () => {
    expect(pickFirstAllowedLocationsTab(makeHas(['targets.manage']))).toBe(
      '/locations/targets'
    );
  });

  it('returns null for non-function input', () => {
    expect(pickFirstAllowedLocationsTab(undefined)).toBeNull();
    expect(pickFirstAllowedLocationsTab(null)).toBeNull();
  });
});
