# Slice 110 — WalletContextValue API Delta

## Before

```ts
interface WalletContextValue {
  balanceCents: number | null;
  lockedBalanceCents: number | null;
  setBalanceCents: (cents: number) => void;
  refreshBalance: () => Promise<void>;
}
```

## After

```ts
interface WalletContextValue {
  balanceCents: number | null;
  lockedBalanceCents: number | null;
  setBalanceCents: (cents: number) => void;
  refreshBalance: () => Promise<void>;
  /** true while a fetchBalance call is in flight */
  isFetching: boolean;
  /** unix ms of the last successful fetch, or null if never */
  lastFetchOk: number | null;
  /** derived: !isFetching && lastFetchOk within FRESHNESS_WINDOW_MS (30s) */
  isBalanceFresh: boolean;
}
```

## Consumer Impact

All 17 files importing `useWallet()` continue to work unchanged. New fields are
additive — existing destructures (e.g. `const { balanceCents } = useWallet()`)
ignore them.

Only files opting into the new guard:
- `src/components/player/detail/BuyModal.tsx` (BuyForm)
- `src/features/market/components/shared/BuyOrderModal.tsx`

Both add `disabled={... || balanceStale}` + subtle i18n'd "Saldo wird
aktualisiert…" status line under the affected confirm button.

## AuthProvider Addition

```ts
export type AuthState = 'hydrating' | 'anonymous' | 'authenticated';
export function useAuthState(): AuthState { ... }
```

Derived helper over existing context — no new runtime state, no breaking change.
