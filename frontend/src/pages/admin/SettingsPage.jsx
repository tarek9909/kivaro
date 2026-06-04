import { useAuthStore } from '@/app/stores/authStore.js';
import { PageHeader } from '@/components/ui/PageHeader.jsx';
import { CompanyProfileCard } from './CompanyProfileCard.jsx';
import { SystemSettingsCard } from './SystemSettingsCard.jsx';
import { VatSettingsCard } from './VatSettingsCard.jsx';

export default function SettingsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const canEdit = hasPermission('settings.manage');
  const canViewVat = hasModule('settings.vat') && (canEdit || hasPermission('vat.view') || hasPermission('vat.manage'));
  const canEditVat = canEdit || hasPermission('vat.manage');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Manage the company profile and runtime system settings."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {canViewVat && <VatSettingsCard canEdit={canEditVat} />}
        {canEdit && <CompanyProfileCard canEdit={canEdit} />}
        {canEdit && <SystemSettingsCard canEdit={canEdit} />}
      </div>
    </div>
  );
}
