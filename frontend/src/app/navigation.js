import {
  LayoutDashboard,
  Boxes,
  Truck,
  Users,
  ShoppingCart,
  Wallet,
  Factory,
  PieChart,
  MapPinned,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Bell,
  Store
} from 'lucide-react';

/**
 * Each navigation item declares a `permission` (or array via anyOfPermissions)
 * which is matched against the authenticated user's permissions list.
 * Items without permissions are visible to every authenticated user.
 */
export const NAV_SECTIONS = [
  {
    id: 'overview',
    label: 'Overview',
    labelKey: 'nav.overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        labelKey: 'nav.dashboard',
        to: '/',
        icon: LayoutDashboard,
        moduleKey: 'dashboard',
        anyOfPermissions: ['dashboard.view']
      }
    ]
  },
  {
    id: 'operations',
    label: 'Operations',
    labelKey: 'nav.operations',
    items: [
      {
        id: 'inventory',
        label: 'Inventory',
        labelKey: 'nav.inventory',
        to: '/inventory',
        icon: Boxes,
        moduleKey: 'inventory',
        anyOfPermissions: ['inventory.view', 'stock.movements', 'stock.adjust']
      },
      {
        id: 'production',
        label: 'Production',
        labelKey: 'nav.production',
        to: '/production',
        icon: Factory,
        moduleKey: 'production',
        anyOfPermissions: ['production.view', 'production.create', 'production.complete']
      },
      {
        id: 'purchases',
        label: 'Purchases',
        labelKey: 'nav.purchases',
        to: '/purchases',
        icon: ShoppingCart,
        moduleKey: 'purchases',
        anyOfPermissions: ['purchase_orders.view', 'accounting.view', 'accounting.manage']
      },
      {
        id: 'dispatch',
        label: 'Dispatch',
        labelKey: 'nav.dispatch',
        to: '/dispatch',
        icon: Truck,
        moduleKey: 'dispatch',
        anyOfPermissions: [
          'dispatch.view',
          'dispatch.create',
          'dispatch.approve',
          'dispatch.settle',
          'dispatch.print'
        ]
      }
    ]
  },
  {
    id: 'sales',
    label: 'Sales and Customers',
    labelKey: 'nav.sales',
    items: [
      {
        id: 'customers',
        label: 'Customers',
        labelKey: 'nav.customers',
        to: '/customers',
        icon: Users,
        moduleKey: 'customers',
        anyOfPermissions: [
          'customers.view',
          'customers.create',
          'customers.update',
          'customers.delete'
        ]
      },
      {
        id: 'locations',
        label: 'Locations',
        labelKey: 'nav.locations',
        to: '/locations',
        icon: MapPinned,
        moduleKey: 'locations',
        anyOfPermissions: ['locations.manage', 'salesmen.manage', 'targets.manage']
      },
      {
        id: 'commissions',
        label: 'Commissions',
        labelKey: 'nav.commissions',
        to: '/commissions',
        icon: Receipt,
        moduleKey: 'commissions',
        anyOfPermissions: ['commissions.manage']
      }
    ]
  },
  {
    id: 'finance',
    label: 'Finance',
    labelKey: 'nav.finance',
    items: [
      {
        id: 'accounting',
        label: 'Accounting',
        labelKey: 'nav.accounting',
        to: '/accounting',
        icon: Wallet,
        moduleKey: 'accounting',
        anyOfPermissions: ['accounting.view', 'accounting.manage']
      },
      {
        id: 'debts',
        label: 'Debts and Payments',
        labelKey: 'nav.payments',
        to: '/payments',
        icon: ScrollText,
        moduleKey: 'payments',
        anyOfPermissions: [
          'debts.manage',
          'accounting.view',
          'accounting.manage',
          'dispatch.print'
        ]
      }
    ]
  },
  {
    id: 'insights',
    label: 'Insights',
    labelKey: 'nav.insights',
    items: [
      {
        id: 'reports',
        label: 'Reports',
        labelKey: 'nav.reports',
        to: '/reports',
        icon: PieChart,
        moduleKey: 'reports',
        anyOfPermissions: ['reports.view']
      },
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        labelKey: 'nav.auditLogs',
        to: '/audit-logs',
        icon: ShieldCheck,
        moduleKey: 'audit_logs',
        anyOfPermissions: ['audit_logs.view']
      },
      {
        id: 'notifications',
        label: 'Notifications',
        labelKey: 'nav.notifications',
        to: '/notifications',
        icon: Bell,
        moduleKey: 'notifications',
        anyOfPermissions: ['dashboard.view']
      }
    ]
  },
  {
    id: 'admin',
    label: 'Administration',
    labelKey: 'nav.admin',
    items: [
      {
        id: 'users',
        label: 'Users',
        labelKey: 'nav.users',
        to: '/users',
        icon: Users,
        moduleKey: 'users',
        anyOfPermissions: ['users.view']
      },
      {
        id: 'roles',
        label: 'Roles and Permissions',
        labelKey: 'nav.roles',
        to: '/roles',
        icon: ShieldCheck,
        moduleKey: 'roles',
        anyOfPermissions: ['roles.manage']
      },
      {
        id: 'settings',
        label: 'Settings',
        labelKey: 'nav.settings',
        to: '/settings',
        icon: Settings,
        moduleKey: 'settings',
        anyOfPermissions: ['settings.manage', 'vat.view', 'vat.manage']
      }
    ]
  },
  {
    id: 'platform',
    label: 'Platform',
    labelKey: 'nav.platform',
    items: [
      {
        id: 'superadmin',
        label: 'Superadmin',
        labelKey: 'nav.superadmin',
        to: '/superadmin',
        icon: Store,
        anyOfPermissions: ['superadmin.manage']
      }
    ]
  }
];

export function flattenNavItems(sections = NAV_SECTIONS) {
  return sections.flatMap((section) => section.items);
}
