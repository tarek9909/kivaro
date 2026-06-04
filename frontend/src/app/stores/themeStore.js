import { create } from 'zustand';

const THEME_KEY = 'kivaro_theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'black';
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'black') return stored;
  return 'black'; // Default to black mode
}

function applyThemeToDocument(theme) {
  if (typeof window === 'undefined') return;
  const root = window.document.documentElement;
  root.classList.remove('theme-black', 'theme-light');
  root.classList.add(`theme-${theme}`);
}

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),

  init() {
    applyThemeToDocument(get().theme);
  },

  setTheme(theme) {
    if (theme !== 'black' && theme !== 'light') return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_KEY, theme);
    }
    applyThemeToDocument(theme);
    set({ theme });
  },

  toggleTheme() {
    const next = get().theme === 'black' ? 'light' : 'black';
    get().setTheme(next);
  }
}));
