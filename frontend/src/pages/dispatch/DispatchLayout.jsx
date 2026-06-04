import { Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader.jsx';

export default function DispatchLayout() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Dispatch"
        description="Plan, approve, dispatch, and settle outbound stock against customers in the field."
      />
      <Outlet />
    </div>
  );
}
