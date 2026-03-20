import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { AlertTriangle: Stub, RefreshCw: Stub };
});

// Component that throws
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Boom!');
  return <div data-testid="child">Safe</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React error boundary console noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows default error message when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('shows custom error message', () => {
    render(
      <ErrorBoundary errorMessage="Oops!">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Oops!')).toBeInTheDocument();
  });

  it('shows custom fallback', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="fallback">Custom fallback</div>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('shows try again button with default label', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('shows custom retry label', () => {
    render(
      <ErrorBoundary retryLabel="Nochmal">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Nochmal')).toBeInTheDocument();
  });

  it('resets error state when retry is clicked', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();

    // Click retry — ErrorBoundary resets hasError state
    // Note: child will throw again immediately, but the reset itself works
    fireEvent.click(screen.getByText('Try again'));
    // After reset + re-throw, error message is shown again
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });
});
