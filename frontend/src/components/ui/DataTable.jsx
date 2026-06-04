import { GlassPanel } from './GlassPanel.jsx';
import { LoadingState, EmptyState, ErrorState } from './StateViews.jsx';
import { ActionCellContext } from './Button.jsx';
import { cn } from '@/lib/cn.js';
import { useTranslation } from '@/app/i18n.js';

/**
 * DataTable: a glassmorphism, accessible table with built-in loading/empty/error states.
 *
 * Props:
 * - columns: [{ id, header, cell?(row, idx), align?, className?, headerClassName? }]
 * - rows: array of records
 * - rowKey: (row, idx) => key
 * - isLoading, isError, error, onRetry
 * - empty: { title, description, icon, action }
 * - footer: ReactNode (e.g. <Pagination />)
 * - onRowClick: (row) => void
 * - className
 */
export function DataTable({
  columns = [],
  rows = [],
  rowKey,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  empty,
  footer,
  onRowClick,
  className
}) {
  const { t } = useTranslation();
  const totalCols = columns.length || 1;

  return (
    <GlassPanel className={cn('overflow-hidden', className)}>
      {/* Desktop Table View */}
      <div className="hidden lg:block scrollbar-glass max-w-full overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 text-[11px] uppercase tracking-[0.18em] text-ink-400">
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    'whitespace-nowrap px-4 py-3 font-medium',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={totalCols} className="px-4 py-8">
                  <LoadingState label={t('common.loadingData')} className="border-0 bg-transparent" />
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td colSpan={totalCols} className="px-4 py-8">
                  <ErrorState
                    title={t('common.couldNotLoadData')}
                    description={error?.message || t('common.tryAgain')}
                    onRetry={onRetry}
                    className="border-0 bg-transparent"
                  />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="px-4 py-8">
                  <EmptyState
                    title={empty?.title || t('common.nothingToShow')}
                    description={empty?.description}
                    icon={empty?.icon}
                    action={empty?.action}
                    className="border-0 bg-transparent"
                  />
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={rowKey ? rowKey(row, index) : row.id ?? index}
                  className={cn(
                    'border-b border-white/5 transition last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-white/[0.04]',
                    onRowClick && 'hover:bg-white/[0.04]'
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        'px-4 py-3 align-middle text-ink-100',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.id === 'actions' && 'datatable-actions-cell',
                        col.className
                      )}
                    >
                      {col.id === 'actions' ? (
                        <ActionCellContext.Provider value={true}>
                          {col.cell ? col.cell(row, index) : row[col.id] ?? ''}
                        </ActionCellContext.Provider>
                      ) : (
                        col.cell ? col.cell(row, index) : row[col.id] ?? ''
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
 
      {/* iPad & Mobile Card Grid View */}
      <div className="lg:hidden p-4">
        {isLoading ? (
          <LoadingState label={t('common.loadingData')} className="border-0 bg-transparent py-8" />
        ) : isError ? (
          <ErrorState
            title={t('common.couldNotLoadData')}
            description={error?.message || t('common.tryAgain')}
            onRetry={onRetry}
            className="border-0 bg-transparent py-8"
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={empty?.title || t('common.nothingToShow')}
            description={empty?.description}
            icon={empty?.icon}
            action={empty?.action}
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map((row, index) => (
              <div
                key={rowKey ? rowKey(row, index) : row.id ?? index}
                className={cn(
                  'rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3 transition',
                  onRowClick && 'cursor-pointer hover:border-white/20 hover:bg-white/[0.04]'
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => {
                  const cellVal = col.cell ? col.cell(row, index) : row[col.id] ?? '';
                  if (col.id === 'actions') {
                    if (!cellVal) return null;
                    return (
                      <ActionCellContext.Provider key={col.id} value={true}>
                        <div
                          className="datatable-actions-cell flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-white/5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {cellVal}
                        </div>
                      </ActionCellContext.Provider>
                    );
                  }
                  if (!col.header && col.id !== 'actions') return null;
 
                  return (
                    <div key={col.id} className="flex items-start justify-between gap-3 text-xs">
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                        {col.header}
                      </span>
                      <div
                        className={cn(
                          'text-ink-100 font-medium text-right min-w-0 max-w-[70%]',
                          col.className
                        )}
                      >
                        {cellVal}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      {footer}
    </GlassPanel>
  );
}
