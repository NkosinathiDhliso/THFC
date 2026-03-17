import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../../components/ErrorBoundary/ErrorBoundary';
import { useState } from 'react';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that can toggle error state
const ToggleError = () => {
  const [shouldThrow, setShouldThrow] = useState(false);
  
  if (shouldThrow) {
    throw new Error('Test error');
  }
  
  return (
    <div>
      <div>No error</div>
      <button onClick={() => setShouldThrow(true)}>Trigger Error</button>
    </div>
  );
};

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', async () => {
    await act(async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
    });

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders error UI when there is an error', async () => {
    await act(async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    });

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/we're sorry, but something unexpected happened/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('shows error details in development mode', async () => {
    // Mock development environment
    const originalEnv = import.meta.env.DEV;
    (import.meta.env as Record<string, unknown>).DEV = true;

    await act(async () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    });

    expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

    // Restore original environment
    (import.meta.env as Record<string, unknown>).DEV = originalEnv;
  });

  it('handles retry button click', async () => {
    const user = userEvent.setup();
    
    await act(async () => {
      render(
        <ErrorBoundary>
          <ToggleError />
        </ErrorBoundary>
      );
    });

    // First, trigger an error
    await act(async () => {
      await user.click(screen.getByText('Trigger Error'));
    });

    // Should show error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /try again/i });
    
    await act(async () => {
      await user.click(retryButton);
    });

    // After retry, the error boundary should reset and show children again
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', async () => {
    const customFallback = <div>Custom error message</div>;
    
    await act(async () => {
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    });

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });
});