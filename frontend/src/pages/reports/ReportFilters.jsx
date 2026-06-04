import { Search } from 'lucide-react';
import { Input, Select } from '@/components/ui/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import {
  COMMISSION_STATUS_OPTIONS,
  DEBT_STATUS_OPTIONS,
  DISPATCH_STATUS_OPTIONS,
  ITEM_TYPE_OPTIONS,
  MOVEMENT_TYPE_OPTIONS,
  PO_STATUS_OPTIONS,
  REFERENCE_TYPE_OPTIONS
} from './reports.config.js';
import {
  useReportCustomers,
  useReportItems,
  useReportLocations,
  useReportSalesmen,
  useReportSublocations,
  useReportSuppliers,
  useReportVariants,
  useReportWarehouses
} from './useReportsOptions.js';

const INVENTORY_VIEW = 'inventory.view';
const CUSTOMERS_VIEW = 'customers.view';
const SALESMEN_MANAGE = 'salesmen.manage';
const LOCATIONS_MANAGE = 'locations.manage';
const PURCHASE_ORDERS_VIEW = 'purchase_orders.view';

function PickerOrId({
  enabled,
  optionsQuery,
  rowsKey,
  labelField = 'name',
  label,
  placeholder = '',
  numericLabel,
  numericDescription = 'Numeric only.',
  value,
  onChange
}) {
  if (enabled) {
    const options = optionsQuery?.data?.data?.[rowsKey] || [];
    return (
      <Select label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder || `All ${label?.toLowerCase() || ''}`}</option>
        {options.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {typeof labelField === 'function'
              ? labelField(entry)
              : entry[labelField] || `#${entry.id}`}
          </option>
        ))}
      </Select>
    );
  }
  return (
    <Input
      label={numericLabel || `${label} ID`}
      type="number"
      min="1"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      description={numericDescription}
    />
  );
}

/**
 * Renders the filter controls for the active report based on the keys
 * declared in REPORTS_REGISTRY[reportKey].filters.
 */
