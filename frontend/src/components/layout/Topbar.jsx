import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Languages, LogOut, Menu, Search, UserCog, Sun, Moon, Shield, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, tokenStorage } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useThemeStore } from '@/app/stores/themeStore.js';
import { useLanguageStore, useTranslation } from '@/app/i18n.js';
import { Avatar } from '@/components/ui/Avatar.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Select } from '@/components/ui/Select.jsx';
import { cn } from '@/lib/cn.js';

function useClickAway(ref, handler) {
  useEffect(() => {
    function listener(event) {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    }
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}



export function Topbar({ onOpenSidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const impersonation = useAuthStore((state) => state.impersonation);
  const exitImpersonation = useAuthStore((state) => state.exitImpersonation);
  const { theme, toggleTheme } = useThemeStore();
  const { language, t } = useTranslation();
  const toggleLanguage = useLanguageStore((state) => state.toggleLanguage);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useClickAway(menuRef, () => setMenuOpen(false));

  const isSuperadmin = user?.is_superadmin || !!impersonation;
  const isInsideAdminDashboard = !location.pathname.startsWith('/superadmin');
  const showSuperadminButton = isSuperadmin && isInsideAdminDashboard;

  const handleBackToSuperadmin = () => {
    if (impersonation) {
      if (exitImpersonation()) {
        window.location.assign('/superadmin');
      }
    } else {
      navigate('/superadmin');
    }
  };

  const [switchingStoreId, setSwitchingStoreId] = useState(null);

  const impersonationSession = tokenStorage.getImpersonationSession();
  const superadminToken = impersonationSession?.token;

  const storesQuery = useQuery({
    queryKey: ['topbar', 'superadmin', 'stores'],
    queryFn: () =>
      api.superadmin.stores.list(
        { limit: 100 },
        { headers: { Authorization: `Bearer ${superadminToken}` } }
      ),
    enabled: !!superadminToken && showSuperadminButton,
    staleTime: 5 * 60_000
  });

  const stores = storesQuery.data?.data?.stores || [];
  const switcherStores = [...stores];
  if (impersonation?.store && !switcherStores.some((s) => s.id === impersonation.store.id)) {
    switcherStores.unshift(impersonation.store);
  }

  const handleSwitchStore = async (storeId) => {
    if (!superadminToken) return;
    setSwitchingStoreId(storeId);
    try {
      const response = await api.superadmin.stores.impersonate(
        storeId,
        { headers: { Authorization: `Bearer ${superadminToken}` } }
      );
      useAuthStore.getState().startImpersonation(response?.data);
      toast.success('Switched store');
      window.location.assign('/');
    } catch (error) {
      toast.error('Could not switch store');
      setSwitchingStoreId(null);
    }
  };

  return (
    <header className="glass-panel-strong sticky top-0 z-30 flex h-16 items-center gap-3 px-4">
      <Button
        variant="ghost"
        size="icon"
        leftIcon={Menu}
        onClick={onOpenSidebar}
        aria-label={t('topbar.openNavigation')}
        className="lg:hidden"
      />

      <div className="hidden flex-1 items-center md:flex">
        <div className="flex h-10 w-full max-w-md items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-ink-300 transition focus-within:border-brand-400/70 focus-within:bg-white/[0.07]">
          <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
          <input
            type="search"
            placeholder={t('topbar.searchPlaceholder')}
            className="h-full w-full bg-transparent text-ink-50 placeholder:text-ink-400 focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-ink-300 sm:inline-flex">
            Ctrl K
          </kbd>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {showSuperadminButton && (
          <>
            <Select
              value={impersonation?.store?.id || ''}
              onChange={(e) => handleSwitchStore(e.target.value)}
              placeholder="Switch store..."
              containerClassName="w-40 sm:w-48"
              className="h-8 rounded-lg text-xs"
              leftIcon={Store}
              disabled={!!switchingStoreId}
            >
              {switcherStores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </Select>

            <Button
              variant="secondary"
              size="sm"
              leftIcon={Shield}
              onClick={handleBackToSuperadmin}
              className="mr-1"
            >
              {t('topbar.backToSuperadmin')}
            </Button>
          </>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'black' ? 'Switch to light mode' : 'Switch to black mode'}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-200 transition hover:bg-white/5 hover:text-ink-50"
        >
          {theme === 'black' ? (
            <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          )}
        </button>


        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              'flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-sm transition hover:bg-white/10',
              menuOpen && 'bg-white/10'
            )}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={user?.full_name || user?.username} size="sm" />
            <div className="hidden min-w-0 flex-col items-start leading-tight md:flex">
              <span className="max-w-[160px] truncate text-sm font-medium text-ink-50">
                {user?.full_name || user?.username || t('topbar.guest')}
              </span>
              <span className="max-w-[160px] truncate text-[11px] uppercase tracking-wider text-ink-400">
                {user?.role?.display_name || user?.role?.name || t('topbar.member')}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-ink-300" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="glass-panel-strong absolute right-0 mt-2 w-64 animate-fade-in p-2"
            >
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <Avatar name={user?.full_name || user?.username} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-50">
                    {user?.full_name || user?.username || t('topbar.guest')}
                  </p>
                  <p className="truncate text-xs text-ink-300">{user?.email || ''}</p>
                </div>
              </div>
              <div className="my-2 glass-divider" />
              <button
                role="menuitem"
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:text-ink-500"
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/profile');
                }}
              >
                <UserCog className="h-4 w-4" aria-hidden="true" />
                <span>{t('topbar.profile')}</span>
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  toggleLanguage();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-200 transition hover:bg-white/5"
              >
                <Languages className="h-4 w-4" aria-hidden="true" />
                <span>{language === 'ar' ? t('topbar.switchToEnglish') : t('topbar.switchToArabic')}</span>
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span>{t('topbar.signOut')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
