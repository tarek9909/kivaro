import { useState } from 'react';
import { Archive, Boxes, ListPlus, PackageCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader.jsx';
import { cn } from '@/lib/cn.js';
import { PackagingGroupsTab } from './PackagingGroupsTab.jsx';
import { PackagingOperationsTab } from './PackagingOperationsTab.jsx';
import { ReadyStockTab } from './ReadyStockTab.jsx';
import { SaleCatalogTab } from './SaleCatalogTab.jsx';

const TABS = [
  { id: 'groups', label: 'Groups', icon: Boxes, description: 'Saved flat templates' },
  { id: 'operations', label: 'Package stock', icon: PackageCheck, description: 'Preview and complete' },
  { id: 'ready-stock', label: 'Ready stock', icon: Archive, description: 'Individual containers' },
  { id: 'sale-catalog', label: 'Sale catalog', icon: ListPlus, description: 'Prices and POS activation' }
];

export default function PackagingPage() {
  const [activeTab, setActiveTab] = useState('groups');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Packaging and ready stock"
        description="Turn canonical item inventory into source-tracked ready cartons and bags. Groups are flat templates; every operation and ready container retains its own server snapshot."
      />

      <nav aria-label="Packaging sections" className="glass-panel scrollbar-glass overflow-x-auto">
        <div className="flex min-w-max gap-1 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex min-w-[142px] items-center gap-2 rounded-xl px-3 py-2.5 text-left transition',
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

      {activeTab === 'groups' && <PackagingGroupsTab />}
      {activeTab === 'operations' && <PackagingOperationsTab />}
      {activeTab === 'ready-stock' && <ReadyStockTab />}
      {activeTab === 'sale-catalog' && <SaleCatalogTab />}
    </div>
  );
}
