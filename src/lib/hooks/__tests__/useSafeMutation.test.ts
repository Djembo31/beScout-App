/**
 * Slice 151a — Tests fuer useSafeMutation.
 *
 * Prueft die drei Systemic-Guarantees aus File-Header:
 * 1. Synchronous pending-guard (keine Race)
 * 2. Auto-toast bei Error wenn errorToast gesetzt
 * 3. safeTrigger short-circuit bei pending
 *
 * Plus: Custom onError wird NACH auto-toast aufgerufen (Rollback-Pattern).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSafeMutation } from '../useSafeMutation';

// ============================================
// Mocks
// ============================================
const addToastMock = vi.fn();
const logSilentCatchMock = vi.fn();

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: addToastMock }),
}));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: (tag: string, err: unknown) => logSilentCatchMock(tag, err),
}));

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

beforeEach(() => {
  addToastMock.mockClear();
  logSilentCatchMock.mockClear();
});

// ============================================
// Tests
// ============================================

describe('useSafeMutation', () => {
  it('calls mutationFn and runs onSuccess on success', async () => {
    const fn = vi.fn().mockResolvedValue({ ok: true });
    const onSuccess = vi.fn();

    const { result } = renderHook(
      () =>
        useSafeMutation({
          mutationFn: fn,
          onSuccess,
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it('fires errorToast on mutationFn rejection', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));

    const { result } = renderHook(
      () =>
        useSafeMutation({
          mutationFn: fn,
          errorToast: 'common.errorToast',
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() =>
      expect(addToastMock).toHaveBeenCalledWith('common.errorToast', 'error'),
    );
  });

  it('does NOT auto-toast when errorToast is omitted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('silent'));

    const { result } = renderHook(
      () => useSafeMutation({ mutationFn: fn }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it('calls custom onError AFTER auto-toast', async () => {
    const callOrder: string[] = [];
    addToastMock.mockImplementation(() => callOrder.push('toast'));
    const customOnError = vi.fn(() => callOrder.push('onError'));

    const fn = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(
      () =>
        useSafeMutation({
          mutationFn: fn,
          errorToast: 'subscribe.error',
          onError: customOnError,
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(customOnError).toHaveBeenCalledTimes(1));
    expect(callOrder).toEqual(['toast', 'onError']);
  });

  it('safeTrigger short-circuits while pending — only 1 fn call on rapid-trigger', async () => {
    // Simulate a slow mutation
    let resolveFn: ((value: unknown) => void) | undefined;
    const fn = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve;
        }),
    );

    const { result } = renderHook(
      () => useSafeMutation({ mutationFn: fn }),
      { wrapper: createWrapper() },
    );

    // First trigger starts the mutation
    act(() => {
      result.current.safeTrigger(undefined);
    });

    // Wait for pending state to become visible
    await waitFor(() => expect(result.current.isPending).toBe(true));

    // Rapid-click simulation — 3 further triggers while pending
    act(() => {
      result.current.safeTrigger(undefined);
      result.current.safeTrigger(undefined);
      result.current.safeTrigger(undefined);
    });

    // fn should still have been called exactly ONCE
    expect(fn).toHaveBeenCalledTimes(1);

    // Resolve the slow mutation
    await act(async () => {
      resolveFn?.({ ok: true });
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('safeTrigger passes variables through to mutationFn', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(
      // Generic-Order matches React Query v5: <TData, TError, TVariables, TContext>
      () => useSafeMutation<void, Error, { id: string; qty: number }>({ mutationFn: fn }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.safeTrigger({ id: 'p1', qty: 5 });
    });

    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    // React Query v5 passes (variables, context) — we only care about variables here
    expect(fn.mock.calls[0][0]).toEqual({ id: 'p1', qty: 5 });
  });

  it('passes onMutate through for optimistic updates', async () => {
    const onMutate = vi.fn(async (variables: { value: number }) => ({
      snapshot: variables.value,
    }));
    const fn = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(
      () =>
        useSafeMutation<void, Error, { value: number }, { snapshot: number }>({
          mutationFn: fn,
          onMutate,
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate({ value: 42 });
    });

    await waitFor(() => expect(onMutate).toHaveBeenCalledTimes(1));
    expect(onMutate.mock.calls[0][0]).toEqual({ value: 42 });
  });

  // Slice 151a Finding #9: Regression-Test fuer Optional-Chaining-Safety
  it('does not crash when errorToast fires without customOnError', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('no-handler'));

    const { result } = renderHook(
      () =>
        useSafeMutation({
          mutationFn: fn,
          errorToast: 'orphan.error',
          // NO onError callback
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() =>
      expect(addToastMock).toHaveBeenCalledWith('orphan.error', 'error'),
    );
    // Expect no uncaught exception; test passes if we reach this line
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // Slice 151a Finding #3: Sentry-Integration fuer Money-Path
  it('fires logSilentCatch when errorTag is set', async () => {
    const err = new Error('sentry-catch');
    const fn = vi.fn().mockRejectedValue(err);

    const { result } = renderHook(
      () =>
        useSafeMutation({
          mutationFn: fn,
          errorTag: 'club.follow',
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() =>
      expect(logSilentCatchMock).toHaveBeenCalledWith('club.follow', err),
    );
  });

  it('does NOT fire logSilentCatch when errorTag is omitted', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('untagged'));

    const { result } = renderHook(
      () => useSafeMutation({ mutationFn: fn }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(fn).toHaveBeenCalled());
    expect(logSilentCatchMock).not.toHaveBeenCalled();
  });

  // Slice 151a Finding #6: Echter safeTrigger-Guard-Test (isolated vom Observer)
  it('safeTrigger guards via isPending flag — explicit across re-renders', async () => {
    // Delayed mutation so isPending stays true across a re-render
    let resolveFn: ((v: unknown) => void) | undefined;
    const fn = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve;
        }),
    );

    const { result, rerender } = renderHook(
      () => useSafeMutation({ mutationFn: fn }),
      { wrapper: createWrapper() },
    );

    act(() => result.current.safeTrigger(undefined));
    await waitFor(() => expect(result.current.isPending).toBe(true));

    // Re-render happens in between — result.current now reflects pending-state
    rerender();
    expect(result.current.isPending).toBe(true);

    // Second call from a FRESH result.current reference — isPending still true
    act(() => result.current.safeTrigger(undefined));

    // fn still called only once (guard short-circuited the second)
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => resolveFn?.({ ok: true }));
    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
