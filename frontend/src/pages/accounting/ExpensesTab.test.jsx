import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/api/index.js';
import { useAuthStore } from '@/app/stores/authStore.js';
import ExpensesTab from './ExpensesTab.jsx';

vi.mock('@/api/index.js', () => ({
  api: {
    accounting: {
      expenses: {
        list: vi.fn(),
        remove: vi.fn()
      },
      expenseCategories: {
        list: vi.fn()
      },
      cashAccounts: {
        list: vi.fn()
      }
    }
  },
  tokenStorage: {
    getStoredUser: vi.fn(() => null),
    getAccessToken: vi.fn(() => null),
    getImpersonationSession: vi.fn(() => null)
  }
}));

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('ExpensesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        permissions: ['accounting.view', 'accounting.manage'],
        enabled_modules: ['accounting', 'accounting.expenses']
      }
    });
    api.accounting.expenseCategories.list.mockResolvedValue({
      data: { expense_categories: [] }
    });
    api.accounting.cashAccounts.list.mockResolvedValue({
      data: { cash_accounts: [] }
    });
  });

  it('lets posted active expenses be voided and marks voided rows', async () => {
    api.accounting.expenses.list.mockResolvedValue({
      data: {
        expenses: [
          {
            id: 7,
            expense_date: '2026-05-28',
            expense_category_name: 'Fuel',
            amount: 12,
            payment_method: 'cash',
            reference_number: 'EXP-7',
            description: 'Route fuel',
            is_posted: 1,
            status: 'active'
          },
          {
            id: 8,
            expense_date: '2026-05-28',
            expense_category_name: 'Meals',
            amount: 5,
            payment_method: 'cash',
            reference_number: 'EXP-8',
            is_posted: 1,
            status: 'voided',
            is_voided: 1
          }
        ]
      },
      meta: { totalPages: 1 }
    });
    api.accounting.expenses.remove.mockResolvedValue({ data: {} });

    renderWithClient(<ExpensesTab />);

    expect(await screen.findAllByText('Voided')).not.toHaveLength(0);
    await userEvent.click(screen.getAllByLabelText('Void expense 7')[0]);
    expect(screen.getByRole('dialog', { name: 'Void expense' })).toBeInTheDocument();
    expect(screen.getByText(/reversing ledger entry/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Void' }));
    expect(api.accounting.expenses.remove).toHaveBeenCalledWith(7);
  });
});
