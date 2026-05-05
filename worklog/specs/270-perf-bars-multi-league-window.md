# Slice 270 — fix(perf-bars): Per-Player Multi-League-Window in getRecentPlayerScores

**Slice-Type:** Service + DB-Migration
**Größe:** M (3-5 Files, eine Domain)
**Datum:** 2026-05-05
**Anil-Approval:** Direktive „arbeite alles autonom ab" (volle Entscheidungsgewalt erteilt 2026-05-05)

---

## 1. Problem-Statement (mit Evidence)

**Anil-Quote (2026-05-05):** „die leistungsbalken werden zb bei galatasaray spielern nicht angezeigt auch nicht in der scoutcard, wenn die sich dreht."

**DB-Smoke-Evidence (`mcp__supabase__execute_sql` 2026-05-05):**

| Liga | latest_with_score | global_latest_gw | Lag | FormBars-Status |
|---|---|---|---|---|
| Süper Lig (TR) | 37 | 37 | 0 | OK (außer GAL-Stamm-XI) |
| TFF 1. Lig (TR) | 37 | 37 | 0 | OK |
| Serie A (IT) | 36 | 37 | 1 | meist 4/5 Bars |
| Premier League (GB) | 33 | 37 | **4** | **fast leer** |
| La Liga (ES) | 33 | 37 | **4** | **fast leer** |
| Bundesliga (DE) | 32 | 37 | **5** | **komplett leer** |
| 2. Bundesliga (DE) | 32 | 37 | **5** | **komplett leer** |

**Galatasaray-Smoke** (40 Spieler, alle gegen globales Window [33..37]):
- 1 Spieler hat 1/5 Slots gefüllt (Morata, GW 33 = 63 pts)
- 39 Spieler haben **5/5 nulls** im globalen Window
- DB-Daten existieren (32/40 mit `perf_l5 > 0`, max `gw_score = 30`)

**Beziehung zu Slice 102:** Pilot-Default-Pattern (Pilot-Liga drückt sich ins Multi-League-System).

## 2. Lösungs-Design

**Option A (gewählt): Per-Player Multi-League-Latest via RPC**

Neue SECURITY-DEFINER-RPC `rpc_get_recent_player_scores()`:

```sql
CREATE OR REPLACE FUNCTION public.rpc_get_recent_player_scores()
RETURNS TABLE(player_id uuid, gameweek integer, score integer, position_in_window smallint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT player_id, gameweek, score,
    (ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY gameweek DESC))::smallint
      AS position_in_window
  FROM player_gameweek_scores
  WHERE score > 0
  QUALIFY position_in_window <= 5;
$$;
-- Postgres < 16 hat kein QUALIFY → Subquery-Variant:
-- Siehe Migration für portable Form (WHERE rn <= 5 in Subquery)
```

**Warum RPC + Window-Function statt Client-Group-By:**
- Skaliert auf 60k+ rows ohne Daten-Transfer (Server-side filtern)
- Per-Player-Latest ist semantisch korrekter als Per-Liga-Latest
  - GAL-Reservist mit GW 18 sieht trotzdem seine letzten 5 played-GWs (18, 16, 14, 12, 10)
  - Nicht nur „Liga ist bei GW 30, Spieler hat null im Liga-Window"
- Liga-übergreifend Single-Query (kein Liga-Loop, kein Drift)
- FormBars-Visual-Konsistenz: alle Spieler haben volle 5 Bars wenn sie 5+ Mal gespielt haben

**Service-Refactor in `src/features/fantasy/services/fixtures.ts`:**
- `getRecentPlayerScores()` → ruft RPC, baut `Map<playerId, (number|null)[]>`
- Deprecate `getRecentScoreGameweeks()` als globale Funktion → wird per-player. Existing Caller (KaderTab Tooltip) muss adaptiert werden.

**RateLimit/Performance:**
- RPC Server-Side STABLE → Postgres kann cachen
- 1 RPC-Call statt 2 Sequenz-Queries (besser als Status quo)
- TanStack-Query `staleTime: 5 min` bleibt unverändert
- Map-Type bleibt → Slice 267 Layer-4-Filter greift weiterhin (kein Persist-Crash)

