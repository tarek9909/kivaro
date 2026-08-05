import { useMemo, useState, useEffect, useRef } from 'react';
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
import {
  ChevronDown,
  Download,
  FileText,
  Filter,
  RefreshCw,
  TrendingUp,
  X,
  Search,
  Check
} from 'lucide-react';
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
import { useItemsOptions, useWarehousesOptions } from '@/pages/inventory/useInventoryOptions.js';
import { useLocationsList, useSalesmenList, useSublocationsList } from '@/pages/locations/useLocationsOptions.js';
import { useSuppliersOptions } from '@/pages/purchases/usePurchasesOptions.js';
import { cn } from '@/lib/cn.js';
import { getErrorMessage } from '@/lib/errors.js';
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters.js';
import {
  COMPONENT_ROLE_OPTIONS,
  COMMISSION_STATUS_OPTIONS,
  DEBT_STATUS_OPTIONS,
  DISPATCH_STATUS_OPTIONS,
  FULFILLMENT_TYPE_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  MOVEMENT_TYPE_OPTIONS,
  OPERATION_STATUS_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  READY_STATUS_OPTIONS,
  REFERENCE_TYPE_OPTIONS,
  REPORT_KEYS,
  REPORTS_REGISTRY,
  REPORTS_PERMISSIONS,
  REPORTS_TABS,
  SOURCE_OPTIONS,
  STOCK_HEALTH_OPTIONS,
  STOCK_MODE_OPTIONS,
  getReportBySlug,
  pickFirstAllowedReportTab
} from './reports.config.js';

const PAGE_LIMIT = 25;
const NUMERIC_FILTERS = new Set([
  'warehouse',
  'item',
  'customer',
  'salesman',
  'location',
  'sublocation',
  'supplier',
  'packaging_group',
  'cash_account'
]);
const HIDDEN_ROW_FIELDS = new Set([
  'id',
  'store_id',
  'warehouse_id',
  'item_id',
  'item_variant_id',
  'customer_id',
  'salesman_id',
  'supplier_id',
  'location_id',
  'sublocation_id',
  'packaging_group_id',
  'delivery_closeout_id',
  'cash_account_id',
  'category_id',
  'base_unit_id',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
  'deleted_at',
  'tax_amount'
]);
const SUMMARY_DISPLAY_METRICS = {
  cashReconciliation: ['cash_in', 'cash_out', 'net_movement'],
  commissions: ['sales_amount', 'target_amount', 'total_commission', 'total_payable'],
  currentStock: ['quantity_on_hand', 'quantity_reserved', 'quantity_available', 'stock_value'],
  normalStock: ['quantity_on_hand', 'quantity_reserved', 'quantity_available', 'stock_value'],
  packagingStock: ['quantity_on_hand', 'quantity_reserved', 'quantity_available', 'stock_value'],
  readyStock: ['remaining_inner_quantity', 'available_inner_quantity', 'remaining_cost', 'capacity_kg'],
  customerBalances: ['total_remaining_debt', 'available_credit', 'net_customer_balance'],
  customerProfitability: ['net_sale_quantity', 'net_revenue', 'sales_cogs', 'gift_cogs', 'gross_profit'],
  debts: ['original_amount', 'paid_amount', 'remaining_amount'],
  deliveryCloseouts: ['total_expected', 'total_collected', 'total_debt', 'total_returned_value'],
  discounts: ['discount_amount', 'subtotal_amount', 'customer_total_amount'],
  dispatchSummary: ['total_amount', 'total_collected', 'total_debt', 'dispatched_cogs', 'gift_cogs'],
  gifts: ['net_quantity', 'dispatched_cogs', 'returned_cogs'],
  invoices: ['total_amount', 'collected_amount', 'debt_amount', 'gift_cogs'],
  inventoryAging: ['remaining_cartons', 'remaining_inventory_value', 'age_days'],
  orderPipeline: ['order_count', 'order_value', 'average_open_days'],
  packagingOperations: ['output_carton_count', 'raw_quantity_kg', 'total_cost', 'cost_per_outer', 'cost_per_inner'],
  salesmanPerformance: ['sales_revenue', 'sales_cogs', 'gift_cogs', 'gross_profit_after_gifts', 'total_collected'],
  profitLoss: ['total_income', 'total_expense', 'net_profit'],
  purchases: ['subtotal', 'amount_paid', 'total_amount'],
  packagingShortages: ['shortage_quantity', 'required_quantity', 'available_quantity'],
  salesmanTargetProgress: ['target_amount', 'achieved_sales_amount'],
  sales: ['net_subtotal_amount', 'net_vat_amount', 'net_total_amount'],
  stockMovements: ['quantity_change', 'reserved_quantity_change'],
  returns: ['returned_quantity', 'returned_sales_value', 'returned_cost'],
  vatSummary: ['invoice_count', 'taxable_sales', 'output_vat', 'gross_sales'],
  territoryProfitability: ['customer_count', 'net_sale_quantity', 'net_revenue', 'sales_cogs', 'gift_cogs', 'gross_profit'],
  productProfitability: ['net_sale_quantity', 'net_revenue', 'sales_cogs', 'gift_cogs', 'gross_profit']
};

