import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  Send,
  ShieldAlert,
  SlidersHorizontal
} from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  Badge,
  Button,
  Input,
  PageHeader,
  Pagination,
  Select,
  GlassPanel,
  GlassPanelBody,
  GlassPanelHeader,
  EmptyState,
  ErrorState,
  LoadingState
} from '@/components/ui/index.js';
import { formatDateTime } from '@/lib/formatters.js';
import { NotificationFormModal } from './NotificationFormModal.jsx';

const TYPE_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: ShieldAlert
};

const TYPE_TONES = {
  info: 'info',
  success: 'success',
  warning: 'warn',
  danger: 'danger'
};

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'danger', label: 'Danger' }
];

export default function NotificationsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canBroadcast = hasPermission('settings.manage');
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (type) params.notification_type = type;
    return params;
  }, [debouncedSearch, type, page, limit]);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', queryParams],
    queryFn: () => api.notifications.list(queryParams)
  });

  const items = notificationsQuery.data?.data?.notifications || [];
  const meta = notificationsQuery.data?.meta || {};

  const markReadMutation = useMutation({
    mutationFn: (id) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not mark as read.'))
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not mark notifications as read.'))
  });

  const unreadCount = items.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Notifications"
        description="In-app alerts targeted at you. Stay current with operational events."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={CheckCheck}
              onClick={() => markAllMutation.mutate()}
              isLoading={markAllMutation.isPending}
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
            {canBroadcast && (
              <Button leftIcon={Send} onClick={() => setCreating(true)}>
                Send notification
              </Button>
            )}
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            leftIcon={Bell}
            placeholder="Search by title or message"
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
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <GlassPanel>
        <GlassPanelHeader
          icon={Bell}
          title="Inbox"
          subtitle={
            unreadCount > 0
              ? `${unreadCount} unread of ${items.length} on this page`
              : 'You are all caught up on this page.'
          }
        />
        <GlassPanelBody>
          {notificationsQuery.isPending ? (
            <LoadingState label="Loading notifications..." />
          ) : notificationsQuery.isError ? (
            <ErrorState
              title="Could not load notifications"
              description={getErrorMessage(notificationsQuery.error)}
              onRetry={() => notificationsQuery.refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications match the filters"
              description="Try clearing the search or type filter."
            />
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
              {items.map((notification) => {
                const Icon = TYPE_ICONS[notification.notification_type] || Info;
                const tone = TYPE_TONES[notification.notification_type] || 'neutral';
                const isUnread = !notification.read_at;
                return (
                  <li
                    key={notification.id}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition ${
                      isUnread
                        ? 'border-brand-400/30 bg-brand-500/5'
                        : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-100">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-ink-50">
                          {notification.title}
                        </p>
                        <Badge tone={tone}>{notification.notification_type}</Badge>
                        {notification.reference_type && (
                          <Badge tone="neutral">
                            {notification.reference_type}
                            {notification.reference_id ? ` #${notification.reference_id}` : ''}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink-200 text-pretty">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-[11px] uppercase tracking-wider text-ink-400">
                        {formatDateTime(notification.created_at)}
                        {notification.read_at
                          ? ` - read ${formatDateTime(notification.read_at)}`
                          : ''}
                      </p>
                    </div>
                    {isUnread && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={CheckCircle2}
                        onClick={() => markReadMutation.mutate(notification.id)}
                        isLoading={
                          markReadMutation.isPending &&
                          markReadMutation.variables === notification.id
                        }
                      >
                        Mark read
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </GlassPanelBody>
        {meta?.totalPages ? (
          <Pagination
            page={meta.page || page}
            totalPages={meta.totalPages || 1}
            total={meta.total}
            limit={meta.limit || limit}
            onChange={(nextPage) => setPage(nextPage)}
          />
        ) : null}
      </GlassPanel>

      <NotificationFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
