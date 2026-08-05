import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  ChevronsUpDown,
  ChevronsDownUp
} from 'lucide-react';
import { api } from '@/api/index.js';
import { Modal } from '@/components/ui/Modal.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { Input } from '@/components/ui/Input.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
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
  const [collapsedModules, setCollapsedModules] = useState(new Set());

  const roleDetailQuery = useQuery({
    queryKey: ['role', role?.id],
    queryFn: () => api.roles.get(role.id),
    enabled: Boolean(open && role?.id)
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions', { limit: 500, search }],
    queryFn: () =>
      api.roles.permissions.list({
        limit: 500,
        ...(search ? { search } : {})
      }),
    enabled: Boolean(open)
  });

  const permissions = permissionsQuery.data?.data?.permissions || [];

  useEffect(() => {
    if (!open) return;
    const ids = (roleDetailQuery.data?.data?.role?.permissions || []).map((p) => p.id);
    setSelected(new Set(ids));
  }, [open, roleDetailQuery.data]);

  const groups = useMemo(() => {
    return groupByModule(permissions);
  }, [permissions]);
  const deliveryPermissionKeys = new Set([
    'delivery.release', 'delivery.dispatch', 'delivery.record_returns',
    'delivery.closeout', 'dispatch.settle', 'finance.settle_deliveries'
  ]);
  const selectedPermissionKeys = useMemo(
    () => new Set(permissions.filter((permission) => selected.has(permission.id)).map((permission) => permission.permission_key)),
    [permissions, selected]
  );
  const needsDocumentPrint = [...deliveryPermissionKeys].some((key) => selectedPermissionKeys.has(key));
  const hasDocumentPrint = selectedPermissionKeys.has('dispatch.print') || selectedPermissionKeys.has('invoices.print');
  const hasInvalidDeliveryWorkflow = needsDocumentPrint && !hasDocumentPrint;

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

  function checkAll() {
    const allIds = permissions.map((p) => p.id);
    setSelected(new Set(allIds));
  }

  function uncheckAll() {
    setSelected(new Set());
  }

  function toggleCollapse(moduleName) {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
      }
      return next;
    });
  }

  function expandAll() {
    setCollapsedModules(new Set());
  }

  function collapseAll() {
    setCollapsedModules(new Set(groups.map((g) => g.module)));
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
              disabled={hasInvalidDeliveryWorkflow}
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
        {/* Search */}
        <Input
          leftIcon={Search}
          placeholder={t('roles.searchPermissions')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {hasInvalidDeliveryWorkflow && (
          <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            Delivery workflow permissions require Dispatch print or Invoice print so mandatory documents remain available.
          </p>
        )}

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2.5 text-xs text-ink-300">
            <Badge tone={selected.size > 0 ? 'brand' : 'neutral'}>
              {selected.size} / {permissions.length}
            </Badge>
            <span className="font-medium text-ink-200">
              {t('roles.selectedCount', { count: selected.size })}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <div className="flex items-center gap-1.5 border-r border-white/10 pr-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={CheckSquare}
                  onClick={checkAll}
                  disabled={isLoading || permissions.length === 0}
                >
                  Check all
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={Square}
                  onClick={uncheckAll}
                  disabled={isLoading || selected.size === 0}
                >
                  Uncheck all
                </Button>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={ChevronsUpDown}
                onClick={expandAll}
                disabled={isLoading || groups.length === 0}
              >
                Expand all
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={ChevronsDownUp}
                onClick={collapseAll}
                disabled={isLoading || groups.length === 0}
              >
                Collapse all
              </Button>
            </div>
          </div>
        </div>

        {/* Permissions Accordion Group List */}
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
              const isCollapsed = collapsedModules.has(group.module);
              const allSelected = group.permissions.every((perm) => selected.has(perm.id));
              const someSelected =
                group.permissions.some((perm) => selected.has(perm.id)) && !allSelected;
              const selectedCount = group.permissions.filter((p) => selected.has(p.id)).length;

              return (
                <section
                  key={group.module}
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition"
                >
                  <header className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 select-none">
                    <button
                      type="button"
                      onClick={() => toggleCollapse(group.module)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-400/50 rounded-lg py-0.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-ink-300 transition hover:bg-white/10 hover:text-ink-50">
                        {isCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-sm font-semibold capitalize text-ink-50">
                            {group.module}
                          </p>
                          <Badge tone={selectedCount > 0 ? 'brand' : 'neutral'} size="sm">
                            {selectedCount} / {group.permissions.length}
                          </Badge>
                        </div>
                        <p className="text-xs text-ink-400">
                          {selectedCount} of {group.permissions.length} selected
                        </p>
                      </div>
                    </button>

                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleModule(group.permissions);
                        }}
                      >
                        {allSelected ? 'Clear module' : 'Select module'}
                      </Button>
                    )}
                  </header>

                  {!isCollapsed && (
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
                                  <span className="font-mono text-xs font-medium text-ink-100">
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
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