const FILTER_PARAM = {
  cash_account: 'cash_account_id',
  commission_status: 'status',
  customer: 'customer_id',
  date_from: 'date_from',
  date_to: 'date_to',
  debt_status: 'status',
  dispatch_status: 'status',
  item: 'item_id',
  location: 'location_id',
  movement_type: 'movement_type',
  packaging_group: 'packaging_group_id',
  operation_status: 'status',
  purchase_status: 'status',
  reference_type: 'reference_type',
  salesman: 'salesman_id',
  search: 'search',
  sublocation: 'sublocation_id',
  supplier: 'supplier_id',
  warehouse: 'warehouse_id',
  stock_health: 'stock_health',
  stock_mode: 'stock_mode',
  ready_status: 'ready_status',
  component_role: 'component_role',
  source: 'source',
  fulfillment_type: 'fulfillment_type',
  invoice_status: 'invoice_status',
  post_settlement_exception: 'post_settlement_exception'
};

const SELECT_FILTERS = {
  commission_status: COMMISSION_STATUS_OPTIONS,
  debt_status: DEBT_STATUS_OPTIONS,
  dispatch_status: DISPATCH_STATUS_OPTIONS,
  movement_type: MOVEMENT_TYPE_OPTIONS,
  operation_status: OPERATION_STATUS_OPTIONS,
  purchase_status: PURCHASE_STATUS_OPTIONS,
  reference_type: REFERENCE_TYPE_OPTIONS,
  stock_health: STOCK_HEALTH_OPTIONS,
  stock_mode: STOCK_MODE_OPTIONS,
  ready_status: READY_STATUS_OPTIONS,
  component_role: COMPONENT_ROLE_OPTIONS,
  source: SOURCE_OPTIONS,
  fulfillment_type: FULFILLMENT_TYPE_OPTIONS,
  invoice_status: INVOICE_STATUS_OPTIONS,
  post_settlement_exception: [{ value: '', label: 'All returns' }, { value: 'true', label: 'Post-settlement exceptions only' }]
};

const FILTER_LABELS = {
  commission_status: 'Status',
  customer: 'Customer',
  date_from: 'From',
  date_to: 'To',
  debt_status: 'Status',
  dispatch_status: 'Status',
  item: 'Item',
  location: 'Location',
  movement_type: 'Movement type',
  packaging_group: 'Packaging group',
  operation_status: 'Status',
  purchase_status: 'Status',
  reference_type: 'Reference type',
  salesman: 'Salesman',
  search: 'Search',
  sublocation: 'Sublocation',
  supplier: 'Supplier',
  warehouse: 'Warehouse',
  stock_health: 'Stock health',
  stock_mode: 'Stock mode',
  ready_status: 'Ready state',
  component_role: 'Component role',
  source: 'Stock source',
  fulfillment_type: 'Fulfillment type',
  invoice_status: 'Invoice status',
  post_settlement_exception: 'Return timing'
};

