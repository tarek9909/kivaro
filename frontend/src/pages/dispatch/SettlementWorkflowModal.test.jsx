import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/index.js';
import { SettlementWorkflowModal } from './SettlementWorkflowModal.jsx';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/api/index.js', () => ({
  api: {
    accounting: { paymentOptions: { list: vi.fn() } },
    dispatch: { settlements: { post: vi.fn() } }
  },
  tokenStorage: { getAccessToken: vi.fn(() => null), getStoredUser: vi.fn(() => null), getImpersonationSession: vi.fn(() => null) }
}));

function renderModal() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SettlementWorkflowModal
        open
        onClose={vi.fn()}
        dispatchRequest={{ id: 7 }}
        settlement={{ id: 91, settlement_number: 'SET-91', total_collected: '12.0000', total_debt: '3.0000' }}
      />
    </QueryClientProvider>
  );
}

describe('SettlementWorkflowModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.dispatch.settlements.post.mockResolvedValue({ data: { dispatch_settlement: { id: 91 } } });
    api.accounting.paymentOptions.list.mockResolvedValue({
      data: { cash_accounts: [{ id: 3, account_name: 'Main cash' }] }
    });
  });

  it('requires and posts an incoming cash account when money was collected', async () => {
    const user = userEvent.setup();
    renderModal();
    await screen.findByRole('option', { name: 'Main cash' });
    await user.selectOptions(screen.getByLabelText(/incoming cash account/i), '3');
    await user.click(screen.getByRole('button', { name: /post settlement/i }));
    await waitFor(() => {
      expect(api.dispatch.settlements.post).toHaveBeenCalledWith(91, expect.objectContaining({ cash_account_id: 3 }));
    });
  });
});
