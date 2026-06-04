import { PageHeader } from '@/components/ui/PageHeader.jsx';
import PackagingTab from '@/pages/inventory/PackagingTab.jsx';

export default function PackagingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Packaging"
        description="Manage packaging materials, groups, assignments, and stock consumption from one dedicated workspace."
      />
      <PackagingTab />
    </div>
  );
}
