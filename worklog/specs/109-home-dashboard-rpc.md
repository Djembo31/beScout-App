# Slice 109 — `get_home_dashboard_v1` RPC (Home-Data-Consolidation)

**Status:** spec
**Size:** M (3-5 Files, eine Domain: /home Page + read-only RPC)
**CEO-Scope:** false (read-only Aggregation, keine Fee/Wording/Security-Änderung — nur Query-Consolidation)
**Vorgeplant in:** `worklog/proofs/107-trace-after.md` Zeile 55 + 71

## Ziel

Auf `/home` die per-User-Query-Anzahl durch einen einzigen SECURITY-DEFINER-RPC reduzieren. Messbar: **mindestens 3 Supabase-Netzwerk-Roundtrips weniger** auf /home (holdings + user_stats + tickets + highest_pass → 1 RPC). Erwartet: `/home` LCP 3792ms → ~2500-3000ms (-20 bis -34%).

## Kontext

Slice 107 hat die **Duplicate-Calls** auf /home gededuped (wallets 2x→1x, club_followers 2x→1x, gameweek_scores 5x→1x). `/home` LCP sank von 5086ms auf 3792ms (-25%).

**Was jetzt übrig ist** — `useHomeData` macht noch diese sequenziellen Supabase-Calls beim Mount:

| Hook | Service-Call | Aktuell staleTime |
|------|--------------|-------------------|
| `useHoldings(uid)` | `supabase.from('holdings').select(...player join)` | 30s |
| `useUserStats(uid)` | `supabase.from('user_stats').select(...)` | 2min |
| `useUserTickets(uid)` | `supabase.rpc('get_user_tickets')` | 30s |
| `useHighestPass(uid)` | `supabase.from('user_founding_passes').select(...)` (via `getUserFoundingPasses` → `reduce`) | 5min |

Auf Slow 4G (~150ms Latency pro Roundtrip): 4 Calls × 150ms = **~600ms Waterfall**, den der neue RPC auf **~150ms single-roundtrip** drückt.

## NICHT konsolidiert (bewusste Scope-Outs)

- **`getWallet()`** — RLS Race Condition dokumentiert in `trading.md`, `getWallet() NICHT cachen`. Bleibt separat im WalletProvider.
- **`useHasFreeBoxToday()`** — `staleTime: 0` EXPLICIT per J5F-05 (daily-free-limit Race). Darf nicht in aggregierten Cache.
- **`useLoginStreak()`** — WRITE-RPC (`increment_login_streak_v2` oder ähnlich), nicht read-only, kann nicht konsolidiert werden.
- **`useEvents()`, `usePlayers()`, `useTrendingPlayers()`** — global (nicht per-User), teilen Cache über alle User, keine Einsparung durch User-Aggregation.
- **`useChallengeHistory()`, `useHighestPass()` deferred path** — Beides aktuell gated auf `belowFoldReady` (800ms Timer). Da `highestPass` im neuen RPC enthalten ist, kann der deferred-Gate für `highestPass` entfallen; `challengeHistory` bleibt separat (große Row-Count).

## Betroffene Files

**Neu:**
- `supabase/migrations/YYYYMMDDHHMMSS_home_dashboard_rpc.sql` — RPC + REVOKE + GRANT
- `src/lib/services/homeDashboard.ts` — Service-Wrapper + Types
- `src/lib/queries/homeDashboard.ts` — `useHomeDashboard` Hook
- `src/lib/services/__tests__/homeDashboard.test.ts` — Service-Test

**Edit:**
- `src/app/(app)/hooks/useHomeData.ts` — Swap 4 Hooks → 1 Hook + `queryClient.setQueryData` Priming für Cross-Page-Cache
- `src/lib/queries/keys.ts` — Neuer Key `qk.homeDashboard.byUser(uid)`
- `src/lib/queries/invalidation.ts` — `invalidateHomeDashboard(uid)` (wird nach trades/ticket-use getriggert)
- `src/lib/queries/index.ts` — Export `useHomeDashboard`

## Acceptance Criteria

1. Neue Migration mit `CREATE OR REPLACE FUNCTION public.get_home_dashboard_v1(p_user_id uuid DEFAULT NULL) RETURNS jsonb SECURITY DEFINER` inkl. `REVOKE EXECUTE FROM PUBLIC, anon` + `GRANT EXECUTE TO authenticated` am Ende (AR-44 Pflicht).
2. `auth.uid()`-Guard im RPC-Body: `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM COALESCE(p_user_id, auth.uid()) THEN RAISE EXCEPTION 'auth_uid_mismatch'`.
3. RPC-Return-Shape (jsonb): `{ holdings: [...HoldingWithPlayer], user_stats: DbUserStats|null, tickets: DbUserTickets|null, highest_pass: DbUserFoundingPass|null }` — identisch zu den Einzel-Service-Rückgaben, damit Priming funktioniert.
4. `useHomeData` nutzt nur noch `useHomeDashboard(uid)` statt 4 Einzelhooks — die 4 alten Einzelhooks bleiben exportiert (andere Pages nutzen sie) aber kommen auf /home nicht mehr zum Mount.
5. Nach Fetch: `queryClient.setQueryData` primet `qk.holdings.byUser(uid)`, `qk.userStats.byUser(uid)`, `qk.tickets.balance(uid)`, `qk.foundingPasses.highest(uid)` → andere Komponenten auf /home (z.B. TopBar Ticket-Pill) treffen Warm-Cache, keine neue Netzwerk-Query.
6. Vitest-Test für `getHomeDashboard()` Happy-Path (Mock RPC-Response → mapping zu TS-Typen korrekt).
7. `npx tsc --noEmit` clean.
8. Post-Deploy Chrome-DevTools-Trace `/home`:
   - Netzwerk-Requests auf `supabase.co/rest/v1/*` auf `/home` initial: **mind. 3 weniger als Baseline** (holdings + user_stats + get_user_tickets RPC + user_founding_passes → durch 1 RPC ersetzt).
   - LCP < 3200ms (Baseline 3792ms, Ziel -15% mindestens).
