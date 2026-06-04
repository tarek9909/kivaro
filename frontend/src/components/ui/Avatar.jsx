import { initials } from '@/lib/formatters.js';
import { cn } from '@/lib/cn.js';

export function Avatar({ name, size = 'md', className }) {
  const sizeClass = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base'
  }[size];

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-brand-500/40 via-brand-600/30 to-accent-500/40 font-semibold text-ink-50',
        sizeClass,
        className
      )}
      aria-hidden={!name}
    >
      {initials(name)}
    </span>
  );
}
