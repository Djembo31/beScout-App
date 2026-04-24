'use client';

/**
 * Slice 178d — Race-safe Mutation Primitive mit auto-managed Idempotency-Key.
 *
 * Composition-Hook ueber `useSafeMutation`. Key-Lifecycle:
 * - `safeTrigger(vars)` generiert neuen Key via `newIdempotencyKey(namespace)`.
 * - Key wird an `mutationFn(variables, idempotencyKey)` durchgereicht.
 * - Bei React Query Retry: gleicher Key bleibt (variables-Ref stabil).
 * - onSuccess + onError resetten den Key-Ref (naechster safeTrigger generiert neu).
 *
 * Verwendung:
 * ```tsx
 * const buyMut = useSafeIdempotentMutation<BuyResult, Error, BuyVars>({
 *   idempotencyNamespace: 'trade.buy',
 *   mutationFn: (vars, key) => buyFromMarket(uid, vars.playerId, vars.qty, key),
 *   errorToast: t('buyError'),
 *   errorTag: 'trade.buy',
 * });
 *
 * <Button onClick={() => buyMut.safeTrigger({ playerId, qty })} disabled={buyMut.isPending}>
 * ```
 *
 * Warum nicht direkt in useSafeMutation integriert:
 *   Nicht alle Mutations brauchen Idempotency (z.B. Pure-Reads, Client-nur
 *   State-Changes). Getrennter Hook vermeidet optional-flag-Sprawl.
 */

import { useCallback, useRef } from 'react';
import type { UseMutationOptions } from '@tanstack/react-query';
import { useSafeMutation, type SafeMutationOptions, type SafeMutationResult } from './useSafeMutation';
import { newIdempotencyKey } from '@/lib/idempotency';

export type SafeIdempotentMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = Omit<SafeMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> & {
  /**
   * Namespace-Prefix fuer Idempotency-Key (z.B. `'trade.buy'`, `'mb.open'`).
   * Dient Debug-Zwecken — der key bleibt UUID-collision-free.
   */
  idempotencyNamespace: string;
  /**
   * Mutation-Funktion mit explizitem Idempotency-Key-Parameter.
   * Ersatz fuer `mutationFn` aus React Query.
   */
  mutationFn: (variables: TVariables, idempotencyKey: string) => Promise<TData>;
};

export function useSafeIdempotentMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: SafeIdempotentMutationOptions<TData, TError, TVariables, TContext>,
): SafeMutationResult<TData, TError, TVariables, TContext> {
  const { idempotencyNamespace, mutationFn, onError: customOnError, onSuccess: customOnSuccess, ...rest } = options;
  const keyRef = useRef<string | null>(null);

  const wrappedMutationFn = useCallback(
    async (variables: TVariables) => {
      if (keyRef.current === null) {
        keyRef.current = newIdempotencyKey(idempotencyNamespace);
      }
      return mutationFn(variables, keyRef.current);
    },
    [mutationFn, idempotencyNamespace],
  );

  const wrappedOnSuccess = useCallback<
    NonNullable<UseMutationOptions<TData, TError, TVariables, TContext>['onSuccess']>
  >(
    (...args) => {
      keyRef.current = null;
      customOnSuccess?.(...args);
    },
    [customOnSuccess],
  );

  const wrappedOnError = useCallback<
    NonNullable<UseMutationOptions<TData, TError, TVariables, TContext>['onError']>
  >(
    (...args) => {
      keyRef.current = null;
      customOnError?.(...args);
    },
    [customOnError],
  );

  return useSafeMutation<TData, TError, TVariables, TContext>({
    ...rest,
    mutationFn: wrappedMutationFn,
    onSuccess: wrappedOnSuccess,
    onError: wrappedOnError,
  });
}
