import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Search , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import {
  Badge,
  Button,
  DataTable,
  Input,
  PageHeader,
  Pagination
} from '@/components/ui/index.js';
import { formatDateTime } from '@/lib/formatters.js';
import { AuditLogModal } from './AuditLogModal.jsx';

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [moduleFilter, setModule] = useState('');
  const [actionFilter, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [openLogId, setOpenLogId] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedModule = useDebouncedValue(moduleFilter, 300);
  const debouncedAction = useDebouncedValue(actionFilter, 300);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (debouncedModule) params.module = debouncedModule;
    if (debouncedAction) params.action = debouncedAction;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [debouncedSearch, debouncedModule, debouncedAction, dateFrom, dateTo, page, limit]);

  const logsQuery = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => api.auditLogs.list(queryParams)
  });

  const rows = logsQuery.data?.data?.audit_logs || [];
  const meta = logsQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'created_at',
        header: 'When',
        cell: (row) => (
          <span className="whitespace-nowrap text-xs text-ink-200">
            {formatDateTime(row.created_at)}
          </span>
        )
      },
      {
        id: 'module',
        header: 'Module / Action',
        cell: (row) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="brand">{row.module || 'unknown'}</Badge>
            <Badge tone="info">{row.action || 'unknown'}</Badge>
          </div>
        )
      },
      {
        id: 'user',
        header: 'User',
        cell: (row) => (
          <span className="text-sm text-ink-100">
            {row.user_name || (row.user_id ? `#${row.user_id}` : 'system')}
          </span>
        )
      },
      {
        id: 'record',
        header: 'Record',
        cell: (row) =>
          row.record_id ? (
            <span className="font-mono text-xs text-ink-200">
              {row.table_name || 'record'} #{row.record_id}
            </span>
          ) : (
            <span className="text-xs text-ink-400">-</span>
          )
      },
      {
        id: 'description',
        header: 'Description',
        cell: (row) => (
          <span className="line-clamp-2 text-sm text-ink-200 text-pretty">
            {row.description ? row.description.replace(/\/api\//g, '/') : '-'}
          </span>
        )
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <Button variant="secondary" size="sm" onClick={() => setOpenLogId(row.id)}>
            View
          </Button>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Audit logs"
        description="Operational trail of who did what across the workspace."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
          
          leftIcon={Search}
          placeholder="Search description, module, action, or user"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
        </div>
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          leftIcon={SlidersHorizontal}
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0 sm:w-auto w-full"
        >
          {showFilters ? 'Hide Filters' : 'Filters'}
        </Button>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          showFilters
            ? 'max-h-[1000px] opacity-100 p-4 mt-3 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-sm overflow-visible'
            : 'max-h-0 opacity-0 p-0 border-transparent overflow-hidden'
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          <Input
          placeholder="Module"
          value={moduleFilter}
          onChange={(event) => {
            setModule(event.target.value);
            setPage(1);
          }}
        />
        <Input
          placeholder="Action"
          value={actionFilter}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
            label="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
            label="To"
          />
        </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={logsQuery.isPending}
        isError={logsQuery.isError}
        error={logsQuery.error}
        onRetry={() => logsQuery.refetch()}
        empty={{
          icon: ScrollText,
          title: 'No audit entries found',
          description: 'Try widening the date range or clearing filters.'
        }}
        footer={
          meta?.totalPages ? (
            <Pagination
              page={meta.page || page}
              totalPages={meta.totalPages || 1}
              total={meta.total}
              limit={meta.limit || limit}
              onChange={(nextPage) => setPage(nextPage)}
            />
          ) : null
        }
      />

      <AuditLogModal
        open={Boolean(openLogId)}
        onClose={() => setOpenLogId(null)}
        logId={openLogId}
      />
    </div>
  );
}
