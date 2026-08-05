import { PageHeader } from '@/components/ui/index.js';
import { SalesmanWorkspaceTab } from './SalesmanWorkspaceTab.jsx';

/**
 * Kept as a standalone route so the self-service workspace remains available
 * when a store enables it independently from Mini POS order entry/review.
 */
export default function SalesmanWorkspacePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Salesman self-service"
        title="My workspace"
        description="Follow your own dispatches, delivery closeouts, customer debt, payments, targets, and commissions from authoritative server data."
      />
      <SalesmanWorkspaceTab />
    </div>
  );
}
