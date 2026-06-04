import { useEffect } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useThemeStore } from '@/app/stores/themeStore.js';
import { ProtectedRoute } from '@/app/routes/ProtectedRoute.jsx';
import { PublicOnlyRoute } from '@/app/routes/PublicOnlyRoute.jsx';
import { getDefaultAuthenticatedPath } from '@/app/routes/destinations.js';
import LoginPage from '@/pages/LoginPage.jsx';
import DashboardPage from '@/pages/DashboardPage.jsx';
import ForbiddenPage from '@/pages/ForbiddenPage.jsx';
import NotFoundPage from '@/pages/NotFoundPage.jsx';
import ProfilePage from '@/pages/ProfilePage.jsx';
import UsersPage from '@/pages/admin/UsersPage.jsx';
import RolesPage from '@/pages/admin/RolesPage.jsx';
import SettingsPage from '@/pages/admin/SettingsPage.jsx';
import AuditLogsPage from '@/pages/admin/AuditLogsPage.jsx';
import NotificationsPage from '@/pages/admin/NotificationsPage.jsx';
import InventoryLayout from '@/pages/inventory/InventoryLayout.jsx';
import ItemsTab from '@/pages/inventory/ItemsTab.jsx';
import PackagingPage from '@/pages/packaging/PackagingPage.jsx';
import VariantsTab from '@/pages/inventory/VariantsTab.jsx';
import CategoriesTab from '@/pages/inventory/CategoriesTab.jsx';
import UnitsTab from '@/pages/inventory/UnitsTab.jsx';
import WarehousesTab from '@/pages/inventory/WarehousesTab.jsx';
import StockBalancesTab from '@/pages/inventory/StockBalancesTab.jsx';
import StockMovementsTab from '@/pages/inventory/StockMovementsTab.jsx';
import AdjustmentsTab from '@/pages/inventory/AdjustmentsTab.jsx';
import {
  INVENTORY_PARENT_PERMISSIONS,
  INVENTORY_PERMISSIONS,
  pickFirstAllowedInventoryTab
} from '@/pages/inventory/inventory.config.js';
import PurchasesLayout from '@/pages/purchases/PurchasesLayout.jsx';
import PurchaseOrdersTab from '@/pages/purchases/PurchaseOrdersTab.jsx';
import SuppliersTab from '@/pages/purchases/SuppliersTab.jsx';
import SupplierPaymentsTab from '@/pages/purchases/SupplierPaymentsTab.jsx';
import {
  PURCHASES_PARENT_PERMISSIONS,
  PURCHASES_PERMISSIONS,
  pickFirstAllowedPurchasesTab
} from '@/pages/purchases/purchases.config.js';
import LocationsLayout from '@/pages/locations/LocationsLayout.jsx';
import LocationsTab from '@/pages/locations/LocationsTab.jsx';
import SublocationsTab from '@/pages/locations/SublocationsTab.jsx';
import SalesmenTab from '@/pages/locations/SalesmenTab.jsx';
import TargetsTab from '@/pages/locations/TargetsTab.jsx';
import {
  LOCATIONS_PARENT_PERMISSIONS,
  LOCATIONS_PERMISSIONS,
  pickFirstAllowedLocationsTab
} from '@/pages/locations/locations.config.js';
import CustomersPage from '@/pages/customers/CustomersPage.jsx';
import { CUSTOMERS_PARENT_PERMISSIONS } from '@/pages/customers/customers.config.js';
import ProductionLayout from '@/pages/production/ProductionLayout.jsx';
import ConfigurationsTab from '@/pages/production/ConfigurationsTab.jsx';
import BatchesTab from '@/pages/production/BatchesTab.jsx';
import {
  PRODUCTION_PARENT_PERMISSIONS,
  PRODUCTION_PERMISSIONS,
  pickFirstAllowedProductionTab
} from '@/pages/production/production.config.js';
import DispatchLayout from '@/pages/dispatch/DispatchLayout.jsx';
import DispatchRequestsPage from '@/pages/dispatch/DispatchRequestsPage.jsx';
import {
  DISPATCH_PARENT_PERMISSIONS,
  pickFirstAllowedDispatchTab
} from '@/pages/dispatch/dispatch.config.js';
import AccountingLayout from '@/pages/accounting/AccountingLayout.jsx';
import ExpenseCategoriesTab from '@/pages/accounting/ExpenseCategoriesTab.jsx';
import ExpensesTab from '@/pages/accounting/ExpensesTab.jsx';
import CashAccountsTab from '@/pages/accounting/CashAccountsTab.jsx';
import FinancialTransactionsTab from '@/pages/accounting/FinancialTransactionsTab.jsx';
import SalesmanBalancesTab from '@/pages/accounting/SalesmanBalancesTab.jsx';
import {
  ACCOUNTING_PARENT_PERMISSIONS,
  ACCOUNTING_PERMISSIONS,
  pickFirstAllowedAccountingTab
} from '@/pages/accounting/accounting.config.js';
import PaymentsLayout from '@/pages/payments/PaymentsLayout.jsx';
import CustomerDebtsTab from '@/pages/payments/CustomerDebtsTab.jsx';
import CustomerPaymentsTab from '@/pages/payments/CustomerPaymentsTab.jsx';
import CustomerCreditsTab from '@/pages/payments/CustomerCreditsTab.jsx';
import ReceiptsTab from '@/pages/payments/ReceiptsTab.jsx';
import {
  PAYMENTS_PARENT_PERMISSIONS,
  PAYMENTS_PERMISSIONS,
  pickFirstAllowedPaymentsTab
} from '@/pages/payments/payments.config.js';
import CommissionsLayout from '@/pages/commissions/CommissionsLayout.jsx';
import CommissionRulesTab from '@/pages/commissions/CommissionRulesTab.jsx';
import CommissionsCalculationsTab from '@/pages/commissions/CommissionsCalculationsTab.jsx';
import {
  COMMISSIONS_PARENT_PERMISSIONS,
  pickFirstAllowedCommissionsTab
} from '@/pages/commissions/commissions.config.js';
import ReportsLayout from '@/pages/reports/ReportsLayout.jsx';
import SuperadminDashboard from '@/pages/superadmin/SuperadminDashboard.jsx';
import {
  REPORTS_PARENT_PERMISSIONS,
  REPORTS_PERMISSIONS,
  REPORTS_REGISTRY,
  getReportBySlug,
  pickFirstAllowedReportTab
} from '@/pages/reports/reports.config.js';

