import { SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import {
  Badge,
  Button,
  DataTable,
  Input,
  Pagination,
  Select
} from '@/components/ui/index.js';
import { formatDate, formatNumber } from '@/lib/formatters.js';
import {
  ACCOUNTING_PERMISSIONS,
  FINANCIAL_DIRECTIONS
} from './accounting.config.js';
import { useCashAccountsList } from './useAccountingOptions.js';

const TRANSACTION_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'sale_collection', label: 'Sale collection' },
  { value: 'customer_debt_payment', label: 'Customer debt payment' },
  { value: 'expense', label: 'Expense' },
  { value: 'commission_payment', label: 'Commission payment' },
  { value: 'supplier_payment', label: 'Supplier payment' },
  { value: 'opening_balance', label: 'Opening balance' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'transfer', label: 'Transfer' }
];

const REFERENCE_TYPE_OPTIONS = [
  { value: '', label: 'All references' },
  { value: 'customer_payment', label: 'Customer payment' },
  { value: 'expense', label: 'Expense' },
  { value: 'commission_payment', label: 'Commission payment' },
  { value: 'supplier_payment', label: 'Supplier payment' }
];

export default function FinancialTransactionsTab() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickOptions = hasPermission(ACCOUNTING_PERMISSIONS.view);

  const [cashAccountId, setCashAccountId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [transactionType, setTransactionType] = useState('');
  const [direction, setDirection] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const queryParams = useMemo(() => {
    const params = { page, limit };
    if (cashAccountId) params.cash_account_id = cashAccountId;
    if (transactionType) params.transaction_type = transactionType;
    if (direction) params.direction = direction;
    if (referenceType) params.reference_type = referenceType;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    return params;
  }, [cashAccountId, transactionType, direction, referenceType, dateFrom, dateTo, page, limit]);

  const listQuery = useQuery({
    queryKey: ['accounting', 'transactions', queryParams],
    queryFn: () => api.accounting.financialTransactions.list(queryParams)
  });

  const cashAccountsQuery = useCashAccountsList(canPickOptions);
  const cashAccounts = cashAccountsQuery.data?.data?.cash_accounts || [];

  const rows = listQuery.data?.data?.financial_transactions || [];
  const meta = listQuery.data?.meta || {};

  const columns = useMemo(
    () => [
      {
        id: 'created_at',
        header: 'When',
        cell: (row) => (
          <span className="text-sm text-ink-200">
            {formatDate(row.transaction_date || row.created_at)}
          </span>
        )
      },
      {
        id: 'account_name',
        header: 'Cash account',
        cell: (row) => (
          <span className="text-sm text-ink-100">{row.account_name || '-'}</span>
        )
      },
      {
        id: 'transaction_type',
        header: 'Type',
        cell: (row) => (
          <span className="text-sm text-ink-200">
            {TRANSACTION_TYPE_OPTIONS.find((entry) => entry.value === row.transaction_type)
              ?.label || row.transaction_type}
          </span>
        )
      },
      {
        id: 'direction',
        header: 'Direction',
        cell: (row) => (
          <Badge tone={row.direction === 'in' ? 'success' : 'warn'}>
            {row.direction === 'in' ? 'Money in' : 'Money out'}
          </Badge>
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
      },
      {
        id: 'reference_type',
        header: 'Reference',
        cell: (row) => (
          <span className="text-sm text-ink-200">
            {row.reference_type
              ? `${row.reference_type}#${row.reference_id || '-'}`
              : '-'}
          </span>
        )
      },
      {
        id: 'description',
        header: 'Description',
        cell: (row) => (
          <span className="text-sm text-ink-300">{row.description || '-'}</span>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {canPickOptions ? (
          <Select
            value={cashAccountId}
            onChange={(event) => {
              setCashAccountId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All cash accounts</option>
            {cashAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name || `Account #${account.id}`}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="Cash account ID"
            type="number"
            min="1"
            value={cashAccountId}
            onChange={(event) => {
              setCashAccountId(event.target.value);
              setPage(1);
            }}
            description="Numeric only."
          />
        )}
        <Select
          value={direction}
          onChange={(event) => {
            setDirection(event.target.value);
            setPage(1);
          }}
        >
          {FINANCIAL_DIRECTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          value={transactionType}
          onChange={(event) => {
            setTransactionType(event.target.value);
            setPage(1);
          }}
        >
          {TRANSACTION_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          value={referenceType}
          onChange={(event) => {
            setReferenceType(event.target.value);
            setPage(1);
          }}
        >
          {REFERENCE_TYPE_OPTIONS.map((option) => (
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

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading={listQuery.isPending}
        isError={listQuery.isError}
        error={listQuery.error}
        onRetry={() => listQuery.refetch()}
        empty={{
          title: 'No financial transactions match the filters',
          description:
            'Transactions are recorded automatically when payments, expenses, and supplier payments touch a cash account.'
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
    </div>
  );
}
