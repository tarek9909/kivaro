import { useId } from 'react';
import { cn } from '@/lib/cn.js';

export function Switch({ checked, onChange, label, description, disabled, id, className }) {
  const reactId = useId();
  const inputId = id || reactId;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20',
        disabled && 'cursor-not-allowed opacity-60 hover:border-white/10',
        className
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        className="sr-only"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span
        className={cn(
          'relative mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border border-white/10 bg-white/10 transition',
          checked && 'border-brand-400/60 bg-gradient-to-r from-brand-500 to-accent-500'
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            'absolute h-3.5 w-3.5 translate-x-0.5 rounded-full bg-white shadow transition',
            checked && 'translate-x-[18px]'
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        {label && <span className="block text-sm font-medium text-ink-50">{label}</span>}
        {description && (
          <span className="mt-0.5 block text-xs text-ink-300 text-pretty">{description}</span>
        )}
      </span>
    </label>
  );
}
