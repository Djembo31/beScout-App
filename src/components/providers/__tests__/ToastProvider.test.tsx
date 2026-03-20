import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastProvider';

// ============================================
// Mocks
// ============================================
vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { X: Stub, AlertCircle: Stub, CheckCircle2: Stub, Info: Stub, Sparkles: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui/Confetti', () => ({
  Confetti: () => null,
}));

// ============================================
// Test consumer
// ============================================
function ToastTrigger({ message, type }: { message: string; type: 'error' | 'success' | 'info' | 'celebration' }) {
  const { addToast } = useToast();
  return <button onClick={() => addToast(message, type)}>trigger</button>;
}

// ============================================
// Tests — use fireEvent (not userEvent) with fake timers
// ============================================
describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Hello</div>
      </ToastProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('shows toast message when addToast is called', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Test toast" type="success" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Test toast')).toBeInTheDocument();
  });

  it('auto-removes toast after timeout', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Vanish me" type="info" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Vanish me')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(5100); });
    expect(screen.queryByText('Vanish me')).not.toBeInTheDocument();
  });

  it('celebration toast lasts longer (6000ms)', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Party!" type="celebration" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText('trigger'));
    expect(screen.getByText('Party!')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(5100); });
    expect(screen.getByText('Party!')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.queryByText('Party!')).not.toBeInTheDocument();
  });

  it('shows multiple toasts simultaneously', () => {
    function MultiTrigger() {
      const { addToast } = useToast();
      return (
        <>
          <button onClick={() => addToast('First', 'info')}>t1</button>
          <button onClick={() => addToast('Second', 'error')}>t2</button>
        </>
      );
    }

    render(
      <ToastProvider>
        <MultiTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('t1'));
    fireEvent.click(screen.getByText('t2'));

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('useToast returns addToast function', () => {
    let contextValue: ReturnType<typeof useToast> | null = null;
    function Inspector() {
      contextValue = useToast();
      return null;
    }
    render(
      <ToastProvider>
        <Inspector />
      </ToastProvider>,
    );
    expect(contextValue).not.toBeNull();
    expect(typeof contextValue!.addToast).toBe('function');
  });
});
