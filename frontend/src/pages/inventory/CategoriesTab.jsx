import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
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
import { STATUSES, INVENTORY_PERMISSIONS } from './inventory.config.js';
import { useCategoriesOptions } from './useInventoryOptions.js';

const STATUS_OPTIONS = [{ value: '', label: 'All statuses' }, ...STATUSES];

function emptyForm(category) {
  return {
    parent_id: category?.parent_id ?? '',
    name: category?.name ?? '',
    code: category?.code ?? '',
    description: category?.description ?? '',
    status: category?.status ?? 'active'
  };
}

function CategoryFormModal({ open, onClose, category, parents }) {
  const isEdit = Boolean(category);
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => emptyForm(category));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(category));
    setErrors({});
  }, [open, category]);

  const mutation = useMutation({
    mutationFn: (payload) =>
      isEdit ? api.inventory.categories.update(category.id, payload) : api.inventory.categories.create(payload),
    onSuccess: () => {
      toast.success(isEdit ? 'Category updated' : 'Category created');
      queryClient.invalidateQueries({ queryKey: ['inventory', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'categories'] });
      onClose?.();
    },
    onError: (error) => {
      setErrors(mapFieldErrors(error));
      toast.error(getErrorMessage(error, 'Could not save category.'));
    }
  });

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const next = {};
    if (!form.name?.trim()) next.name = 'Name is required.';
    if (form.parent_id && Number(form.parent_id) === Number(category?.id)) {
      next.parent_id = 'A category cannot be its own parent.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      parent_id: form.parent_id ? Number(form.parent_id) : null,
      name: form.name.trim(),
      code: form.code?.trim() || null,
      description: form.description?.trim() || null,
      status: form.status
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit category' : 'New category'}
      description="Categories group items for catalogs and reporting."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="category-form"
            isLoading={mutation.isPending}
          >
            {isEdit ? 'Save changes' : 'Create category'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
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
            value={form.code || ''}
            onChange={(event) => handleChange('code', event.target.value)}
            error={errors.code}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Parent category"
            value={form.parent_id || ''}
            onChange={(event) => handleChange('parent_id', event.target.value)}
            error={errors.parent_id}
          >
            <option value="">No parent</option>
            {parents
              .filter((parent) => parent.id !== category?.id)
              .map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
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
          label="Description"
          value={form.description || ''}
          onChange={(event) => handleChange('description', event.target.value)}
          rows={3}
        />
      </form>
    </Modal>
  );
}

export default function CategoriesTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreate = hasPermission(INVENTORY_PERMISSIONS.create);
  const canUpdate = hasPermission(INVENTORY_PERMISSIONS.update);
  const canDelete = hasPermission(INVENTORY_PERMISSIONS.delete);

  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
  const [parentId, setParentId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (parentId) params.parent_id = parentId;
    return params;
  }, [debouncedSearch, status, parentId, page, limit]);

  const listQuery = useQuery({
    queryKey: ['inventory', 'categories', queryParams],
    queryFn: () => api.inventory.categories.list(queryParams)
  });

  const parentsQuery = useCategoriesOptions(true);
  const parents = parentsQuery.data?.data?.categories || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.inventory.categories.remove(id),
    onSuccess: () => {
      toast.success('Category deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'categories'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete category.'))
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id) => api.inventory.categories.hardDelete(id),
    onSuccess: () => {
      toast.success('Category hard-deleted');
      setHardDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory', 'categories'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'options', 'categories'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not hard-delete category.'))
  });

  const rows = listQuery.data?.data?.categories || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
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
        id: 'parent_name',
        header: 'Parent',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.parent_name || '-'}</span>
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
            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setHardDeleteTarget(row)}
              >
                Hard delete
              </Button>
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
        <Button
          leftIcon={Plus}
          onClick={() => setCreating(true)}
          disabled={!canCreate}
        >
          New category
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
          <Select
            value={parentId}
            onChange={(event) => {
              setParentId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All parents</option>
            {parents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
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
        empty={{
          title: 'No categories found',
          description: canCreate
            ? 'Create your first category to start grouping items.'
            : 'Adjust your filters to find existing categories.'
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

      <CategoryFormModal open={creating} onClose={() => setCreating(false)} parents={parents} />
      <CategoryFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        category={editing || undefined}
        parents={parents}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate category"
        description={
          deleteTarget
            ? `Set ${deleteTarget.name} to inactive? Items keep their category assignment, but the category is hidden from active filters.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
      <ConfirmDialog
        open={Boolean(hardDeleteTarget)}
        onClose={() => setHardDeleteTarget(null)}
        onConfirm={() => hardDeleteTarget && hardDeleteMutation.mutate(hardDeleteTarget.id)}
        title="Hard delete category"
        description={
          hardDeleteTarget
            ? `Permanently delete ${hardDeleteTarget.name}? This cannot be undone and will fail if items or child categories still reference it.`
            : ''
        }
        confirmLabel="Hard delete"
        isLoading={hardDeleteMutation.isPending}
      />
    </div>
  );
}
