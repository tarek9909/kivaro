import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck } from 'lucide-react';
import { api } from '@/api/index.js';
import { Modal } from '@/components/ui/Modal.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Input } from '@/components/ui/Input.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Pagination } from '@/components/ui/Pagination.jsx';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews.jsx';
import { useTranslation } from '@/app/i18n.js';
import { getErrorMessage } from '@/lib/errors.js';
import { cn } from '@/lib/cn.js';

function groupByModule(permissions) {
  const map = new Map();
  for (const perm of permissions) {
    const key = perm.module || 'general';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(perm);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, perms]) => ({
      module,
      permissions: perms.slice().sort((a, b) => a.permission_key.localeCompare(b.permission_key))
    }));
}

export function RolePermissionsDrawer({ open, onClose, role, canEdit = false }) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const roleDetailQuery = useQuery({
    queryKey: ['role', role?.id],
    queryFn: () => api.roles.get(role.id),
    enabled: Boolean(open && role?.id)
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions', { page, limit, search }],
    queryFn: () => api.roles.permissions.list({
      page,
      limit,
      ...(search ? { search } : {})
    }),
    enabled: Boolean(open)
  });

  const permissions = permissionsQuery.data?.data?.permissions || [];
  const meta = permissionsQuery.data?.meta || {};

  useEffect(() => {
    if (!open) return;
    const ids = (roleDetailQuery.data?.data?.role?.permissions || []).map((p) => p.id);
    setSelected(new Set(ids));
  }, [open, roleDetailQuery.data]);

  const groups = useMemo(() => {
    return groupByModule(permissions);
  }, [permissions]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleModule(modulePerms) {
    const allSelected = modulePerms.every((perm) => selected.has(perm.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const perm of modulePerms) {
        if (allSelected) next.delete(perm.id);
        else next.add(perm.id);
      }
      return next;
    });
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      api.roles.replacePermissions(role.id, {
        permission_ids: [...selected]
      }),
    onSuccess: () => {
      toast.success('Permissions updated');
      queryClient.invalidateQueries({ queryKey: ['role', role.id] });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      onClose?.();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not save permissions.'))
  });

  const isLoading = roleDetailQuery.isPending || permissionsQuery.isPending;
  const isError = roleDetailQuery.isError || permissionsQuery.isError;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={role ? `Permissions: ${role.display_name || role.name}` : 'Permissions'}
      description={
        canEdit
          ? 'Select the permissions to assign. Users with this role will get these capabilities.'
          : 'Read-only view of the assigned permissions for this role.'
      }
      footer={
        canEdit ? (
          <>
            <Button variant="ghost" onClick={onClose} disabled={saveMutation.isPending}>
              Cancel
            </Button>
            <Button
              leftIcon={ShieldCheck}
              onClick={() => saveMutation.mutate()}
              isLoading={saveMutation.isPending}
            >
              {t('roles.savePermissions')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <Input
          leftIcon={Search}
          placeholder={t('roles.searchPermissions')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        <p className="text-xs text-ink-400">
          {t('roles.selectedCount', { count: selected.size })}
        </p>
        {isLoading ? (
          <LoadingState label="Loading permissions..." />
        ) : isError ? (
          <ErrorState
            title="Could not load permissions"
            description={getErrorMessage(roleDetailQuery.error || permissionsQuery.error)}
            onRetry={() => {
              roleDetailQuery.refetch();
              permissionsQuery.refetch();
            }}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            title="No permissions found"
            description="Adjust your search or contact an administrator."
          />
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const allSelected = group.permissions.every((perm) =>
                selected.has(perm.id)
              );
              const someSelected =
                group.permissions.some((perm) => selected.has(perm.id)) && !allSelected;
              return (
                <section
                  key={group.module}
                  className="rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold capitalize text-ink-50">
                        {group.module}
                      </p>
                      <p className="text-xs text-ink-400">
                        {group.permissions.filter((p) => selected.has(p.id)).length} of{' '}
                        {group.permissions.length} selected
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleModule(group.permissions)}
                      >
                        {allSelected ? 'Clear all' : someSelected ? 'Select all' : 'Select all'}
                      </Button>
                    )}
                  </header>
                  <ul className="divide-y divide-white/5">
                    {group.permissions.map((perm) => {
                      const isSelected = selected.has(perm.id);
                      return (
                        <li key={perm.id}>
                          <label
                            className={cn(
                              'flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-white/[0.04]',
                              !canEdit && 'cursor-default'
                            )}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isSelected}
                              onChange={() => canEdit && toggle(perm.id)}
                              disabled={!canEdit}
                            />
                            <span
                              className={cn(
                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                                isSelected
                                  ? 'border-brand-400 bg-brand-500/30 text-white'
                                  : 'border-white/15 bg-white/5'
                              )}
                              aria-hidden="true"
                            >
                              {isSelected && (
                                <svg
                                  width="10"
                                  height="10"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    d="M3 8.5l3 3 7-7"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-ink-100">
                                  {perm.permission_key}
                                </span>
                                <Badge tone="neutral">{perm.action}</Badge>
                              </div>
                              {perm.description && (
                                <p className="mt-1 text-xs text-ink-400 text-pretty">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
        {meta?.totalPages ? (
          <Pagination
            page={meta.page || page}
            totalPages={meta.totalPages || 1}
            total={meta.total}
            limit={meta.limit || limit}
            onChange={setPage}
            className="border border-white/10"
          />
        ) : null}
      </div>
    </Modal>
  );
}
