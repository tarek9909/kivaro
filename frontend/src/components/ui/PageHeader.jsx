import { cn } from '@/lib/cn.js';

export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 pb-4',
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-200/80">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-50 text-balance">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm text-ink-300 text-pretty">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
