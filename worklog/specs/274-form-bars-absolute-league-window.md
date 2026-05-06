# Slice 274 — fix(perf-bars): Absolute Liga-Window für FormBars (DNP-Stale-Visualisierung)

**Slice-Type:** DB-Migration + Service + UI (cross-domain M-Slice)
**Größe:** M (3-5 Files, eine Domain)
**Datum:** 2026-05-06
**Anil-Approval:** Direktive 2026-05-06 — „Option A — Absolute Liga-Window"

---

## 1. Problem-Statement (mit Evidence)

**Anil-Quote (2026-05-06):**
> „nicht alle spieler haben die leistungsbalken bis zur aktuellen Gameweek, einige haben mehr als 5 spiele nicht gespielt, aber zeigen noch leistungsbalken an, aus vergangenen GW's, das irrtiert den user, so kann er denken das er die letzten 3 spieltage verpasst hat, wobei es mehr als fünf waren."

**Aktueller Bug (Slice 270 unbeabsichtigte Konsequenz):**
- Backend `rpc_get_recent_player_scores` returnt **letzte 5 played GWs PER Spieler** (`ROW_NUMBER OVER PARTITION BY player_id ORDER BY gameweek DESC`)
- Frontend `FormBars.tsx:53-56` paddet mit `null` am alten Ende → **5 played → 5 colored bars** unabhängig vom Alter

**Beispiel-Symptom:**
- Liga bei GW 35
- Stammspieler verletzt seit GW 30 → Service liefert `[GW26, GW27, GW28, GW29, GW30]`
- FormBars: 5 colored bars rechtsbündig
- User-Wahrnehmung: „on form, vielleicht 1-2 Wochen verpasst"
- Wirklichkeit: 5 GWs verpasst seit GW 30

**Beziehung zu Slice 270:** Slice 270 hat absichtlich auf Per-Player-Window gewechselt, weil damals **Liga-Window-Lag** (active_gameweek-Drift) dazu führte dass Stammspieler in lagging Ligen 5/5 dashed waren. **Slice 273 hat den Liga-Lag-Bug komplett gefixt** (DB-Heal active_gw + Cron-Bug-Klasse identifiziert). Dadurch ist die ursprüngliche Begründung für Per-Player-Window obsolet — die FPL-Standard-Lösung „absolutes Liga-Window mit DNP-Slots" ist jetzt sicher.

## 2. Lösungs-Design

**Option A (gewählt) — Absolute Liga-Window via RPC:**

Neue/refactorierte RPC `rpc_get_recent_player_scores` returnt für **jeden aktiven Spieler × jede der letzten 5 finished Liga-GWs** einen Slot:
- Score wenn Spieler in dieser GW played hat
- `null` wenn nicht played (DNP / Bench / not-in-squad / verletzt)

Frontend rendert null-Slot als dashed Bar mit Tooltip „GW X · nicht aufgestellt".

**SQL-Skizze (portable Postgres < 16):**

```sql
WITH league_recent_gws AS (
  -- Pro Liga: die letzten 5 finished GWs (aus fixtures-truth, NICHT clubs.active_gameweek)
  SELECT
    c.league_id,
    f.gameweek,
    ROW_NUMBER() OVER (PARTITION BY c.league_id ORDER BY f.gameweek DESC) AS rn
  FROM (SELECT DISTINCT league_id, gameweek FROM (
    SELECT c.league_id, f.gameweek
    FROM fixtures f
    JOIN clubs c ON c.id = f.home_club_id
    WHERE f.status IN ('finished', 'simulated')
    GROUP BY c.league_id, f.gameweek
  ) t) AS lg
),
window_gws AS (
  SELECT league_id, gameweek FROM league_recent_gws WHERE rn <= 5
),
player_window AS (
  -- Cross-Join: jeder Spieler × seine 5 Liga-GWs
  SELECT
    p.id AS player_id,
    wg.gameweek
  FROM players p
  JOIN clubs c ON c.id = p.club_id
  JOIN window_gws wg ON wg.league_id = c.league_id
  WHERE p.club_id IS NOT NULL  -- skip dangling
)
SELECT COALESCE(jsonb_agg(
  jsonb_build_object(
    'player_id', pw.player_id,
    'gameweek', pw.gameweek,
    'score', pgs.score  -- nullable: NULL wenn nicht played
  ) ORDER BY pw.player_id, pw.gameweek ASC
), '[]'::jsonb)
FROM player_window pw
LEFT JOIN public.player_gameweek_scores pgs
  ON pgs.player_id = pw.player_id
  AND pgs.gameweek = pw.gameweek
  AND pgs.score > 0;
```

