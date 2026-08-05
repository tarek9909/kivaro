import { Outlet } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader.jsx';

export default function DispatchLayout() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Orders & deliveries"
        description="Review customer orders, release deliveries, and settle outbound stock in the field."
      />
      <Outlet />
    </div>
  );
}
