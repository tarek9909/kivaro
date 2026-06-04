import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import {
  LOCATIONS_PERMISSIONS,
  STATUS_FILTER_OPTIONS
} from './locations.config.js';
import { SublocationFormModal } from './SublocationFormModal.jsx';
import { useLocationsList } from './useLocationsOptions.js';

export default function SublocationsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission(LOCATIONS_PERMISSIONS.locations);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
  const [locationId, setLocationId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (locationId) params.location_id = locationId;
    return params;
  }, [debouncedSearch, status, locationId, page, limit]);

  const listQuery = useQuery({
    queryKey: ['locations', 'sublocations', queryParams],
    queryFn: () => api.locations.sublocations.list(queryParams)
  });

  const locationsQuery = useLocationsList(canManage);
  const locations = locationsQuery.data?.data?.locations || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.locations.sublocations.remove(id),
    onSuccess: () => {
      toast.success('Sublocation deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['locations', 'sublocations'] });
      queryClient.invalidateQueries({
        queryKey: ['locations', 'options', 'sublocations']
      });
      queryClient.invalidateQueries({ queryKey: ['locations', 'location-sublocations'] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not deactivate sublocation.'))
  });

  const rows = listQuery.data?.data?.sublocations || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Sublocation',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.name}</p>
            {row.code ? (
              <p className="truncate font-mono text-xs text-ink-400">{row.code}</p>
            ) : null}
          </div>
        )
      },
      {
        id: 'location_name',
        header: 'Location',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.location_name || '-'}</span>
        )
      },
      {
        id: 'description',
        header: 'Description',
        cell: (row) => (
          <span className="line-clamp-2 text-sm text-ink-200 text-pretty">
            {row.description || '-'}
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
              <Button variant="secondary" size="sm" onClick={() => setEditing(row)}>
                Edit
              </Button>
            )}
            {canManage && row.status === 'active' && (
              <Button
                variant="ghost"
                size="icon"
                leftIcon={Trash2}
                aria-label={`Deactivate ${row.name}`}
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
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canManage}>
          New sublocation
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
          leftIcon={Search}
          placeholder="Search by name, code, or parent location"
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
        empty={{ title: 'No sublocations match the filters' }}
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

      <SublocationFormModal
        open={creating}
        onClose={() => setCreating(false)}
        defaultLocationId={locationId || undefined}
      />
      <SublocationFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        sublocation={editing || undefined}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate sublocation"
        description={
          deleteTarget
            ? `Set ${deleteTarget.name} to inactive? Existing customer and salesman links remain intact.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
