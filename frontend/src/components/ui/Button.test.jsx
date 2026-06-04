import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button.jsx';

describe('Button', () => {
  it('renders the label and is enabled by default', () => {
    render(<Button>Save changes</Button>);
    const button = screen.getByRole('button', { name: /save changes/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('disables and shows the loading spinner when isLoading is true', () => {
    render(<Button isLoading>Submitting</Button>);
    const button = screen.getByRole('button', { name: /submitting/i });
    expect(button).toBeDisabled();
  });

  it('fires onClick when activated', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Run</Button>);
    await user.click(screen.getByRole('button', { name: /run/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
