# Slice 021 — Orders RLS Tighten (CEO Option 2, Seal)

## Ziel

Schliesse den AUTH-08-Klasse Privacy-Leak aus Slice 019/020: RLS `orders_select` von `qual='true'` auf `auth.uid() = user_id OR admin-check`. Slice 020 hat bereits alle cross-user Client-Reads auf `get_public_orderbook` RPC umgestellt und `buyFromOrder` auf `playerId`+`seller_id`-from-RPC umgehoben.

## Prerequisites (aus Slice 020 erfuellt)

✅ `get_public_orderbook` RPC live (SECURITY DEFINER, bypasses RLS, handle+is_own projection)
✅ Services getSellOrders/getAllOpenSellOrders/getAllOpenBuyOrders nutzen RPC
✅ `buyFromOrder(buyerId, orderId, quantity, playerId)` — kein direct `.from('orders')` cross-user-Lookup mehr
✅ Seller-Notification nutzt `result.seller_id` aus RPC statt post-buy order-read
✅ UI consumer migriert auf `order.is_own` + `order.handle`
✅ Nur verbleibender Produktion-Read auf `.from('orders')`: `social.ts:308` count WHERE user_id=self (self-only, RLS erlaubt)
✅ 306/306 Tests gruen mit neuer Architektur

## Betroffene Files

| File | Aenderung |
|------|-----------|
| `supabase/migrations/20260417070100_orders_rls_tighten.sql` | **NEW** — DROP `orders_select` (qual=true), CREATE `orders_select_own_or_admin` |
| `src/lib/__tests__/db-invariants.test.ts` | INV-26 EXPECTED_PERMISSIVE — `orders.orders_select` Eintrag entfernen (Guard scharf) |
| `src/lib/__tests__/auth/rls-checks.test.ts` | Neuer Test `AUTH-16: user cannot read another user's orders` |

## Konkret — Migration

```sql
DROP POLICY IF EXISTS "orders_select" ON public.orders;

CREATE POLICY "orders_select_own_or_admin"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM club_admins ca WHERE ca.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid())
  );
```

Pattern 1:1 wie `holdings_select_own_or_admin` (Slice 014).

## Konkret — INV-26 Cleanup

```ts
// REMOVE:
// 'orders.orders_select': 'Orderbook-public-by-design (pending CEO review — user_id currently exposed).',
```

## Konkret — AUTH-16

```ts
it('AUTH-16: user cannot read another user\'s orders', async () => {
  const { data } = await botAClient
    .from('orders')
    .select('*')
    .eq('user_id', botBId)
    .limit(5);

  expect(data ?? []).toHaveLength(0);
});
```

Pattern 1:1 wie AUTH-08 (holdings-check nach Slice 014).

## Acceptance Criteria

1. Policy `orders_select_own_or_admin` existiert auf `public.orders`.
2. Policy `orders_select` (qual=true) DROP'd.
3. INV-26 whitelist nur noch 1 Eintrag: `user_stats.Anyone can read stats`.
4. INV-26 gruen.
5. AUTH-16 Test: bot A sieht 0 rows auf `orders WHERE user_id=botB`.
6. `npx tsc --noEmit` clean.
7. Orderbook-UI funktioniert weiterhin (via RPC) — kann ich nicht local testen, aber Service-Tests + RPC-Sanity waren in Slice 020 gruen.

## Edge Cases

1. **Club-Admin User** — sieht alle Orders via Admin-branch (Fan-Analytics). Unveraendert.
2. **Platform-Admin** — sieht alle. Unveraendert.
3. **Regular User** — eigene Orders sichtbar (Cancel-Button, portfolio). Fremde Orders unsichtbar.
4. **`social.ts:308` count(user_id=self)** — RLS erlaubt self-read, OK.
5. **Realtime-Subscription auf `orders`** — noch pruefen (falls existiert, muss RLS matchen). Grep-Check.

## Proof-Plan

- `worklog/proofs/021-migration.sql` — Migration Content
- `worklog/proofs/021-rls-before-after.txt` — pg_policies Diff
- `worklog/proofs/021-tsc.txt` — clean
- `worklog/proofs/021-tests.txt` — db-invariants + auth/rls-checks

## Scope-Out

- Regression-Fix fuer Realtime Publication (falls applicable) — Follow-Up wenn noetig
- Club-Admin Per-Club Scoping (aktuell sieht jeder Club-Admin alle Orders aller Clubs) — Follow-Up, nicht AUTH-08-Klasse

## Slice-Klassifikation

- **Groesse:** S (1 Migration + 2 Test-Anpassungen)
- **CEO-Scope:** CEO Option 2 approved (Slice 019 chat). Teil von Slice-Split-Entscheidung aus 020.
- **Risiko:** Niedrig — Service-Layer bereits auf RPC umgestellt und verifiziert
