import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus , SlidersHorizontal } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import {
  PAYMENT_METHODS,
  PURCHASES_PERMISSIONS
} from './purchases.config.js';
import {
  usePurchaseOrdersOptions,
  useSuppliersOptions
} from './usePurchasesOptions.js';
import { SupplierPaymentFormModal } from './SupplierPaymentFormModal.jsx';

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Any method' },
  ...PAYMENT_METHODS
];

export default function SupplierPaymentsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canView = hasPermission(PURCHASES_PERMISSIONS.accountingView);
  const canCreate = hasPermission(PURCHASES_PERMISSIONS.accountingManage);
  const canSeePurchaseOrders = hasPermission(PURCHASES_PERMISSIONS.view);

  const [supplierId, setSupplierId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [creating, setCreating] = useState(false);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (supplierId) params.supplier_id = supplierId;
    if (purchaseOrderId) params.purchase_order_id = purchaseOrderId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [supplierId, purchaseOrderId, dateFrom, dateTo, page, limit]);

  const listQuery = useQuery({
    queryKey: ['purchases', 'payments', queryParams],
    queryFn: () => api.purchases.supplierPayments.list(queryParams),
    enabled: canView
  });

  const suppliersQuery = useSuppliersOptions(canView && canSeePurchaseOrders);
  const purchaseOrdersQuery = usePurchaseOrdersOptions(canView && canSeePurchaseOrders);

  const suppliers = suppliersQuery.data?.data?.suppliers || [];
  const purchaseOrders = purchaseOrdersQuery.data?.data?.purchase_orders || [];

  const allRows = listQuery.data?.data?.supplier_payments || [];
  // payment_method is not a backend filter; we apply it client-side on the
  // current page so the table still feels responsive without forging a
  // request the API would ignore.
  const rows = paymentMethod
    ? allRows.filter((row) => row.payment_method === paymentMethod)
    : allRows;
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'payment_date',
        header: 'Date',
        cell: (row) => (
          <span className="whitespace-nowrap text-sm text-ink-200">
            {formatDate(row.payment_date)}
          </span>
        )
      },
      {
        id: 'supplier_name',
        header: 'Supplier',
        cell: (row) => <span className="text-sm text-ink-100">{row.supplier_name || '-'}</span>
      },
      {
        id: 'po_number',
        header: 'Purchase order',
        cell: (row) => (
          <span className="text-sm text-ink-200">
            {row.po_number || '-'}
          </span>
        )
      },
      {
        id: 'payment_method',
        header: 'Method',
        cell: (row) => <Badge tone="neutral">{row.payment_method}</Badge>
      },
      {
        id: 'reference_number',
        header: 'Reference',
        cell: (row) => (
          <span className="font-mono text-xs text-ink-200">
            {row.reference_number || '-'}
          </span>
        )
      },
      {
        id: 'amount',
        header: 'Amount',
        align: 'right',
        cell: (row) => (
          <span className="font-mono text-sm text-ink-100">
            {formatNumber(row.amount, { maximumFractionDigits: 4 })}
          </span>
        )
      }
    ],
    []
  );

  if (!canView) {
    return (
      <EmptyState
        title="Permission required"
        description="The accounting.view permission is required to see supplier payments."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button leftIcon={Plus} onClick={() => setCreating(true)} disabled={!canCreate}>
          Record payment
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {canSeePurchaseOrders ? (
          <Select
            value={supplierId}
            onChange={(event) => {
              setSupplierId(event.target.value);
              setPurchaseOrderId('');
              setPage(1);
            }}
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Supplier ID"
            type="number"
            min="1"
            value={supplierId}
            onChange={(event) => {
              setSupplierId(event.target.value);
              setPage(1);
            }}
            description="Numeric only. purchase_orders.view is needed for a picker."
          />
        )}
        {canSeePurchaseOrders ? (
          <Select
            value={purchaseOrderId}
            onChange={(event) => {
              setPurchaseOrderId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All purchase orders</option>
            {purchaseOrders
              .filter(
                (order) => !supplierId || String(order.supplier_id) === String(supplierId)
              )
              .map((order) => (
                <option key={order.id} value={order.id}>
                  {order.po_number}
                  {order.supplier_name ? ` - ${order.supplier_name}` : ''}
                </option>
              ))}
          </Select>
        ) : (
          <Input
            label="Purchase order ID"
            type="number"
            min="1"
            value={purchaseOrderId}
            onChange={(event) => {
              setPurchaseOrderId(event.target.value);
              setPage(1);
            }}
            description="Numeric only."
          />
        )}
        <Select
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
        >
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
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
          <Input
            label="From"
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setPage(1);
            }}
          />
          <Input
            label="To"
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setPage(1);
            }}
          />
        </div>
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
          title: paymentMethod
            ? `No ${paymentMethod} payments on this page`
            : 'No supplier payments yet',
          description: canCreate
            ? 'Record your first payment using the action above.'
            : 'Adjust your filters or wait for a payment to be recorded.'
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

      <SupplierPaymentFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
