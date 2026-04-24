# Slice 178f — Call-Site-Migration auf Auto-Key

6 Money-Path Call-Sites migriert, damit Slice-178-Idempotency in Prod aktiv ist.

## Migrationen

| # | File | Namespace | RPC |
|---|------|-----------|-----|
| a | `src/features/market/mutations/trading.ts` → useBuyFromMarket | `market.buy` | buy_player_sc |
| b | `src/features/market/mutations/trading.ts` → usePlaceBuyOrder | `market.placeBuyOrder` | place_buy_order |
| c | `src/components/player/detail/hooks/usePlayerTrading.ts` → buyMut (market+order) + sellMut | `player.buy`, `player.sell` | buy_player_sc, buy_from_order, place_sell_order |
| d | `src/components/club/sections/MembershipSection.tsx` → subscribeMut | `membership.subscribe` | subscribe_to_club |
| e | `src/app/(app)/hooks/useHomeData.ts` + `src/app/(app)/missions/page.tsx` → handleOpenMysteryBox | `mb.open` | open_mystery_box_v2 |
| f | `src/components/admin/useAdminPlayersState.ts` → handleLiquidate | `admin.liquidate` | liquidate_player |

## Migration-Pattern

**useSafeMutation-Path (a-d):**
```diff
- return useSafeMutation<T, Error, V, C>({
-   mutationFn: (vars) => service(uid, ..., vars),
+ return useSafeIdempotentMutation<T, Error, V, C>({
+   idempotencyNamespace: 'scope.action',
+   mutationFn: (vars, idempotencyKey) => service(uid, ..., vars, idempotencyKey),
```

**Plain-async-Path (e, f):**
```diff
- const result = await service(arg1, arg2);
+ const result = await service(arg1, arg2, newIdempotencyKey('scope.action'));
```

## Tests
Alle Assertion-Updates (`'u1', 'p1', 3` → `'u1', 'p1', 3, expect.stringMatching(/^market\.buy:/)`).

120/120 pass über 5 Suites (trading + player-trading + membership + liquidation + small-services).

## Scope-Out
- `buyFromIpo` NICHT migriert — IPO-RPC nicht in Slice-178-Integration-Scope.
- `cancelBuyOrder`, `cancelOrder` — Cancel-RPCs nicht in Slice-178-Scope.
- Reconciler-Path in Payment-Gateways — kein Anwendungsfall in BeScout.
