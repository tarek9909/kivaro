import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters.js';
import {
  useLocationsList,
  useSalesmenList,
  useSublocationsList
} from '@/pages/locations/useLocationsOptions.js';

const PAGE_LIMIT = 20;

function ProgressBadge({ value }) {
  const percentage = Number(value || 0);
  const tone = percentage >= 100 ? 'success' : percentage >= 70 ? 'info' : 'neutral';
  return <Badge tone={tone}>{formatNumber(percentage, { maximumFractionDigits: 2 })}%</Badge>;
}

export default function SalesPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickSalesmen = hasPermission('salesmen.manage');
  const canPickLocations = hasPermission('locations.manage');

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [salesmanId, setSalesmanId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [sublocationId, setSublocationId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const params = useMemo(() => {
    const next = { page, limit: PAGE_LIMIT };
    if (debouncedSearch) next.search = debouncedSearch;
    if (salesmanId) next.salesman_id = Number(salesmanId);
    if (locationId) next.location_id = Number(locationId);
    if (sublocationId) next.sublocation_id = Number(sublocationId);
    if (dateFrom) next.date_from = dateFrom;
    if (dateTo) next.date_to = dateTo;
    return next;
  }, [debouncedSearch, salesmanId, locationId, sublocationId, dateFrom, dateTo, page]);

  const salesQuery = useQuery({
    queryKey: ['sales', 'targets', params],
    queryFn: () => api.reports.salesmanTargetProgress.get(params)
  });
  const salesmenQuery = useSalesmenList(canPickSalesmen);
  const locationsQuery = useLocationsList(canPickLocations);
  const sublocationsQuery = useSublocationsList(canPickLocations);

  const rows = salesQuery.data?.data?.salesman_target_progress || [];
  const meta = salesQuery.data?.meta || {};
  const summary = meta.summary?.totals || {};
  const salesmen = salesmenQuery.data?.data?.salesmen || [];
  const locations = locationsQuery.data?.data?.locations || [];
  const sublocations = sublocationsQuery.data?.data?.sublocations || [];

  const columns = useMemo(() => [
    {
      id: 'salesman_name',
      header: 'Salesman',
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-50">{row.salesman_name}</p>
          <p className="truncate text-xs text-ink-400">
            {row.location_name || '-'}{row.sublocation_name ? ` - ${row.sublocation_name}` : ''}
          </p>
        </div>
      )
    },
    {
      id: 'period',
      header: 'Applies',
      cell: (row) => (
        <span className="text-xs text-ink-200">
          {formatDate(row.period_start)} to {formatDate(row.period_end)}
        </span>
      )
    },
    {
      id: 'target_period',
      header: 'Period',
      cell: (row) => <Badge tone="neutral">{row.target_period}</Badge>
    },
    {
      id: 'target_amount',
      header: 'Target',
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-sm text-ink-100">
          {formatNumber(row.target_amount, { maximumFractionDigits: 4 })}
        </span>
      )
    },
    {
      id: 'base_salary',
      header: 'Base salary',
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-sm text-ink-100">
          {formatCurrency(row.base_salary || 0)}
        </span>
      )
    },
    {
      id: 'achieved_sales_amount',
      header: 'Achieved',
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-sm text-ink-100">
          {formatNumber(row.achieved_sales_amount, { maximumFractionDigits: 4 })}
        </span>
      )
    },
    {
      id: 'achievement_percentage',
      header: 'Progress',
      align: 'right',
      cell: (row) => <ProgressBadge value={row.achievement_percentage} />
    }
  ], []);

  function resetPagedFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          containerClassName="xl:col-span-2"
          leftIcon={Search}
          placeholder="Search salesman, location, or sublocation"
          value={search}
          onChange={(event) => resetPagedFilter(setSearch, event.target.value)}
        />
        {canPickSalesmen ? (
          <Select value={salesmanId} onChange={(event) => resetPagedFilter(setSalesmanId, event.target.value)}>
            <option value="">All salesmen</option>
            {salesmen.map((salesman) => (
              <option key={salesman.id} value={salesman.id}>{salesman.full_name}</option>
            ))}
          </Select>
        ) : (
          <Input
            label="Salesman ID"
            type="number"
            min="1"
            value={salesmanId}
            onChange={(event) => resetPagedFilter(setSalesmanId, event.target.value)}
          />
        )}
        {canPickLocations ? (
          <Select value={locationId} onChange={(event) => resetPagedFilter(setLocationId, event.target.value)}>
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </Select>
        ) : (
          <Input
            label="Location ID"
            type="number"
            min="1"
            value={locationId}
            onChange={(event) => resetPagedFilter(setLocationId, event.target.value)}
          />
        )}
      </div>

      <div className="flex justify-end">
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          leftIcon={SlidersHorizontal}
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0 sm:w-auto w-full"
        >
          {showFilters ? 'Hide Filters' : 'Filters'}
        </Button>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          showFilters
            ? 'max-h-[1000px] opacity-100 p-4 mt-3 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-sm overflow-visible'
            : 'max-h-0 opacity-0 p-0 border-transparent overflow-hidden'
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {canPickLocations ? (
            <Select value={sublocationId} onChange={(event) => resetPagedFilter(setSublocationId, event.target.value)}>
              <option value="">All sublocations</option>
              {sublocations
                .filter((sublocation) => !locationId || Number(sublocation.location_id) === Number(locationId))
                .map((sublocation) => (
                  <option key={sublocation.id} value={sublocation.id}>
                    {sublocation.location_name ? `${sublocation.location_name} - ` : ''}{sublocation.name}
                  </option>
                ))}
            </Select>
          ) : (
            <Input
              label="Sublocation ID"
              type="number"
              min="1"
              value={sublocationId}
              onChange={(event) => resetPagedFilter(setSublocationId, event.target.value)}
            />
          )}
          <Input
            label="Applies from"
            type="date"
            value={dateFrom}
            onChange={(event) => resetPagedFilter(setDateFrom, event.target.value)}
          />
          <Input
            label="Applies to"
            type="date"
            value={dateTo}
            onChange={(event) => resetPagedFilter(setDateTo, event.target.value)}
          />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">Rows</p>
          <p className="mt-1 font-display text-2xl font-semibold text-ink-50">{formatNumber(meta.summary?.rows ?? rows.length)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">Target</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink-50">{formatNumber(summary.target_amount || 0, { maximumFractionDigits: 4 })}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">Base salary</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink-50">{formatCurrency(summary.base_salary || 0)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">Achieved</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink-50">{formatNumber(summary.achieved_sales_amount || 0, { maximumFractionDigits: 4 })}</p>
        </div>
      </section>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.salesman_target_id}
        isLoading={salesQuery.isPending}
        isError={salesQuery.isError}
        error={salesQuery.error}
        onRetry={() => salesQuery.refetch()}
        empty={{
          icon: TrendingUp,
          title: 'No salesman targets match the filters',
          description: 'Adjust the filters or create location and salesman targets first.'
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
