const POS_REGISTER_DRAFT_KEY_PREFIX = 'kivaro.pos.register-draft.v1';
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function getPosRegisterDraftStorageKey(userId, storeId) {
  return userId && storeId ? `${POS_REGISTER_DRAFT_KEY_PREFIX}.${storeId}.${userId}` : null;
}

export function loadPosRegisterDraft(storageKey) {
  if (!storageKey || typeof window === 'undefined') return null;
  try {
    const draft = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
    if (!draft || typeof draft !== 'object') return null;
    const savedAt = Date.parse(draft.savedAt || '');
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > MAX_DRAFT_AGE_MS) {
      window.localStorage.removeItem(storageKey);
      return null;
    }
    const { savedAt: _savedAt, ...restoredDraft } = draft;
    return restoredDraft;
  } catch {
    return null;
  }
}

export function savePosRegisterDraft(storageKey, draft) {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
  } catch {
    // A private browser mode or a full storage quota must not interrupt sales.
  }
}

export function clearPosRegisterDraft(storageKey) {
  if (!storageKey || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Keep the register usable when browser storage is unavailable.
  }
}

export function clearAllPosRegisterDrafts() {
  if (typeof window === 'undefined') return;
  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(POS_REGISTER_DRAFT_KEY_PREFIX)) window.localStorage.removeItem(key);
    }
  } catch {
    // Session cleanup must not prevent logout when browser storage is unavailable.
  }
}