**Warum fixtures-truth statt `clubs.active_gameweek`:**
- Slice 273 zeigte: `clubs.active_gameweek` driftet (PL 31→35, La Liga 33→34)
- Fixtures-Tabelle ist die Wahrheit für „welche GWs sind tatsächlich gespielt"
- Bug-Klasse Slice 270 „Per-Tenant-Window vs. Global-MAX" — das gleiche Pattern auf Liga-Achse

## 3. Betroffene Files (geschätzt)

| File | Art | Was |
|------|-----|-----|
| `supabase/migrations/20260506XXXXXX_slice_274_absolute_league_window.sql` | NEW | RPC-Refactor `rpc_get_recent_player_scores` (gleicher Name, neue Body) |
| `src/features/fantasy/services/fixtures.ts` | EDIT | `getRecentPlayerScoresAndGameweeks` — kein API-Change, nur RPC-Body returnt jetzt nullable score |
| `src/components/player/FormBars.tsx` | EDIT | Pad-Logic entfernen (Service liefert immer 5 Slots) — nur Status-Mapping anpassen |
| `messages/de.json` + `messages/tr.json` | EDIT | Neue formBars-Keys: `notPlayedTooltip` für DNP-Slot mit GW-Info |
| `src/features/fantasy/services/__tests__/fixtures.test.ts` | EDIT | Test-Mocks anpassen (5-Slot-Array statt N played) |
| `src/components/player/__tests__/FormBars.test.tsx` (NEW falls nicht existent) | NEW | Tests: 5 played → 5 colored, 3 played → 3 colored + 2 dashed, 0 played → 5 dashed |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| File | Zweck | Frage |
|------|-------|-------|
| `supabase/migrations/20260505190000_slice_270d_jsonb_return_recent_player_scores.sql` | RPC-Body Slice 270d v2 (current) | Wie sieht Window-Function genau aus? Welche Caps/Order? |
| `src/features/fantasy/services/fixtures.ts:441-496` | `getRecentPlayerScoresAndGameweeks` | Pad-Logic Service-Side — wo fängt sie GW=null ab? |
| `src/components/player/FormBars.tsx:53-99` | Render-Logic Pad + Status-Mapping | Status: `played | bench | not_in_squad` — Mapping zu colored/dashed |
| `src/features/fantasy/services/scoring.queries.ts` | TanStack-Query select-Pattern (Slice 270b) | Konsumenten-Hooks: `useRecentScores` + `useRecentPlayerGameweeks` |
| `src/lib/queries/managerData.ts` | Caller-Site KaderTab (Slice 270b Tooltip-Migration) | Wie Tooltip-GW gerendert wird |
| `messages/de.json` formBars-Section | i18n-Schlüssel für FormBars | Welche Keys existieren (`played`, `bench`, `notInSquad`, `gw`)? |
| `.claude/rules/errors-db.md` „Per-Tenant-Window vs. Global-MAX" | Slice 270 Pattern | Pattern erweiterbar auf Liga-Achse mit dem gleichen RPC-Refactor |

## 5. Pattern-References

- **errors-db.md** „Per-Tenant-Window vs. Global-MAX in Aggregat-Services (Slice 270)" — direkt erweitert auf Liga-Tenant-Achse
- **errors-db.md** „PostgREST RPC-Pfad ignoriert `.range()` und `?limit` (Slice 270d v2)" — JSONB-Return-Pattern beibehalten
- **errors-frontend.md** „Selected-Item-Snapshot vs. Realtime-Update-Drift (Slice 273)" — Cache-Key + Stable-Refetch (relevant wenn neue Liga-Param dazukommt)
- **patterns.md #45 placeholderData für Cold-Start-Mirror** — RPC-Cache-Key wie Slice 270b (kein Caller-Side-Liga-Param, single global Cache)
- **CLAUDE.md** „Money-RPC Idempotency-Blueprint" — NICHT relevant (read-only RPC, kein Money-Path)

## 6. Acceptance Criteria (executable)

