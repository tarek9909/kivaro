import { NavLink, Outlet } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader.jsx';
import { useAuthStore } from '@/app/stores/authStore.js';
import { PURCHASES_TABS } from './purchases.config.js';
import { cn } from '@/lib/cn.js';

export default function PurchasesLayout() {
  const hasAnyPermission = useAuthStore((state) => state.hasAnyPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const visibleTabs = PURCHASES_TABS.filter((tab) =>
    hasModule(tab.featureKey) && hasAnyPermission(tab.anyOfPermissions)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Purchases"
        description="Suppliers, purchase orders, receiving, and supplier payments. Use the tabs to switch contexts."
      />

      <nav
        aria-label="Purchases sections"
        className="glass-panel scrollbar-glass overflow-x-auto lg:overflow-visible"
      >
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:min-w-0 lg:items-center gap-1 p-1">
          {visibleTabs.map((tab) => (
            <li key={tab.id} className="w-full lg:w-auto">
              <NavLink
                to={tab.to}
                end
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center justify-center w-full gap-2 rounded-xl px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-gradient-to-r from-brand-500/30 to-accent-500/15 text-ink-50 shadow-glass'
                      : 'text-ink-300 hover:bg-white/5 hover:text-ink-50'
                  )
                }
              >
                {tab.id === 'orders' && (
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{tab.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet />
    </div>
  );
}
