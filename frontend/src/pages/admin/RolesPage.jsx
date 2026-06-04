import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ShieldCheck, ShieldPlus, Trash2, Users as UsersIcon } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useTranslation } from '@/app/i18n.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  GlassPanel,
  GlassPanelBody,
  Input,
  PageHeader,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage } from '@/lib/errors.js';
import { RoleFormModal } from './RoleFormModal.jsx';
import { RolePermissionsDrawer } from './RolePermissionsDrawer.jsx';

export default function RolesPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManage = hasPermission('roles.manage');
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const debouncedSearch = useDebouncedValue(search, 300);
  const params = useMemo(() => ({
    page,
    limit,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { status } : {})
  }), [debouncedSearch, limit, page, status]);

  const rolesQuery = useQuery({
    queryKey: ['roles', params],
    queryFn: () => api.roles.list(params)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.roles.remove(id),
    onSuccess: () => {
      toast.success('Role deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete role.'))
  });

  const roles = rolesQuery.data?.data?.roles || [];
  const meta = rolesQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'role',
        header: 'Role',
        cell: (row) => (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium text-ink-50">
                {row.display_name || row.name}
              </p>
              {row.is_system_role ? <Badge tone="info">System</Badge> : null}
            </div>
            <p className="truncate font-mono text-xs text-ink-400">{row.name}</p>
          </div>
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
        id: 'permission_count',
        header: 'Permissions',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">{row.permission_count ?? 0}</span>
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
            <Button
              variant="secondary"
              size="sm"
              leftIcon={ShieldCheck}
              onClick={() => setPermissionsTarget(row)}
            >
              Permissions
            </Button>
            {canManage && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                Edit
              </Button>
            )}
            {canManage && !row.is_system_role && (
              <Button
                variant="ghost"
                size="icon"
                leftIcon={Trash2}
                aria-label={`Delete ${row.display_name || row.name}`}
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title={t('roles.title')}
        description={t('roles.description')}
        actions={
          canManage ? (
            <Button leftIcon={ShieldPlus} onClick={() => setCreating(true)}>
              {t('roles.new')}
            </Button>
          ) : (
            <Button leftIcon={Plus} disabled>
              New role
            </Button>
          )
        }
      />

      <GlassPanel>
        <GlassPanelBody>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <Input
              label={t('common.search')}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              leftIcon={Search}
              placeholder="Role name or description"
            />
            <Select
              label={t('common.status')}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </Select>
          </div>
        </GlassPanelBody>
      </GlassPanel>

      <DataTable
        columns={columns}
        rows={roles}
        rowKey={(row) => row.id}
        isLoading={rolesQuery.isPending}
        isError={rolesQuery.isError}
        error={rolesQuery.error}
        onRetry={() => rolesQuery.refetch()}
        empty={{
          icon: UsersIcon,
          title: 'No roles defined yet',
          description: canManage
            ? 'Create your first role and assign permissions to it.'
            : 'Ask an administrator to create roles for your team.'
        }}
        footer={
          <Pagination
            page={meta.page || page}
            totalPages={meta.totalPages || 1}
            total={meta.total}
            limit={meta.limit || limit}
            onChange={setPage}
          />
        }
      />

      <RoleFormModal open={creating} onClose={() => setCreating(false)} />
      <RoleFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        role={editing || undefined}
      />
      <RolePermissionsDrawer
        open={Boolean(permissionsTarget)}
        onClose={() => setPermissionsTarget(null)}
        role={permissionsTarget}
        canEdit={canManage}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete role"
        description={
          deleteTarget
            ? `Delete role ${deleteTarget.display_name || deleteTarget.name}? Users with this role will need to be reassigned.`
            : ''
        }
        confirmLabel="Delete role"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
