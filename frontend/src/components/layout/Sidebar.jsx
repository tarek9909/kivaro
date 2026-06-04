import { NavLink } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useTranslation } from '@/app/i18n.js';
import { NAV_SECTIONS } from '@/app/navigation.js';
import { cn } from '@/lib/cn.js';

function isItemVisible(item, { hasAnyPermission, hasModule, user }) {
  if (user?.is_superadmin && item.id !== 'superadmin') return false;
  if (!user?.is_superadmin && item.id === 'superadmin') return false;
  if (item.moduleKey && !hasModule(item.moduleKey)) return false;
  if (!item.anyOfPermissions) return true;
  return hasAnyPermission(item.anyOfPermissions);
}

export function Sidebar({ collapsed, onToggle, onNavigate }) {
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();

  const profileQuery = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => api.settings.companyProfile.get(),
    staleTime: 5 * 60_000,
    retry: false
  });
  const profile = profileQuery.data?.data?.company_profile;

  const sections = NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => isItemVisible(item, { hasAnyPermission, hasModule, user }))
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col gap-3 overflow-hidden p-4 transition-[width] duration-300 ease-out',
        'bg-ink-950/20 backdrop-blur-3xl border border-white/10 rounded-2xl',
        collapsed ? 'w-[76px]' : 'w-[260px]'
      )}
      aria-label="Primary"
    >
      <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-1">
        <div className="flex min-w-0 items-center gap-2">
          {profile?.logo_url ? (
            <img
              src={profile.logo_url}
              alt="Logo"
              className="h-9 w-9 shrink-0 rounded-xl object-contain bg-black/20 p-1 border border-white/10"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 font-display text-sm font-bold text-white shadow-glass ring-1 ring-white/10">
              {profile?.company_name ? profile.company_name.charAt(0).toUpperCase() : 'K'}
            </span>
          )}
          <div
            className={cn(
              'min-w-0 transition-all duration-300 ease-out origin-left',
              collapsed ? 'max-w-0 opacity-0 scale-x-0 overflow-hidden' : 'max-w-[150px] opacity-100 scale-x-100'
            )}
          >
            <p className="font-display text-sm font-bold leading-tight tracking-wide text-ink-50 truncate">
              {profile?.company_name || 'Kivaro'}
            </p>
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.15em] text-ink-400">
              ERP Control Room
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-ink-300 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white"
        >
          <ChevronLeft
            className={cn(
              'h-4 w-4 transition-transform duration-300',
              collapsed && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>
      </div>

      <nav className="scrollbar-glass -mx-1 flex-1 space-y-4 overflow-y-auto px-1 pb-2 pt-1">
        {sections.map((section) => (
          <div key={section.id} className="space-y-1">
            <p
              className={cn(
                'px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-ink-400/70 transition-all duration-300 ease-out origin-left whitespace-nowrap',
                collapsed ? 'max-h-0 opacity-0 scale-y-0 overflow-hidden' : 'max-h-10 opacity-100 scale-y-100'
              )}
            >
              {t(section.labelKey || section.label)}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const to = item.id === 'dashboard' && user?.store?.slug && !user?.is_superadmin
                  ? `/store/${user.store.slug}`
                  : item.to;
                return (
                  <li key={item.id}>
                    <NavLink
                      to={to}
                      end={to === '/' || item.id === 'dashboard'}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm font-medium transition-all duration-200',
                          'text-ink-300 hover:bg-white/[0.03] hover:text-ink-50',
                          isActive &&
                            'bg-white/[0.07] border-white/10 text-ink-50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_8px_16px_-4px_rgba(0,0,0,0.4)]'
                        )
                      }
                      title={collapsed ? t(item.labelKey || item.label) : undefined}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-400 to-accent-400 opacity-0 transition-all duration-300 ease-out shadow-[0_0_8px_#4a54f0]',
                              isActive ? 'opacity-100' : 'opacity-0'
                            )}
                            aria-hidden="true"
                          />
                          <Icon className="h-4 w-4 shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:text-brand-300" aria-hidden="true" />
                          <span
                            className={cn(
                              'truncate transition-all duration-300 ease-out origin-left group-hover:translate-x-0.5',
                              collapsed ? 'max-w-0 opacity-0 scale-x-0 overflow-hidden' : 'max-w-[200px] opacity-100 scale-x-100'
                            )}
                          >
                            {t(item.labelKey || item.label)}
                          </span>
                        </>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