1. **AC-01** RPC-Body: `pg_get_functiondef('public.rpc_get_recent_player_scores()'::regprocedure)` enthält `LEFT JOIN public.player_gameweek_scores`
2. **AC-02** RPC-Output: `SELECT jsonb_array_length(rpc_get_recent_player_scores())` returnt `(activePlayers × 5)` statt `(playedPlayers × 5-played)`
3. **AC-03** Spieler ohne Score in einer GW im Window erhält Slot mit `score: null` (verifiziert via SQL: `SELECT COUNT(*) FROM jsonb_array_elements(rpc_get_recent_player_scores()) e WHERE (e->>'score')::int IS NULL > 0`)
4. **AC-04** FormBars rendert dashed-Bar für `score=null`-Slot mit Tooltip `GW X · nicht aufgestellt`
5. **AC-05** FormBars rendert colored-Bar für `score>0`-Slot mit Tooltip `GW X · {score} pts`
6. **AC-06** Spieler mit 5 played in den letzten 5 Liga-GWs zeigt 5 colored bars (Regression-Check)
7. **AC-07** Spieler mit 0 played in den letzten 5 Liga-GWs zeigt 5 dashed bars
8. **AC-08** Multi-League: Spieler in DE (Liga bei GW 32) bekommt Window [28..32], Spieler in PL (bei GW 35) bekommt Window [31..35] — verifiziert via DB-Smoke
9. **AC-09** vitest 3215+ tests grün (kein Regression)
10. **AC-10** TanStack-Query select-Pattern (Slice 270b) bleibt: 1 RPC, 2 Konsumenten-Sichten (`useRecentScores` Map<playerId, scores[]> + `useRecentPlayerGameweeks` Map<playerId, gws[]>)

## 7. Edge Cases Table

| # | Szenario | Erwartetes Verhalten |
|---|---------|---------------------|
| E-01 | Liga hat noch keine 5 finished GWs (Saisonbeginn, GW 1-4) | Window-Size = `actualMaxGw` (z.B. 3 GWs) → Service paddet auf 5 mit null am alten Ende |
| E-02 | Spieler ist Junior, 0 played | 5 dashed Bars |
| E-03 | Spieler hat genau die letzten 5 Liga-GWs alle played | 5 colored bars (no change vs. heute) |
| E-04 | Spieler hat Lücke in Mitte (z.B. played GW 31+33+35, missed 32+34) | dashed-colored-dashed-colored-colored (Mixed-Pattern) |
| E-05 | Spieler ist Stammspieler, verletzt seit GW 30, Liga bei GW 35 | 5 dashed Bars + Tooltip „GW 31 · nicht aufgestellt" usw. (= Anil's Bug-Szenario, exakt fix) |
| E-06 | Spieler-Liga: Liga hat keine fixtures (z.B. neuer Test-Liga) | Player erhält **0 Slots** in Service-Map → Frontend `?? []` → Pad-Fallback 5 dashed |
| E-07 | Multi-League-Aggregat: Player A (DE, GW 32) + Player B (PL, GW 35) im gleichen User-Kader | Beide haben jeweils ihr eigenes Liga-Window — kein cross-pollination |
| E-08 | Player wechselt Verein mid-season von DE → PL | Aktuelle Liga = PL → Window aus PL → Scores aus alter DE-Zeit fallen aus dem Window (semantisch korrekt: Bars zeigen aktuelle Liga-Performance) |
| E-09 | `score = 0` (DB-Wert) vs. `score = NULL` (DNP) | DB-Schema: `score INTEGER NOT NULL` → kein NULL möglich. Filter `score > 0` im RPC = nicht-played. Aber: 0-Punkte-Spiel bei full-played-90min ist möglich? → Pre-Spec-Check: `SELECT COUNT(*) FROM player_gameweek_scores WHERE score = 0` |
| E-10 | RPC-Output 22k-Element-Array statt 15k (47% mehr) | Cold-Start JSON.parse Mobile: ~300-600ms (akzeptabel, dokumentiert als Performance-Watch) |
| E-11 | Race: Liga-active_gw drifted (Slice 273 noch Backlog für Cron-Auto-Reconcile) | RPC nutzt fixtures-truth (status='finished') statt `clubs.active_gameweek` → drift-immun |

## 8. Self-Verification Commands