const PLACEHOLDER_ROUTES = [];

const ADMIN_ROUTES = [
  { path: 'users', element: <UsersPage />, anyOfPermissions: ['users.view'], moduleKey: 'users' },
  { path: 'roles', element: <RolesPage />, anyOfPermissions: ['roles.manage'], moduleKey: 'roles' },
  { path: 'settings', element: <SettingsPage />, anyOfPermissions: ['settings.manage', 'vat.view', 'vat.manage'], moduleKey: 'settings' },
  { path: 'audit-logs', element: <AuditLogsPage />, anyOfPermissions: ['audit_logs.view'], moduleKey: 'audit_logs' },
  { path: 'notifications', element: <NotificationsPage />, anyOfPermissions: ['dashboard.view'], moduleKey: 'notifications' }
];

function InventoryIndexRedirect() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const target = pickFirstAllowedInventoryTab(hasPermission, hasModule);
  if (!target) {
    return <Navigate to="/" replace />;
  }
  // pickFirstAllowedInventoryTab returns absolute paths like /inventory/items.
  return <Navigate to={target} replace />;
}

function PurchasesIndexRedirect() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const target = pickFirstAllowedPurchasesTab(hasPermission, hasModule);
  if (!target) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={target} replace />;
}

function LocationsIndexRedirect() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const target = pickFirstAllowedLocationsTab(hasPermission, hasModule);
  if (!target) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={target} replace />;
}

function ProductionIndexRedirect() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const target = pickFirstAllowedProductionTab(hasPermission, hasModule);
  if (!target) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={target} replace />;
}

