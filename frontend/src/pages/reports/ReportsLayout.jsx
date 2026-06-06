import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Download, FileText, Filter, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { DataTable } from '@/components/ui/DataTable.jsx';
import {
  GlassPanel,
  GlassPanelBody,
  GlassPanelHeader
} from '@/components/ui/GlassPanel.jsx';
import { Input } from '@/components/ui/Input.jsx';
import { PageHeader } from '@/components/ui/PageHeader.jsx';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { Select } from '@/components/ui/Select.jsx';
import { LoadingState } from '@/components/ui/StateViews.jsx';
import { useItemsOptions, useVariantsOptions, useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import { useLocationsList, useSalesmenList, useSublocationsList } from '@/pages/locations/useLocationsOptions.js';
import { useSuppliersOptions } from '@/pages/purchases/usePurchasesOptions.js';
import { cn } from '@/lib/cn.js';
import { getErrorMessage } from '@/lib/errors.js';
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters.js';
import {
  COMMISSION_STATUS_OPTIONS,
  DEBT_STATUS_OPTIONS,
  DISPATCH_STATUS_OPTIONS,
  MOVEMENT_TYPE_OPTIONS,
  PACKAGING_ASSIGNMENT_STATUS_OPTIONS,
  PO_STATUS_OPTIONS,
  REFERENCE_TYPE_OPTIONS,
  REPORTS_REGISTRY,
  REPORTS_PERMISSIONS,
  REPORTS_TABS,
  getReportBySlug,
  pickFirstAllowedReportTab
} from './reports.config.js';

const PAGE_LIMIT = 25;
const NUMERIC_FILTERS = new Set([
  'warehouse',
  'item',
  'item_variant',
  'customer',
  'salesman',
  'location',
  'sublocation',
  'supplier',
  'packaging_group',
  'production_batch'
]);
const HIDDEN_ROW_FIELDS = new Set(['tax_amount']);
const SUMMARY_DISPLAY_METRICS = {
  commissions: ['sales_amount', 'target_amount', 'base_salary', 'total_commission', 'total_payable'],
  currentStock: ['quantity_on_hand', 'quantity_available', 'stock_value'],
  customerBalances: ['total_remaining_debt', 'available_credit', 'net_customer_balance'],
  debts: ['original_amount', 'paid_amount', 'remaining_amount'],
  dispatchSummary: ['net_total_amount', 'total_collected', 'total_debt'],
  profitLoss: ['total_income', 'total_expense', 'net_profit'],
  purchases: ['subtotal', 'amount_paid', 'total_amount'],
  packagingAssignments: ['charcoal_quantity_kg', 'primary_container_count', 'total_packaging_cost'],
  packagingShortages: ['shortage_quantity', 'required_quantity', 'total_cost'],
  salesmanTargetProgress: ['base_salary', 'target_amount', 'achieved_sales_amount'],
  sales: ['net_subtotal_amount', 'net_vat_amount', 'net_total_amount'],
  stockMovements: ['quantity_change', 'reserved_quantity_change']
};

const FILTER_PARAM = {
  commission_status: 'status',
  customer: 'customer_id',
  date_from: 'date_from',
  date_to: 'date_to',
  debt_status: 'status',
  dispatch_status: 'status',
  item: 'item_id',
  item_variant: 'item_variant_id',
  location: 'location_id',
  movement_type: 'movement_type',
  packaging_assignment_status: 'status',
  packaging_group: 'packaging_group_id',
  po_status: 'status',
  production_batch: 'production_batch_id',
  reference_type: 'reference_type',
  salesman: 'salesman_id',
  search: 'search',
  sublocation: 'sublocation_id',
  supplier: 'supplier_id',
  warehouse: 'warehouse_id'
};

const SELECT_FILTERS = {
  commission_status: COMMISSION_STATUS_OPTIONS,
  debt_status: DEBT_STATUS_OPTIONS,
  dispatch_status: DISPATCH_STATUS_OPTIONS,
  movement_type: MOVEMENT_TYPE_OPTIONS,
  packaging_assignment_status: PACKAGING_ASSIGNMENT_STATUS_OPTIONS,
  po_status: PO_STATUS_OPTIONS,
  reference_type: REFERENCE_TYPE_OPTIONS
};

const FILTER_LABELS = {
  commission_status: 'Status',
  customer: 'Customer',
  date_from: 'From',
  date_to: 'To',
  debt_status: 'Status',
  dispatch_status: 'Status',
  item: 'Item',
  item_variant: 'Variant',
  location: 'Location',
  movement_type: 'Movement type',
  packaging_assignment_status: 'Status',
  packaging_group: 'Packaging group',
  po_status: 'Status',
  production_batch: 'Production batch',
  reference_type: 'Reference type',
  salesman: 'Salesman',
  search: 'Search',
  sublocation: 'Sublocation',
  supplier: 'Supplier',
  warehouse: 'Warehouse'
};

const FIELD_LABELS = {
  net_profit: 'Net profit',
  supplier_payments: 'Supplier payments cash outflow',
  total_expense: 'Accrual expenses'
};

function cleanParams(filters) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .map(([key, value]) => [FILTER_PARAM[key], NUMERIC_FILTERS.has(key) ? Number(value) : value])
  );
}

