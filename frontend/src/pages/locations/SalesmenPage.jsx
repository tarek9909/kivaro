import { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Target, UsersRound } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button, EmptyState, GlassPanel, GlassPanelBody, PageHeader } from '@/components/ui/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { SalesmanWorkspaceTab } from '@/pages/pos/SalesmanWorkspaceTab.jsx';
import { LOCATIONS_PERMISSIONS } from './locations.config.js';
import SalesmenTab from './SalesmenTab.jsx';
import TargetsTab from './TargetsTab.jsx';

const WORKSPACE_PERMISSIONS = [
  'salesman_workspace.view',
  'salesmen.manage',
  'pos.create_for_salesman'
];

export default function SalesmenPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [searchParams, setSearchParams] = useSearchParams();
  const canDirectory = hasPermission(LOCATIONS_PERMISSIONS.salesmen);
  const canTargets = hasPermission(LOCATIONS_PERMISSIONS.targets);
  const canWorkspace = WORKSPACE_PERMISSIONS.some((permission) => hasPermission(permission));

  const tabs = useMemo(() => [
    canDirectory && { id: 'directory', label: 'Salesmen', icon: UsersRound },
    canWorkspace && { id: 'workspace', label: 'Workspace', icon: LayoutDashboard },
    canTargets && { id: 'targets', label: 'Targets', icon: Target }
  ].filter(Boolean), [canDirectory, canTargets, canWorkspace]);

  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => requestedTab || tabs[0]?.id || '');

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id || '');
    }
  }, [activeTab, tabs]);

  function selectTab(tabId) {
    setActiveTab(tabId);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    if (tabId !== 'workspace') next.delete('salesman_id');
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales operations"
        title="Salesmen"
        description="Manage salesmen, territories, targets, and their operational workspace in one place."
      />

      {tabs.length ? (
        <>
          <nav aria-label="Salesmen sections" className="glass-panel overflow-x-auto">
            <div className="flex min-w-max gap-1 p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    size="sm"
                    variant={activeTab === tab.id ? 'primary' : 'ghost'}
                    leftIcon={Icon}
                    onClick={() => selectTab(tab.id)}
                  >
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </nav>

          {activeTab === 'directory' && <SalesmenTab />}
          {activeTab === 'workspace' && (
            <SalesmanWorkspaceTab initialSalesmanId={searchParams.get('salesman_id')} />
          )}
          {activeTab === 'targets' && <TargetsTab />}
        </>
      ) : (
        <GlassPanel>
          <GlassPanelBody>
            <EmptyState
              icon={UsersRound}
              title="Salesmen access is restricted"
              description="Ask an administrator for salesman management or workspace access."
            />
          </GlassPanelBody>
        </GlassPanel>
      )}
    </div>
  );
}