function DispatchIndexRedirect() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const target = pickFirstAllowedDispatchTab(hasPermission, hasModule);
  if (!target) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={target} replace />;
}

function AccountingIndexRedirect() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const target = pickFirstAllowedAccountingTab(hasPermission, hasModule);
  if (!target) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={target} replace />;
}

function PaymentsIndexRedirect() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const target = pickFirstAllowedPaymentsTab(hasPermission, hasModule);
  if (!target) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={target} replace />;
}

function CommissionsIndexRedirect() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const target = pickFirstAllowedCommissionsTab(hasPermission, hasModule);
  if (!target) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={target} replace />;
}

function ReportsIndexRedirect() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const target = pickFirstAllowedReportTab(hasPermission, hasModule);
  if (!target) {
    return <Navigate to="/" replace />;
  }
  return <Navigate to={target} replace />;
}

function ReportRoute() {
  const { reportId } = useParams();
  const reportKey = getReportBySlug(reportId);
  const moduleKey = reportKey ? `reports.${REPORTS_REGISTRY[reportKey].id}` : undefined;
  return (
    <ProtectedRoute anyOfPermissions={[REPORTS_PERMISSIONS.view]} moduleKey={moduleKey}>
      <ReportsLayout />
    </ProtectedRoute>
  );
}

function RootIndex() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={getDefaultAuthenticatedPath(user)} replace />;
}

function StoreWorkspaceIndex() {
  const { storeSlug } = useParams();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);

  if (user?.is_superadmin) {
    return <Navigate to="/superadmin" replace />;
  }

  if (user?.store?.slug && user.store.slug !== storeSlug) {
    return <Navigate to={`/store/${user.store.slug}`} replace />;
  }

  if (!hasPermission('dashboard.view') || !hasModule('dashboard')) {
    return <Navigate to={getDefaultAuthenticatedPath(user)} replace />;
  }

  return <DashboardPage />;
}

