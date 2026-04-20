# Slice 122 — get_market_user_dashboard RPC (Query-Konsolidierung /market)

## Ziel (1 Satz)
4 per-User-Queries auf /market (`holdings`, `watchlist`, `incoming_offers`, `open_bids`) in 1 SECURITY DEFINER RPC konsolidieren — analog Slice 109 `get_home_dashboard_v1`.

## Erwarteter Impact
- **Requests cold-load /market**: 6+ → 3+ (-3 per-user queries)
- **LCP**: marginal (-1-3%, ähnlich Slice 109 Realitäts-Check)
- **Structural**: Cross-page-Cache-Priming über `queryClient.setQueryData` → bei /market→/profile etc. warm

## RPC Design

```sql
CREATE OR REPLACE FUNCTION public.get_market_user_dashboard(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_holdings jsonb;
  v_watchlist jsonb;
  v_incoming_offers jsonb;
  v_open_bids jsonb;
  v_owned_player_ids uuid[];
BEGIN
  -- AR-44 Auth Guard
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- 1. Holdings (qty > 0)
  SELECT COALESCE(jsonb_agg(row_to_json(h)), '[]'::jsonb) INTO v_holdings
  FROM (
    SELECT id, user_id, player_id, quantity, avg_buy_price, created_at, updated_at
    FROM holdings
    WHERE user_id = p_user_id AND quantity > 0
    ORDER BY updated_at DESC
  ) h;

  -- 2. Watchlist
  SELECT COALESCE(jsonb_agg(row_to_json(w)), '[]'::jsonb) INTO v_watchlist
  FROM (
    SELECT id, user_id, player_id, alert_threshold_pct, alert_direction,
           last_alert_price, created_at
    FROM watchlist
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
  ) w;

  -- 3. Incoming offers (pending, nicht expired)
  SELECT COALESCE(jsonb_agg(row_to_json(o)), '[]'::jsonb) INTO v_incoming_offers
  FROM (
    SELECT id, player_id, sender_id, receiver_id, side, price, quantity,
           status, counter_offer_id, message, expires_at, created_at, updated_at
    FROM offers
    WHERE receiver_id = p_user_id
      AND status = 'pending'
      AND expires_at > NOW()
    ORDER BY created_at DESC
  ) o;

  -- 4. Open bids für Players die User hält (Accept-fähig)
  SELECT ARRAY(
    SELECT player_id FROM holdings WHERE user_id = p_user_id AND quantity > 0
  ) INTO v_owned_player_ids;

  IF array_length(v_owned_player_ids, 1) > 0 THEN
    SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb) INTO v_open_bids
    FROM (
      SELECT id, player_id, sender_id, receiver_id, side, price, quantity,
             status, counter_offer_id, message, expires_at, created_at, updated_at
      FROM offers
      WHERE receiver_id IS NULL
        AND status = 'pending'
        AND side = 'buy'
        AND expires_at > NOW()
        AND player_id = ANY(v_owned_player_ids)
      ORDER BY created_at DESC
      LIMIT 50
    ) b;
  ELSE
    v_open_bids := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'holdings', v_holdings,
    'watchlist', v_watchlist,
    'incoming_offers', v_incoming_offers,
    'open_bids', v_open_bids
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_market_user_dashboard(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_market_user_dashboard(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_market_user_dashboard(uuid) TO authenticated;
```

## Files

| File | Änderung |
|------|----------|
| `supabase/migrations/20260420XXXXXX_slice_122_market_user_dashboard.sql` | Neue Migration |
| `src/lib/services/marketDashboard.ts` (NEU) | Thin RPC-Wrapper + `MarketUserDashboard` Type |
| `src/lib/queries/marketDashboard.ts` (NEU) | `useMarketUserDashboard(uid)` + setQueryData-Priming |
| `src/features/market/hooks/useMarketData.ts` | 4 Einzelhooks → 1 konsolidierter Hook |
| `src/lib/queries/invalidation.ts` | `invalidateTradeQueries` etc. invalidieren zusätzlich `qk.marketDashboard.byUser(uid)` |
| `src/lib/queries/keys.ts` | Neuer Query-Key `qk.marketDashboard.byUser(uid)` |
| Tests: market + queries Tests anpassen |

## Acceptance Criteria

1. Neue Migration applied via `mcp__supabase__apply_migration`
2. RPC-Invariants: `pg_get_functiondef` enthält `auth_uid_mismatch` Guard + REVOKE/GRANT sauber
3. Smoke-Test gegen jarvis-qa liefert 4 Arrays
4. `useMarketUserDashboard` primed `qk.holdings.byUser(uid)`, `qk.watchlist.byUser(uid)`, `qk.offers.incoming(uid)`, `qk.offers.openBids` via `setQueryData`
5. useMarketData verbraucht nur noch 1 Hook statt 4 für diese Daten
6. tsc clean + vitest relevant suites grün
7. Post-Deploy: Network-Tab zeigt `get_market_user_dashboard` 1× statt 4 separate Requests
8. Cache-Propagation: nach /market Besuch sind die 4 Sub-Caches warm für andere Pages

## Edge Cases

1. User ohne Holdings → `open_bids` returnt `[]` (skippt ANY-Filter)
2. User ohne Offers → beide offer-Arrays `[]`
3. Expired offers → exclude via `expires_at > NOW()` check
4. Auth.uid() mismatch → Exception (User kann nicht fremde Daten ziehen)
5. Concurrent invalidation nach Trade → dashboard-Key + sub-keys beide invalidated, kein stale-Data

## Proof-Plan

- `worklog/proofs/122-rpc-verify.txt` — pg_get_functiondef + GRANTs
- `worklog/proofs/122-smoke.txt` — jarvis-qa smoke-call output
- `worklog/proofs/122-tsc-vitest.txt` — build + tests

## Scope-Out

- Global Queries (`useActiveIpos`, `useAllOpenOrders`, `useTrendingPlayers`) bleiben separate — shared cache zwischen Users
- Tab-Gated Queries (priceHist, announced/ended IPOs) bleiben separate — nur bei Tab switch relevant
- `useEnrichedPlayers` internal queries bleiben (players + holdings sind im Dashboard drin, orders nicht)
