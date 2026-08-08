import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, UserPlus } from 'lucide-react';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { Button, EmptyState, GlassPanel, GlassPanelBody, PageHeader } from '@/components/ui/index.js';
import { PosCustomerModal } from './PosCustomerModal.jsx';
import { PosRegisterTab } from './PosRegisterTab.jsx';
import { SalesmanOrdersTab } from './SalesmanOrdersTab.jsx';
import { POS_PERMISSIONS } from './pos.constants.js';
import { positiveIntegerId } from './pos.utils.js';

export default function PosPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editDispatchId = searchParams.get('edit_dispatch_id');
  const showOrders = searchParams.get('view') === 'orders' && !editDispatchId;

  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canCreateOwn = hasPermission(POS_PERMISSIONS.createOwn);
  const canCreateForSalesman = hasPermission(POS_PERMISSIONS.createForSalesman);
  // The dispatch capability endpoint remains authoritative for the final
  // write. POS users must still load their own selected draft here; otherwise
  // Edit order opens a blank register and risks creating a duplicate draft.
  const canEditDispatch = Boolean(editDispatchId) && (
    hasPermission('dispatch.create')
    || hasPermission(POS_PERMISSIONS.createOwn)
    || hasPermission(POS_PERMISSIONS.createForSalesman)
  );

  // dispatch.create opens this surface only after clicking Edit order on an
  // existing draft; it does not grant general POS checkout creation.
  const canRegister = canCreateOwn || canCreateForSalesman || canEditDispatch;
  const canCreateCustomers = hasPermission(POS_PERMISSIONS.createCustomers);
  const canRequestGifts = hasPermission(POS_PERMISSIONS.requestGifts);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [selectedSalesmanId, setSelectedSalesmanId] = useState('');
  const numericSelectedSalesmanId = positiveIntegerId(selectedSalesmanId);

  const editDispatchQuery = useQuery({
    queryKey: ['dispatch', 'request', editDispatchId],
    queryFn: () => api.dispatch.requests.get(editDispatchId),
    enabled: Boolean(canEditDispatch && editDispatchId)
  });

  const editingDispatch = editDispatchQuery.data?.data?.dispatch_request || null;

  const warehousesQuery = useQuery({
    queryKey: ['pos', 'warehouses'],
    queryFn: () => api.pos.warehouses.list(),
    enabled: canRegister,
    staleTime: 60_000
  });
  const territoriesQuery = useQuery({
    queryKey: ['pos', 'territories', selectedSalesmanId || 'self'],
    queryFn: () => api.pos.territories.list(
      numericSelectedSalesmanId ? { salesman_id: numericSelectedSalesmanId } : undefined
    ),
    enabled: canRegister && canCreateCustomers,
    staleTime: 60_000
  });

  const warehouses = warehousesQuery.data?.data?.warehouses || [];
  const defaultWarehouseId = warehouses[0]?.id;
  const territories = territoriesQuery.data?.data?.territories || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sales workflow"
        title="POS Terminal"
        description={showOrders
          ? 'Review your assigned orders and continue editing eligible orders in Mini POS.'
          : 'Use the register to create editable draft orders. Each checkout opens in Orders & deliveries immediately.'}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setSearchParams(showOrders ? {} : { view: 'orders' })}
            >
              {showOrders ? 'New order' : 'My orders'}
            </Button>
            {!showOrders && canRegister && canCreateCustomers && (
              <Button variant="secondary" leftIcon={UserPlus} onClick={() => setCustomerModalOpen(true)}>
                New POS customer
              </Button>
            )}
          </div>
        )}
      />

      {showOrders ? (
        <SalesmanOrdersTab initialSalesmanId={searchParams.get('salesman_id')} />
      ) : canRegister ? (
        <PosRegisterTab
          warehouses={warehouses}
          defaultWarehouseId={defaultWarehouseId}
          canRequestGifts={canRequestGifts}
          canCreateCustomers={canCreateCustomers}
          onCreateCustomer={() => setCustomerModalOpen(true)}
          onSalesmanChange={setSelectedSalesmanId}
          onOrderSuccess={() => {
            setSearchParams({});
            navigate('/dispatch/requests');
          }}
          editingDispatch={editingDispatch}
          isEditing={Boolean(editDispatchId)}
          onCancelEdit={() => setSearchParams({})}
        />
      ) : (
        <GlassPanel>
          <GlassPanelBody>
            <EmptyState
              icon={ShoppingBag}
              title="Mini POS access is restricted"
              description="Ask an administrator for the appropriate POS order-entry permission."
            />
          </GlassPanelBody>
        </GlassPanel>
      )}

      {canRegister && canCreateCustomers && (
        <PosCustomerModal
          open={customerModalOpen}
          onClose={() => setCustomerModalOpen(false)}
          territories={territories}
          salesmanId={selectedSalesmanId}
        />
      )}
    </div>
  );
}
