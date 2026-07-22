import { useAuthStore } from '@/app/stores/authStore.js';
import { PageHeader } from '@/components/ui/index.js';
import { SalesmanWorkspaceTab } from './SalesmanWorkspaceTab.jsx';

/**
 * Kept as a standalone route so the self-service workspace remains available
 * when a store enables it independently from Mini POS order entry/review.
 */
export default function SalesmanWorkspacePage() {
  const canLoadOrders = useAuthStore((state) => state.hasPermission('pos.own_orders'));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Salesman self-service"
        title="My workspace"
        description="Follow your own dispatches, delivery closeouts, customer debt, payments, targets, commissions, and Mini POS history from authoritative server data."
      />
      <SalesmanWorkspaceTab canLoadOrders={canLoadOrders} />
    </div>
  );
}
