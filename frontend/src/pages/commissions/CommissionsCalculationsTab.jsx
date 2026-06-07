import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calculator , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import {
  Badge,
  Button,
  DataTable,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import { useSalesmenList, useSublocationsList } from '@/pages/locations/useLocationsOptions.js';
import { LOCATIONS_PERMISSIONS } from '@/pages/locations/locations.config.js';
import {
  COMMISSIONS_PERMISSIONS,
  COMMISSION_STATUSES,
  COMMISSION_STATUS_FILTER_OPTIONS,
  getCommissionStatusTone
} from './commissions.config.js';
import { CommissionCalculateModal } from './CommissionCalculateModal.jsx';
import { CommissionDrawer } from './CommissionDrawer.jsx';

function StatusBadge({ status }) {
  const tone = getCommissionStatusTone(status);
  const label =
    COMMISSION_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

export default function CommissionsCalculationsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission(COMMISSIONS_PERMISSIONS.manage);
  const canPickSalesmen = hasPermission(LOCATIONS_PERMISSIONS.salesmen);

  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [salesmanId, setSalesmanId] = useState('');
  const [sublocationId, setSublocationId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [calculating, setCalculating] = useState(false);
  const [openCommissionId, setOpenCommissionId] = useState(null);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (status) params.status = status;
    if (salesmanId) params.salesman_id = salesmanId;
    if (sublocationId) params.sublocation_id = sublocationId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [status, salesmanId, sublocationId, dateFrom, dateTo, page, limit]);

  const listQuery = useQuery({
    queryKey: ['commissions', 'calculations', queryParams],
    queryFn: () => api.commissions.calculations.list(queryParams)
  });

  const salesmenQuery = useSalesmenList(canPickSalesmen);
  const salesmen = salesmenQuery.data?.data?.salesmen || [];

  const sublocationsQuery = useSublocationsList(true);
  const sublocations = sublocationsQuery.data?.data?.sublocations || [];

  const rows = listQuery.data?.data?.commissions || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'created_at',
        header: 'Created',
        cell: (row) => (
          <span className="text-sm text-ink-200">{formatDate(row.created_at)}</span>
        )
      },
      {
        id: 'salesman_name',
        header: 'Salesman',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-ink-100">
              {row.salesman_name || (row.salesman_id ? `#${row.salesman_id}` : '-')}
            </p>
            {row.sublocation_name && (
              <p className="truncate text-xs text-ink-400">{row.sublocation_name}</p>
            )}
          </div>
        )
      },
      {
        id: 'period',
        header: 'Period',
        cell: (row) => (
          <span className="text-sm text-ink-200">
            {row.period_start ? formatDate(row.period_start) : '-'}
            {row.period_end ? ` - ${formatDate(row.period_end)}` : ''}
          </span>
        )
      },
      {
        id: 'sales_amount',
        header: 'Sales',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {formatNumber(row.sales_amount, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'target_amount',
        header: 'Target',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-200">
            {formatNumber(row.target_amount, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'total_commission',
        header: 'Commission',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.total_commission, { maximumFractionDigits: 4 })}
          </span>
        )
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.status} />
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setOpenCommissionId(row.id)}
          >
            View
          </Button>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          leftIcon={Calculator}
          onClick={() => setCalculating(true)}
          disabled={!canManage}
        >
          Calculate commission
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          {COMMISSION_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {canPickSalesmen ? (
          <Select
            value={salesmanId}
            onChange={(event) => {
              setSalesmanId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All salesmen</option>
            {salesmen.map((salesman) => (
              <option key={salesman.id} value={salesman.id}>
                {salesman.full_name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Salesman ID"
            type="number"
            min="1"
            value={salesmanId}
            onChange={(event) => {
              setSalesmanId(event.target.value);
              setPage(1);
            }}
            description="Numeric only."
          />
        )}
        <Select
          label="Sublocation"
          value={sublocationId}
          onChange={(event) => {
            setSublocationId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All sublocations</option>
          {sublocations.map((sublocation) => (
            <option key={sublocation.id} value={sublocation.id}>
              {sublocation.name}
            </option>
          ))}
        </Select>
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
          <Input
          label="From"
          type="date"
          value={dateFrom}
          onChange={(event) => {
            setDateFrom(event.target.value);
            setPage(1);
          }}
        />
        <Input
          label="To"
          type="date"
          value={dateTo}
          onChange={(event) => {
            setDateTo(event.target.value);
            setPage(1);
          }}
        />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={listQuery.isPending}
        isError={listQuery.isError}
        error={listQuery.error}
        onRetry={() => listQuery.refetch()}
        empty={{
          title: 'No commissions match the filters',
          description: canManage
            ? 'Adjust your filters or calculate a new commission.'
            : 'Adjust your filters to find existing commissions.'
        }}
        footer={
          meta?.totalPages ? (
            <Pagination
              page={meta.page || page}
              totalPages={meta.totalPages || 1}
              total={meta.total}
              limit={meta.limit || limit}
              onChange={(nextPage) => setPage(nextPage)}
            />
          ) : null
        }
      />

      <CommissionCalculateModal
        open={calculating}
        onClose={() => setCalculating(false)}
      />
      <CommissionDrawer
        open={Boolean(openCommissionId)}
        onClose={() => setOpenCommissionId(null)}
        commissionId={openCommissionId}
      />
    </div>
  );
}
