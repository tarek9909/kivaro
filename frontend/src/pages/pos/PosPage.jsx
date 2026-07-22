import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, LayoutDashboard, ShoppingBasket, UserPlus } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import { Button, EmptyState, GlassPanel, GlassPanelBody, PageHeader } from '@/components/ui/index.js';
import { cn } from '@/lib/cn.js';
import { PosCustomerModal } from './PosCustomerModal.jsx';
import { PosManagerReviewTab } from './PosManagerReviewTab.jsx';
import { PosMyOrdersTab } from './PosMyOrdersTab.jsx';
import { POS_PERMISSIONS } from './pos.constants.js';
import { SalesmanWorkspaceTab } from './SalesmanWorkspaceTab.jsx';

function mergeWarehouses(knownWarehouses, orders) {
  const values = new Map((knownWarehouses || []).map((warehouse) => [String(warehouse.id), warehouse]));
  for (const order of orders || []) {
    if (order.warehouse_id && !values.has(String(order.warehouse_id))) {
      values.set(String(order.warehouse_id), {
        id: order.warehouse_id,
        name: order.warehouse_name || `Warehouse #${order.warehouse_id}`
      });
    }
  }
  return [...values.values()];
}

const TAB_DEFINITIONS = [
  {
    id: 'orders',
    label: 'My POS orders',
    icon: ShoppingBasket,
    description: 'Pending orders and catalogue',
    needs: 'ownOrders'
  },
  {
    id: 'review',
    label: 'Manager review',
    icon: ClipboardCheck,
    description: 'Grouped pending work',
    needs: 'review'
  },
  {
    id: 'workspace',
    label: 'My workspace',
    icon: LayoutDashboard,
    description: 'History and KPIs',
    needs: 'workspace'
  }
];

export default function PosPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canOwnOrders = hasPermission(POS_PERMISSIONS.ownOrders);
  const canReview = hasPermission(POS_PERMISSIONS.review);
  const canAccept = hasPermission(POS_PERMISSIONS.accept);
  const canCreateCustomers = hasPermission(POS_PERMISSIONS.createCustomers);
  const canRequestGifts = hasPermission(POS_PERMISSIONS.requestGifts);
  const canApproveGifts = hasPermission(POS_PERMISSIONS.approveGifts);
  const canViewInventory = hasPermission('inventory.view');
  const canWorkspace = hasPermission(POS_PERMISSIONS.salesmanWorkspace);
  const [activeTab, setActiveTab] = useState(() => (
    canOwnOrders ? 'orders' : canReview ? 'review' : canWorkspace ? 'workspace' : ''
  ));
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const warehousesQuery = useWarehousesOptions(canOwnOrders && canViewInventory);
  const recentOrdersQuery = useQuery({
    queryKey: ['pos', 'orders', 'warehouse-options'],
    queryFn: () => api.pos.orders.list({ page: 1, limit: 100 }),
    enabled: canOwnOrders,
    staleTime: 30_000
  });
  const territoriesQuery = useQuery({
    queryKey: ['pos', 'territories'],
    queryFn: () => api.pos.territories.list(),
    enabled: canOwnOrders && canCreateCustomers,
    staleTime: 60_000
  });

  const availableTabs = useMemo(
    () => TAB_DEFINITIONS.filter((tab) => {
      if (tab.needs === 'ownOrders') return canOwnOrders;
      if (tab.needs === 'review') return canReview;
      return canWorkspace;
    }),
    [canOwnOrders, canReview, canWorkspace]
  );
  useEffect(() => {
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id || '');
    }
  }, [activeTab, availableTabs]);

  const recentOrders = recentOrdersQuery.data?.data?.pos_orders || [];
  const warehouses = useMemo(
    () => mergeWarehouses(warehousesQuery.data?.data?.warehouses || [], recentOrders),
    [recentOrders, warehousesQuery.data?.data?.warehouses]
  );
  const defaultWarehouseId = warehouses[0]?.id;
  const territories = territoriesQuery.data?.data?.territories || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales workflow"
        title="Mini POS"
        description="Salesmen create unreserved customer orders from a quantity-hidden catalogue. Managers review them by salesman and convert selected available orders into a combined dispatch."
        actions={canOwnOrders && canCreateCustomers ? (
          <Button variant="secondary" leftIcon={UserPlus} onClick={() => setCustomerModalOpen(true)}>
            New POS customer
          </Button>
        ) : null}
      />

      {availableTabs.length ? (
        <>
          <nav aria-label="Mini POS sections" className="glass-panel scrollbar-glass overflow-x-auto">
            <div className="flex min-w-max gap-1 p-1">
              {availableTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex min-w-[150px] items-center gap-2 rounded-xl px-3 py-2.5 text-left transition',
                      active
                        ? 'bg-gradient-to-r from-brand-500/30 to-accent-500/15 text-ink-50 shadow-glass'
                        : 'text-ink-300 hover:bg-white/5 hover:text-ink-50'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{tab.label}</span>
                      <span className="block truncate text-[10px] text-ink-400">{tab.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          {activeTab === 'orders' && (
            <PosMyOrdersTab
              warehouses={warehouses}
              defaultWarehouseId={defaultWarehouseId}
              canRequestGifts={canRequestGifts}
              canCreateCustomers={canCreateCustomers}
              onCreateCustomer={() => setCustomerModalOpen(true)}
            />
          )}
          {activeTab === 'review' && <PosManagerReviewTab canAccept={canAccept} canApproveGifts={canApproveGifts} />}
          {activeTab === 'workspace' && <SalesmanWorkspaceTab canLoadOrders={canOwnOrders} />}
        </>
      ) : (
        <GlassPanel>
          <GlassPanelBody>
            <EmptyState
              icon={ShoppingBasket}
              title="Mini POS access is restricted"
              description="Ask an administrator for the appropriate Mini POS own-order or review permission."
            />
          </GlassPanelBody>
        </GlassPanel>
      )}

      {canOwnOrders && canCreateCustomers && (
        <PosCustomerModal
          open={customerModalOpen}
          onClose={() => setCustomerModalOpen(false)}
          territories={territories}
        />
      )}
    </div>
  );
}
