import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VatSettingsCard } from './VatSettingsCard.jsx';

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@/api/index.js', () => ({
  api: {
    settings: {
      vat: {
        get: vi.fn(),
        update: vi.fn()
      }
    }
  }
}));

import { api } from '@/api/index.js';

function renderWithQuery(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('VatSettingsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.settings.vat.get.mockResolvedValue({ data: { vat: { enabled: false, rate: 0 } } });
    api.settings.vat.update.mockResolvedValue({ data: { vat: { enabled: true, rate: 10 } } });
  });

  it('requires a positive VAT rate when enabling VAT', async () => {
    const user = userEvent.setup();
    renderWithQuery(<VatSettingsCard canEdit />);

    await screen.findByLabelText(/vat rate/i);
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /save vat/i }));

    expect(await screen.findByText(/vat rate is required/i)).toBeInTheDocument();
    expect(api.settings.vat.update).not.toHaveBeenCalled();
  });

  it('saves enabled VAT settings with the configured rate', async () => {
    const user = userEvent.setup();
    renderWithQuery(<VatSettingsCard canEdit />);

    const rateInput = await screen.findByLabelText(/vat rate/i);
    await user.click(screen.getByRole('checkbox'));
    await user.clear(rateInput);
    await user.type(rateInput, '10');
    await user.click(screen.getByRole('button', { name: /save vat/i }));

    await waitFor(() => {
      expect(api.settings.vat.update).toHaveBeenCalledWith({ enabled: true, rate: 10 });
    });
  });
});
