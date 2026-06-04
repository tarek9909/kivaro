import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import { useLocationsList } from '@/pages/locations/useLocationsOptions.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Input,
  Modal,
  Pagination,
  Select,
  Textarea
} from '@/components/ui/index.js';
import { STATUSES, INVENTORY_PERMISSIONS } from './inventory.config.js';

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...STATUSES];

function emptyForm(warehouse) {
  return {
    name: warehouse?.name ?? '',
    code: warehouse?.code ?? '',
    location_id: warehouse?.location_id ?? '',
    address: warehouse?.address ?? '',
    status: warehouse?.status ?? 'active'
  };
}

function WarehouseFormModal({ open, onClose, warehouse, locations, canPickLocations }) {
  const isEdit = Boolean(warehouse);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(warehouse));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(warehouse));
    setErrors({});
  }, [open, warehouse]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.inventory.warehouses.update(warehouse.id, payload)
        : api.inventory.warehouses.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Warehouse updated' : 'Warehouse created');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'warehouses'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save warehouse.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name?.trim()) next.name = 'Name is required.';
    if (!form.code?.trim()) next.code = 'Code is required.';
    if (form.location_id && Number.isNaN(Number(form.location_id))) {
      next.location_id = 'Select a valid location.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      name: form.name.trim(),
      code: form.code.trim(),
      location_id: form.location_id ? Number(form.location_id) : null,
      address: form.address?.trim() || null,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit warehouse' : 'New warehouse'}
      description="Warehouses hold stock balances. Optionally link a warehouse to a sales location."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="warehouse-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create warehouse'}
          </Button>
        </>
      }
    >
      <form id="warehouse-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => handleChange('name', event.target.value)}
            error={errors.name}
            required
          />
          <Input
            label="Code"
            value={form.code}
            onChange={(event) => handleChange('code', event.target.value)}
            error={errors.code}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Location"
            value={form.location_id || ''}
            onChange={(event) => handleChange('location_id', event.target.value)}
            error={errors.location_id}
            description={canPickLocations ? 'Optional sales location.' : 'Location access is needed to change this.'}
            disabled={!canPickLocations}
          >
            <option value="">No location</option>
            {warehouse?.location_id && !locations.some((location) => Number(location.id) === Number(warehouse.location_id)) && (
              <option value={warehouse.location_id}>{warehouse.location_name || `Location ${warehouse.location_id}`}</option>
            )}
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </Select>
          <Select
            label="Status"
            value={form.status}
            onChange={(event) => handleChange('status', event.target.value)}
            error={errors.status}
          >
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <Textarea
          label="Address"
          value={form.address || ''}
          onChange={(event) => handleChange('address', event.target.value)}
          rows={3}
        />
      </form>
    </Modal>
  );
}

export default function WarehousesTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(INVENTORY_PERMISSIONS.create);
  const canUpdate = hasPermission(INVENTORY_PERMISSIONS.update);
  const canDelete = hasPermission(INVENTORY_PERMISSIONS.delete);
  const canPickLocations = hasPermission('locations.manage');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
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
    return params;
  }, [debouncedSearch, status, page, limit]);

  const listQuery = useQuery({
    queryKey: ['inventory', 'warehouses', queryParams],
    queryFn: () => api.inventory.warehouses.list(queryParams)
  });
  const locationsQuery = useLocationsList(canPickLocations);
  const locations = locationsQuery.data?.data?.locations || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.inventory.warehouses.remove(id),
    onSuccess: () => {
      toast.success('Warehouse deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'warehouses'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not deactivate warehouse.'))
  });

  const rows = listQuery.data?.data?.warehouses || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Warehouse',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.name}</p>
            <p className="truncate font-mono text-xs text-ink-400">{row.code}</p>
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
        id: 'address',
        header: 'Address',
        cell: (row) => (
          <span className="line-clamp-2 text-sm text-ink-200 text-pretty">
            {row.address || '-'}
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
            {canUpdate && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(row)}>
                Edit
              </Button>
            )}
            {canDelete && row.status === 'active' && (
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
    [canDelete, canUpdate]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>
          New warehouse
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
          leftIcon={Search}
          placeholder="Search by name or code"
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
          {STATUS_OPTIONS.map((option) => (
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
        empty={{ title: 'No warehouses found' }}
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

      <WarehouseFormModal
        open={creating}
        onClose={() => setCreating(false)}
        locations={locations}
        canPickLocations={canPickLocations}
      />
      <WarehouseFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        warehouse={editing || undefined}
        locations={locations}
        canPickLocations={canPickLocations}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate warehouse"
        description={
          deleteTarget
            ? `Set ${deleteTarget.name} to inactive? Existing balances and movements remain intact.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
