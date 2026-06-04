import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react';
import { Button } from './Button.jsx';
import { cn } from '@/lib/cn.js';

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing to show yet',
  description,
  action,
  className
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-6 py-10 text-center',
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-ink-200">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1">
        <p className="font-display text-sm font-semibold text-ink-100">{title}</p>
        {description && <p className="text-sm text-ink-300">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/5 px-6 py-10 text-center',
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-500/10 text-rose-200">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1">
        <p className="font-display text-sm font-semibold text-ink-50">{title}</p>
        {description && <p className="text-sm text-ink-300">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" leftIcon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function LoadingState({ label = 'Loading...', className }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'mx-auto flex w-full min-w-0 max-w-sm flex-col items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-10 text-center text-sm text-ink-300',
        className
      )}
    >
      <div className="relative h-9 w-9">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/20" />
        <span className="absolute inset-1.5 rounded-full bg-gradient-to-br from-brand-400 to-accent-500" />
      </div>
      <span className="break-words">{label}</span>
    </div>
  );
}