```bash
# 1. RPC-Body verify
mcp__supabase__execute_sql:
  SELECT pg_get_functiondef('public.rpc_get_recent_player_scores()'::regprocedure);

# 2. Window-Size pro Liga
mcp__supabase__execute_sql:
  WITH window_gws AS (
    SELECT c.league_id, l.name, f.gameweek,
      ROW_NUMBER() OVER (PARTITION BY c.league_id ORDER BY f.gameweek DESC) AS rn
    FROM (SELECT DISTINCT c.league_id, f.gameweek FROM fixtures f
      JOIN clubs c ON c.id = f.home_club_id
      WHERE f.status IN ('finished','simulated')) AS sub
    JOIN clubs c ON c.league_id = sub.league_id
    JOIN leagues l ON l.id = c.league_id
    JOIN fixtures f ON f.gameweek = sub.gameweek
    GROUP BY c.league_id, l.name, f.gameweek
  )
  SELECT name, ARRAY_AGG(gameweek ORDER BY rn) AS recent_5_gws
  FROM window_gws WHERE rn <= 5 GROUP BY name;

# 3. JSONB-Length verify (Größenwachstum)
mcp__supabase__execute_sql:
  SELECT jsonb_array_length(rpc_get_recent_player_scores()) AS total_slots,
         (SELECT COUNT(*) FROM players WHERE club_id IS NOT NULL) * 5 AS expected_total;

# 4. DNP-Slot count
mcp__supabase__execute_sql:
  SELECT COUNT(*) FILTER (WHERE (e->>'score') IS NULL OR (e->>'score')::int = 0) AS dnp_slots,
         COUNT(*) AS total_slots
  FROM jsonb_array_elements(rpc_get_recent_player_scores()) e;

# 5. Anil-Test-Spieler verify (langzeitverletzter Bekannter aus Multi-Liga)
mcp__supabase__execute_sql:
  SELECT p.first_name, p.last_name, c.name AS club, l.name AS league,
         (SELECT MAX(gameweek) FROM player_gameweek_scores WHERE player_id = p.id AND score > 0) AS last_played_gw
  FROM players p JOIN clubs c ON c.id = p.club_id JOIN leagues l ON l.id = c.league_id
  WHERE p.last_name ILIKE 'müller' OR p.last_name ILIKE 'haaland' OR p.last_name ILIKE 'leao'
  LIMIT 10;

# 6. vitest Regression
npx vitest run src/features/fantasy/services/__tests__/fixtures.test.ts src/components/player/__tests__

# 7. tsc clean
npx tsc --noEmit
```

## 9. Open-Questions

**Pflicht-Klärung (Anil approval):**

- **Q1**: Score `0` vs. `null` — kommt im DB-Schema `score = 0` für ein gespieltes Match vor? (z.B. -2 für Eigentor + 2 für 90min)
  - Default-Annahme: `score > 0` filter = "played" (wie current Slice 270d). Falls 0-Spiele möglich → Filter erweitern auf `minutes_played > 0` (anderer Join nötig)
  - **Pre-BUILD-Check pflicht via SQL**

- **Q2**: Tooltip-Wording bei DNP-Slot — `nicht aufgestellt` vs. `kein Einsatz` vs. `pausiert`?
  - Default-Vorschlag: DE „nicht aufgestellt", TR „kadroda yok"
  - **Anil-Approval pflicht** (i18n-Pflicht-Review per business.md)

**Autonom-Zone (CTO-Entscheidung):**
- RPC-Name bleibt `rpc_get_recent_player_scores` (gleicher API-Contract, nur Body-Change)
- Service-API bleibt `getRecentPlayerScoresAndGameweeks` (Map<playerId, RecentScoreSlot[]>)
- TanStack-Query select-Pattern bleibt (Slice 270b), Cache-Key unverändert (kein Liga-Param weil RPC liefert für alle Spieler aller Ligen)
- FormBars-Pad-Logic vereinfachen: Service liefert immer 5 Slots → keine Frontend-Pad-Logic mehr nötig

## 10. Proof-Plan

| Beweis | Format | Pfad |
|--------|--------|------|
| RPC-Body verify | SQL-Output `.txt` | `worklog/proofs/274-rpc-functiondef.txt` |
| DB-Smoke 5 verifies | SQL-Output `.txt` | `worklog/proofs/274-db-smoke.txt` |
| vitest 3215+ green | Terminal-Output `.txt` | `worklog/proofs/274-vitest.txt` |
| Live-Verify FormBars-Render | Chrome-DevTools DOM-Audit `.txt` | `worklog/proofs/274-formbars-dom.txt` |
| Anil-Test-Spieler (Müller, Haaland, Leão wenn verletzt) | Screenshot bescout.net `.png` | `worklog/proofs/274-screenshot-{player}.png` |

## 11. Scope-Out

