import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ShieldAlert, Trash2, Users , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { useDebouncedValue } from '@/lib/useDebouncedValue.js';
import { getErrorMessage } from '@/lib/errors.js';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  GlassPanel,
  GlassPanelBody,
  Input,
  PageHeader,
  Pagination,
  Select
} from '@/components/ui/index.js';
import {
  useLocationsList,
  useSalesmenList,
  useSublocationsList
} from '@/pages/locations/useLocationsOptions.js';
import { LOCATIONS_PERMISSIONS } from '@/pages/locations/locations.config.js';
import {
  CUSTOMERS_PERMISSIONS,
  CUSTOMER_STATUSES,
  CUSTOMER_STATUS_FILTER_OPTIONS,
  getCustomerStatusTone
} from './customers.config.js';
import { CustomerFormModal } from './CustomerFormModal.jsx';
import { CustomerDrawer } from './CustomerDrawer.jsx';

function StatusBadge({ status }) {
  const tone = getCustomerStatusTone(status);
  const label =
    CUSTOMER_STATUSES.find((entry) => entry.value === status)?.label || status;
  return <Badge tone={tone}>{label}</Badge>;
}

export default function CustomersPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canView = hasPermission(CUSTOMERS_PERMISSIONS.view);
  const canCreate = hasPermission(CUSTOMERS_PERMISSIONS.create);
  const canUpdate = hasPermission(CUSTOMERS_PERMISSIONS.update);
  const canDelete = hasPermission(CUSTOMERS_PERMISSIONS.delete);
  const canPickLocations = hasPermission(LOCATIONS_PERMISSIONS.locations);
  const canPickSalesmen = hasPermission(LOCATIONS_PERMISSIONS.salesmen);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [status, setStatus] = useState('');
  const [locationId, setLocationId] = useState('');
  const [sublocationId, setSublocationId] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [openCustomerId, setOpenCustomerId] = useState(null);

  const debouncedSearch = useDebouncedValue(search, 300);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (status) params.status = status;
    if (locationId) params.location_id = locationId;
    if (sublocationId) params.sublocation_id = sublocationId;
    if (salesmanId) params.salesman_id = salesmanId;
    return params;
  }, [debouncedSearch, status, locationId, sublocationId, salesmanId, page, limit]);

  // GET /customers requires customers.view; do not call it for users that
  // only have create/update/delete.
  const listQuery = useQuery({
    queryKey: ['customers', 'list', queryParams],
    queryFn: () => api.customers.list(queryParams),
    enabled: canView
  });

  // The same picker queries hit inventory.view-class endpoints that are
  // already gated by their own permissions. We additionally require
  // customers.view here so a creator-only operator does not pull catalog
  // data they would not see anywhere else on this page.
  const locationsQuery = useLocationsList(canView && canPickLocations);
  const sublocationsQuery = useSublocationsList(canView && canPickLocations);
  const salesmenQuery = useSalesmenList(canView && canPickSalesmen);

  const locations = locationsQuery.data?.data?.locations || [];
  const sublocationsAll = sublocationsQuery.data?.data?.sublocations || [];
  const sublocations = locationId
    ? sublocationsAll.filter(
        (sublocation) => String(sublocation.location_id) === String(locationId)
      )
    : sublocationsAll;
  const salesmen = salesmenQuery.data?.data?.salesmen || [];

  const deleteMutation = useMutation({
    mutationFn: (id) => api.customers.remove(id),
    onSuccess: () => {
      toast.success('Customer deactivated');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not deactivate customer.'))
  });

  const rows = listQuery.data?.data?.customers || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'name',
        header: 'Customer',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink-50">{row.name}</p>
            <p className="truncate font-mono text-xs text-ink-400">
              {row.customer_code || row.phone || '-'}
            </p>
          </div>
        )
      },
      {
        id: 'location',
        header: 'Location',
        cell: (row) => (
          <div className="min-w-0">
            <p className="truncate text-sm text-ink-200">{row.location_name || '-'}</p>
            <p className="truncate text-xs text-ink-400">{row.sublocation_name || ''}</p>
          </div>
        )
      },
      {
        id: 'assigned_salesman_name',
        header: 'Salesman',
        cell: (row) => (
          <span className="text-sm text-ink-200">{row.assigned_salesman_name || '-'}</span>
        )
      },
      {
        id: 'phone',
        header: 'Phone',
        cell: (row) => (
          <span className="font-mono text-xs text-ink-200">
            {row.phone || row.secondary_phone || '-'}
          </span>
        )
      },
      {
        id: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.status} />
      },
      {
        id: 'actions',
        header: '',
        align: 'right',
        cell: (row) => (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpenCustomerId(row.id)}>
              View
            </Button>
            {canUpdate && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                Edit
              </Button>
            )}
            {canDelete && row.status === 'active' && (
              <Button
                variant="ghost"
                size="icon"
                leftIcon={Trash2}
                aria-label={`Deactivate ${row.name}`}
                onClick={() => setDeleteTarget(row)}
              />
            )}
          </div>
        )
      }
    ],
    [canDelete, canUpdate]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales and Customers"
        title="Customers"
        description={
          canView
            ? 'Customer directory with location, salesman, and history. Open a customer to review their receipts, debts, and payments.'
            : 'You can add new customers here. Browsing the directory or opening a customer for history requires the view permission.'
        }
        actions={
          <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>
            New customer
          </Button>
        }
      />

      {!canView ? (
        <GlassPanel>
          <GlassPanelBody>
            <EmptyState
              icon={ShieldAlert}
              title="Customer browsing is restricted"
              description={
                canCreate
                  ? 'Use New customer above to add a customer. Ask an administrator for the customers.view permission to browse, edit, or remove existing customers.'
                  : 'Ask an administrator for the customers.view permission to browse the directory.'
              }
            />
          </GlassPanelBody>
        </GlassPanel>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Input
              containerClassName="xl:col-span-2"
              leftIcon={Search}
              placeholder="Search by name, code, phone, or address"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              {CUSTOMER_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end">
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
          {canPickLocations ? (
              <Select
                value={locationId}
                onChange={(event) => {
                  setLocationId(event.target.value);
                  setSublocationId('');
                  setPage(1);
                }}
              >
                <option value="">All locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Location ID"
                type="number"
                min="1"
                value={locationId}
                onChange={(event) => {
                  setLocationId(event.target.value);
                  setPage(1);
                }}
                description="Numeric only."
              />
            )}
            {canPickLocations ? (
              <Select
                value={sublocationId}
                onChange={(event) => {
                  setSublocationId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All sublocations</option>
                {sublocations.map((sublocation) => (
                  <option key={sublocation.id} value={sublocation.id}>
                    {sublocation.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Sublocation ID"
                type="number"
                min="1"
                value={sublocationId}
                onChange={(event) => {
                  setSublocationId(event.target.value);
                  setPage(1);
                }}
                description="Numeric only."
              />
            )}
            {canPickSalesmen ? (
              <Select
                value={salesmanId}
                onChange={(event) => {
                  setSalesmanId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All salesmen</option>
                {salesmen.map((salesman) => (
                  <option key={salesman.id} value={salesman.id}>
                    {salesman.full_name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                label="Salesman ID"
                type="number"
                min="1"
                value={salesmanId}
                onChange={(event) => {
                  setSalesmanId(event.target.value);
                  setPage(1);
                }}
                description="Numeric only."
              />
            )}
        </div>
      </div>

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            isLoading={listQuery.isPending}
            isError={listQuery.isError}
            error={listQuery.error}
            onRetry={() => listQuery.refetch()}
            empty={{
              icon: Users,
              title: 'No customers match the filters',
              description: canCreate
                ? 'Adjust your filters or add a new customer to start serving them.'
                : 'Adjust your filters to find existing customers.'
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
        </>
      )}

      <CustomerFormModal open={creating} onClose={() => setCreating(false)} />
      <CustomerFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        customer={editing || undefined}
      />
      {/* The detail drawer hits GET /customers/:id which requires customers.view.
          Mount it only when the user has that permission. */}
      {canView && (
        <CustomerDrawer
          open={Boolean(openCustomerId)}
          onClose={() => setOpenCustomerId(null)}
          customerId={openCustomerId}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Deactivate customer"
        description={
          deleteTarget
            ? `Set ${deleteTarget.name} to inactive? Customers with dispatch, payment, or debt history are protected and stay active.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
