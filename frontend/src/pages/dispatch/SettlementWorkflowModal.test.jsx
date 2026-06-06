import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import { SettlementWorkflowModal } from './SettlementWorkflowModal.jsx';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn()
  }
}));

vi.mock('@/api/index.js', () => ({
  api: {
    dispatch: {
      settlements: {
        addCustomer: vi.fn(),
        cancel: vi.fn(),
        complete: vi.fn(),
        get: vi.fn()
      }
    }
  },
  tokenStorage: {
    getAccessToken: vi.fn(() => null),
    getStoredUser: vi.fn(() => null),
    getImpersonationSession: vi.fn(() => null)
  }
}));

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SettlementWorkflowModal
        open
        onClose={vi.fn()}
        settlement={{ id: 91, settlement_number: 'SET-91', status: 'draft' }}
        dispatchRequest={{
          id: 7,
          customers: [
            {
              id: 5,
              customer_id: 12,
              customer_name: 'Market A',
              customer_total_amount: '12.0000',
              net_total_amount: '10.0000'
            }
          ],
          items: [
            {
              id: 9,
              dispatch_customer_id: 5,
              item_name: 'Charcoal',
              variant_name: 'Bag',
              quantity: '2.0000',
              returned_quantity: '0.0000',
              line_total: '10.0000'
            }
          ]
        }}
      />
    </QueryClientProvider>
  );
}

describe('SettlementWorkflowModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ user: { permissions: ['dispatch.settle'] } });
    api.dispatch.settlements.get.mockResolvedValue({
      data: {
        dispatch_settlement: {
          id: 91,
          settlement_number: 'SET-91',
          status: 'draft',
          customers: []
        }
      }
    });
    api.dispatch.settlements.complete.mockResolvedValue({ data: { dispatch_request: { id: 7 } } });
  });

  it('submits checked customers in one bulk completion payload', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByLabelText('Partial'));
    await user.clear(screen.getByLabelText('Collected'));
    await user.type(screen.getByLabelText('Collected'), '4');
    await user.type(screen.getByLabelText('Cash account ID'), '3');
    await user.click(screen.getByRole('button', { name: /complete settlement/i }));

    await waitFor(() => {
      expect(api.dispatch.settlements.complete).toHaveBeenCalledWith(91, expect.objectContaining({
        cash_account_id: 3,
        customers: [
          expect.objectContaining({
            dispatch_customer_id: 5,
            settlement_status: 'partial',
            collected_amount: 4,
            return_items: []
          })
        ]
      }));
    });
  });
});
