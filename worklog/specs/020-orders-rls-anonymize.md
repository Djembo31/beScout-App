# Slice 020 — Orders RLS Tighten + Handle-Projection (CEO Option 2)

## Ziel

Slice 019 (INV-26) fand `orders.orders_select` mit `qual='true'` — AUTH-08-Klasse Privacy-Leak (user_id aller Orders sichtbar fuer alle authenticated User). CEO approved Option 2: Anonymize via Handle-Projection. Dieser Slice:

1. Tightens RLS: `orders_select` auf `auth.uid() = user_id OR admin-check` (Pattern aus holdings_select_own_or_admin, Slice 014).
2. Neue SECURITY DEFINER RPC `get_public_orderbook(p_player_id, p_side)` die Orderbook-Reads mit `handle` + `is_own`-Projektion liefert.
3. Service-Layer + UI migriert auf RPC. `user_id` verschwindet aus cross-user-Reads.
4. INV-26 Whitelist fuer `orders.orders_select` entfernt — Regression-Guard jetzt scharf.

## Hintergrund

Orderbook ist typisch public-by-design (Market-Maker brauchen Preis + Menge), aber **user_id-Exposure** erlaubt Enumeration von Tradern, ihren Positionen (via Stueck-count), Trading-Pattern. Das ist Privacy-Leak, gleiche Klasse wie AUTH-08 Holdings.

**CEO-Entscheidung (2026-04-17, chat):** Option 2 — tighten + handle-projection.

## Scope-Splitting

Ich mache alles in **einem Slice** (M-L) — Dependencies sind so eng verzahnt dass ein Split Deployment-Race-Conditions erzeugen wuerde (RLS tighten OHNE Service-Migration = Markt bricht; Service-Migration OHNE RLS = Privacy-Leak bleibt offen).

Alles in einem Commit, atomar deploybar.

## Betroffene Files

### DB

| File | Aenderung |
|------|-----------|
| `supabase/migrations/20260417070000_orders_rls_tighten.sql` | **NEW** — DROP `orders_select` (qual=true), CREATE `orders_select_own_or_admin` |
| `supabase/migrations/20260417070100_get_public_orderbook_rpc.sql` | **NEW** — SECURITY DEFINER RPC, AR-44 REVOKE/GRANT |

### Services

| File | Aenderung |
|------|-----------|
| `src/lib/services/trading.ts` | `getSellOrders`, `getAllOpenSellOrders`, `getAllOpenBuyOrders` — wechseln auf `rpc('get_public_orderbook', ...)` |

### Types

| File | Aenderung |
|------|-----------|
| `src/types/index.ts` | Neuer Typ `PublicOrder` — enthaelt `handle \| null` + `is_own: boolean`, KEIN user_id. `DbOrder` bleibt fuer interne RPC-Reads (Admin). Services returnen `PublicOrder[]` |

### UI Consumer

| File | Zeile | Aenderung |
|------|-------|-----------|
| `src/components/player/detail/BuyModal.tsx` | 150 | `o.user_id !== userId` → `!o.is_own` |
| `src/components/player/detail/BuyModal.tsx` | 316 | `profileMap[order.user_id]?.handle` → `order.handle` |
| `src/components/player/detail/TradingTab.tsx` | 287 | `order.user_id === userId` → `order.is_own` |
| `src/components/player/detail/TradingTab.tsx` | 288 | `profileMap[order.user_id]?.handle` → `order.handle` |
| `src/components/player/detail/TradingTab.tsx` | 302 | `@{order.user_id.slice(0, 8)}` → `@{order.handle ?? t('anonSeller')}` |
| `src/components/player/detail/hooks/usePlayerTrading.ts` | 68 | `o.user_id === userId` → `o.is_own` |
| `src/components/player/detail/hooks/usePlayerDetailData.ts` | 146-160 | Profile-Map-Logic — nur noch fuer `trades` (orders haben bereits handle) |
| `src/features/market/components/portfolio/BestandView.tsx` | 78 | `o.user_id !== uid \|\| o.side !== 'sell'` → `!o.is_own \|\| o.side !== 'sell'` |
| `src/features/market/components/portfolio/BestandView.tsx` | 91 | `o.user_id === uid` → `o.is_own` |
| `src/features/market/components/marktplatz/BuyOrdersSection.tsx` | 45 | `user?.id === order.user_id` → `order.is_own` |

### Tests

