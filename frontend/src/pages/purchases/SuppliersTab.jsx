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
  Select,
  Textarea
} from '@/components/ui/index.js';
import { PURCHASES_PERMISSIONS, SUPPLIER_STATUSES } from './purchases.config.js';

const STATUS_FILTER_OPTIONS = [{ value: '', label: 'All statuses' }, ...SUPPLIER_STATUSES];

function emptyForm(supplier) {
  return {
    name: supplier?.name ?? '',
    phone: supplier?.phone ?? '',
    email: supplier?.email ?? '',
    contact_person: supplier?.contact_person ?? '',
    address: supplier?.address ?? '',
    status: supplier?.status ?? 'active'
  };
}

function SupplierFormModal({ open, onClose, supplier }) {
  const isEdit = Boolean(supplier);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(supplier));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(supplier));
    setErrors({});
  }, [open, supplier]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? api.purchases.suppliers.update(supplier.id, payload)
        : api.purchases.suppliers.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Supplier updated' : 'Supplier created');
      queryClient.invalidateQueries({ queryKey: ['purchases', 'suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases', 'options', 'suppliers'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save supplier.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name?.trim()) next.name = 'Supplier name is required.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Invalid email address.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      name: form.name.trim(),
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      contact_person: form.contact_person?.trim() || null,
      address: form.address?.trim() || null,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit supplier' : 'New supplier'}
      description="Suppliers are companies you raise purchase orders against."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="supplier-form" isLoading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create supplier'}
          </Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Name"
          value={form.name}
          onChange={(event) => handleChange('name', event.target.value)}
          error={errors.name}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            value={form.phone || ''}
            onChange={(event) => handleChange('phone', event.target.value)}
            error={errors.phone}
          />
          <Input
            label="Email"
            type="email"
            value={form.email || ''}
            onChange={(event) => handleChange('email', event.target.value)}
            error={errors.email}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Contact person"
            value={form.contact_person || ''}
            onChange={(event) => handleChange('contact_person', event.target.value)}
            error={errors.contact_person}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(event) => handleChange('status', event.target.value)}
            error={errors.status}
          >
            {SUPPLIER_STATUSES.map((option) => (
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

export default function SuppliersTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(PURCHASES_PERMISSIONS.create);
  // Backend uses purchase_orders.create for both update and delete.
  const canManage = canCreate;
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
    queryKey: ['purchases', 'suppliers', queryParams],
    queryFn: () => api.purchases.suppliers.list(queryParams)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.purchases.suppliers.remove(id),
    onSuccess: () => {
      toast.success('Supplier deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['purchases', 'suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['purchases', 'options', 'suppliers'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not deactivate supplier.'))
  });

  const rows = listQuery.data?.data?.suppliers || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Supplier',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.name}</p>
            {row.contact_person ? (
              <p className="truncate text-xs text-ink-400">{row.contact_person}</p>
            ) : null}
          </div>
        )
      },
      {
        id: 'contact',
        header: 'Contact',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-ink-200">{row.email || '-'}</p>
            <p className="truncate text-xs text-ink-400">{row.phone || ''}</p>
          </div>
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
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>
          New supplier
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
          leftIcon={Search}
          placeholder="Search by name, phone, email, or contact"
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
        empty={{ title: 'No suppliers found' }}
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

      <SupplierFormModal open={creating} onClose={() => setCreating(false)} />
      <SupplierFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        supplier={editing || undefined}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate supplier"
        description={
          deleteTarget
            ? `Set ${deleteTarget.name} to inactive? Existing purchase orders remain intact.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