const FIELD_LABELS = {
  net_profit: 'Net profit',
  payroll_expenses: 'Salesman payroll',
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

function isNumericKey(key) {
  return /(quantity|qty|carton|count|level|kg|weight|days|age|percentage|achieved|reorder|capacity|inner|outer|rows|total)/i.test(key) &&
    !key.toLowerCase().includes('status') &&
    !key.toLowerCase().includes('name') &&
    !key.toLowerCase().includes('code');
}

function buildColumns(rows) {
  const keys = [];
  for (const row of rows.slice(0, 10)) {
    for (const key of Object.keys(row || {})) {
      if (HIDDEN_ROW_FIELDS.has(key)) continue;
      if (key.endsWith('_id')) continue;
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys.map((key) => {
    const isMoney = isMoneyKey(key);
    const isNum = isNumericKey(key);
    const isDate = isDateKey(key);
    return {
      id: key,
      header: titleize(key),
      align: (isMoney || isNum) ? 'right' : undefined,
      className: cn(
        (isMoney || isNum || isDate || key === 'status' || key === 'code' || key === 'unit_symbol')
          ? 'whitespace-nowrap tabular-nums'
          : 'max-w-[200px] min-w-[120px] whitespace-normal break-words text-ink-200',
        isMoney && 'font-medium'
      ),
      cell: (row) => <span title={formatCell(key, row[key])}>{formatCell(key, row[key])}</span>
    };
  });
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

/** Build optgroup categories from report registry eyebrow field. */
function buildReportGroups(hasPermission, hasModule) {
  const groups = {};
  for (const key of REPORT_KEYS) {
    const entry = REPORTS_REGISTRY[key];
    const featureKey = `reports.${entry.id}`;
    if (!hasModule(featureKey) || !hasPermission(REPORTS_PERMISSIONS.view)) continue;
    const category = entry.eyebrow || 'Other';
    if (!groups[category]) groups[category] = [];
    groups[category].push({ key, id: entry.id, label: entry.label });
  }
  return groups;
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
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorSearch, setSelectorSearch] = useState('');
  const selectorRef = useRef(null);
  const selectorSearchInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        setIsSelectorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isSelectorOpen && selectorSearchInputRef.current) {
      const timer = setTimeout(() => {
        selectorSearchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSelectorOpen]);
  const canUseInventoryPickers = hasPermission('inventory.view');
  const canUseCustomerPicker = hasPermission('customers.view');
  const canUseSalesmanPicker = hasPermission('salesmen.manage');
  const canUseLocationPicker = hasPermission('locations.manage');
  const canUseSupplierPicker = hasPermission('purchase_orders.view');
  const canExportReports = hasPermission(REPORTS_PERMISSIONS.export);

  const needs = (name) => report.filters.includes(name);
  const warehousesQuery = useWarehousesOptions(canUseInventoryPickers && needs('warehouse'));
  const itemsQuery = useItemsOptions(canUseInventoryPickers && needs('item'));
  const packagingGroupsQuery = useQuery({
    queryKey: ['reports', 'options', 'packaging-groups'],
    queryFn: () => api.packaging.groups.list({ page: 1, limit: 100, status: 'active' }),
    staleTime: 60_000,
    enabled: canUseInventoryPickers && needs('packaging_group')
  });
  const customersQuery = useCustomersOptions(canUseCustomerPicker && needs('customer'));
  const salesmenQuery = useSalesmenList(canUseSalesmanPicker && needs('salesman'));
  const locationsQuery = useLocationsList(canUseLocationPicker && needs('location'));
  const sublocationsQuery = useSublocationsList(canUseLocationPicker && needs('sublocation'));
  const suppliersQuery = useSuppliersOptions(canUseSupplierPicker && needs('supplier'));

  const pickerData = {
    customer: optionRows(customersQuery.data),
    item: optionRows(itemsQuery.data),
    packaging_group: optionRows(packagingGroupsQuery.data),
    location: optionRows(locationsQuery.data),
    salesman: optionRows(salesmenQuery.data),
    sublocation: optionRows(sublocationsQuery.data),
    supplier: optionRows(suppliersQuery.data),
    warehouse: optionRows(warehousesQuery.data)
  };

  const canUsePicker = {
    customer: canUseCustomerPicker,
    item: canUseInventoryPickers,
    packaging_group: canUseInventoryPickers,
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

  const isProfitLoss = reportKey === 'profitLoss';

  const { displayRows, displayColumns } = useMemo(() => {
    if (isProfitLoss && rows.length > 0) {
      const firstRow = rows[0] || {};
      const transposed = Object.entries(firstRow)
        .filter(([key]) => !HIDDEN_ROW_FIELDS.has(key) && !key.endsWith('_id'))
        .map(([key, value]) => ({
          key,
          metric: titleize(key),
          value
        }));

      const transposedColumns = [
        {
          id: 'metric',
          header: 'Financial Metric',
          className: 'font-semibold text-ink-300',
          cell: (row) => {
            const isImportant = ['net_profit', 'total_income', 'total_expense', 'gross_profit_before_gifts', 'gross_profit_after_gifts'].includes(row.key);
            return (
              <span className={cn(isImportant && 'font-bold text-brand-300 tracking-wide text-xs uppercase')}>
                {row.metric}
              </span>
            );
          }
        },
        {
          id: 'value',
          header: 'Amount',
          align: 'right',
          className: 'font-medium tabular-nums text-ink-100',
          cell: (row) => {
            const isImportant = ['net_profit', 'total_income', 'total_expense', 'gross_profit_before_gifts', 'gross_profit_after_gifts'].includes(row.key);
            return (
              <span className={cn(isImportant && 'font-bold text-brand-400 text-sm')}>
                {formatCell(row.key, row.value)}
              </span>
            );
          }
        }
      ];

      return { displayRows: transposed, displayColumns: transposedColumns };
    }

    return {
      displayRows: rows,
      displayColumns: buildColumns(rows)
    };
  }, [rows, isProfitLoss]);

  const reportGroups = useMemo(() => buildReportGroups(hasPermission, hasModule), [hasPermission, hasModule]);
  const filteredReportGroups = useMemo(() => {
    const query = selectorSearch.toLowerCase().trim();
    if (!query) return reportGroups;

    const filtered = {};
    for (const [category, reports] of Object.entries(reportGroups)) {
      const matching = reports.filter((r) =>
        r.label.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query)
      );
      if (matching.length > 0) {
        filtered[category] = matching;
      }
    }
    return filtered;
  }, [reportGroups, selectorSearch]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value !== '' && value !== null && value !== undefined).length,
    [filters]
  );

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
    <div className="space-y-5">
      {/* ── Page Header with Report Picker ── */}
      <PageHeader
        eyebrow={report.eyebrow}
        title={report.label}
        description={report.description}
        actions={
          <div className="flex items-center gap-2">
            <div ref={selectorRef} className="relative min-w-[240px]">
              {/* Custom Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                aria-haspopup="listbox"
                aria-expanded={isSelectorOpen}
                className={cn(
                  'flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-ink-100 outline-none transition',
                  'hover:border-white/20 hover:bg-white/8',
                  isSelectorOpen && 'border-brand-400/50 ring-1 ring-brand-400/25 bg-white/8'
                )}
              >
                <span className="truncate">{report.label}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-ink-400 transition-transform duration-200',
                    isSelectorOpen && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </button>

              {/* Custom Popover */}
              {isSelectorOpen && (
                <div className="glass-panel-strong absolute right-0 z-50 mt-1.5 flex w-72 max-h-96 flex-col overflow-hidden p-1.5 shadow-glass-lg rounded-xl border border-white/10 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Search Box */}
                  <div className="relative flex items-center shrink-0 px-2 py-2 border-b border-white/5 gap-2">
                    <Search className="absolute left-4 h-3.5 w-3.5 text-ink-400" />
                    <input
                      ref={selectorSearchInputRef}
                      type="text"
                      value={selectorSearch}
                      onChange={(e) => setSelectorSearch(e.target.value)}
                      placeholder="Search reports..."
                      className="w-full h-8 pl-8 pr-8 rounded-lg bg-white/5 border border-white/10 text-xs text-ink-50 placeholder:text-ink-400 focus:outline-none focus:border-brand-400/50"
                    />
                    {selectorSearch && (
                      <button
                        type="button"
                        onClick={() => setSelectorSearch('')}
                        className="absolute right-4 text-ink-400 hover:text-ink-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Options list */}
                  <div className="scrollbar-glass overflow-y-auto flex-1 flex flex-col gap-2 p-1 min-h-[40px]">
                    {Object.keys(filteredReportGroups).length > 0 ? (
                      Object.entries(filteredReportGroups).map(([category, reports]) => (
                        <div key={category} className="flex flex-col gap-0.5">
                          {/* Group Title */}
                          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">
                            {category}
                          </div>
                          
                          {/* Group Options */}
                          {reports.map((r) => {
                            const isSelected = r.id === report.id;
                            return (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() => {
                                  onSelectReport(`/reports/${r.id}`);
                                  setIsSelectorOpen(false);
                                  setSelectorSearch('');
                                }}
                                className={cn(
                                  'w-full text-left px-2.5 py-2 text-xs rounded-lg transition-all flex items-center justify-between',
                                  isSelected
                                    ? 'bg-brand-500/10 text-brand-300 font-semibold border-l-2 border-brand-400'
                                    : 'text-ink-200 hover:bg-white/5 hover:text-ink-50'
                                )}
                              >
                                <span className="truncate">{r.label}</span>
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))
                    ) : (
                      <div className="px-2.5 py-6 text-xs text-center text-ink-400">
                        No matching reports found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* ── Compact Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          size="sm"
          leftIcon={Filter}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-400/20 px-1.5 text-[10px] font-bold text-brand-200">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <Button variant="ghost" size="sm" leftIcon={RefreshCw} onClick={() => reportQuery.refetch()}>
          Refresh
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" leftIcon={X} onClick={clearFilters}>
            Clear filters
          </Button>
        )}

        <div className="flex-1" />

        {canExportReports && (
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
        )}
      </div>

      {/* ── Expandable Filter Grid ── */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          showFilters ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <GlassPanel>
          <GlassPanelBody className="space-y-0">
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
          </GlassPanelBody>
        </GlassPanel>
      </div>

      {/* ── Summary Cards + Chart ── */}
      <ReportSummary
        reportKey={reportKey}
        report={report}
        rows={rows}
        summary={meta.summary}
        isLoading={reportQuery.isPending}
      />

      {/* ── Data Table ── */}
      <DataTable
        columns={displayColumns.length ? displayColumns : [{ id: 'empty', header: report.label, cell: () => '-' }]}
        rows={displayRows}
        rowKey={(row, index) => row.key ?? row.id ?? `${reportKey}-${index}`}
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
        <GlassPanel className="min-h-[260px]">
          <GlassPanelHeader
            title={titleize(chartKey)}
            subtitle={report.eyebrow}
          />
          <GlassPanelBody className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              {isDateKey(labelKey) ? (
                <LineChart data={chartRows}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} width={48} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,20,35,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      fontSize: 12
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#7dd3fc" strokeWidth={2.5} dot={{ r: 3, fill: '#7dd3fc' }} activeDot={{ r: 5, fill: '#38bdf8' }} />
                </LineChart>
              ) : (
                <BarChart data={chartRows}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="label" stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="#8f9bb3" tickLine={false} axisLine={false} fontSize={11} width={48} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(15,20,35,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                      fontSize: 12
                    }}
                  />
                  <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
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
  const gradientBorder = tone === 'brand'
    ? 'from-brand-400/60 via-sky-400/40 to-indigo-400/30'
    : 'from-white/10 via-white/5 to-transparent';

  return (
    <GlassPanel className="relative overflow-hidden">
      {/* Gradient top accent */}
      <div className={cn('absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r', gradientBorder)} />
      <GlassPanelBody className="space-y-2 pt-6">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            {label}
          </p>
          {tone === 'brand' && (
            <TrendingUp className="h-3.5 w-3.5 text-brand-300/60" />
          )}
        </div>
        <p className="truncate font-display text-3xl font-semibold text-ink-50 animate-in fade-in duration-500">
          {value}
        </p>
      </GlassPanelBody>
    </GlassPanel>
  );
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}