## 3. Betroffene Files (geschätzt)

| File | Art | Begründung |
|------|-----|------------|
| `supabase/migrations/20260505HHMMSS_slice_270_per_player_recent_scores.sql` | NEU | Migration für RPC |
| `src/features/fantasy/services/fixtures.ts` | EDIT | `getRecentPlayerScores` + `getRecentScoreGameweeks` |
| `src/features/fantasy/services/__tests__/fixtures.test.ts` | EDIT | Test-Cases für Multi-League-Verhalten |
| `src/lib/queries/managerData.ts` | UNCHANGED | Hook-Wrapper bleibt (gleicher Return-Shape) |
| `src/features/manager/components/kader/KaderTab.tsx` | EVTL EDIT | wenn Tooltip-GW pro Player adaptiert |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Frage |
|------|-------|-------|
| `src/features/fantasy/services/fixtures.ts:436-483` | bestehende `getRecentPlayerScores`-Implementation | Welche Helper hängen am bestehenden Code (gameweeks-Array, lookup-Map)? Was muss bleiben für Backward-Compat? |
| `src/features/fantasy/services/fixtures.ts:419-431` | `getRecentScoreGameweeks` | Genutzt für Tooltip-GW-Labels in KaderPlayerRow. Wenn jeder Player eigenes Window hat, muss auch dieser Service per-Player werden? Oder ein Tooltip-Refactor? |
| `src/features/manager/components/kader/KaderTab.tsx:153` (Slice 198 fm 5.1) | GW-Labels-Konsumenten | Wie wird `gameweeks?.[i]` an `KaderPlayerRow.formEntries[].gameweek` gepasst? Pro Player oder global? |
| `src/lib/queries/managerData.ts:21-27` (`useRecentScores`) | Hook-Wrapper | Map-Reconstruction nötig? Slice 267 Layer-4 Persist-Filter aktiv? |
| `src/components/player/FormBars.tsx:36-138` | Konsument-Visualisierung | Wie verhält sich `padded`-Array bei Player mit < 5 Played-GWs? Wird "bench"/"not_in_squad" korrekt gerendert? |
| `supabase/migrations/` letzte 3-5 Migrations | Migration-Pattern + REVOKE-Block | Slice-269 + Slice-267 + SO-5 als Template (apply_migration via MCP, AR-44 REVOKE/GRANT) |
| `src/features/fantasy/services/__tests__/fixtures.test.ts:474-489` | bestehende Test-Skeleton | Mock-Pattern für `supabase.rpc()` vs `.from().select()` — wie ist der Helper aufgebaut? |
| `src/types/index.ts` (DbPlayer, MatchTimelineEntry) | Type-Definitionen | Reicht der bestehende Return-Shape (`Map<string, (number|null)[]>`)? |
| `.claude/rules/database.md` Migration-Template-Pflichten (AR-44) | Migration-DoD | REVOKE/GRANT-Block am Ende der Migration pflicht |
| `.claude/rules/errors-db.md` Money-RPC-Idempotency | NICHT relevant | Kein Money-Path, aber Pattern-Spiegelung wert für Konsistenz-Check |

## 5. Pattern-References

- **Slice 102** (errors-frontend.md → Data-Format vs Component-Expectation Drift / Pilot-Default-Pattern) — gleiche Bug-Klasse: globale Annahme bricht Multi-Tenant. Diesmal nicht TR-Default, sondern globaler MAX(gw).
- **Slice 081d** (errors-scraper.md → Cross-Club-Contamination via API-Football) — Pattern-Familie „Liga-übergreifender silent corrupted Aggregat".
- **Slice 267 D44 Pattern #45** (errors-frontend.md → Map/Set-typed React-Query-Data + Persist) — Map-Return-Shape bleibt → Layer-4-Filter weiter aktiv.
- **AR-44** (database.md → Migration-Template-Pflichten) — REVOKE/GRANT pflicht.
- **Slice 200** (errors-frontend.md → PLAYER_SELECT_COLS Sync) — _Nicht_ relevant für 270, aber sekundärer Befund (mv_trend_7d 0 records) gehört in eigenen Slice 271.

