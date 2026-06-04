import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  LoadingState
} from '@/components/ui/index.js';
import { formatDateTime } from '@/lib/formatters.js';
import { getErrorMessage } from '@/lib/errors.js';

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <span className="break-words text-sm text-ink-100">{value || '-'}</span>
    </div>
  );
}

export function LocationDrawer({ open, onClose, locationId }) {
  const detailQuery = useQuery({
    queryKey: ['locations', 'location', locationId],
    queryFn: () => api.locations.locations.get(locationId),
    enabled: Boolean(open && locationId)
  });

  const sublocationsQuery = useQuery({
    queryKey: ['locations', 'location-sublocations', locationId],
    queryFn: () => api.locations.locations.sublocations(locationId, { page: 1, limit: 100 }),
    enabled: Boolean(open && locationId)
  });

  const location = detailQuery.data?.data?.location;
  const sublocations = sublocationsQuery.data?.data?.sublocations || [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={location ? location.name : 'Location'}
      description={location ? `Created ${formatDateTime(location.created_at)}` : undefined}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detailQuery.isPending ? (
        <LoadingState label="Loading location..." />
      ) : detailQuery.isError ? (
        <ErrorState
          title="Could not load location"
          description={getErrorMessage(detailQuery.error)}
          onRetry={() => detailQuery.refetch()}
        />
      ) : !location ? (
        <EmptyState title="Location not found" />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={location.status === 'active' ? 'success' : 'neutral'}>
              {location.status}
            </Badge>
            {location.code ? <Badge tone="info">{location.code}</Badge> : null}
          </div>
          <section className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" value={location.name} />
            <Field label="Code" value={location.code} />
            <Field label="Status" value={location.status} />
            <Field
              label="Updated"
              value={location.updated_at ? formatDateTime(location.updated_at) : null}
            />
          </section>
          {location.description && (
            <section>
              <h3 className="font-display text-sm font-semibold text-ink-50">Description</h3>
              <p className="mt-1 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-ink-200 text-pretty">
                {location.description}
              </p>
            </section>
          )}
          <section>
            <h3 className="font-display text-sm font-semibold text-ink-50">Sublocations</h3>
            {sublocationsQuery.isPending ? (
              <LoadingState className="mt-2" label="Loading sublocations..." />
            ) : sublocationsQuery.isError ? (
              <ErrorState
                className="mt-2"
                title="Could not load sublocations"
                description={getErrorMessage(sublocationsQuery.error)}
                onRetry={() => sublocationsQuery.refetch()}
              />
            ) : sublocations.length === 0 ? (
              <EmptyState
                className="mt-2"
                title="No sublocations yet"
                description="Add sublocations under this location to start assigning salesmen and targets."
              />
            ) : (
              <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
                {sublocations.map((sublocation) => (
                  <li
                    key={sublocation.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-50">{sublocation.name}</p>
                        {sublocation.code ? (
                          <p className="truncate font-mono text-xs text-ink-400">
                            {sublocation.code}
                          </p>
                        ) : null}
                      </div>
                      <Badge tone={sublocation.status === 'active' ? 'success' : 'neutral'}>
                        {sublocation.status}
                      </Badge>
                    </div>
                    {sublocation.description && (
                      <p className="mt-1 text-xs text-ink-300 text-pretty">
                        {sublocation.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}
