import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Send,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { Button } from '@/components/ui/Button.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { formatDateTime } from '@/lib/formatters.js';
import { cn } from '@/lib/cn.js';
import { NotificationFormModal } from '@/pages/admin/NotificationFormModal.jsx';

const TYPE_CONFIG = {
  info: {
    icon: Info,
    bgClass: 'bg-blue-500/10 border-blue-400/25 text-blue-400',
    glowClass: 'group-hover:shadow-[0_0_12px_rgba(59,130,246,0.25)]',
    badgeTone: 'info'
  },
  success: {
    icon: CheckCircle2,
    bgClass: 'bg-emerald-500/10 border-emerald-400/25 text-emerald-400',
    glowClass: 'group-hover:shadow-[0_0_12px_rgba(16,185,129,0.25)]',
    badgeTone: 'success'
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-500/10 border-amber-400/25 text-amber-400',
    glowClass: 'group-hover:shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    badgeTone: 'warn'
  },
  danger: {
    icon: ShieldAlert,
    bgClass: 'bg-rose-500/10 border-rose-400/25 text-rose-400',
    glowClass: 'group-hover:shadow-[0_0_12px_rgba(244,63,94,0.25)]',
    badgeTone: 'danger'
  }
};

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateTime(dateString);
}

function useClickAway(ref, handler) {
  useEffect(() => {
    function listener(event) {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    }
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export function NotificationsPopover() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canBroadcast = hasPermission('settings.manage');

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const [creating, setCreating] = useState(false);
  const popoverRef = useRef(null);

  useClickAway(popoverRef, () => setIsOpen(false));

  const notificationsQuery = useQuery({
    queryKey: ['notifications', { popover: true, limit: 15 }],
    queryFn: () => api.notifications.list({ page: 1, limit: 15 }),
    staleTime: 15_000,
    refetchInterval: 30_000
  });

  const allItems = notificationsQuery.data?.data?.notifications || [];
  const unreadItems = allItems.filter((n) => !n.read_at);
  const unreadCount = unreadItems.length;

  const displayedItems = activeTab === 'unread' ? unreadItems : allItems;

  const markReadMutation = useMutation({
    mutationFn: (id) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not mark notification as read.')
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not mark notifications as read.')
  });

  return (
    <div ref={popoverRef} className="relative">
      {/* Bell Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle notifications pop-up"
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-white/[0.03] text-ink-200 backdrop-blur-md transition-all duration-200 hover:border-white/15 hover:bg-white/10 hover:text-ink-50 active:scale-95',
          isOpen && 'border-brand-500/30 bg-brand-500/10 text-brand-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
        )}
      >
        <Bell className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-12 scale-110 text-brand-300')} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-lg ring-2 ring-slate-950 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Pop-up Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications overview"
          className="absolute right-0 mt-3 w-80 sm:w-[410px] max-h-[560px] z-50 flex flex-col rounded-2xl border border-white/15 bg-slate-950/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 overflow-hidden"
        >
          {/* Top Decorative Ambient Light */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-500 opacity-80" />

          {/* Header */}
          <div className="flex flex-col border-b border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-4 pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 border border-brand-500/30 text-brand-300 shadow-inner">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-ink-50 flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-semibold text-brand-300 border border-brand-400/30">
                        {unreadCount} new
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={CheckCheck}
                  onClick={() => markAllMutation.mutate()}
                  isLoading={markAllMutation.isPending}
                  className="h-7 text-xs px-2.5 text-ink-300 hover:text-brand-300 hover:bg-brand-500/10 border border-transparent hover:border-brand-500/20 rounded-lg transition-all"
                  title="Mark all as read"
                >
                  Mark all read
                </Button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150',
                  activeTab === 'all'
                    ? 'bg-white/10 text-white font-semibold shadow-sm border border-white/10'
                    : 'text-ink-300 hover:text-ink-100 hover:bg-white/5'
                )}
              >
                <span>All</span>
                <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] opacity-75">
                  {allItems.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150',
                  activeTab === 'unread'
                    ? 'bg-brand-500/20 text-brand-200 font-semibold shadow-sm border border-brand-500/30'
                    : 'text-ink-300 hover:text-ink-100 hover:bg-white/5'
                )}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500/80 text-white px-1.5 py-0.2 text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-glass divide-y divide-white/5">
            {notificationsQuery.isPending ? (
              <div className="py-12 text-center text-xs text-ink-400 space-y-2">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
                <p>Loading notifications...</p>
              </div>
            ) : displayedItems.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/10 shadow-inner">
                  <Sparkles className="h-6 w-6 text-brand-300 opacity-80" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-ink-100">
                    {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                  </p>
                  <p className="text-xs text-ink-400 max-w-[240px] mx-auto leading-relaxed">
                    {activeTab === 'unread'
                      ? 'You are all caught up! Switch to All to see past messages.'
                      : 'Important updates and alerts will appear here when they arrive.'}
                  </p>
                </div>
              </div>
            ) : (
              displayedItems.map((item) => {
                const config = TYPE_CONFIG[item.notification_type] || TYPE_CONFIG.info;
                const Icon = config.icon;
                const isUnread = !item.read_at;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group relative flex items-start gap-3 p-3 rounded-xl transition-all duration-200',
                      isUnread
                        ? 'bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent border border-brand-500/20 shadow-sm'
                        : 'hover:bg-white/[0.04] border border-transparent'
                    )}
                  >
                    {/* Unread Glowing Pill Indicator */}
                    {isUnread && (
                      <span className="absolute top-3.5 left-1.5 h-2 w-2 rounded-full bg-brand-400 shadow-[0_0_8px_rgba(129,140,248,0.9)] animate-pulse" />
                    )}

                    {/* Notification Type Icon Badge */}
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all duration-200',
                        config.bgClass,
                        config.glowClass
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>

                    {/* Message Content */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={cn('text-xs font-semibold truncate', isUnread ? 'text-ink-50' : 'text-ink-200')}>
                          {item.title || 'Notification'}
                        </h4>
                        <span className="text-[10px] text-ink-400 shrink-0 flex items-center gap-1 font-mono">
                          <Clock className="h-2.5 w-2.5 opacity-60" />
                          {formatRelativeTime(item.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-ink-300 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Item Actions */}
                      {isUnread && (
                        <div className="pt-1 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => markReadMutation.mutate(item.id)}
                            disabled={markReadMutation.isPending}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-300 hover:text-brand-200 bg-brand-500/10 hover:bg-brand-500/20 px-2 py-0.5 rounded-md border border-brand-500/30 transition-all duration-150 active:scale-95"
                          >
                            <Check className="h-3 w-3" />
                            <span>Mark read</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/10 bg-white/[0.02]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200 transition-all duration-150"
            >
              <span>View all notifications</span>
              <ExternalLink className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            {canBroadcast && (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={Send}
                onClick={() => {
                  setIsOpen(false);
                  setCreating(true);
                }}
                className="h-7 text-xs px-3 bg-white/10 hover:bg-white/15 text-white border-white/15 shadow-sm"
              >
                Send notification
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      {canBroadcast && (
        <NotificationFormModal open={creating} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}