## 6. Acceptance Criteria (executable)

| AC | Verifikation |
|----|--------------|
| AC-01: GAL-Stamm-XI hat ≥ 5 Bars sichtbar nach Deploy | DB: `SELECT COUNT(*) FROM rpc_get_recent_player_scores() WHERE player_id IN (SELECT id FROM players WHERE club_id = '6bfe7d27-…')` ≥ 5×34 = 170 rows |
| AC-02: Bundesliga-Spieler haben ≥ 5 Bars (lag=5 Heilung) | DB: `SELECT COUNT(*)` für DE-Liga-Spieler aus RPC ≥ 5 × N_active |
| AC-03: Liga-übergreifend kein Player mit 0 Bars wenn matches > 0 | SQL-Smoke: 0 Rows in `players p WHERE p.matches > 0 AND NOT EXISTS (SELECT 1 FROM rpc_get_recent_player_scores() rps WHERE rps.player_id = p.id)` |
| AC-04: Service-Return-Shape unverändert | TypeScript-Check: `Map<string, (number\|null)[]>` mit 5-element Arrays |
| AC-05: Bestehende Test-Skeleton bleibt grün | `npx vitest run src/features/fantasy/services/__tests__/fixtures.test.ts` |
| AC-06: Neue Test-Cases verifizieren Multi-League-Korrektheit | 3 neue Test-Cases (siehe Sektion 11) — alle PASS |
| AC-07: tsc clean | `npx tsc --noEmit` |
| AC-08: REVOKE/GRANT-Block in Migration vorhanden | grep `REVOKE EXECUTE` + `GRANT EXECUTE` in Migration-File |
| AC-09: PostgREST-Cap nicht getroffen | DB rows-Count via RPC: ≤ N_active_players × 5 = ~25k rows ≤ Server-Cap |
| AC-10: Live-Verify gegen bescout.net post-Deploy | Chrome-DevTools-Screenshot Galatasaray-Spieler + Bundesliga-Spieler mit 5 Bars |

## 7. Edge Cases Table

| Kategorie | Case | Erwartetes Verhalten |
|-----------|------|----------------------|
| null | Player ohne Scores (alle GWs `score=0` oder keine Rows) | RPC liefert 0 Rows → Map enthält Player nicht → FormBars rendert 5 dashed bars |
| 0 | Player mit `score=0` in vielen GWs (Reservist Bench) | Filter `score>0` schließt aus → Player hat nur GWs mit echten Punkten in Window |
| < 5 played | Player mit 3 played-GWs total | RPC liefert 3 Rows → Service paddt mit 2 nulls am ältesten Ende → 3 farbige + 2 dashed bars |
| Concurrent | Live-Match während RPC-Call (score wird gerade upserted) | RPC ist STABLE (Snapshot) — okay, Hub-Refresh per staleTime 5 min |
| Liga-Mix | User hat Holdings aus 4 Ligen | Jeder Player kriegt eigene 5 letzten played-GWs → Rendering identisch konsistent |
| Doppel-Score | Player hat 2 Rows für gleiche GW (kann nicht passieren wegen UNIQUE-Constraint, aber falls) | ROW_NUMBER nimmt nur eine, andere droppt → kein Crash |
| Persist-Cache | TanStack-Query Tab-Switch | Map-Type Layer-4-Filter (Slice 267) verhindert Persist → Refetch on Mount |
| Empty DB | player_gameweek_scores ist leer (frische Saison) | RPC liefert 0 rows → leere Map → FormBars 5 dashed bars überall |
| RPC-Fail | DB temporary down | `throw new Error(error.message)` bubbles to React-Query `isError` → kein silent null-Cast (Slice 165 Pattern) |
| Realtime-Update | Player bekommt neuen Score während Window cached ist | Slice 267 Realtime-Channel feuert separat — `useRecentScores` invalidiert auf Refresh-Cycle (5 min) — akzeptabel kein Live-Update für FormBars |

## 8. Self-Verification Commands

