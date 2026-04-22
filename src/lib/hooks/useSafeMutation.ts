'use client';

/**
 * Slice 151a — Race-safe Mutation Primitive.
 *
 * Wrapper um React Query's `useMutation` der drei Systemic-Issues loest,
 * die in Slice 150 Audit identifiziert wurden (Ausloeser: Slice 149
 * Follow-Button Rapid-Click):
 *
 * 1. **Synchronous Pending-Guard:** React Query's internal MutationObserver
 *    hat ein synchrones `isPending`-Flag (v5). `safeTrigger` liest das und
 *    short-circuitet bei in-flight-Mutation — kein `useRef`-Mutex noetig.
 *    Note: Selbst ohne `safeTrigger` ist `mutate()` idempotent gegen rapid-
 *    fire-calls (MutationObserver reused in-flight mutation); der Guard
 *    spart den 2. `onMutate`-Cycle und macht die UX-Intent explizit.
 *
 * 2. **Toast-Integration:** Optionaler `errorToast` (RESOLVED translated string,
 *    NICHT i18n-key) zeigt einheitlichen Error-Toast ohne copy-paste
 *    `try/catch` + `addToast` in jedem Call-Site.
 *
 * 3. **Sentry-Observability:** Optionaler `errorTag` fuer Money-Path
 *    Observability. Wird via `logSilentCatch` an Sentry gemeldet (Pattern
 *    aus `memory/pattern_observability_stack.md`). Slice 151c (Subscribe)
 *    MUSS diesen Parameter nutzen.
 *
 * Verwendung:
 * ```tsx
 * const followMut = useSafeMutation({
 *   mutationFn: (newFollowing: boolean) =>
 *     toggleFollowClub(user.id, club.id, newFollowing),
 *   onMutate: async (newFollowing) => { ... optimistic ... },
 *   onError: (err, variables, context) => { ... rollback ... },
 *   onSuccess: () => queryClient.invalidateQueries(...),
 *   errorToast: t('followError'),             // translated string
 *   errorTag: 'club.follow',                  // Sentry breadcrumb tag
 * });
 *
 * <Button
 *   onClick={() => followMut.safeTrigger(!isFollowing)}
 *   disabled={followMut.isPending}
 *   aria-busy={followMut.isPending}
 * >
 * ```
 *
 * Generic-Order: **Matches React Query v5** — `<TData, TError, TVariables, TContext>`.
 *
 * Migrations-Scope: Slice 151b-160 — siehe `worklog/proofs/150-mutation-audit.md`.
 */

import { useCallback } from 'react';
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useToast } from '@/components/providers/ToastProvider';
import { logSilentCatch } from '@/lib/observability/silentRejects';

export type SafeMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'onError'> & {
  /**
   * Translated error message fuer Auto-Toast (e.g. `t('followError')`).
   * **Pass RESOLVED string, NOT raw i18n-key.** Wenn undefined: kein Auto-Toast.
   */
  errorToast?: string;
  /**
   * Sentry breadcrumb tag (e.g. `'club.follow'`, `'membership.subscribe'`).
   * Money-Path-Mutations MUESSEN diesen setzen fuer Observability.
   */
  errorTag?: string;
  /**
   * Custom onError. Wird NACH `errorToast` + `logSilentCatch` aufgerufen.
   * Typischer Use: Rollback optimistischer Updates.
   */
  onError?: UseMutationOptions<TData, TError, TVariables, TContext>['onError'];
};

/**
 * Note: `UseMutationResult` is a discriminated-union TYPE (not interface) in
 * React Query v5, so `interface extends` is disallowed by TypeScript. We use
 * an intersection type here to preserve the union structure while adding
 * `safeTrigger`.
 */
export type SafeMutationResult<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = UseMutationResult<TData, TError, TVariables, TContext> & {
  /**
   * Race-safe trigger. Short-circuit bei `isPending`.
   * Direkt in `onClick` nutzbar ohne zusaetzlichen Guard.
   */
  safeTrigger: (variables: TVariables) => void;
};

/**
 * Race-safe Mutation-Hook. Siehe File-Header fuer Details.
 */
export function useSafeMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: SafeMutationOptions<TData, TError, TVariables, TContext>,
): SafeMutationResult<TData, TError, TVariables, TContext> {
  const { addToast } = useToast();
  const { errorToast, errorTag, onError: customOnError, ...rest } = options;

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    // React Query v5 passes 4 args to onError: (error, variables, onMutateResult, mutationFnContext).
    // Use rest-args passthrough to remain forward-compatible with minor v5 updates.
    onError: ((...args: Parameters<
      NonNullable<UseMutationOptions<TData, TError, TVariables, TContext>['onError']>
    >) => {
      const [err] = args;
      // Order: toast first (user-visible), then Sentry (observability), then rollback (state)
      if (errorToast) addToast(errorToast, 'error');
      if (errorTag) logSilentCatch(errorTag, err);
      customOnError?.(...args);
    }) as UseMutationOptions<TData, TError, TVariables, TContext>['onError'],
  });

  // useCallback with [mutation.mutate, mutation.isPending] — stable refs across renders
  // that share the same observer-state. Consumer-side memoization ({onClick={safeTrigger}})
  // remains effective across most renders.
  const safeTrigger = useCallback(
    (variables: TVariables) => {
      if (mutation.isPending) return;
      mutation.mutate(variables);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation.mutate, mutation.isPending],
  );

  // Object.assign preserves bound methods (mutate, mutateAsync, reset) as
  // observer-bound functions. A spread `{...mutation, safeTrigger}` would copy
  // them as plain refs — functionally OK with React Query v5's defensive this-
  // handling, but semantically less clean.
  // The intersection-based SafeMutationResult type (vs interface-extends) plays
  // nicely with React Query's discriminated-union — no explicit cast needed.
  return Object.assign(mutation, { safeTrigger });
}
