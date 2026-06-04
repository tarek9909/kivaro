import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users,
  SlidersHorizontal
} from 'lucide-react';
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
  PageHeader,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatDateTime } from '@/lib/formatters.js';
import { UserFormModal } from './UserFormModal.jsx';

const STATUS_TONES = {
  active: 'success',
  inactive: 'neutral',
  suspended: 'warn'
};

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

export default function UsersPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();

  const canCreate = hasPermission('users.create');
  const canUpdate = hasPermission('users.update');
  const canDelete = hasPermission('users.delete');
  const canManageRoles = hasPermission('roles.manage');

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
  const [roleId, setRoleId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const rolesQuery = useQuery({
    queryKey: ['roles', 'options'],
    queryFn: () => api.roles.list({ page: 1, limit: 100, status: 'active' }),
    enabled: canManageRoles || canCreate || canUpdate
  });

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (roleId) params.role_id = roleId;
    return params;
  }, [debouncedSearch, status, roleId, page, limit]);

  const usersQuery = useQuery({
    queryKey: ['users', queryParams],
    queryFn: () => api.users.list(queryParams)
  });

  const users = usersQuery.data?.data?.users || [];
  const meta = usersQuery.data?.meta || {};

  const statusMutation = useMutation({
    mutationFn: ({ id, status: nextStatus }) =>
      api.users.updateStatus(id, { status: nextStatus }),
    onSuccess: () => {
      toast.success('User status updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update status.'))
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.users.remove(id),
    onSuccess: () => {
      toast.success('User deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete user.'))
  });

  const roles = rolesQuery.data?.data?.roles || [];

  const columns = useMemo(
    () => [
      {
        id: 'full_name',
        header: 'Name',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.full_name}</p>
            <p className="truncate text-xs text-ink-400">
              {row.email || row.username || row.phone || '-'}
            </p>
          </div>
        )
      },
      {
        id: 'role',
        header: 'Role',
        cell: (row) => (
          <span className="text-sm text-ink-100">
            {row.role_display_name || row.role_name || '-'}
          </span>
        )
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => (
          <Badge tone={STATUS_TONES[row.status] || 'neutral'}>{row.status}</Badge>
        )
      },
      {
        id: 'last_login_at',
        header: 'Last login',
        cell: (row) => (
          <span className="text-xs text-ink-300">
            {row.last_login_at ? formatDateTime(row.last_login_at) : 'Never'}
          </span>
        )
      },
      {
        id: 'created_at',
        header: 'Created',
        cell: (row) => (
          <span className="text-xs text-ink-300">{formatDateTime(row.created_at)}</span>
        )
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => {
          const isPending = statusMutation.isPending && statusMutation.variables?.id === row.id;
          return (
            <div className="flex flex-wrap items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              {canUpdate && (
                <>
                  <Button
                    variant="ghost"
                    leftIcon={UserCheck}
                    isLoading={isPending && statusMutation.variables?.status === 'active'}
                    disabled={isPending || row.status === 'active'}
                    onClick={() =>
                      statusMutation.mutate({
                        id: row.id,
                        status: 'active'
                      })
                    }
                    className={row.status === 'active'
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "border-transparent text-ink-400 hover:border-white/10 hover:bg-white/5"
                    }
                  >
                    Activate
                  </Button>
                  <Button
                    variant="ghost"
                    leftIcon={UserX}
                    isLoading={isPending && statusMutation.variables?.status === 'inactive'}
                    disabled={isPending || row.status === 'inactive'}
                    onClick={() =>
                      statusMutation.mutate({
                        id: row.id,
                        status: 'inactive'
                      })
                    }
                    className={row.status === 'inactive'
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                      : "border-transparent text-ink-400 hover:border-white/10 hover:bg-white/5"
                    }
                  >
                    Deactivate
                  </Button>
                </>
              )}
              {canUpdate && (
                <Button
                  variant="ghost"
                  leftIcon={UserCog}
                  onClick={() => setEditing(row)}
                >
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  leftIcon={Trash2}
                  aria-label={`Delete ${row.full_name}`}
                  onClick={() => setDeleteTarget(row)}
                />
              )}
            </div>
          );
        }
      }
    ],
    [canDelete, canUpdate, statusMutation]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Operators that can sign in to the workspace. Permissions are granted by role."
        actions={
          canCreate ? (
            <Button leftIcon={UserPlus} onClick={() => setCreating(true)}>
              New user
            </Button>
          ) : (
            <Button leftIcon={Plus} disabled>
              New user
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            leftIcon={Search}
            placeholder="Search by name, email, username, or phone"
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
            value={roleId}
            onChange={(event) => {
              setRoleId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.display_name || role.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={users}
        rowKey={(row) => row.id}
        isLoading={usersQuery.isPending}
        isError={usersQuery.isError}
        error={usersQuery.error}
        onRetry={() => usersQuery.refetch()}
        empty={{
          icon: Users,
          title: 'No users match the filters',
          description:
            'Adjust your filters or invite a new operator using the New user action.'
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

      <UserFormModal
        open={creating}
        onClose={() => setCreating(false)}
        roles={roles}
      />
      <UserFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        user={editing || undefined}
        roles={roles}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Delete user"
        description={
          deleteTarget
            ? `Soft-delete ${deleteTarget.full_name}? They will lose access immediately. You can recreate them later.`
            : ''
        }
        confirmLabel="Delete user"
        isLoading={deleteMutation.isPending}
      />

      {!canCreate && !canUpdate && !canDelete && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          <ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden="true" />
          You can view users but cannot make changes. Ask an administrator for the
          users.create, users.update, or users.delete permissions.
        </div>
      )}
    </div>
  );
}
