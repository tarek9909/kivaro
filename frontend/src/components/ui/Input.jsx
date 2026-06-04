import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn.js';

export const Input = forwardRef(function Input(
  {
    label,
    description,
    error,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className,
    containerClassName,
    id,
    ...props
  },
  ref
) {
  const reactId = useId();
  const inputId = id || reactId;

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium uppercase tracking-wider text-ink-300"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'group flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 transition focus-within:border-brand-400/70 focus-within:bg-white/[0.07]',
          error && 'border-rose-400/60 focus-within:border-rose-400/80'
        )}
      >
        {LeftIcon && <LeftIcon className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" />}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${inputId}-error` : description ? `${inputId}-desc` : undefined}
          className={cn(
            'h-10 w-full min-w-0 bg-transparent text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none disabled:cursor-not-allowed disabled:text-ink-400',
            className
          )}
          {...props}
        />
        {RightIcon && <RightIcon className="h-4 w-4 shrink-0 text-ink-300" aria-hidden="true" />}
      </div>
      {description && !error && (
        <p id={`${inputId}-desc`} className="text-xs text-ink-400">
          {description}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
});