export function ReportFilters({ filters, values, onChange }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canPickInventory = hasPermission(INVENTORY_VIEW);
  const canPickCustomers = hasPermission(CUSTOMERS_VIEW);
  const canPickSalesmen = hasPermission(SALESMEN_MANAGE);
  const canPickLocations = hasPermission(LOCATIONS_MANAGE);
  const canPickSuppliers = hasPermission(PURCHASE_ORDERS_VIEW);

  const needsWarehouses = filters.includes('warehouse');
  const needsItems = filters.includes('item');
  const needsVariants = filters.includes('item_variant');
  const needsCustomers = filters.includes('customer');
  const needsSalesmen = filters.includes('salesman');
  const needsLocations = filters.includes('location');
  const needsSublocations = filters.includes('sublocation');
  const needsSuppliers = filters.includes('supplier');

  const warehousesQuery = useReportWarehouses(canPickInventory && needsWarehouses);
  const itemsQuery = useReportItems(canPickInventory && needsItems);
  const variantsQuery = useReportVariants(canPickInventory && needsVariants);
  const customersQuery = useReportCustomers(canPickCustomers && needsCustomers);
  const salesmenQuery = useReportSalesmen(canPickSalesmen && needsSalesmen);
  const locationsQuery = useReportLocations(canPickLocations && needsLocations);
  const sublocationsQuery = useReportSublocations(canPickLocations && needsSublocations);
  const suppliersQuery = useReportSuppliers(canPickSuppliers && needsSuppliers);

  const set = (key) => (next) => onChange({ ...values, [key]: next });

  const hasSearch = filters.includes('search');
  const otherFilters = filters.filter((key) => key !== 'search');

  return (
    <div className="space-y-3">
      {hasSearch && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input
            containerClassName="xl:col-span-2"
            leftIcon={Search}
            placeholder="Search"
            aria-label="Search report rows"
            value={values.search || ''}
            onChange={(event) => set('search')(event.target.value)}
          />
        </div>
      )}

      {otherFilters.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {otherFilters.map((key) => {
            switch (key) {
              case 'warehouse':
                return (
                  <PickerOrId
                    key={key}
                    enabled={canPickInventory}
                    optionsQuery={warehousesQuery}
                    rowsKey="warehouses"
                    labelField="name"
                    label="Warehouse"
                    placeholder="All warehouses"
                    value={values.warehouse_id || ''}
                    onChange={set('warehouse_id')}
                  />
                );
              case 'item':
                return (
                  <PickerOrId
                    key={key}
                    enabled={canPickInventory}
                    optionsQuery={itemsQuery}
                    rowsKey="items"
                    labelField="name"
                    label="Item"
                    placeholder="All items"
                    value={values.item_id || ''}
                    onChange={set('item_id')}
                  />
                );
              case 'item_variant':
                return (
                  <PickerOrId
                    key={key}
                    enabled={canPickInventory}
                    optionsQuery={variantsQuery}
                    rowsKey="item_variants"
                    labelField={(entry) =>
                      `${entry.item_name || ''}${
                        entry.variant_name ? ` - ${entry.variant_name}` : ''
                      }`
                    }
                    label="Variant"
                    placeholder="All variants"
                    value={values.item_variant_id || ''}
                    onChange={set('item_variant_id')}
                  />
                );
              case 'customer':
                return (
                  <PickerOrId
                    key={key}
                    enabled={canPickCustomers}
                    optionsQuery={customersQuery}
                    rowsKey="customers"
                    labelField="name"
                    label="Customer"
                    placeholder="All customers"
                    value={values.customer_id || ''}
                    onChange={set('customer_id')}
                  />
                );
              case 'salesman':
                return (
                  <PickerOrId
                    key={key}
                    enabled={canPickSalesmen}
                    optionsQuery={salesmenQuery}
                    rowsKey="salesmen"
                    labelField="full_name"
                    label="Salesman"
                    placeholder="All salesmen"
                    value={values.salesman_id || ''}
                    onChange={set('salesman_id')}
                  />
                );
              case 'location':
                return (
                  <PickerOrId
                    key={key}
                    enabled={canPickLocations}
                    optionsQuery={locationsQuery}
                    rowsKey="locations"
                    labelField="name"
                    label="Location"
                    placeholder="All locations"
                    value={values.location_id || ''}
                    onChange={set('location_id')}
                  />
                );
              case 'sublocation':
                return (
                  <PickerOrId
                    key={key}
                    enabled={canPickLocations}
                    optionsQuery={sublocationsQuery}
                    rowsKey="sublocations"
                    labelField="name"
                    label="Sublocation"
                    placeholder="All sublocations"
                    value={values.sublocation_id || ''}
                    onChange={set('sublocation_id')}
                  />
                );
              case 'supplier':
                return (
                  <PickerOrId
                    key={key}
                    enabled={canPickSuppliers}
                    optionsQuery={suppliersQuery}
                    rowsKey="suppliers"
                    labelField="name"
                    label="Supplier"
                    placeholder="All suppliers"
                    value={values.supplier_id || ''}
                    onChange={set('supplier_id')}
                  />
                );
              case 'item_type':
                return (
                  <Select
                    key={key}
                    label="Item type"
                    value={values.item_type || ''}
                    onChange={(event) => set('item_type')(event.target.value)}
                  >
                    {ITEM_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                );
              case 'movement_type':
                return (
                  <Select
                    key={key}
                    label="Movement type"
                    value={values.movement_type || ''}
                    onChange={(event) => set('movement_type')(event.target.value)}
                  >
                    {MOVEMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                );
              case 'reference_type':
                return (
                  <Select
                    key={key}
                    label="Reference type"
                    value={values.reference_type || ''}
                    onChange={(event) => set('reference_type')(event.target.value)}
                  >
                    {REFERENCE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                );
              case 'dispatch_status':
                return (
                  <Select
                    key={key}
                    label="Status"
                    value={values.status || ''}
                    onChange={(event) => set('status')(event.target.value)}
                  >
                    {DISPATCH_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                );
              case 'debt_status':
                return (
                  <Select
                    key={key}
                    label="Status"
                    value={values.status || ''}
                    onChange={(event) => set('status')(event.target.value)}
                  >
                    {DEBT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                );
              case 'po_status':
                return (
                  <Select
                    key={key}
                    label="Status"
                    value={values.status || ''}
                    onChange={(event) => set('status')(event.target.value)}
                  >
                    {PO_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                );
              case 'commission_status':
                return (
                  <Select
                    key={key}
                    label="Status"
                    value={values.status || ''}
                    onChange={(event) => set('status')(event.target.value)}
                  >
                    {COMMISSION_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                );
              case 'date_from':
                return (
                  <Input
                    key={key}
                    label="From"
                    type="date"
                    value={values.date_from || ''}
                    onChange={(event) => set('date_from')(event.target.value)}
                  />
                );
              case 'date_to':
                return (
                  <Input
                    key={key}
                    label="To"
                    type="date"
                    value={values.date_to || ''}
                    onChange={(event) => set('date_to')(event.target.value)}
                  />
                );
              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
}