| File | Aenderung |
|------|-----------|
| `src/lib/__tests__/db-invariants.test.ts` | INV-26 EXPECTED_PERMISSIVE — `orders.orders_select`-Eintrag entfernen |
| `src/lib/__tests__/auth/rls-checks.test.ts` | Neuer Test `AUTH-16: user cannot read another user's orders` (analog AUTH-08) |
| `src/components/player/detail/__tests__/TradingTab.test.tsx` | Mock-Orders auf neues Shape (is_own, handle) |
| `src/components/player/detail/hooks/__tests__/usePlayerDetailData.test.ts` | Mock-Orders auf neues Shape |
| `src/features/market/components/shared/__tests__/OrderDepthView.test.tsx` | Mock-Orders auf neues Shape (falls nuetzen user_id) |

## Konkret — RPC

```sql
CREATE OR REPLACE FUNCTION public.get_public_orderbook(
  p_player_id uuid DEFAULT NULL,
  p_side text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  player_id uuid,
  side text,
  price bigint,
  quantity int,
  filled_qty int,
  status text,
  created_at timestamptz,
  expires_at timestamptz,
  handle text,
  is_own boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    o.id,
    o.player_id,
    o.side::text,
    o.price,
    o.quantity,
    o.filled_qty,
    o.status::text,
    o.created_at,
    o.expires_at,
    p.handle,
    (o.user_id = auth.uid()) AS is_own
  FROM orders o
  LEFT JOIN profiles p ON p.id = o.user_id
  WHERE o.status IN ('open', 'partial')
    AND o.expires_at > now()
    AND (p_player_id IS NULL OR o.player_id = p_player_id)
    AND (p_side IS NULL OR o.side = p_side)
  ORDER BY
    CASE o.side WHEN 'sell' THEN o.price END ASC NULLS LAST,
    CASE o.side WHEN 'buy'  THEN o.price END DESC NULLS LAST,
    o.created_at ASC
  LIMIT 1000;
$$;

REVOKE EXECUTE ON FUNCTION public.get_public_orderbook(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_public_orderbook(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_public_orderbook(uuid, text) TO authenticated;
```

## Konkret — RLS-Migration

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

Pattern wie holdings_select_own_or_admin (Slice 014).

## Acceptance Criteria

1. **RLS**: Authenticated User kann **nur eigene** Orders via direct `from('orders').select()` lesen. Fremde Orders NICHT sichtbar (AUTH-16 test).
2. **Admin**: Club-Admin und Platform-Admin sehen alle Orders (analog holdings).
3. **Orderbook-UX**: Market-Page + Player-Detail zeigen weiterhin alle offenen Orders via `get_public_orderbook` RPC.
4. **Privacy**: Response der RPC enthaelt KEINE `user_id`-Spalte. Nur `handle` + `is_own`.
5. **Types**: `PublicOrder`-Typ eingefuehrt. Services returnen `PublicOrder[]`. UI-Consumer migriert.
6. **INV-26**: `orders.orders_select`-Whitelist-Eintrag entfernt. Test bleibt gruen (da jetzt nur `auth.uid() = ...`-qual, nicht `'true'`).
7. **Tests**: `tsc --noEmit` clean, `vitest run` alle relevanten Suites gruen.
8. **Trading-RPCs unveraendert**: `buy_from_order`, `cancel_order` etc. arbeiten SECURITY DEFINER direkt auf `orders`-Tabelle — RLS bypassed, keine Aenderung noetig.

## Edge Cases

1. **Orderbook mit 0 offenen Orders** — RPC returned leeres Array. UI Empty-State rendert (unveraendert).
2. **User mit open-Order auf eigenem Player** — in Orderbook sichtbar als `is_own=true`. `BuyModal:150` filter `!o.is_own` verhindert Kauf von eigener Order.
3. **Fremd-User mit geloeschtem Profil** (profile.handle = NULL) — `LEFT JOIN` liefert `handle=null`. UI-Fallback `@{order.handle ?? t('anonSeller')}`.
4. **Admin auf public Market-Page** — sieht alle Orders via RLS direct reads moeglich, aber Service nutzt RPC (Konsistenz). RPC liefert Admin auch `is_own` korrekt.
5. **Buy-from-Order Flow** (buy_from_order RPC): SECURITY DEFINER-RPC hat ungehinderten Tabellenzugriff. Unveraendert.
6. **Cancel eigenen Order** (cancel_order RPC): SECURITY DEFINER, unveraendert.
7. **Player Detail nutzt `getSellOrders`** — jetzt via RPC. Response-Shape hat keine user_id mehr. Impact: `usePlayerDetailData:143-160` Profile-Map bauen fuer orders → nicht mehr noetig, weil handles bereits da.
8. **useAllOpenOrders / useAllOpenBuyOrders** — aehnliche Anpassung wie Sell.

## Proof-Plan