export default function App() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
    useThemeStore.getState().init();
  }, [hydrate]);

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<RootIndex />} />
        <Route path="store/:storeSlug" element={<StoreWorkspaceIndex />} />
        <Route path="forbidden" element={<ForbiddenPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="superadmin"
          element={
            <ProtectedRoute anyOfPermissions={['superadmin.manage']}>
              <SuperadminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="superadmin/:storeSlug"
          element={
            <ProtectedRoute anyOfPermissions={['superadmin.manage']}>
              <SuperadminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="superadmin/:storeSlug/:tab"
          element={
            <ProtectedRoute anyOfPermissions={['superadmin.manage']}>
              <SuperadminDashboard />
            </ProtectedRoute>
          }
        />

        {ADMIN_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute anyOfPermissions={route.anyOfPermissions} moduleKey={route.moduleKey}>
                {route.element}
              </ProtectedRoute>
            }
          />
        ))}

        <Route
          path="inventory"
          element={
            <ProtectedRoute anyOfPermissions={INVENTORY_PARENT_PERMISSIONS} moduleKey="inventory">
              <InventoryLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<InventoryIndexRedirect />} />
          <Route
            path="items"
            element={
              <ProtectedRoute anyOfPermissions={[INVENTORY_PERMISSIONS.view]} moduleKey="inventory.items">
                <ItemsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="packaging"
            element={<Navigate to="/packaging" replace />}
          />
          <Route
            path="variants"
            element={
              <ProtectedRoute anyOfPermissions={[INVENTORY_PERMISSIONS.view]} moduleKey="inventory.variants">
                <VariantsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="categories"
            element={
              <ProtectedRoute anyOfPermissions={[INVENTORY_PERMISSIONS.view]} moduleKey="inventory.categories">
                <CategoriesTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="units"
            element={
              <ProtectedRoute anyOfPermissions={[INVENTORY_PERMISSIONS.view]} moduleKey="inventory.units">
                <UnitsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="warehouses"
            element={
              <ProtectedRoute anyOfPermissions={[INVENTORY_PERMISSIONS.view]} moduleKey="inventory.warehouses">
                <WarehousesTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="balances"
            element={
              <ProtectedRoute anyOfPermissions={[INVENTORY_PERMISSIONS.view]} moduleKey="inventory.balances">
                <StockBalancesTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="movements"
            element={
              <ProtectedRoute anyOfPermissions={[INVENTORY_PERMISSIONS.movements]} moduleKey="inventory.movements">
                <StockMovementsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="adjustments"
            element={
              <ProtectedRoute
                anyOfPermissions={[
                  INVENTORY_PERMISSIONS.adjust,
                  INVENTORY_PERMISSIONS.movements
                ]}
                moduleKey="inventory.adjustments"
              >
                <AdjustmentsTab />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="packaging"
          element={
            <ProtectedRoute anyOfPermissions={[INVENTORY_PERMISSIONS.view]} moduleKey="inventory.packaging">
              <PackagingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="purchases"
          element={
            <ProtectedRoute anyOfPermissions={PURCHASES_PARENT_PERMISSIONS} moduleKey="purchases">
              <PurchasesLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PurchasesIndexRedirect />} />
          <Route
            path="orders"
            element={
              <ProtectedRoute anyOfPermissions={[PURCHASES_PERMISSIONS.view]} moduleKey="purchases.orders">
                <PurchaseOrdersTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="suppliers"
            element={
              <ProtectedRoute anyOfPermissions={[PURCHASES_PERMISSIONS.view]} moduleKey="purchases.suppliers">
                <SuppliersTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="payments"
            element={
              <ProtectedRoute
                anyOfPermissions={[
                  PURCHASES_PERMISSIONS.accountingView,
                  PURCHASES_PERMISSIONS.accountingManage
                ]}
                moduleKey="purchases.payments"
              >
                <SupplierPaymentsTab />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="locations"
          element={
            <ProtectedRoute anyOfPermissions={LOCATIONS_PARENT_PERMISSIONS} moduleKey="locations">
              <LocationsLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<LocationsIndexRedirect />} />
          <Route
            path="areas"
            element={
              <ProtectedRoute anyOfPermissions={[LOCATIONS_PERMISSIONS.locations]} moduleKey="locations.locations">
                <LocationsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="sublocations"
            element={
              <ProtectedRoute anyOfPermissions={[LOCATIONS_PERMISSIONS.locations]} moduleKey="locations.sublocations">
                <SublocationsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="salesmen"
            element={
              <ProtectedRoute anyOfPermissions={[LOCATIONS_PERMISSIONS.salesmen]} moduleKey="locations.salesmen">
                <SalesmenTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="targets"
            element={
              <ProtectedRoute anyOfPermissions={[LOCATIONS_PERMISSIONS.targets]} moduleKey="locations.targets">
                <TargetsTab />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="customers"
          element={
            <ProtectedRoute anyOfPermissions={CUSTOMERS_PARENT_PERMISSIONS} moduleKey="customers">
              <CustomersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="production"
          element={
            <ProtectedRoute anyOfPermissions={PRODUCTION_PARENT_PERMISSIONS} moduleKey="production">
              <ProductionLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ProductionIndexRedirect />} />
          <Route
            path="configurations"
            element={
              <ProtectedRoute
                anyOfPermissions={[
                  PRODUCTION_PERMISSIONS.view,
                  PRODUCTION_PERMISSIONS.create
                ]}
                moduleKey="production.configurations"
              >
                <ConfigurationsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="batches"
            element={
              <ProtectedRoute
                anyOfPermissions={[
                  PRODUCTION_PERMISSIONS.view,
                  PRODUCTION_PERMISSIONS.create,
                  PRODUCTION_PERMISSIONS.complete
                ]}
                moduleKey="production.batches"
              >
                <BatchesTab />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="dispatch"
          element={
            <ProtectedRoute anyOfPermissions={DISPATCH_PARENT_PERMISSIONS} moduleKey="dispatch">
              <DispatchLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DispatchIndexRedirect />} />
          <Route
            path="requests"
            element={
              <ProtectedRoute anyOfPermissions={DISPATCH_PARENT_PERMISSIONS} moduleKey="dispatch.requests">
                <DispatchRequestsPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="accounting"
          element={
            <ProtectedRoute anyOfPermissions={ACCOUNTING_PARENT_PERMISSIONS} moduleKey="accounting">
              <AccountingLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AccountingIndexRedirect />} />
          <Route
            path="expense-categories"
            element={
              <ProtectedRoute
                anyOfPermissions={[
                  ACCOUNTING_PERMISSIONS.view,
                  ACCOUNTING_PERMISSIONS.manage
                ]}
                moduleKey="accounting.expense-categories"
              >
                <ExpenseCategoriesTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="expenses"
            element={
              <ProtectedRoute
                anyOfPermissions={[
                  ACCOUNTING_PERMISSIONS.view,
                  ACCOUNTING_PERMISSIONS.manage
                ]}
                moduleKey="accounting.expenses"
              >
                <ExpensesTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="cash-accounts"
            element={
              <ProtectedRoute
                anyOfPermissions={[
                  ACCOUNTING_PERMISSIONS.view,
                  ACCOUNTING_PERMISSIONS.manage
                ]}
                moduleKey="accounting.cash-accounts"
              >
                <CashAccountsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="transactions"
            element={
              <ProtectedRoute anyOfPermissions={[ACCOUNTING_PERMISSIONS.view]} moduleKey="accounting.financial-transactions">
                <FinancialTransactionsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="salesman-balances"
            element={
              <ProtectedRoute anyOfPermissions={[ACCOUNTING_PERMISSIONS.view]} moduleKey="accounting.salesman-balances">
                <SalesmanBalancesTab />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="payments"
          element={
            <ProtectedRoute anyOfPermissions={PAYMENTS_PARENT_PERMISSIONS} moduleKey="payments">
              <PaymentsLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PaymentsIndexRedirect />} />
          <Route
            path="debts"
            element={
              <ProtectedRoute anyOfPermissions={[PAYMENTS_PERMISSIONS.debts]} moduleKey="payments.debts">
                <CustomerDebtsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="customer-payments"
            element={
              <ProtectedRoute
                anyOfPermissions={[
                  PAYMENTS_PERMISSIONS.accountingView,
                  PAYMENTS_PERMISSIONS.accountingManage
                ]}
                moduleKey="payments.customer-payments"
              >
                <CustomerPaymentsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="customer-credits"
            element={
              <ProtectedRoute
                anyOfPermissions={[PAYMENTS_PERMISSIONS.accountingView]}
                moduleKey="payments.customer-credits"
              >
                <CustomerCreditsTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="receipts"
            element={
              <ProtectedRoute anyOfPermissions={[PAYMENTS_PERMISSIONS.receiptsPrint]} moduleKey="payments.receipts">
                <ReceiptsTab />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="commissions"
          element={
            <ProtectedRoute anyOfPermissions={COMMISSIONS_PARENT_PERMISSIONS} moduleKey="commissions">
              <CommissionsLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<CommissionsIndexRedirect />} />
          <Route
            path="rules"
            element={
              <ProtectedRoute anyOfPermissions={COMMISSIONS_PARENT_PERMISSIONS} moduleKey="commissions.rules">
                <CommissionRulesTab />
              </ProtectedRoute>
            }
          />
          <Route
            path="calculations"
            element={
              <ProtectedRoute anyOfPermissions={COMMISSIONS_PARENT_PERMISSIONS} moduleKey="commissions.calculations">
                <CommissionsCalculationsTab />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route
          path="reports"
          element={
            <ProtectedRoute anyOfPermissions={REPORTS_PARENT_PERMISSIONS} moduleKey="reports">
              <ReportsLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ReportsIndexRedirect />} />
          <Route
            path=":reportId"
            element={<ReportRoute />}
          />
        </Route>

        {PLACEHOLDER_ROUTES.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <ProtectedRoute anyOfPermissions={route.anyOfPermissions} moduleKey={route.moduleKey}>
                <ForbiddenPage />
              </ProtectedRoute>
            }
          />
        ))}

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
