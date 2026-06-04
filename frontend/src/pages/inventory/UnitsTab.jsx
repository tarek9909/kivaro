import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage, mapFieldErrors } from '@/lib/errors.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Input,
  Modal,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { UNIT_TYPES, INVENTORY_PERMISSIONS } from './inventory.config.js';
import { useUnitsOptions } from './useInventoryOptions.js';

function emptyForm(unit) {
  return {
    name: unit?.name ?? '',
    symbol: unit?.symbol ?? '',
    unit_type: unit?.unit_type ?? 'quantity',
    base_unit_id: unit?.base_unit_id ?? '',
    conversion_to_base: unit?.conversion_to_base ?? 1
  };
}

function UnitFormModal({ open, onClose, unit, baseUnits }) {
  const isEdit = Boolean(unit);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(unit));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(unit));
    setErrors({});
  }, [open, unit]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? api.inventory.units.update(unit.id, payload) : api.inventory.units.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Unit updated' : 'Unit created');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'units'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'units'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save unit.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name?.trim()) next.name = 'Name is required.';
    if (!form.symbol?.trim()) next.symbol = 'Symbol is required.';
    const conversion = Number(form.conversion_to_base);
    if (!conversion || conversion <= 0) {
      next.conversion_to_base = 'Conversion must be a positive number.';
    }
    if (form.base_unit_id && Number(form.base_unit_id) === Number(unit?.id)) {
      next.base_unit_id = 'A unit cannot be its own base.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      name: form.name.trim(),
      symbol: form.symbol.trim(),
      unit_type: form.unit_type,
      base_unit_id: form.base_unit_id ? Number(form.base_unit_id) : null,
      conversion_to_base: Number(form.conversion_to_base)
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit unit' : 'New unit'}
      description="Units of measure used by items and variants."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="unit-form"
            isLoading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Create unit'}
          </Button>
        </>
      }
    >
      <form id="unit-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={form.name}
            onChange={(event) => handleChange('name', event.target.value)}
            error={errors.name}
            required
          />
          <Input
            label="Symbol"
            value={form.symbol}
            onChange={(event) => handleChange('symbol', event.target.value)}
            error={errors.symbol}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Unit type"
            value={form.unit_type}
            onChange={(event) => handleChange('unit_type', event.target.value)}
            error={errors.unit_type}
          >
            {UNIT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            label="Base unit"
            value={form.base_unit_id || ''}
            onChange={(event) => handleChange('base_unit_id', event.target.value)}
            error={errors.base_unit_id}
            description="Optional. Set when this unit derives from another."
          >
            <option value="">None</option>
            {baseUnits
              .filter((u) => u.id !== unit?.id)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} ({option.symbol})
                </option>
              ))}
          </Select>
        </div>
        <Input
          label="Conversion to base"
          type="number"
          step="any"
          min="0"
          value={form.conversion_to_base}
          onChange={(event) => handleChange('conversion_to_base', event.target.value)}
          error={errors.conversion_to_base}
          description="How many of this unit equal one base unit. Default 1."
        />
      </form>
    </Modal>
  );
}

export default function UnitsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(INVENTORY_PERMISSIONS.create);
  const canUpdate = hasPermission(INVENTORY_PERMISSIONS.update);
  const canDelete = hasPermission(INVENTORY_PERMISSIONS.delete);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [debouncedSearch, page, limit]);

  const listQuery = useQuery({
    queryKey: ['inventory', 'units', queryParams],
    queryFn: () => api.inventory.units.list(queryParams)
  });

  const baseUnitsQuery = useUnitsOptions(true);
  const baseUnits = baseUnitsQuery.data?.data?.units || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.inventory.units.remove(id),
    onSuccess: () => {
      toast.success('Unit deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'units'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'units'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete unit.'))
  });

  const rows = listQuery.data?.data?.units || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.name}</p>
            <p className="truncate font-mono text-xs text-ink-400">{row.symbol}</p>
          </div>
        )
      },
      {
        id: 'unit_type',
        header: 'Type',
        cell: (row) => <Badge tone="neutral">{row.unit_type}</Badge>
      },
      {
        id: 'base_unit',
        header: 'Base',
        cell: (row) =>
          row.base_unit_symbol ? (
            <span className="text-sm text-ink-200">
              {row.conversion_to_base} per {row.base_unit_symbol}
            </span>
          ) : (
            <span className="text-xs text-ink-400">-</span>
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
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                leftIcon={Trash2}
                aria-label={`Delete ${row.name}`}
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
          New unit
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
          leftIcon={Search}
          placeholder="Search by name or symbol"
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
          title: 'No units found',
          description: 'Create units to express how items and variants are measured.'
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

      <UnitFormModal open={creating} onClose={() => setCreating(false)} baseUnits={baseUnits} />
      <UnitFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        unit={editing || undefined}
        baseUnits={baseUnits}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete unit"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.name}? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