- `worklog/proofs/020-migration.sql` — beide Migrations Content
- `worklog/proofs/020-rpc-sanity.txt` — Testaufruf `SELECT * FROM get_public_orderbook(NULL, 'sell') LIMIT 3`
- `worklog/proofs/020-rls-before-after.txt` — pg_policies Diff
- `worklog/proofs/020-tsc.txt` — clean
- `worklog/proofs/020-tests.txt` — db-invariants + auth/rls-checks + player/detail + market 
- `worklog/proofs/020-diff-stat.txt` — git diff --stat

**Kein Playwright-E2E in diesem Slice** — gegen bescout.net nach Deploy (Phase 7).

## Scope-Out

- **Profile-Map-Optimization fuer trades** — `usePlayerDetailData:143-160` baut weiterhin Profile-Map aus `trades.buyer_id`/`seller_id`. Separate Slice.
- **Offers-Table analog** — `offers` hat `qual` mit `auth.uid() = sender_id OR receiver_id OR (receiver_id IS NULL ...)` — nicht qual=true, scheinbar OK. Kein Fix noetig in diesem Slice.
- **Order-Anonymization fuer Admin-Analytics** — Admin-Panel zeigt weiterhin user_id. Das ist gewollt fuer Ops-Sicht.
- **RPC-Pagination** — initial LIMIT 1000, kein offset-Param. Orderbook braucht selten mehr als 1000 per Player. Future-Slice wenn skaliert.

## Slice-Klassifikation

- **Groesse:** L (2 Migrations + Type + 3 Services + 8 UI-Aenderungen + ~5 Test-Files, ~150-200 Zeilen geaendert)
- **CEO-Scope:** ✅ **CEO Option 2 explicit approved** (2026-04-17 chat). Security + Trading-angrenzend.
- **Risiko:** Mittel — viele Consumer, aber Pattern bekannt. Atomar-deployable (alles in einem commit). Alle Tests updated.

## Rollout-Reihenfolge (innerhalb des Commits)

1. Migration 070000 (RLS tighten) — muss erst nach RPC live sein, sonst Markt bricht. **Oder erst RPC anlegen, dann RLS tighten**.
2. Migration 070100 (RPC) — erst applied, dann RLS tighten.
3. Service-Layer wechselt auf RPC.
4. UI-Consumer migrieren.
5. Tests aktualisieren.
6. INV-26 Whitelist cleanen.

Im git-Commit atomar. Im Deploy: Migration 070100 (RPC) laeuft vor 070000 (RLS). Supabase applied Migrations nach Filename-Ordnung alphabetisch, aber `070000 < 070100`! **Das ist problematisch** — RLS wird zuerst getightened, dann existiert noch keine RPC.

Correction — Sequence: Migration-Filename-Nummerierung entscheidet Applied-Order. Ich nummeriere als:
- `20260417070000_get_public_orderbook_rpc.sql` (first)
- `20260417070100_orders_rls_tighten.sql` (second)

So laueft RPC-Create ZUERST, dann RLS-Tighten. Service-Code ist zwar noch auf `.from('orders')`, aber RLS-Tighten lockt nur cross-user reads — eigene Orders bleiben readable. Markt bricht bis neuer Service-Code deployed. **Das ist das Deploy-Race.**

**Loesung:** Der Deploy lauft via Vercel-Build + git push. Migrations werden von `mcp__supabase__apply_migration` VOR dem git-push applied (durch mich jetzt). Dann ist DB already in new state, aber Old-Service-Code noch live bis Vercel-Deploy fertig ist. In dieser Zeit: Cross-User-Orderbook-Reads liefern nur die eigenen Orders des lesenden Users. 10-30 min Markt-Stoerung.

**Alternative:** Ich reverse der Migration-Order: erst RPC, dann RLS. Aber beide jetzt applieren (vor code-deploy). Zu diesem Zeitpunkt:
- RPC da
- RLS tight
- Service uses `.from('orders')` → liefert nur eigene Orders
- Markt-UI zeigt immer-noch-ueber-RLS-gefilterten Kram

Das ist **gleicher Deploy-Race**. Nicht vermeidbar ohne Blue-Green.

**Pragmatisch:** Ich apply Migrations JETZT, deploy Code via push — in 10-30min ist Markt wieder online. Beta-Phase, akzeptabel.

Oder: **Ich trenne RLS-Tighten in separaten Slice** nach Code-Deploy verified.

Hmm — sichereste Option:
- **Dieser Slice 020**: RPC + Service-Layer Migration + UI-Consumer. RLS bleibt. Kein Privacy-Fix, aber vorbereitet.
- **Slice 021**: RLS tighten + INV-26 whitelist entfernen. Nach Slice-020-Deploy + verify.

Das macht jeden Slice kleiner und der Deploy-Race ist weg. Slice 020 ist dann M, Slice 021 ist S.

**OK. Ich splittens.** Slice 020 = Prep (RPC + UI-Migration), Slice 021 = RLS-Tighten after Slice-020-deploy + Code verified in Prod.
