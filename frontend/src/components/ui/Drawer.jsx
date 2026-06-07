import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn.js';

/**
 * Right-side glassmorphism drawer for detail/preview surfaces.
 */
export function Drawer({ open, onClose, title, description, children, footer, width = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-2xl'
  }[width];

  return createPortal(
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex justify-end sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        aria-label="Close drawer"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
      />
      <aside
        className={cn(
          'glass-panel-strong relative z-10 flex h-full w-full flex-col overflow-hidden animate-fade-in sm:h-auto sm:max-h-[90vh]',
          widthClass
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/5 px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-base font-semibold text-ink-50 text-balance">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-ink-300 text-pretty">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-ink-300 transition hover:bg-white/10 hover:text-ink-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="scrollbar-glass min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/5 bg-white/[0.02] px-5 py-3">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
}
