/**
 * Dataset definitions and query shaping for the directory exports. Export
 * endpoints deliberately do not accept pagination; they receive only the
 * active filters that are meaningful for their dataset.
 */
export const CUSTOMER_EXPORT_OPTIONS = [
  {
    value: 'directory_filtered',
    dataset: 'directory',
    label: 'Directory (current filters)',
    filename: 'customers-directory.csv',
    usesFilters: true
  },
  {
    value: 'directory_all',
    dataset: 'directory',
    label: 'Directory (all customers)',
    filename: 'customers-directory-all.csv',
    usesFilters: false
  },
  {
    value: 'invoices',
    dataset: 'invoices',
    label: 'Invoices (current filters)',
    filename: 'customers-invoices.csv',
    usesFilters: true
  },
  {
    value: 'receipts',
    dataset: 'receipts',
    label: 'Receipts (current filters)',
    filename: 'customers-receipts.csv',
    usesFilters: true
  },
  {
    value: 'payments',
    dataset: 'payments',
    label: 'Payments (current filters)',
    filename: 'customers-payments.csv',
    usesFilters: true
  },
  {
    value: 'debts',
    dataset: 'debts',
    label: 'Debts (current filters)',
    filename: 'customers-debts.csv',
    usesFilters: true
  }
];

export const SALESMAN_EXPORT_OPTIONS = [
  {
    value: 'performance',
    dataset: 'performance',
    label: 'Performance (current filters)',
    filename: 'salesmen-performance.csv'
  },
  {
    value: 'orders',
    dataset: 'orders',
    label: 'Mini POS orders (current filters)',
    filename: 'salesmen-orders.csv'
  },
  {
    value: 'invoices',
    dataset: 'invoices',
    label: 'Invoices (current filters)',
    filename: 'salesmen-invoices.csv'
  },
  {
    value: 'delivered_customers',
    dataset: 'delivered_customers',
    label: 'Delivered customers (current filters)',
    filename: 'salesmen-delivered-customers.csv'
  },
  {
    value: 'revenue',
    dataset: 'revenue',
    label: 'Revenue (current filters)',
    filename: 'salesmen-revenue.csv'
  }
];

function findOption(options, value) {
  return options.find((option) => option.value === value) || options[0];
}

function copyDefined(source, fields) {
  return Object.fromEntries(
    fields
      .filter((field) => source[field] !== undefined && source[field] !== null && source[field] !== '')
      .map((field) => [field, source[field]])
  );
}

export function buildCustomerExport({ optionValue, filters = {} }) {
  const option = findOption(CUSTOMER_EXPORT_OPTIONS, optionValue);
  const params = { dataset: option.dataset };

  if (option.usesFilters) {
    Object.assign(params, copyDefined(filters, [
      'search',
      'status',
      'location_id',
      'sublocation_id',
      'salesman_id',
      'invoice_status',
      'receipt_type',
      'debt_status',
      'date_from',
      'date_to'
    ]));
  }

  return { option, params };
}

export function buildSalesmanExport({ optionValue, filters = {} }) {
  const option = findOption(SALESMAN_EXPORT_OPTIONS, optionValue);
  return {
    option,
    params: {
      dataset: option.dataset,
      ...copyDefined(filters, [
        'search',
        'salesman_id',
        'pos_status',
        'invoice_status',
        'date_from',
        'date_to'
      ]),
      ...copyDefined(
        { salesman_status: filters.salesman_status ?? filters.status },
        ['salesman_status']
      )
    }
  };
}

export function downloadBlob(blob, filename) {
  if (!blob) return false;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
