import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState, ErrorState, LoadingState } from './StateViews.jsx';

describe('StateViews', () => {
  it('renders an EmptyState with title and description', () => {
    render(<EmptyState title="Nothing yet" description="Try a new search" />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.getByText('Try a new search')).toBeInTheDocument();
  });

  it('renders an ErrorState with retry control that fires the callback', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorState
        title="Could not load"
        description="API is unreachable"
        onRetry={onRetry}
      />
    );
    expect(screen.getByText('Could not load')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('LoadingState exposes an aria-live region with the label', () => {
    render(<LoadingState label="Working..." />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Working...');
  });
});
