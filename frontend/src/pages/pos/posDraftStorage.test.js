import { describe, expect, it } from 'vitest';
import {
  clearPosRegisterDraft,
  clearAllPosRegisterDrafts,
  getPosRegisterDraftStorageKey,
  loadPosRegisterDraft,
  savePosRegisterDraft
} from './posDraftStorage.js';

describe('Mini POS local draft storage', () => {
  it('scopes drafts to the signed-in user and restores the saved form', () => {
    const key = getPosRegisterDraftStorageKey(17, 4);
    savePosRegisterDraft(key, {
      selectedCustomerId: '5',
      cart: [{ sale_catalog_entry_id: '2', quantity: '3' }]
    });

    expect(key).toContain('.4.17');
    expect(loadPosRegisterDraft(key)).toEqual({
      selectedCustomerId: '5',
      cart: [{ sale_catalog_entry_id: '2', quantity: '3' }]
    });

    clearPosRegisterDraft(key);
    expect(loadPosRegisterDraft(key)).toBeNull();
  });

  it('removes stale recovery drafts', () => {
    const key = getPosRegisterDraftStorageKey(17, 4);
    window.localStorage.setItem(key, JSON.stringify({
      selectedCustomerId: '5',
      savedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    }));

    expect(loadPosRegisterDraft(key)).toBeNull();
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it('clears all register recovery drafts on logout without touching other storage', () => {
    savePosRegisterDraft(getPosRegisterDraftStorageKey(17, 4), { cart: [{ id: 1 }] });
    savePosRegisterDraft(getPosRegisterDraftStorageKey(18, 4), { cart: [{ id: 2 }] });
    window.localStorage.setItem('unrelated-preference', 'keep');

    clearAllPosRegisterDrafts();

    expect(loadPosRegisterDraft(getPosRegisterDraftStorageKey(17, 4))).toBeNull();
    expect(loadPosRegisterDraft(getPosRegisterDraftStorageKey(18, 4))).toBeNull();
    expect(window.localStorage.getItem('unrelated-preference')).toBe('keep');
  });
});
