import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';
import { cn } from '@/lib/cn.js';
import { useTranslation } from '@/app/i18n.js';

export function Pagination({ page = 1, totalPages = 1, total, limit, onChange, className }) {
  const { t } = useTranslation();
  const safePage = Math.max(1, Math.min(page, Math.max(1, totalPages)));
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  const start = total ? (safePage - 1) * (limit || 0) + 1 : 0;
  const end = total ? Math.min(safePage * (limit || 0), total) : 0;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-white/5 px-4 py-3 text-sm text-ink-300',
        className
      )}
    >
      <p className="text-xs">
        {total
          ? t('pagination.showing', { start, end, total })
          : t('pagination.pageOf', { page: safePage, totalPages: Math.max(1, totalPages) })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={ChevronLeft}
          disabled={!canPrev}
          onClick={() => canPrev && onChange?.(safePage - 1)}
        >
          {t('pagination.previous')}
        </Button>
        <span className="text-xs text-ink-400">
          {t('pagination.pageOf', { page: safePage, totalPages: Math.max(1, totalPages) })}
        </span>
        <Button
          variant="secondary"
          size="sm"
          rightIcon={ChevronRight}
          disabled={!canNext}
          onClick={() => canNext && onChange?.(safePage + 1)}
        >
          {t('pagination.next')}
        </Button>
      </div>
    </div>
  );
}