```bash
# Pre-Build Discovery (bestätigt Bug)
mcp__supabase__execute_sql:
  SELECT c.country, c.league, MAX(pgs.gameweek) FILTER (WHERE pgs.score > 0) AS latest_with_score
  FROM player_gameweek_scores pgs
  JOIN players p ON p.id = pgs.player_id
  JOIN clubs c ON c.id = p.club_id
  GROUP BY c.country, c.league;

# Post-Migration verify RPC exists
mcp__supabase__execute_sql:
  SELECT pg_get_functiondef('public.rpc_get_recent_player_scores()'::regprocedure);

# Post-Migration AC-01 (GAL-Stamm-XI)
mcp__supabase__execute_sql:
  SELECT COUNT(*) FROM rpc_get_recent_player_scores()
  WHERE player_id IN (SELECT id FROM players WHERE club_id = '6bfe7d27-dfef-46c6-89b3-293f2eb84ecd');
  -- Expect: ≥ 170 (34 active × 5)

# Post-Migration AC-03 (no orphans)
mcp__supabase__execute_sql:
  SELECT p.first_name, p.last_name, c.country, c.league
  FROM players p
  JOIN clubs c ON c.id = p.club_id
  WHERE p.matches > 0
    AND NOT EXISTS (SELECT 1 FROM rpc_get_recent_player_scores() rps WHERE rps.player_id = p.id)
  LIMIT 20;
  -- Expect: ≤ 5 rows (only edge-case players with score=0 in all played matches)

# Post-Service-Refactor
npx tsc --noEmit
npx vitest run src/features/fantasy/services/__tests__/fixtures.test.ts

# Post-Build (Build-Health)
npx next build  # nicht Pflicht für /spec, aber wenn ich's mache, nicht slack lassen

# Post-Deploy Live-Verify (manuell oder Chrome-DevTools-MCP)
# 1. https://bescout.net/player/<gal-player-id> → 5 Bars sichtbar
# 2. https://bescout.net/market mit Bundesliga-Filter → Bars sichtbar
```

## 9. Open Questions

**Pflicht-Klärung (vor Implementation, falls unklar):**
1. Soll `getRecentScoreGameweeks` (Tooltip-GW-Labels) per-Player werden? → **Entscheidung Claude-CTO:** Ja, per-Player. Tooltip soll echte GW pro Bar zeigen, nicht globales Liga-Fenster. Service liefert `Map<playerId, number[]>` analog zu Scores. Adaption in `KaderTab.tsx:153`.
2. Migration-Naming + Versions-Stempel? → **Entscheidung:** `20260505HHMMSS_slice_270_per_player_recent_scores.sql` mit aktuellem Timestamp.

**Autonom-Zone (Claude entscheidet während BUILD):**
- Konkretes SQL für Window-Function (CTE vs. Subquery vs. lateral join)
- Test-Mock-Strategie (MCP-Live vs. mock supabase.rpc)
- Tooltip-Pattern in KaderTab — wenn aufwändig, deferred auf Folge-Slice 270b (markieren in active.md)

## 10. Proof-Plan

| Artefakt | Inhalt | Wo |
|----------|--------|-----|
| `worklog/proofs/270-db-smoke.txt` | Pre-Migration + Post-Migration AC-01/02/03 SQL-Output | text |
| `worklog/proofs/270-vitest.txt` | `npx vitest run …fixtures.test.ts` Output | text |
| `worklog/proofs/270-tsc.txt` | `npx tsc --noEmit` Output | text |
| `worklog/proofs/270-live-screenshot.png` | Galatasaray-Spieler-Card mit 5 Bars sichtbar (post-Deploy) | png via Chrome-DevTools-MCP |
| `worklog/proofs/270-bundesliga-screenshot.png` | Bundesliga-Spieler-Card mit 5 Bars sichtbar | png |

## 11. Test-Strategie (neu für Slice 270)

3 neue vitest-Cases in `fixtures.test.ts` describe-block `getRecentPlayerScores`:

