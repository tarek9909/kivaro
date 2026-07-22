import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Plus, Search, Trash2 , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  buildSalesmanExport,
  downloadBlob,
  SALESMAN_EXPORT_OPTIONS
} from '@/lib/csvExport.js';
import { CsvExportControl } from '@/components/CsvExportControl.jsx';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatCurrency, formatDate } from '@/lib/formatters.js';
import {
  LOCATIONS_PERMISSIONS,
  STATUS_FILTER_OPTIONS
} from './locations.config.js';
import { SalesmanFormModal } from './SalesmanFormModal.jsx';
import { SalesmanAssignmentModal } from './SalesmanAssignmentModal.jsx';

export default function SalesmenTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission(LOCATIONS_PERMISSIONS.salesmen);
  const canExport = canManage && hasPermission('reports.export');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exportOption, setExportOption] = useState('performance');
  const [isExporting, setIsExporting] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);
  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    return params;
  }, [debouncedSearch, status, page, limit]);

  const listQuery = useQuery({
    queryKey: ['locations', 'salesmen', queryParams],
    queryFn: () => api.locations.salesmen.list(queryParams)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.locations.salesmen.remove(id),
    onSuccess: () => {
      toast.success('Salesman deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['locations', 'salesmen'] });
      queryClient.invalidateQueries({ queryKey: ['locations', 'options', 'salesmen'] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not deactivate salesman.'))
  });

  async function exportCsv() {
    const { option, params } = buildSalesmanExport({
      optionValue: exportOption,
      filters: queryParams
    });
    setIsExporting(true);
    try {
      const response = await api.locations.salesmen.exportCsv(params);
      const blob = response instanceof Blob ? response : response?.data;
      if (!downloadBlob(blob, option.filename)) {
        throw new Error('The export response did not include a CSV file.');
      }
      toast.success('Salesman CSV downloaded');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not export salesman CSV.'));
    } finally {
      setIsExporting(false);
    }
  }

  const rows = listQuery.data?.data?.salesmen || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'full_name',
        header: 'Salesman',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.full_name}</p>
            <p className="truncate text-xs text-ink-400">
              {row.email || row.phone || '-'}
            </p>
          </div>
        )
      },
      {
        id: 'vehicle_number',
        header: 'Vehicle',
        cell: (row) => (
          <span className="font-mono text-xs text-ink-200">{row.vehicle_number || '-'}</span>
        )
      },
      {
        id: 'national_id',
        header: 'National ID',
        cell: (row) => (
          <span className="font-mono text-xs text-ink-200">{row.national_id || '-'}</span>
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
        id: 'joined_at',
        header: 'Joined',
        cell: (row) => (
          <span className="text-sm text-ink-200">{formatDate(row.joined_at)}</span>
        )
      },
      {
        id: 'active_sublocations',
        header: 'Assignments',
        cell: (row) => (
          <span className="line-clamp-2 text-xs text-ink-200">
            {row.active_sublocations || '-'}
          </span>
        )
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => (
          <Badge tone={row.status === 'active' ? 'success' : 'neutral'}>{row.status}</Badge>
        )
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {canManage && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={Link2}
                onClick={() => setAssigning(row)}
              >
                Assignments
              </Button>
            )}
            {canManage && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                Edit
              </Button>
            )}
            {canManage && row.status === 'active' && (
              <Button
                variant="ghost"
                size="icon"
                leftIcon={Trash2}
                aria-label={`Deactivate ${row.full_name}`}
                onClick={() => setDeleteTarget(row)}
              />
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
        {canExport && (
          <CsvExportControl
            options={SALESMAN_EXPORT_OPTIONS}
            value={exportOption}
            onChange={setExportOption}
            onExport={exportCsv}
            isLoading={isExporting}
            label="Salesman export dataset"
          />
        )}
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canManage}>
          New salesman
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
          leftIcon={Search}
          placeholder="Search by name, phone, email, or vehicle"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        </div>
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
          <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
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
        empty={{ title: 'No salesmen match the filters' }}
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

      <SalesmanFormModal open={creating} onClose={() => setCreating(false)} />
      <SalesmanFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        salesman={editing || undefined}
      />
      <SalesmanAssignmentModal
        open={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        salesman={assigning || undefined}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate salesman"
        description={
          deleteTarget
            ? `Set ${deleteTarget.full_name} to inactive? Assignments stay on record but new dispatches will not target them.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
