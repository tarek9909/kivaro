import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/index.js';
import { SalesmanWorkspaceTab } from './SalesmanWorkspaceTab.jsx';

vi.mock('@/api/index.js', () => ({
  api: {
    pos: {
      workspace: { get: vi.fn() },
      orders: { get: vi.fn() }
    }
  }
}));

function renderWorkspace(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <SalesmanWorkspaceTab {...props} />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

const workspace = {
  salesman: { id: 7, full_name: 'Maya Saleh', code: 'SAL-007' },
  metrics: {
    dispatch_count: 4,
    active_delivery_count: 1,
    dispatched_revenue: '1250.0000',
    settled_collections: '900.0000',
    open_balance_debt: '200.0000',
    open_balance_count: 1,
    submitted_closeout_count: 1,
    pending_order_count: 2,
    pending_commission: '75.0000',
    paid_commission: '25.0000'
  },
  territories: [
    { assignment_id: 3, location_id: 1, sublocation_id: 2, location_name: 'Beirut', sublocation_name: 'Hamra' }
  ],
  recent_orders: [
    { id: 44, order_number: 'POS-44', customer_name: 'Nour Market', order_date: '2026-07-21', status: 'converted', total_amount: '45.0000' }
  ],
  recent_dispatches: [
    {
      id: 12,
      dispatch_number: 'DSP-12',
      warehouse_name: 'Main warehouse',
      request_date: '2026-07-20',
      status: 'partially_settled',
      settlement_status: 'draft',
      customer_count: 2,
      total_amount: '150.0000',
      settlement_collected: '100.0000',
      settlement_debt: '50.0000',
      returned_quantity: '1.0000'
    }
  ],
  recent_debts: [
    {
      id: 21,
      customer_name: 'Nour Market',
      debt_number: 'DEBT-21',
      dispatch_number: 'DSP-12',
      debt_date: '2026-07-20',
      status: 'partially_paid',
      original_amount: '50.0000',
      paid_amount: '10.0000',
      remaining_amount: '40.0000'
    }
  ],
  recent_commissions: [
    {
      id: 31,
      sublocation_name: 'Hamra',
      period_start: '2026-07-01',
      period_end: '2026-07-31',
      status: 'approved',
      total_commission: '75.0000',
      paid_amount: '25.0000'
    }
  ],
  target_progress: [
    {
      salesman_target_id: 41,
      location_name: 'Beirut',
      sublocation_name: 'Hamra',
      period_start: '2026-07-01',
      period_end: '2026-07-31',
      target_amount: '1000.0000',
      achieved_sales_amount: '650.0000',
      achievement_percentage: '65.0000'
    }
  ]
};

describe('SalesmanWorkspaceTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.pos.workspace.get.mockResolvedValue({ data: { workspace } });
    api.pos.orders.get.mockResolvedValue({
      data: {
        pos_order: {
          id: 44,
          order_number: 'POS-44',
          customer_name: 'Nour Market',
          warehouse_name: 'Main warehouse',
          order_date: '2026-07-21',
          status: 'converted',
          availability: { available: true },
          lines: [],
          events: [],
          dispatch_links: []
        }
      }
    });
  });

  it('renders authoritative workspace figures instead of deriving them from POS orders', async () => {
    renderWorkspace();

    await waitFor(() => expect(api.pos.workspace.get).toHaveBeenCalledWith({ limit: 20 }));
    expect(await screen.findByText('Maya Saleh')).toBeInTheDocument();
    expect(screen.getByText('Dispatched revenue')).toBeInTheDocument();
    expect(screen.getByText('DSP-12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delivery workflow' })).toBeInTheDocument();
    expect(screen.getByText('Customer debts and payment status')).toBeInTheDocument();
    expect(screen.getByText(/DEBT-21/)).toBeInTheDocument();
    expect(screen.getByText('Commissions')).toBeInTheDocument();
    expect(screen.getByText('Target progress')).toBeInTheDocument();
    expect(screen.getByText('Beirut')).toBeInTheDocument();
    expect(screen.getByText('POS-44')).toBeInTheDocument();
  });

  it('keeps the own-order detail modal available from workspace order history', async () => {
    const user = userEvent.setup();
    renderWorkspace({ canLoadOrders: true });

    await screen.findByText('POS-44');
    await user.click(screen.getByRole('button', { name: 'History' }));

    await waitFor(() => expect(api.pos.orders.get).toHaveBeenCalledWith(44));
    expect(await screen.findByRole('dialog', { name: 'POS-44' })).toBeInTheDocument();
  });

  it('does not expose order detail actions without own-order access', async () => {
    renderWorkspace({ canLoadOrders: false });

    await screen.findByText('POS-44');
    expect(screen.queryByRole('button', { name: 'History' })).not.toBeInTheDocument();
    expect(screen.getByText('Order history requires own-order access')).toBeInTheDocument();
  });
});
