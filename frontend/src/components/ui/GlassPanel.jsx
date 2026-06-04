import { cn } from '@/lib/cn.js';

export function GlassPanel({ as: Tag = 'div', strong = false, className, children, ...props }) {
  return (
    <Tag
      className={cn(strong ? 'glass-panel-strong' : 'glass-panel', className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function GlassPanelHeader({ title, subtitle, actions, className, icon: Icon }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 px-5 pt-5',
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Icon className="h-4 w-4 text-brand-200" aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          {title && (
            <h2 className="font-display text-base font-semibold text-ink-50">{title}</h2>
          )}
          {subtitle && <p className="mt-0.5 text-sm text-ink-300">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function GlassPanelBody({ className, children }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

export function GlassPanelFooter({ className, children }) {
  return (
    <div className={cn('flex items-center justify-end gap-2 border-t border-white/5 px-5 py-3', className)}>
      {children}
    </div>
  );
}
