import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useTranslation } from '@/app/i18n.js';
import { cn } from '@/lib/cn.js';

const COLLAPSE_KEY = 'kivaro_sidebar_collapsed';

function readInitialCollapsed() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(COLLAPSE_KEY) === '1';
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(readInitialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const impersonation = useAuthStore((state) => state.impersonation);
  const exitImpersonation = useAuthStore((state) => state.exitImpersonation);
  const { t } = useTranslation();

  const profileQuery = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => api.settings.companyProfile.get(),
    staleTime: 5 * 60_000,
    retry: false
  });
  const profile = profileQuery.data?.data?.company_profile;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (profile?.company_name) {
      document.title = `${profile.company_name} ERP`;
    } else {
      document.title = 'Kivaro ERP';
    }

    const faviconLink = document.querySelector("link[rel~='icon']");
    if (faviconLink) {
      faviconLink.href = profile?.logo_url || '/favicon.svg';
    }
  }, [profile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden p-3 sm:p-4 gap-4">
      {/* Mobile navigation drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 flex lg:hidden transition-all duration-300',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <button
          type="button"
          aria-label="Close navigation"
          className={cn(
            'absolute inset-0 bg-ink-950/60 backdrop-blur-sm transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            'relative z-10 m-3 flex transition-transform duration-300 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)]'
          )}
        >
          <Sidebar
            collapsed={false}
            onToggle={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      </div>

      {/* Desktop Sidebar (left column, floating) */}
      <div className="hidden lg:flex shrink-0 h-full">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />
      </div>

      {/* Main workspace (right column) */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden h-full">
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        {impersonation && (
          <div className="glass-panel-strong flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm text-ink-100">
            <span>
              {t('topbar.impersonating', {
                store: impersonation.store?.name || impersonation.store?.code || '-',
                user: impersonation.user?.full_name || impersonation.user?.username || '-'
              })}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (exitImpersonation()) {
                  window.location.assign('/superadmin');
                }
              }}
            >
              {t('topbar.exitStore')}
            </Button>
          </div>
        )}
        <main className="scrollbar-glass min-h-0 flex-1 overflow-y-auto rounded-2xl">
          <div className="animate-fade-in space-y-6 px-1 py-2 md:px-2">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
