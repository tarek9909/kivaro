import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn.js';

export const Textarea = forwardRef(function Textarea(
  {
    label,
    description,
    error,
    className,
    containerClassName,
    id,
    rows = 4,
    ...props
  },
  ref
) {
  const reactId = useId();
  const textareaId = id || reactId;

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-medium uppercase tracking-wider text-ink-300"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'group flex min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 transition focus-within:border-brand-400/70 focus-within:bg-white/[0.07]',
          error && 'border-rose-400/60 focus-within:border-rose-400/80'
        )}
      >
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${textareaId}-error` : description ? `${textareaId}-desc` : undefined}
          className={cn(
            'min-h-[80px] w-full min-w-0 resize-y bg-transparent text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none disabled:cursor-not-allowed disabled:text-ink-400',
            className
          )}
          {...props}
        />
      </div>
      {description && !error && (
        <p id={`${textareaId}-desc`} className="text-xs text-ink-400">
          {description}
        </p>
      )}
      {error && (
        <p id={`${textareaId}-error`} className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
});
