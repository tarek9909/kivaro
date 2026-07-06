import { useAuthStore } from '@/app/stores/authStore.js';
import { PageHeader } from '@/components/ui/PageHeader.jsx';
import { CompanyProfileCard } from './CompanyProfileCard.jsx';
import { SystemSettingsCard } from './SystemSettingsCard.jsx';

export default function SettingsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canEdit = hasPermission('settings.manage');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Manage the company profile and runtime system settings."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {canEdit && <CompanyProfileCard canEdit={canEdit} />}
        {canEdit && <SystemSettingsCard canEdit={canEdit} />}
      </div>
    </div>
  );
}
