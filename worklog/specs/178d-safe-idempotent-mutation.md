# Slice 178d — useSafeIdempotentMutation + newIdempotencyKey

Client-side Auto-Key-Generation fuer Slice-178-Money-RPC-Integration.

## Files
- `src/lib/idempotency.ts` NEU — `newIdempotencyKey(namespace?): string`
- `src/lib/hooks/useSafeIdempotentMutation.ts` NEU — Composition ueber useSafeMutation mit auto-managed key-lifecycle
- `src/lib/__tests__/idempotency.test.ts` NEU — 5 tests

## AC
1. `newIdempotencyKey()` liefert eindeutige String-IDs (100/100 unique in test).
2. Namespace-Prefix optional, Format `namespace:uuid`.
3. Fallback ohne `crypto.randomUUID` (alte Runtime): Date+Math.random composite.
4. `useSafeIdempotentMutation` wrappt useSafeMutation. mutationFn-Signature: `(vars, key) => Promise<T>`.
5. Key-Lifecycle: persist waehrend in-flight+retry, reset auf onSuccess + onError.
6. tsc clean + 5/5 tests pass.

## Usage-Pattern
```tsx
const buyMut = useSafeIdempotentMutation<BuyResult, Error, BuyVars>({
  idempotencyNamespace: 'trade.buy',
  mutationFn: (vars, key) => buyFromMarket(uid, vars.playerId, vars.qty, key),
  errorToast: t('buyError'),
  errorTag: 'trade.buy',
});
<Button onClick={() => buyMut.safeTrigger({ playerId, qty })} disabled={buyMut.isPending}>
```

## Scope-Out
- Migration bestehender useSafeMutation-Call-Sites auf useSafeIdempotentMutation — Follow-up per Feature (Trading, Subscribe, MysteryBox, Liquidate). Pro Consumer eigener XS-Slice.
