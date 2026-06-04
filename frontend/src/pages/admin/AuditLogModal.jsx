import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { Modal } from '@/components/ui/Modal.jsx';
import { Badge } from '@/components/ui/Badge.jsx';
import { Button } from '@/components/ui/Button.jsx';
import { LoadingState, ErrorState } from '@/components/ui/StateViews.jsx';
import { formatDateTime } from '@/lib/formatters.js';
import { getErrorMessage } from '@/lib/errors.js';

function tryParseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseUserAgent(ua) {
  if (!ua) return '-';
  
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  // Detect OS
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows NT 6.2')) os = 'Windows 8';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Macintosh') && ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    os = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    const match = ua.match(/OS (\d+_\d+)/);
    os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
  } else if (ua.includes('Android')) {
    const match = ua.match(/Android (\d+\.?\d*)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (ua.includes('Linux')) os = 'Linux';

  // Detect Browser
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/(\d+)/);
    browser = match ? `Edge ${match[1]}` : 'Edge';
  } else if (ua.includes('Chrome/') || ua.includes('CriOS/')) {
    const match = ua.match(/(?:Chrome|CriOS)\/(\d+)/);
    browser = match ? `Chrome ${match[1]}` : 'Chrome';
  } else if (ua.includes('Firefox/') || ua.includes('FxiOS/')) {
    const match = ua.match(/(?:Firefox|FxiOS)\/(\d+)/);
    browser = match ? `Firefox ${match[1]}` : 'Firefox';
  } else if (ua.includes('Safari/') && ua.includes('Version/')) {
    const match = ua.match(/Version\/(\d+)/);
    browser = match ? `Safari ${match[1]}` : 'Safari';
  } else if (ua.includes('MSIE') || ua.includes('Trident/')) {
    browser = 'Internet Explorer';
  }

  return `${browser} on ${os}`;
}

function formatReadableData(data) {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return String(data);
  
  if (Array.isArray(data)) {
    return data.map(item => formatReadableData(item)).join(', ');
  }

  const rows = [];
  
  function recurse(obj, prefix = '') {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        const displayKey = prefix ? `${prefix} ➔ ${key}` : key;
        
        if (val && typeof val === 'object' && Object.keys(val).length === 0) {
          continue;
        }
        
        if (val && typeof val === 'object') {
          recurse(val, displayKey);
        } else {
          rows.push({
            key: displayKey,
            value: val === true ? 'Yes' : val === false ? 'No' : String(val ?? '-')
          });
        }
      }
    }
  }

  recurse(data);
  return rows;
}

function ReadableDataBlock({ label, value }) {
  const parsed = tryParseJson(value);
  if (parsed === null || parsed === undefined) return null;

  const rows = formatReadableData(parsed);

  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <section className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
          {label}
        </p>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200">
          {String(parsed)}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </p>
      <div className="overflow-hidden rounded-xl border border-white/5 bg-ink-950/20 backdrop-blur">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-[10px] font-bold uppercase tracking-wider text-ink-400">
              <th className="px-4 py-2">Field</th>
              <th className="px-4 py-2">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                <td className="px-4 py-2.5 font-medium text-ink-300 capitalize">
                  {row.key.replace(/^body ➔ /, '').replace(/_/g, ' ')}
                </td>
                <td className="px-4 py-2.5 font-mono text-ink-100 text-pretty">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span className="break-all text-sm text-ink-100">{value || '-'}</span>
    </div>
  );
}

export function AuditLogModal({ open, onClose, logId }) {
  const detailQuery = useQuery({
    queryKey: ['audit-log', logId],
    queryFn: () => api.auditLogs.get(logId),
    enabled: Boolean(open && logId)
  });

  const log = detailQuery.data?.data?.audit_log;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Audit log entry"
      description={log ? `${log.module || 'unknown'} / ${log.action || 'unknown'}` : undefined}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detailQuery.isPending ? (
        <LoadingState label="Loading audit entry..." />
      ) : detailQuery.isError ? (
        <ErrorState
          title="Could not load audit entry"
          description={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      ) : !log ? (
        <p className="text-sm text-ink-300">No data.</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{log.module || 'unknown'}</Badge>
            <Badge tone="info">{log.action || 'unknown'}</Badge>
            {log.table_name ? <Badge tone="neutral">{log.table_name}</Badge> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Logged at" value={formatDateTime(log.created_at)} />
            <Field
              label="User"
              value={log.user_name || (log.user_id ? `#${log.user_id}` : 'system')}
            />
            <Field
              label="Record"
              value={
                log.record_id
                  ? `${log.table_name || 'record'} #${log.record_id}`
                  : '-'
              }
            />
            <Field label="IP address" value={log.ip_address} />
            <div className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                User agent
              </span>
              <span className="text-sm font-medium text-ink-100" title={log.user_agent}>
                {parseUserAgent(log.user_agent)}
              </span>
              <span className="text-[10px] text-ink-400 leading-relaxed text-balance">
                {log.user_agent}
              </span>
            </div>
          </div>
          {log.description && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-100 font-mono">
              {log.description.replace(/\/api\//g, '/')}
            </div>
          )}
          <ReadableDataBlock label="Old values" value={log.old_values} />
          <ReadableDataBlock label="New values" value={log.new_values} />
        </div>
      )}
    </Modal>
  );
}
