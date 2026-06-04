import { cn } from '@/lib/cn.js';

const TONES = {
  neutral: 'bg-white/5 text-ink-200 border-white/10',
  brand: 'bg-brand-500/15 text-brand-200 border-brand-400/30',
  success: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
  warn: 'bg-amber-500/15 text-amber-200 border-amber-400/30',
  danger: 'bg-rose-500/15 text-rose-200 border-rose-400/30',
  info: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/30'
};

export function Badge({ tone = 'neutral', className, children, icon: Icon, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider',
        TONES[tone],
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3" aria-hidden="true" />}
      {children}
    </span>
  );
}
