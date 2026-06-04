import { describe, expect, it } from 'vitest';
import { translate } from './i18n.js';

describe('i18n dictionaries', () => {
  it('returns readable Arabic UI strings', () => {
    expect(translate('ar', 'nav.dashboard')).toBe('لوحة التحكم');
    expect(translate('ar', 'topbar.switchToArabic')).toBe('العربية');
  });

  it('falls back to English for missing Arabic keys', () => {
    expect(translate('ar', 'missing.key')).toBe('missing.key');
    expect(translate('ar', 'common.save')).toBe('حفظ');
  });
});
