import { AlertTriangle, CheckCircle2, PackageCheck } from 'lucide-react';
import { Badge, Button, DataTable, Modal } from '@/components/ui/index.js';
import { formatNumber } from '@/lib/formatters.js';

function quantity(value, unit = '') {
  const formatted = formatNumber(value, { maximumFractionDigits: 4 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function SummaryCard({ label, value, tone = 'text-ink-50' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">{label}</p>
      <p className={`mt-1 font-mono text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export function PackagingPreviewModal({ open, onClose, preview, onComplete, isCompleting, canComplete = false }) {
  if (!preview) return null;
  const shelfMetrics = [
    ['Reusable shelf bags used', preview.input?.reusable_shelf_packages_used, 'bags'],
    ['Unpacked kg reused', preview.input?.unpacked_shelf_kg_used, 'kg'],
    ['New shelf bags', preview.input?.new_shelf_packages, 'bags'],
    ['New unpacked carry', preview.input?.new_unpacked_shelf_kg, 'kg']
  ].filter(([, value]) => value !== null && value !== undefined);
  const shortageColumns = [
    {
      id: 'label',
      header: 'Input',
      cell: (row) => <span className="font-medium text-ink-50">{row.label}</span>
    },
    {
      id: 'required_quantity',
      header: 'Required',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm">{quantity(row.required_quantity, row.unit)}</span>
    },
    {
      id: 'available_quantity',
      header: 'Available',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm">{quantity(row.available_quantity, row.unit)}</span>
    },
    {
      id: 'shortage_quantity',
      header: 'Shortage',
      align: 'right',
      cell: (row) => (
        <span className={`font-mono text-sm ${Number(row.shortage_quantity) > 0 ? 'text-rose-200' : 'text-emerald-200'}`}>
          {quantity(row.shortage_quantity, row.unit)}
        </span>
      )
    },
    {
      id: 'available',
      header: 'State',
      cell: (row) => <Badge tone={row.available ? 'success' : 'danger'}>{row.available ? 'available' : 'short'}</Badge>
    }
  ];

  const componentColumns = [
    {
      id: 'item_name',
      header: 'Component',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-50">{row.item_name}</p>
          <p className="text-xs text-ink-400">{row.component_role?.replaceAll('_', ' ')}</p>
        </div>
      )
    },
    {
      id: 'quantity_per_outer',
      header: 'Per outer',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm">{quantity(row.quantity_per_outer, 'pc')}</span>
    },
    {
      id: 'required_quantity',
      header: 'Total input',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm">{quantity(row.required_quantity, 'pc')}</span>
    },
    {
      id: 'unit_cost',
      header: 'WAC',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm">{formatNumber(row.unit_cost, { maximumFractionDigits: 4 })}</span>
    },
    {
      id: 'total_cost',
      header: 'Cost',
      align: 'right',
      cell: (row) => <span className="font-mono text-sm">{formatNumber(row.total_cost, { maximumFractionDigits: 4 })}</span>
    }
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Packaging preview — ${preview.group?.name || 'group'}`}
      description="This preview is calculated by the server from the saved group configuration, live stock, carton state, and weighted-average cost."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isCompleting}>Close</Button>
          <Button
            leftIcon={PackageCheck}
            onClick={onComplete}
            disabled={!preview.can_complete || !canComplete}
            isLoading={isCompleting}
          >
            Complete packaging
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className={`flex items-start gap-3 rounded-2xl border p-4 ${preview.can_complete ? 'border-emerald-400/25 bg-emerald-500/[0.07]' : 'border-rose-400/25 bg-rose-500/[0.07]'}`}>
          {preview.can_complete ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />}
          <div>
            <p className="font-medium text-ink-50">{preview.can_complete ? 'All inputs are currently available' : 'Packaging cannot be completed yet'}</p>
            <p className="mt-1 text-xs text-ink-300">{!canComplete ? 'You can review this preview, but packaging completion requires inventory creation or stock-adjustment permission.' : preview.can_complete ? 'Confirmation atomically consumes the listed source stock and creates ready containers.' : 'Resolve every shortage, then generate a fresh preview before completion.'}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Outer cartons" value={quantity(preview.output?.full_outer_cartons, 'cartons')} />
          <SummaryCard label="Inner bags" value={quantity(preview.output?.total_inner_quantity, 'bags')} />
          <SummaryCard label="Group capacity" value={quantity(preview.group_capacity_kg, 'kg')} />
          <SummaryCard label="Total cost" value={formatNumber(preview.costs?.total_cost, { maximumFractionDigits: 4 })} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Input Source & Consumption Summary</h4>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="Saved input" value={preview.input?.item_name || '-'} />
            <SummaryCard label="Cartons consumed" value={quantity(preview.input?.cartons_consumed, 'cartons')} />
            <SummaryCard label="Input WAC" value={formatNumber(preview.input?.unit_cost, { maximumFractionDigits: 4 })} />
            {shelfMetrics.map(([label, value, unit]) => (
              <SummaryCard key={label} label={label} value={quantity(value, unit)} />
            ))}
            <SummaryCard label="Warehouse" value={preview.warehouse_id || '-'} />
          </div>
        </div>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="border-b border-white/5 pb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Availability and Shortages</h4>
            <p className="mt-0.5 text-xs text-ink-300">Server-provided availability is checked again under transaction locks when you complete.</p>
          </div>
          <DataTable columns={shortageColumns} rows={preview.shortages || []} rowKey={(row) => `${row.label}-${row.unit}`} />
        </section>

        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="border-b border-white/5 pb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-300">Packaging Material Cost</h4>
            <p className="mt-0.5 text-xs text-ink-300">These physical components are consumed as inputs; only configured ready outputs are sale offers.</p>
          </div>
          <DataTable columns={componentColumns} rows={preview.components || []} rowKey={(row) => `${row.component_role}-${row.item_id}`} />
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Raw cost" value={formatNumber(preview.costs?.raw_cost, { maximumFractionDigits: 4 })} />
          <SummaryCard label="Packaging cost" value={formatNumber(preview.costs?.packaging_cost, { maximumFractionDigits: 4 })} />
          <SummaryCard label="Cost / outer" value={formatNumber(preview.costs?.cost_per_outer, { maximumFractionDigits: 4 })} />
          <SummaryCard label="Cost / inner" value={formatNumber(preview.costs?.cost_per_inner, { maximumFractionDigits: 4 })} />
        </div>
      </div>
    </Modal>
  );
}
