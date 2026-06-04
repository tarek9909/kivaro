import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus , SlidersHorizontal } from 'lucide-react';
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
import {
  LOCATIONS_PERMISSIONS,
  TARGET_STATUSES,
  TARGET_STATUS_FILTER_OPTIONS,
  getTargetStatusTone
} from './locations.config.js';
import { useLocationsList } from './useLocationsOptions.js';
import { LocationTargetFormModal } from './LocationTargetFormModal.jsx';
import { TargetDrawer } from './TargetDrawer.jsx';

function StatusBadge({ status }) {
  const tone = getTargetStatusTone(status);
  const label = TARGET_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

export default function TargetsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission(LOCATIONS_PERMISSIONS.targets);
  const canPickLocations = hasPermission(LOCATIONS_PERMISSIONS.locations);

  const [status, setStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [locationId, setLocationId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openTargetId, setOpenTargetId] = useState(null);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (status) params.status = status;
    if (locationId) params.location_id = locationId;
    if (periodStart) params.period_start = periodStart;
    if (periodEnd) params.period_end = periodEnd;
    return params;
  }, [status, locationId, periodStart, periodEnd, page, limit]);

  const listQuery = useQuery({
    queryKey: ['locations', 'targets', queryParams],
    queryFn: () => api.locations.locationTargets.list(queryParams)
  });

  const locationsQuery = useLocationsList(canPickLocations);
  const locations = locationsQuery.data?.data?.locations || [];

  const rows = listQuery.data?.data?.location_targets || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'location_name',
        header: 'Location',
        cell: (row) => (
          <span className="text-sm text-ink-100">{row.location_name || '-'}</span>
        )
      },
      {
        id: 'target_period',
        header: 'Period',
        cell: (row) => <Badge tone="neutral">{row.target_period}</Badge>
      },
      {
        id: 'period_range',
        header: 'Range',
        cell: (row) => (
          <span className="text-xs text-ink-200">
            {formatDate(row.period_start)} to {formatDate(row.period_end)}
          </span>
        )
      },
      {
        id: 'target_amount',
        header: 'Amount',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.target_amount, { maximumFractionDigits: 4 })}
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpenTargetId(row.id)}>
              View
            </Button>
            {canManage && row.status !== 'closed' && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                Edit
              </Button>
            )}
          </div>
        )
      }
    ],
    [canManage]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canManage}>
          New target
        </Button>
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
          <Select
            value={locationId}
            onChange={(event) => {
              setLocationId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Location ID"
            type="number"
            min="1"
            value={locationId}
            onChange={(event) => {
              setLocationId(event.target.value);
              setPage(1);
            }}
            description="Numeric only. Ask an administrator for territory access."
          />
        )}
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          {TARGET_STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          label="Period from"
          type="date"
          value={periodStart}
          onChange={(event) => {
            setPeriodStart(event.target.value);
            setPage(1);
          }}
        />
        <Input
          label="Period to"
          type="date"
          value={periodEnd}
          onChange={(event) => {
            setPeriodEnd(event.target.value);
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
          title: 'No targets match the filters',
          description: canManage
            ? 'Adjust your filters or create a new location target.'
            : 'Adjust your filters to find existing targets.'
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

      <LocationTargetFormModal open={creating} onClose={() => setCreating(false)} />
      <LocationTargetFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        target={editing || undefined}
      />
      <TargetDrawer
        open={Boolean(openTargetId)}
        onClose={() => setOpenTargetId(null)}
        targetId={openTargetId}
      />
    </div>
  );
}