function rowsFromResponse(response, rowsKey) {
  const direct = response?.data?.[rowsKey];
  if (Array.isArray(direct)) return direct;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

export function optionRows(response) {
  const data = response?.data;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data)) return response.data;
  if (data && typeof data === 'object') {
    const namedRows = Object.values(data).find((value) => Array.isArray(value));
    if (namedRows) return namedRows;
  }
  return [];
}

function optionLabel(row, fallback) {
  return row.name || row.display_name || row.full_name || row.code || row.sku || row.title || fallback;
}

function titleize(value) {
  if (FIELD_LABELS[value]) return FIELD_LABELS[value];
  return String(value)
    .replace(/_id$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isMoneyKey(key) {
  return /(amount|balance|cost|expense|gross|income|loss|paid|price|profit|purchase|remaining|revenue|sales|target|total|value)/i.test(key);
}

function isDateKey(key) {
  return /(date|_at)$/i.test(key);
}

function formatCell(key, value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (isDateKey(key)) return formatDate(value);
  if (typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)))) {
    return isMoneyKey(key) ? formatCurrency(value) : formatNumber(value);
  }
  if (typeof value === 'object') return 'Details';
  return String(value);
}

function buildColumns(rows) {
  const keys = [];
  for (const row of rows.slice(0, 10)) {
    for (const key of Object.keys(row || {})) {
      if (HIDDEN_ROW_FIELDS.has(key)) continue;
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys.map((key) => ({
    id: key,
    header: titleize(key),
    align: isMoneyKey(key) ? 'right' : undefined,
    className: cn('max-w-[240px] whitespace-nowrap', isMoneyKey(key) && 'font-medium tabular-nums'),
    cell: (row) => <span title={formatCell(key, row[key])}>{formatCell(key, row[key])}</span>
  }));
}

function getLabelKey(rows) {
  const preferred = ['name', 'customer_name', 'salesman_name', 'warehouse_name', 'item_name', 'status', 'date'];
  const keys = Object.keys(rows[0] || {});
  return preferred.find((key) => keys.includes(key)) || keys.find((key) => typeof rows[0]?.[key] === 'string') || keys[0];
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function useCustomersOptions(enabled) {
  return useQuery({
    queryKey: ['customers', 'options', 'reports'],
    queryFn: () => api.customers.list({ page: 1, limit: 100, status: 'active' }),
    staleTime: 60_000,
    enabled
  });
}

export default function ReportsLayout() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasModule = useAuthStore((state) => state.hasModule);
  const fallback = pickFirstAllowedReportTab(hasPermission, hasModule);
  const reportKey = getReportBySlug(reportId);

  if (!reportId) return <Navigate to={fallback || '/'} replace />;
  if (!reportKey) return <Navigate to={fallback || '/'} replace />;
  if (!hasModule(`reports.${REPORTS_REGISTRY[reportKey].id}`)) {
    return <Navigate to={fallback || '/'} replace />;
  }

  const report = REPORTS_REGISTRY[reportKey];

  return (
    <ReportWorkspace
      key={reportKey}
      reportKey={reportKey}
      report={report}
      hasPermission={hasPermission}
      hasModule={hasModule}
      onSelectReport={(next) => navigate(next)}
    />
  );
}

export function getSummaryMetricKeys(reportKey, summary) {
  const configuredMetrics = SUMMARY_DISPLAY_METRICS[reportKey] || [];
  const backendMetrics = Array.isArray(summary?.metrics) ? summary.metrics : [];
  const availableMetrics = new Set(backendMetrics.length ? backendMetrics : Object.keys(summary?.totals || {}));
  const preferred = configuredMetrics.filter((metric) => !availableMetrics.size || availableMetrics.has(metric));
  return preferred.length ? preferred : backendMetrics.slice(0, 3);
}

function ReportWorkspace({ reportKey, report, hasPermission, hasModule, onSelectReport }) {
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(() => (
    Object.fromEntries(report.filters.map((filter) => [filter, '']))
  ));
  const canUseInventoryPickers = hasPermission('inventory.view');
  const canUseCustomerPicker = hasPermission('customers.view');
  const canUseSalesmanPicker = hasPermission('salesmen.manage');
  const canUseLocationPicker = hasPermission('locations.manage');
  const canUseSupplierPicker = hasPermission('purchase_orders.view');
  const canExportReports = hasPermission(REPORTS_PERMISSIONS.export);

  const needs = (name) => report.filters.includes(name);
  const warehousesQuery = useWarehousesOptions(canUseInventoryPickers && needs('warehouse'));
  const itemsQuery = useItemsOptions(canUseInventoryPickers && needs('item'));
  const variantsQuery = useVariantsOptions(canUseInventoryPickers && needs('item_variant'));
  const customersQuery = useCustomersOptions(canUseCustomerPicker && needs('customer'));
  const salesmenQuery = useSalesmenList(canUseSalesmanPicker && needs('salesman'));
  const locationsQuery = useLocationsList(canUseLocationPicker && needs('location'));
  const sublocationsQuery = useSublocationsList(canUseLocationPicker && needs('sublocation'));
  const suppliersQuery = useSuppliersOptions(canUseSupplierPicker && needs('supplier'));

  const pickerData = {
    customer: optionRows(customersQuery.data),
    item: optionRows(itemsQuery.data),
    item_variant: optionRows(variantsQuery.data),
    location: optionRows(locationsQuery.data),
    salesman: optionRows(salesmenQuery.data),
    sublocation: optionRows(sublocationsQuery.data),
    supplier: optionRows(suppliersQuery.data),
    warehouse: optionRows(warehousesQuery.data)
  };

  const canUsePicker = {
    customer: canUseCustomerPicker,
    item: canUseInventoryPickers,
    item_variant: canUseInventoryPickers,
    location: canUseLocationPicker,
    salesman: canUseSalesmanPicker,
    sublocation: canUseLocationPicker,
    supplier: canUseSupplierPicker,
    warehouse: canUseInventoryPickers
  };

  const params = useMemo(() => ({
    page,
    limit: PAGE_LIMIT,
    ...cleanParams(filters)
  }), [filters, page]);

  const reportQuery = useQuery({
    queryKey: ['reports', reportKey, params],
    queryFn: () => api.reports[reportKey].get(params),
    keepPreviousData: true
  });

  const rows = rowsFromResponse(reportQuery.data, report.rowsKey);
  const meta = reportQuery.data?.meta || {};
  const columns = useMemo(() => buildColumns(rows), [rows]);

  function updateFilter(name, value) {
    setPage(1);
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setPage(1);
    setFilters(Object.fromEntries(report.filters.map((filter) => [filter, ''])));
  }

  async function exportCsv() {
    setIsExporting(true);
    try {
      const text = await api.reports[reportKey].csv(cleanParams(filters));
      downloadText(report.csvFilename, text);
      toast.success('CSV downloaded');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not export CSV.'));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title={report.label}
        description={report.description}
        actions={
          canExportReports ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={Download}
              onClick={exportCsv}
              isLoading={isExporting}
              aria-label={`Export ${report.label}`}
            >
              Export CSV
            </Button>
          ) : null
        }
      />

      <GlassPanel className="lg:overflow-visible">
        <GlassPanelBody className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:overflow-visible gap-2 p-2">
          {REPORTS_TABS.filter((tab) => hasModule(tab.featureKey) && tab.anyOfPermissions.some((permission) => hasPermission(permission))).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectReport(tab.to)}
              className={cn(
                'w-full text-center lg:w-auto rounded-lg px-3 py-2 text-sm font-medium transition',
                tab.reportKey === reportKey
                  ? 'bg-white/12 text-ink-50 shadow-glass'
                  : 'text-ink-300 hover:bg-white/5 hover:text-ink-100'
              )}
              aria-current={tab.reportKey === reportKey ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </GlassPanelBody>
      </GlassPanel>

      <GlassPanel>
        <GlassPanelHeader
          icon={Filter}
          title="Filters"
          subtitle="Refine this report before exporting or paging."
          actions={
            <Button
              variant={showFilters ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={SlidersHorizontal}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Filters'}
            </Button>
          }
        />
        <div
          className={`transition-all duration-300 ease-in-out ${
            showFilters
              ? 'max-h-[1000px] opacity-100 overflow-visible'
              : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <GlassPanelBody>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {report.filters.map((filter) => (
                <ReportFilter
                  key={filter}
                  name={filter}
                  value={filters[filter] || ''}
                  onChange={(value) => updateFilter(filter, value)}
                  canUsePicker={canUsePicker[filter]}
                  options={pickerData[filter] || []}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" leftIcon={RefreshCw} onClick={() => reportQuery.refetch()}>
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </GlassPanelBody>
        </div>
      </GlassPanel>

      <ReportSummary
        reportKey={reportKey}
        report={report}
        rows={rows}
        summary={meta.summary}
        isLoading={reportQuery.isPending}
      />

      <DataTable
        columns={columns.length ? columns : [{ id: 'empty', header: report.label, cell: () => '-' }]}
        rows={rows}
        rowKey={(row, index) => row.id ?? `${reportKey}-${index}`}
        isLoading={reportQuery.isPending}
        isError={reportQuery.isError}
        error={reportQuery.error}
        onRetry={() => reportQuery.refetch()}
        empty={{
          title: 'No rows found',
          description: 'Adjust the filters or date range and try again.',
          icon: FileText
        }}
        footer={
          meta?.totalPages ? (
            <Pagination
              page={meta.page || page}
              totalPages={meta.totalPages || 1}
              total={meta.total}
              limit={meta.limit || PAGE_LIMIT}
              onChange={setPage}
            />
          ) : null
        }
      />
    </div>
  );
}

function ReportFilter({ name, value, onChange, canUsePicker, options }) {
  const label = FILTER_LABELS[name] || titleize(name);
  if (name === 'search') {
    return (
      <Input
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search rows"
      />
    );
  }
  if (name === 'date_from' || name === 'date_to') {
    return (
      <Input
        label={label}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  if (SELECT_FILTERS[name]) {
    return (
      <Select label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {SELECT_FILTERS[name].map((option) => (
          <option key={option.value || 'all'} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }
  if (NUMERIC_FILTERS.has(name) && canUsePicker) {
    return (
      <Select label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All {label.toLowerCase()}</option>
        {options.map((row) => (
          <option key={row.id} value={row.id}>
            {optionLabel(row, `${label} #${row.id}`)}
          </option>
        ))}
      </Select>
    );
  }
  return (
    <Input
      label={`${label} ID`}
      type="number"
      min="1"
      inputMode="numeric"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Numeric ID"
    />
  );
}

function ReportSummary({ reportKey, report, rows, summary, isLoading }) {
  if (isLoading) {
    return <LoadingState label="Preparing report summary..." />;
  }
  if (!rows.length) {
    return null;
  }

  const numericKeys = getSummaryMetricKeys(reportKey, summary);
  const labelKey = getLabelKey(rows);
  const chartKey = numericKeys[0];
  const summaryTotals = summary?.totals || {};
  const chartRows = rows.slice(0, 8).map((row, index) => ({
    label: String(row[labelKey] || `Row ${index + 1}`).slice(0, 18),
    value: Number(row[chartKey] || 0)
  }));

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <div className="grid gap-4 md:grid-cols-3 xl:col-span-2">
        <SummaryCard label="Rows" value={formatNumber(summary?.rows ?? rows.length)} tone="neutral" />
        {numericKeys.map((key) => (
          <SummaryCard
            key={key}
            label={titleize(key)}
            value={isMoneyKey(key) ? formatCurrency(summaryTotals[key] ?? sum(rows, key)) : formatNumber(summaryTotals[key] ?? sum(rows, key))}
            tone={isMoneyKey(key) ? 'brand' : 'neutral'}
          />
        ))}
      </div>
      {chartKey && (
        <GlassPanel className="min-h-[220px]">
          <GlassPanelHeader
            title={titleize(chartKey)}
            subtitle={report.eyebrow}
          />
          <GlassPanelBody className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              {isDateKey(labelKey) ? (
                <LineChart data={chartRows}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} width={42} />
                  <Tooltip contentStyle={{ background: '#121826', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="#7dd3fc" strokeWidth={2} dot={false} />
                </LineChart>
              ) : (
                <BarChart data={chartRows}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis dataKey="label" stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} width={42} />
                  <Tooltip contentStyle={{ background: '#121826', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12 }} />
                  <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </GlassPanelBody>
        </GlassPanel>
      )}
    </section>
  );
}

function SummaryCard({ label, value, tone }) {
  return (
    <GlassPanel>
      <GlassPanelBody className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            {label}
          </p>
          <Badge tone={tone}>{tone === 'brand' ? 'Total' : 'Report'}</Badge>
        </div>
        <p className="truncate font-display text-2xl font-semibold text-ink-50">{value}</p>
      </GlassPanelBody>
    </GlassPanel>
  );
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}
