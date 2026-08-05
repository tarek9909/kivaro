import { useAuthStore } from '@/app/stores/authStore.js';
import { PageHeader } from '@/components/ui/PageHeader.jsx';
import { CompanyProfileCard } from './CompanyProfileCard.jsx';

export default function SettingsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canEdit = hasPermission('settings.manage');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Manage the company profile details."
      />

      {canEdit && <CompanyProfileCard canEdit={canEdit} />}
    </div>
  );
}