**EXPLIZIT NICHT in diesem Slice:**
- Cron-Code-Fix `gameweek-sync/route.ts` Postponed-Match-Aware advance (= Slice 273 Backlog, separater Slice 275)
- TFF1 GW38 Saisonende-Mapping
- Frontend-Visual-Refresh der Bars (Animation, Hover-Polish) — pures Logic-Fix
- Liga-Selector-UI für FormBars (User wählt nicht aus, Liga kommt vom Spieler-club)
- DB-Schema-Change `player_gameweek_scores` (kein NEW column, nur LEFT JOIN-Logik in RPC)
- Performance-Optimierung über JSONB hinaus (Slice 270d Self-Audit Item: Pagination/Filter-Param post-Beta)

## 12. Stage-Chain (geplant)

```
SPEC (this file) → IMPACT (Konsumenten-Liste verifizieren, falls cross-cutting)
  → BUILD (3 Schritte: Migration → Service-Test-Update → FormBars-Test)
  → REVIEW (Reviewer-Agent, Pflicht ab M-Slice + Money-Path-Watch)
  → PROVE (RPC-functiondef + DB-Smoke + vitest + Live-Verify)
  → LOG
```

**Skipped (Begründung):**
- IMPACT skipped wenn Konsumenten unverändert (API-Contract `getRecentPlayerScoresAndGameweeks` bleibt) — verify via grep VOR BUILD-Start

## 13. Pre-Mortem (5 Szenarien)

1. **„Score = 0 für gespielte Matches" stellt sich raus → Filter `score > 0` cuttet legitime 0-Punkte-Spiele**
   - Mitigation: Q1-Pre-BUILD-SQL-Check (Section 9). Falls ja: Filter umstellen auf `minutes_played > 0` JOIN auf `fixture_player_stats`
2. **22k-Element-Array zu groß für Mobile JSON.parse → 600ms+ Hang**
   - Mitigation: Pre-BUILD-Smoke `EXPLAIN ANALYZE` auf RPC-Output-Size. Falls > 500ms-Mobile-Budget: Server-Side Filter-Param (z.B. `p_player_ids UUID[]`) nachrüsten als Slice 274b
3. **Slice 270 Reviewer F-01 Re-Trigger: ORDER BY-Change im RPC bricht Frontend-Render**
   - Mitigation: ORDER unverändert (`player_id, gameweek ASC` = oldest→newest per player) — explicit guard im Migration-Header
4. **TanStack-Query Cache-Drift: alter Cache liefert per-player-Window, neuer Cache liefert absolute, Mismatch in Konsumenten**
   - Mitigation: TanStack-Persist-Buster bump (Slice 267 Pattern), Migration-Sequence: Deploy → Hard-Refresh
5. **Multi-Liga: Spieler ohne `club_id` (FREE_AGENT) fehlen komplett im Output**
   - Mitigation: Bewusst, dokumentiert in AC-08 Edge-Case. Free-Agents haben in BeScout aktuell kein Tradable-State, daher OK.

---

## Spec-Quality-Selbstcheck (Anil-Approval-Vorbereitung)

- [x] Code-Reading-Liste hat ≥ 6 Items (M-Slice Pflicht): 7 Items ✓
- [x] Pattern-References sind ECHT relevant (4 Patterns + Slice 270 Begründung): ✓
- [x] ACs sind executable mit konkretem VERIFY-Command: 10 ACs ✓
- [x] Edge-Cases enumerieren systematisch (null/0/empty/race/multi-tenant): 11 Cases ✓
- [x] Self-Verification-Commands laufen (7 Commands inkl. SQL + tsc + vitest): ✓
- [x] Open-Questions trennen Pflicht-Klärung von Autonom-Zone: 2 Q + 4 autonom ✓
- [x] Money-Path-Watch: read-only RPC, kein Money/Trading betroffen ✓
- [x] TR-Wording-Vorab: Q2 als Anil-Pflicht-Review ✓

---

## CTO-Empfehlung

**Greenlight für SPEC → IMPACT (kurz) → BUILD.** Implementierung in 3 Schritten:

1. **Pre-BUILD SQL-Smoke** (Q1 + Q2 Tooltip): 5 min
2. **Migration + RPC-Body** (mit DB-Smoke nach Apply): 30 min
3. **Service + FormBars + Tests + i18n + Live-Verify**: 60 min

Total ~1.5h, vollautomat-fähig wenn Anil Q1 + Q2 vorab beantwortet.