9. `SELECT policyname, cmd FROM pg_proc WHERE proname = 'get_home_dashboard_v1'` zeigt korrekte Guard + Grants.

## Edge Cases

1. **Anon-User auf /home**: RPC wird nie gecallt (`enabled: !!uid`). App darf nicht crashen wenn `uid === undefined` beim Mount → Hook muss `useQuery({ enabled: !!uid })` machen.
2. **User hat 0 Holdings**: RPC returnt `{ holdings: [] }` — kein NULL. Array destruct im Service safe.
3. **User ohne user_stats Row**: Neue User. `user_stats` kann `null` sein → RPC returnt `null` für diesen Key. Frontend muss das handhaben (tat es schon via `useUserStats(uid) ?? null`).
4. **User ohne founding_passes**: `highest_pass: null`. `useHighestPass` returnte auch `null`, kein Breaking-Change.
5. **Cache-Priming schlägt fehl** (z.B. shape-mismatch): `setQueryData` wirft nicht, aber UI zeigt Stale. → `zod`-validation optional, aber first iteration skippen (Service-Layer ist single-caller, shape kontrolliert).
6. **Invalidation nach Trade**: `buy/sell_player_sc` RPCs → Service-Layer muss `invalidateHomeDashboard(uid)` triggern zusätzlich zu `invalidateHoldings(uid)`. Ohne → stale holdings auf /home nach Buy/Sell.
7. **`p_user_id` = NULL**: Wrapper-Pattern — `COALESCE(p_user_id, auth.uid())` im RPC, Guard wirft nur bei echter Mismatch. Service-Layer callt immer ohne Param → RPC nutzt auth.uid.
8. **holdings.player JOIN**: gleiche Column-Liste wie `getHoldings` Service (first_name, last_name, image_url, position, club, club_id, floor_price, price_change_24h, perf_l5, perf_l15, matches, goals, assists, status, shirt_number, age). Keine Drift → kopiere exakt.
9. **Service lookups parallel auf SQL-Level**: Der RPC-Body kann die 4 Abfragen nicht wirklich parallelisieren (PL/pgSQL sequenziell), aber 1× RPC-Roundtrip + 4 DB-internal selects ist trotzdem schneller als 4 HTTP-Roundtrips + 4 db-selects.

## Proof-Plan

- `worklog/proofs/109-tsc-clean.txt` — `npx tsc --noEmit` output
- `worklog/proofs/109-vitest.txt` — `npx vitest run src/lib/services/__tests__/homeDashboard.test.ts`
- `worklog/proofs/109-rpc-security-audit.txt` — `SELECT proname, prosecdef, proacl FROM pg_proc WHERE proname = 'get_home_dashboard_v1'` (SECURITY DEFINER + Grants verifiziert)
- `worklog/proofs/109-network-before.txt` — Chrome-DevTools Network-Log /home pre-deploy (bescout.net, jarvis-qa, Slow 4G)
- `worklog/proofs/109-network-after.txt` — Chrome-DevTools Network-Log /home post-deploy
- `worklog/proofs/109-lcp-compare.md` — LCP-Metrik Before/After + Request-Count-Delta

## Scope-Out (bewusst nicht in 109)

- AuthProvider-Robustness (`balanceIsStale` / Button-Guards / State-Machine) → **Slice 110** (direkt danach)
- Service Worker Cache / React Query Persist → nicht geplant
- `challengeHistory`, `hasFreeBoxToday`, `loginStreak` — siehe "NICHT konsolidiert" oben
- TopBar-spezifische Query-Konsolidierung → separater Slice bei Bedarf
- `players`, `events`, `trendingPlayers` — global, nicht dieser Slice

## Risiken

- **RLS-Drift:** RPC ist SECURITY DEFINER → umgeht RLS. Wenn der RPC durch einen Bug fremde `p_user_id` akzeptiert ohne Guard, leakt er Holdings/Stats. Gegen-Maßnahme: AR-44 Guard-Pattern exakt kopieren.
- **Cache-Sync-Drift:** Wenn Priming-Shapes abweichen (z.B. RPC returnt Spalten in anderer Reihenfolge), rendern die per-Hook-Consumer falsch. Gegen-Maßnahme: Service-Types exakt matchen + Vitest.
- **Keine echte Parallelisierung in PL/pgSQL:** Einsparung kleiner als erhofft wenn DB-internal-Queries in Summe teurer sind als 4 HTTP-Roundtrips (nur bei extrem großen Holdings). Realistic check: bei <100 Holdings/User sind HTTP-Roundtrips dominant.