```ts
describe('getRecentPlayerScores — Multi-League per-player window (Slice 270)', () => {
  it('returns 5 latest played GWs per player when player has 5+ played', async () => {
    // Mock supabase.rpc returning per-player rows with various GWs
    // Verify: 1 player with GWs [10, 15, 20, 25, 30] → array [10,15,20,25,30] (oldest→newest)
  });

  it('pads to 5 with nulls when player has fewer than 5 played GWs', async () => {
    // Mock: player with 2 played-GWs [25, 30]
    // Verify: array [null, null, null, 25, 30] (oldest→newest)
  });

  it('returns empty Map when no scores exist', async () => {
    // Already exists — adapt to RPC-mock instead of from()-mock
  });
});
```

**Knowledge-Flywheel post-Bug-Fix (Pflicht):**
- `errors-frontend.md` neuer Block: „Multi-League globale Annahme zerbricht bei Lag-Liga" (Slice-102-Erweiterung) ODER `errors-db.md` „Service-Aggregation über alle Tenants ohne Per-Tenant-Window".
- `memory/decisions.md` D-Eintrag falls Entscheidung „RPC-First für Server-Side-Aggregations" als neuer Standard erhoben werden soll.

## 12. Scope-Out (explizit NICHT drin)

- ❌ `mv_trend_7d`-Cron-Audit → Slice 271 (eigenes Audit-Slice)
- ❌ `perf_l5 = 50.00`-Default-Source → Slice 271
- ❌ `getBatchFormScores` (Fantasy Picker) Refactor — funktioniert anders (Player-IDs explicit), kein Bug
- ❌ TradingCardFrame-Flip-Karte `matchTimeline` Audit — separater Pfad, separater Bug (falls vorhanden)
- ❌ Realtime-Push für FormBars-Updates → post-Beta, nicht in 270
- ❌ Cron-Health-Audit für api-football.com Sync — Slice 272+
- ❌ Bundle-Size-Optimization der FormBars-Komponente — kein Performance-Hot-Spot

## 13. Pre-Mortem (5 Szenarien)

1. **RPC liefert > Server-Cap rows.** Mitigation: Window-Function filtert auf max 5 per player → Hard-Cap N_players × 5 ≤ 25k. Postgres-Cap typically 10k → falls Hit: explizite `LIMIT N_players * 5` mit Pagination via Range. → DB-Smoke vor Service-Refactor pflicht.

2. **PostgREST Function-Call cached unerwünscht.** STABLE garantiert per-Snapshot, aber bei rapid succession könnte Postgres re-evaluieren. → Test: 2 RPC-Calls in 100ms-Abstand vs. SQL direkt — Werte müssen matchen. Wenn drift: VOLATILE statt STABLE.

3. **Test-Mock-Komplexität:** Bestehende fixtures.test.ts mockt `.from()` chains. RPC-Mock ist anderer Pfad. → Risk: Neue Tests grün aber Mock testet nicht echtes Verhalten. Mitigation: Mock-Helper für `.rpc()` einbauen, gegen DB-Live-Smoke abgleichen.

4. **Backward-Compat: KaderPlayerRow.gameweeks ist `number[]` nicht `Map`.** Wenn `getRecentScoreGameweeks` per-Player wird, ändert sich Caller-Contract. → Mitigation: Slice 270 hält `getRecentScoreGameweeks` aktuell als globale Variante (nimmt `MAX` über alle Player). Der Tooltip-Refactor ist optionaler Zusatz, deferred falls Aufwand groß.

5. **REVOKE-Block vergessen → anon kann RPC ohne Limit aufrufen.** AR-44 strict. → Hook `ship-cto-review-gate` + Reviewer-Agent fängt das im REVIEW. Plus self-check via `grep "REVOKE EXECUTE" supabase/migrations/<slice-270>.sql`.

---

**Spec-Quality-Selbstcheck (Slice 211):**
- [x] Code-Reading-Liste hat ≥ 6 Items (M-Slice Mindest)
- [x] Pattern-References echt relevant (4 + 1 negativ-markiert)
- [x] ACs executable mit konkreten VERIFY-Commands
- [x] Edge-Cases enumerieren systematisch (10 Categorien)
- [x] Self-Verification-Commands lauffähig
- [x] Open-Questions trennen Pflicht-Klärung (entschieden) von Autonom-Zone
- [x] Pre-Mortem ≥ 5 Szenarien (M-Slice empfohlen)
- [x] Money-Path? Nein. Compliance-Wording? Nein.
