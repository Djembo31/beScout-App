---
paths:
  - "src/lib/services/**"
  - "src/lib/queries/**"
  - "src/app/api/**"
  - "src/types/**"
  - "supabase/migrations/**"
---

# Errors: Database & RPCs

Stand: 2026-05-05 · Split aus `common-errors.md` (Slice 186). Siehe auch `database.md` (Columns, CHECK), `trading.md` (Money-Regeln).

### Multi-Hop Cron-Bridge ohne Trigger: rating→fantasy_points→gw_score Divergenz (Slice 313 Doku, 2026-06-14)

**Bug-Klasse (latent):** Dieselbe Semantik wird über mehrere Tabellen per **RPC-Bridge** (nicht per Trigger) propagiert. Solange nur EIN Pfad die Bridge auslöst, desynct jede *out-of-band*-Mutation der Quell-Tabelle (manueller SQL-Backfill, partielle API-Reparatur) die Downstream-Tabelle **still** bis zum nächsten Bridge-Lauf. Zwei UI-Views, die je eine Seite der Bridge lesen, zeigen dann widersprüchliche Zahlen.

**Konkrete Kette (BeScout Rating-Semantik, 3-Hop):**
1. `fixture_player_stats.rating` (API-Football Match-Rating 1–10, ~48k non-null) — Quelle.
2. `fixture_player_stats.fantasy_points` = `round(rating*10)` (0–100, **gleiche Zeile**, dupliziert).
3. `player_gameweek_scores.score` (0–100, **andere Tabelle**) — geschrieben **nur** vom RPC `sync_fixture_scores`.

**Verkabelung (verifiziert Slice 313):** `sync_fixture_scores` läuft via `admin_import_gameweek_stats` (API-Import-Flow) + Manual-Fallback (`scoring.admin.ts:187`). **Kein DB-Trigger** verbindet `fixture_player_stats.rating`-UPDATE → `player_gameweek_scores`. → Wer `rating`/`fantasy_points` direkt patcht (Backfill-Skript, MCP-SQL), MUSS danach `sync_fixture_scores(p_gameweek)` aufrufen, sonst:
- **FormBars** (`rpc_get_recent_player_scores` → `player_gameweek_scores`) zeigen alten Score.
- **Match-Rating-Views** (`fixture_player_stats.rating`/`fantasy_points`, z.B. FixtureDetailModal) zeigen neuen Wert.

**Detection (pro GW, divergierende Spieler):**
```sql
SELECT pgs.player_id, pgs.gameweek, pgs.score,
       ROUND(AVG(fps.rating) * 10) AS expected_from_rating
FROM player_gameweek_scores pgs
JOIN fixture_player_stats fps ON fps.player_id = pgs.player_id
JOIN fixtures f ON f.id = fps.fixture_id AND f.gameweek = pgs.gameweek
WHERE pgs.gameweek = <gw> AND fps.rating IS NOT NULL
GROUP BY pgs.player_id, pgs.gameweek, pgs.score
HAVING pgs.score <> ROUND(AVG(fps.rating) * 10);
-- Rows > 0 → Bridge nicht gelaufen nach Rating-Mutation → sync_fixture_scores(<gw>) nachziehen.
```

**Color-Layer ist NICHT betroffen (verifiziert Slice 313):** `getScoreStyle` (`scoreColor.ts`) ist Single-Source 0–100; FormBars füttern `gw_score` (0–100), MatchTimeline `entry.score` (0–100), Fantasy-Badges `score`/`mvpScore` (0–100). **Kein Caller reicht ein rohes 1–10-`rating` durch** (`grep "getScore(Style|Hex|Bg|TextClass|BadgeStyle)\("` → alle Argumente 0–100-Skala). Die Divergenz ist also rein im **Zahlenwert** der zwei Tabellen, nicht in der Farb-Tier-Zuordnung.

**Regel:** Bei jedem manuellen Eingriff in `fixture_player_stats.rating`/`fantasy_points` → `sync_fixture_scores(p_gameweek)` als Pflicht-Folgeschritt. Backlog (post-API-Key): Bridge als AFTER-UPDATE-Trigger absichern (gleiche Klasse wie D39 Trigger+GUC-Invariant), damit out-of-band-Mutationen nicht mehr desyncen können.

**Beziehung:** Pattern-Familie mit „History-Gap-Tag-Sensitivität" (Slice 271, unten) + „Per-Tenant-Window vs Global-MAX" (Slice 270) — alle drei: temporale/cross-table-Aggregation, deren Frische an einem separaten Job hängt. **Reference:** S7-Registry §1.3/1.5 (`worklog/audits/2026-06-13/s7-source-of-truth-registry.md`), `scoring.admin.ts:154-190`, `fixtures.ts:629`.

### Leere Backfill-Platzhalter sehen aus wie „Balances ohne Audit-Trail" (Slice 306, 2026-06-13)

**Bug-Klasse (Audit-Fehldiagnose):** Eine Balance/Aggregat-Tabelle hat N Zeilen, die zugehörige Ledger/Audit-Tabelle hat 0 Zeilen. Schnell-Schluss: „N Balances ohne Trail = Compliance-Risiko". **Falsch, wenn die N Zeilen leere Backfill-Platzhalter sind** (alle balance/earned/spent = 0, alle mit identischem `updated_at` = ein Batch-INSERT). Dann gibt es keine echte Aktivität → leerer Ledger ist korrekt, kein Risiko. Sibling zu „Seed-Wert-Poisoning" (Slice 303, unten): plausibel aussehende DB-Rows verleiten zur Fehl-Klassifikation.

**Detection (PFLICHT vor jeder „Aggregat ohne Audit = Risiko"-Klassifikation):**
```sql
-- 1. Sind die "Balances" echt oder leere Platzhalter?
SELECT COUNT(*) AS rows, SUM(balance) AS sum_bal, SUM(earned_total) AS sum_earned,
       SUM(spent_total) AS sum_spent, MIN(updated_at) AS first, MAX(updated_at) AS last,
       COUNT(*) FILTER (WHERE balance=0 AND earned_total=0 AND spent_total=0) AS empty_rows
FROM <balance_table>;
-- sum_*=0 + empty_rows=COUNT + first==last → Backfill-Platzhalter, KEIN Risiko.

-- 2. Schreiben die Write-RPCs überhaupt in den Ledger? (sonst echtes Repair nötig)
SELECT proname, (pg_get_functiondef(oid) ILIKE '%INSERT INTO%<ledger_table>%') AS logs_ledger
FROM pg_proc WHERE proname IN ('<earn_rpc>','<spend_rpc>','<grant_rpc>');
-- logs_ledger=true für alle → Ledger-Pfad korrekt, leerer Ledger = nur dormant.

-- 3. Gibt es überhaupt Aufrufer im App-Code? (grep src/ nach den RPC-Namen)
-- 0 Aufrufer → dormant feature (Removal/Aktivierung = separate Produkt-Entscheidung).
```

**Lehre:** „Aggregat ohne Audit-Trail" ist erst dann ein Money/Compliance-Risiko, wenn die Aggregat-Werte **echt** sind UND der Write-Pfad den Ledger **nicht** schreibt. Beides verifizieren, bevor P1-Risiko gelabelt wird. **Reference:** Slice 306 (Wildcards) — S7-Registry hatte „35 Balances ohne Ledger = Compliance-Risiko P1" geclaimt; Investigation: 35 leere Platzhalter, RPCs schreiben korrekt, 0 Aufrufer → dormant, kein Risiko. Fix war nur `getWildcardHistory` swallow→throw.

### Seed-Wert-Poisoning in Fallback-Formel-Branch (Slice 303, 2026-06-13)

**Bug-Klasse:** Eine NOT-NULL-Spalte wird mit einem plausibel aussehenden Seed-Wert befüllt (z.B. `last_price = 10000` cents = 100 $SCOUT für alle ungetradeten Spieler). Eine Kanon-Formel/RPC nutzt diese Spalte als **Fallback-Branch** (`... → last_price > 0 → use last_price`). Der Seed vergiftet die Formel still: für 96 % der Zeilen liefert der Fallback Müll, der gespeicherte (andere) Wert ist aber korrekt. **Ein naiver Recompute-Backfill würde die korrekten Werte mit dem vergifteten Formel-Output überschreiben.**

**Symptom (Slice 303):** `recalc_floor_price` Fallback `... → last_price>0 → keep`. 3870 Spieler hatten `last_price=10000` (nur 15 mit echten Trades), 496 auf `0`. Health-Check: 3310/4556 (73 %) `floor_price` „divergieren" von der Formel — aber der gespeicherte `floor_price` (= IPO-Preis) war der **bessere** Wert; die Formel war vergiftet. Naiver `recalc`-Backfill hätte Yamal-Floor 200.000 → 100 $SCOUT zerschossen.

**Detection (PFLICHT vor jedem Recompute-Backfill einer Formel mit Fallback-Branch):**
```sql
-- 1. Seed-Cluster finden (identischer Wert massenhaft)
SELECT <fallback_col>, COUNT(*) AS rows,
  COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM <source> s WHERE s.fk=t.id)) AS has_real_source
FROM <table> t GROUP BY <fallback_col> ORDER BY rows DESC LIMIT 10;
-- Ein Wert mit hoher row-count + niedrigem has_real_source = Seed-Müll.

-- 2. Divergenz stored vs Formel messen — VOR Backfill
-- (CASE der Kanon-Formel nachbauen, COUNT WHERE stored <> formel)
```

**Fix-Pattern: Hygiene VOR Formel-Vertrauen, nie umgekehrt.**
Untradete/Source-lose Zeilen auf den „nie-X"-Sentinel normalisieren (hier `0`, da Formel `> 0` prüft), NICHT die Formel über alle laufen lassen:
```sql
UPDATE <table> t SET <fallback_col> = 0
WHERE t.<fallback_col> <> 0
  AND t.id NOT IN (SELECT fk FROM <source> WHERE fk IS NOT NULL);  -- NULL-trap-safe
```
Danach stimmen gespeicherter Wert + Formel überein → Recompute/Konsolidierung sicher. Verify: Divergenz-Re-Check muss von hoch (73 %) auf ~0 fallen; Source-behaftete Zeilen (Snapshot-Summe) unverändert.

**Beziehung:** Pattern-Familie mit `errors-scraper.md` „Scraper Default-Poisoning (Slice 081)" — plausible Default-Werte, die wie echte Daten aussehen. Hier auf DB-Formel-Achse: der Seed ist nicht im Display sichtbar (Client fällt auf den richtigen gespeicherten Wert zurück), wird erst beim Backfill gefährlich. **Reference:** Slice 303 `supabase/migrations/20260613210000_slice_303_last_price_hygiene.sql`.

## Supabase / Postgres

### Tenant-Window Achsen-Erweiterung: Per-Player vs. Per-Liga (Slice 274, 2026-05-06)

**Bug-Klasse-Erweiterung:** Slice 270 ("Per-Tenant-Window vs. Global-MAX") spannte Player-Tenant-Achse vs. globalem MAX. Slice 274 zeigt: dieselbe Bug-Klasse hat **mehrere zulässige Tenant-Achsen** mit gegensätzlichen User-Effekten:

| Achse | Beispiel | Wenn FALSCH (Anti-Pattern) | Wenn RICHTIG |
|-------|----------|---------------------------|--------------|
| **Per-Player-Window** (ROW_NUMBER PARTITION BY player_id) | Slice 270 | Spieler verletzt seit GW 30, Liga bei GW 35 → Service liefert 5 played [GW26-30] → User sieht „on form, 1-2 verpasst" | Wenn ABSOLUTE Liga-GWs verzerrt sind (z.B. cross-league mit lagging Tenants und kein per-tenant-Reconcile) |
| **Per-Tenant-Window (Liga)** mit absoluter MAX-pro-Tenant + LEFT JOIN | Slice 274 | Wenn Liga-Lag noch nicht gefixt ist (Slice 273 pre-Heal) → Stammspieler in lagging Liga zeigen 5/5 dashed obwohl spielen | Wenn Liga-Truth aus fixtures-Status sauber ist |

**Decision-Tree für neue Aggregat-Services mit „letzte N pro Tenant":**

1. Gibt es Aggregat-Drift in der Tenant-Achse? (Liga-Lag, Active-Counter-Drift, etc.)
   - JA → Erst die Drift fixen (Slice 273-Pattern), DANN absolutes Window
   - NEIN → Absolutes Tenant-Window ist FPL-Standard (DNP-Spieler werden visuell als „nicht aufgestellt" sichtbar)
2. Sub-Frage: Soll DNP visuell unterscheidbar von „played mit 0 Punkten" sein?
   - JA + Performance OK → Differential-JOIN auf transactional Layer (z.B. fps.minutes_played > 0)
   - JA + Performance kritisch → Pragma: NULLIF(score, 0) — opfert Bench/Cameo-Differenzierung für Frequency
   - NEIN → JOIN ohne Filter — alle pgs-rows = played

**Performance-Trap (Slice 274 v1→v2 Heal):** Differential-JOIN via `LEFT JOIN fps + GROUP BY + SUM(minutes_played)` kostet 8× mehr (951ms vs 125ms) wenn `players` als Seq Scan + Hash Aggregate kombiniert. Pragma `NULLIF(score, 0)` ist 100% drop-in same-cost und löst 95% des Differenzierungs-Bedarfs.

**Beispiel-Migration:** `supabase/migrations/20260506100000_slice_274_absolute_league_window.sql`

```sql
-- Tenant-Window: 5 letzte finished GWs per Liga
WITH league_recent_gws AS (
  SELECT league_id, gameweek,
    ROW_NUMBER() OVER (PARTITION BY league_id ORDER BY gameweek DESC) AS rn
  FROM (SELECT DISTINCT league_id, gameweek FROM fixtures
    WHERE status IN ('finished','simulated') AND league_id IS NOT NULL) sub
),
window_gws AS (SELECT league_id, gameweek FROM league_recent_gws WHERE rn <= 5),
player_window AS (
  -- Cross-Join Spieler × ihr Liga-Window
  SELECT p.id AS player_id, wg.gameweek
  FROM players p JOIN clubs c ON c.id = p.club_id
  JOIN window_gws wg ON wg.league_id = c.league_id
  WHERE p.club_id IS NOT NULL
)
SELECT jsonb_agg(jsonb_build_object(
  'player_id', pw.player_id, 'gameweek', pw.gameweek,
  'score', NULLIF(pgs.score, 0)  -- score=0 → NULL → dashed
) ORDER BY pw.player_id, pw.gameweek ASC)
FROM player_window pw
LEFT JOIN player_gameweek_scores pgs
  ON pgs.player_id = pw.player_id AND pgs.gameweek = pw.gameweek;
```

**Reference:** Slice 274 Spec `worklog/specs/274-form-bars-absolute-league-window.md`. Pattern-Beziehung: erweitert Slice 270 „Per-Tenant-Window vs. Global-MAX" um die zweite Tenant-Achse (Liga statt Player) + dokumentiert die NULLIF-vs-Differential-JOIN Performance-Trap.

### PostgREST RPC-Pfad ignoriert `.range()` und `?limit` (Slice 270d v2, 2026-05-05)

**Bug-Klasse:** Erweiterung von "PostgREST 1000-row cap" (siehe `common-errors.md §1`) auf RPC-Achse. Bei TABLE-Return-RPCs **ignoriert PostgREST den Range-Override** den Supabase-JS via `.range(start, end)` als URL-Param `?offset=X&limit=Y` an die RPC-URL hängt. Server cappt hart bei 1000 Rows, Response-Header zeigt `content-range: 0-999/*` trotz `?limit=100000`.

**Symptom (Slice 270d Live-Bug 2026-05-05):**

`rpc_get_recent_player_scores()` returnt `TABLE(player_id, gameweek, score, ...)`. DB-Smoke `SELECT COUNT(*)` = 15.350 Rows. Client `supabase.rpc('rpc_get_recent_player_scores').range(0, 99999)` produzierte:
- Request-URL: `POST .../rpc/rpc_get_recent_player_scores?offset=0&limit=100000`
- **Response-Header:** `content-range: 0-999/*` ← nur 1000 Rows
- DOM-Audit: alle 12 FormBars-Container in Marktplatz "Mein Kader" rendern 5 dashed bars statt farbige (Service-Map war leer für Player-IDs außerhalb der ersten ~200).

`.range()` für `.from().select()` setzt einen `Range`-HTTP-Header und wird respektiert. Bei `.rpc()` wird stattdessen ein URL-Query-Param geschrieben — der wird vom PostgREST-RPC-Handler aktiv ignoriert.

**Fix-Pattern: JSONB-Aggregation als Single-Row-Return.**

Statt `RETURNS TABLE(...)` mit Set-Output liefert die RPC einen einzelnen JSONB-Array-Wert (1 Row × 1 Column = kein Cap):

```sql
DROP FUNCTION IF EXISTS public.<rpc_name>();

CREATE OR REPLACE FUNCTION public.<rpc_name>()
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      '<col1>', col1,
      '<col2>', col2,
      ...
    ) ORDER BY <sort_cols>
  ), '[]'::jsonb)
  FROM (
    -- subquery (window function etc.)
  ) t
  WHERE <filter>;
$$;

REVOKE EXECUTE ON FUNCTION public.<rpc_name>() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.<rpc_name>() TO authenticated;
```

Service-Side parst das Result als JS-Array:

```ts
const { data, error } = await supabase.rpc('<rpc_name>');
if (error) throw new Error(error.message);
if (!data) return new Map();
const rows = data as Array<{ ... }>;  // Supabase-JS deserialisiert JSONB
// ... process rows ...
```

**Anti-Pattern:**

```ts
// FALSCH — .range() wird vom RPC-Pfad ignoriert
const { data } = await supabase.rpc('fn').range(0, 99999);

// FALSCH — .limit() ist KEIN Override-Path bei RPC
const { data } = await supabase.rpc('fn').limit(99999);
```

**Detection (vor BUILD bei aggregaten RPCs):**

```bash
# Pre-Implementation Check: erwartet die RPC mehr als 1000 Rows?
mcp__supabase__execute_sql:
  EXPLAIN (ANALYZE) SELECT * FROM public.<rpc_name>();
  -- "actual rows" > 1000 → JSONB-Return wählen, NICHT TABLE-Set + .range()
```

**Live-Verify (post-Deploy bei jedem Aggregat-RPC-Refactor):**

```js
// Chrome-DevTools-Network-Trace: Response-Header content-range prüfen
// content-range: 0-999/* → Cap getroffen, Fix nötig
// content-range: 0-N/* mit N > 999 → OK (oder JSONB-Return aktiv)
```

**Beziehung:**
- `common-errors.md §1` "PostgREST 1000-row cap MONEY-CRITICAL" — gleicher Bug-Familie auf `.from().select()`-Achse, Fix dort ist `.range()`-Loop. Bei RPC ist `.range()` NICHT der Fix.
- Slice 270d v1 (superseded) hat das verkannt — `.range()` an `.rpc()` angesetzt, Live-Verify zeigte content-range 0-999/* trotz request-limit=100000.
- Slice 270d v2 (live) hat auf JSONB-Return umgestellt.

**Reference:** Migration `20260505190000_slice_270d_jsonb_return_recent_player_scores.sql`. Service `src/features/fantasy/services/fixtures.ts:436-470` (`getRecentPlayerScores`).

### History-Gap-Tag-Sensitivität bei strict-7d-LEFT-JOIN (Slice 271 Discovery, 2026-05-05)

**Bug-Klasse:** Daily-Snapshot-Cron + Daily-Trend-Calc-Cron mit strict-7d-LEFT-JOIN (`past.date = CURRENT_DATE - INTERVAL '7 days'`). Wenn auch nur EIN Snapshot-Tag innerhalb des 7-Tage-Fensters fehlt (z.B. weil Cron 1× ausfiel, Schedule erst später aktiv wurde, Initial-Backfill am Tag X aber Daily-Cron erst am Tag X+5 live), bekommt der Trend-Calc 7 Tage später `past.mv_eur IS NULL` → CASE returnt NULL → ALLE Spieler bekommen `trend = NULL` für diesen Tag.

**Symptom (Slice 271 Discovery 2026-05-05):**

`cron_snapshot_and_calc_mv_trends` lief grün seit 2026-05-01 (cron_sync_log status=success). `players_mv_history` hat 31.892 Rows. ABER `players.mv_trend_7d` = 4556× NULL.

| Datum | snapshot_count | trend_updated_count | 7d-old Datum | History-Gap? |
|-------|---------------|----------------------|---------------|---------------|
| 2026-05-05 | 4556 | **0** | 2026-04-28 | ❌ GAP |
| 2026-05-04 | 4556 | **0** | 2026-04-27 | ❌ GAP |
| 2026-05-03 | 4556 | 4556 | 2026-04-26 | ❌ GAP — DB hatte non-NULL Werte vorher → IS DISTINCT FROM matched, alle auf NULL gesetzt |
| 2026-05-02 | 4556 | 4556 | 2026-04-25 | ✅ EXISTS (Initial-Backfill) → echte Trends |
| 2026-05-01 | 4556 | **0** | 2026-04-24 | ❌ GAP — alle waren schon NULL |

History gefüllt nur für: 2026-04-25 (Initial-Backfill) + 2026-04-30 ff. (Daily-Cron live). 4 Tage Gap dazwischen.

**Detection:**
```sql
-- Welche History-Daten fehlen?
SELECT date, COUNT(*) AS rows
FROM <history_table>
GROUP BY date
ORDER BY date DESC;

-- Direkter Check: Wie viele Trends wären HEUTE NULL?
WITH trend_calc AS (
  SELECT today.player_id,
    CASE WHEN past.mv_eur IS NULL THEN NULL ELSE 'computed' END AS state
  FROM <history_table> today
  LEFT JOIN <history_table> past ON past.player_id = today.player_id
    AND past.date = CURRENT_DATE - INTERVAL '7 days'
  WHERE today.date = CURRENT_DATE
)
SELECT state, COUNT(*) FROM trend_calc GROUP BY state;
```

**Fix-Pattern: LATERAL-Fallback-Lookup im Window [3d, 14d].**

Statt strict `past.date = CURRENT_DATE - INTERVAL '7 days'`:
```sql
LEFT JOIN LATERAL (
  SELECT mv_eur FROM <history_table> h
  WHERE h.player_id = today.player_id
    AND h.date BETWEEN CURRENT_DATE - INTERVAL '14 days' AND CURRENT_DATE - INTERVAL '3 days'
  ORDER BY h.date DESC
  LIMIT 1
) past ON true
```

Vorteile: Robust gegen 1-3 Gap-Tage. Trend-Semantik bleibt valid.
Nachteile: Trend-Threshold (`> past * 1.05`) leicht Skew-anfällig bei großen n — akzeptabel weil Trend-Klasse qualitativ bleibt.

**Anti-Pattern erkannt durch:**
- Self-Healing innerhalb 7-14 Tagen, danach steady-state — verleitet zu „blieb 1 Woche kaputt, kein Bug".
- Cron-Sync-Log zeigt `status=success` weil RPC nicht failed — Bug ist `trend_updated_count=0` bei `snapshot_count > 0`.
- Frontend-Konsument fehlt → kein User-Bug-Report → bleibt latent.

**Beziehung:** Cross-Cutting mit Slice 270 "Per-Tenant-Window vs. Global-MAX" (gleiche Bug-Klasse "Aggregations-Window-Drift", andere Achse). Pattern-Familie: temporale Aggregations brauchen robuste Fallback-Lookups gegen Gap-Tage.

**Reference:** Slice 271 Discovery `worklog/audits/2026-05-05/slice-271-discovery-mv-trend-perf-l5.md`. Live-Bug seit Slice 197d Deploy 2026-04-25, latent bis 2026-05-05 weil 0 Frontend-Konsumenten.

### Per-Tenant-Window vs. Global-MAX in Aggregat-Services (Slice 270, 2026-05-05)

**Bug-Klasse:** Slice-102 Pilot-Default-Pattern auf DB-Achse. Service mit Multi-Tenant-Daten (Liga, Region, Sub-Org) nutzt `MAX(timestamp_col)` global als Fenster-Anchor → Tenants mit Lag bekommen leere/null-Slots, obwohl ihre eigenen Daten existieren.

**Symptom (Slice 270 Live-Bug 2026-05-05):** `getRecentPlayerScores` in `fixtures.ts` baute Window aus `MAX(gw) WHERE score>0` über **alle 7 Ligen**. TR Süper Lig + TFF 1. Lig waren bei GW 37, EU-Ligen 4–5 GWs hinten:
- DE Bundesliga `latest_with_score = 32` → `lag_vs_global = 5` → **5/5 NULL-Slots**, 0% Form-Bars sichtbar
- EN Premier League `latest = 33` → lag 4 → fast leer
- ES La Liga `latest = 33` → lag 4 → fast leer
- IT Serie A `latest = 36` → lag 1 → meist 4/5

Plus: Galatasaray-Stamm-XI `last_appearance_gw = 30` während Süper Lig `max_gw = 37` (andere Clubs spielten weiter) → 0/5 Slots im globalen [33..37]-Fenster trotz vorhandener GW-Score-Rows. Anil-User-Sicht: „Form-Bars werden bei Galatasaray nicht angezeigt".

**Detection-Pattern:**
```sql
-- Pre-Fix Smoke: gibt's Tenant-Lag gegen globalen MAX?
WITH per_tenant AS (
  SELECT tenant_col, MAX(time_col) FILTER (WHERE filter_cond) AS latest_with_data
  FROM <data_table> JOIN <tenant_table> USING (...)
  GROUP BY tenant_col
),
global AS (SELECT MAX(time_col) AS global_max FROM <data_table> WHERE filter_cond)
SELECT pt.tenant_col, pt.latest_with_data, g.global_max,
       (g.global_max - pt.latest_with_data) AS lag
FROM per_tenant pt, global g
ORDER BY lag DESC;
-- Lag > 0 für > 1 Tenant → Bug-Verdacht.
```

**Fix-Pattern: Server-side Per-Tenant-ROW_NUMBER via RPC.**
```sql
CREATE OR REPLACE FUNCTION public.rpc_get_recent_<x>()
RETURNS TABLE(<tenant_id> uuid, <time_col> integer, <value> integer, position smallint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT <tenant_id>, <time_col>, <value>, position
  FROM (
    SELECT
      <tenant_id>, <time_col>, <value>,
      (ROW_NUMBER() OVER (PARTITION BY <tenant_id> ORDER BY <time_col> DESC))::smallint AS position
    FROM public.<data_table>
    WHERE <filter_cond>
  ) t
  WHERE position <= <N>
  ORDER BY <tenant_id>, <time_col> ASC;  -- oldest→newest per tenant
$$;
-- AR-44 REVOKE/GRANT-Block pflicht.
```

**Warum nicht Client-side group-by:**
- Skaliert nicht: 60k+ rows Daten-Transfer für eine 5-Slot-Visualisierung.
- Pre-Fix-Variante in Slice 270 hatte 2 Sequenz-Queries (latest_gw + window_rows). RPC ist 1 Round-Trip.
- ROW_NUMBER ist Postgres-native, STABLE-Marker erlaubt Caching.

**Anti-Pattern erkannt durch:**
- Plurale Tenants in der App (Multi-League, Multi-Region).
- Service-Aggregation mit globalem `MAX/MIN/LATEST` ohne Tenant-Group.
- Visuell: Konsumenten zeigen leere Slots/null-Werte trotz vorhandener Daten.
- Symptom-Verstärker: Pilot/Beachhead-Tenant ist „immer aktuell" (Default sieht ok aus, andere Tenants brechen still).

**Reference:** Slice 270 (`supabase/migrations/20260505180000_slice_270_per_player_recent_scores.sql` + `fixtures.ts:436-490`). Spec: `worklog/specs/270-perf-bars-multi-league-window.md`. Erweitert Slice 102 (Frontend-Achse) auf DB-Service-Achse.

**Beziehung:**
- Slice 102 (errors-frontend.md → Data-Format vs Component-Expectation Drift) — gleiche Bug-Klasse, andere Layer (Frontend Hardcode-Default).
- Slice 081d (errors-scraper.md → Cross-Club-Contamination) — Pattern-Familie „Liga-übergreifender silent corrupted Aggregat".
- Slice 200 (errors-frontend.md → PLAYER_SELECT_COLS Sync) — komplementär: Type-Drift vs. globale Annahme.

### Migration-Heal v1→v2 Same-Session (Slice 207, codifiziert Slice 211)

Wenn eine in der gleichen Session applied Migration semantisch falsch ist (Reviewer findet Logic-Bug, DB-Smoke findet falsche Aggregation, Audit-Verify findet wrong Output), kann sie via `mcp__supabase__apply_migration` mit GLEICHEM Filename-Stem + nur Timestamp-Bump (+5 Minuten) drüber-appliziert werden.

**Pattern:**
```
v1: 20260426150000_slice_207_most_owned_batch.sql
    ↓ (Reviewer/DB-Smoke findet semantischen Bug)
v2: 20260426150500_slice_207_most_owned_batch.sql  (+5 min)
    CREATE OR REPLACE FUNCTION ... (idempotent body)
```

**Voraussetzungen:**
- v1 verwendet `CREATE OR REPLACE FUNCTION` (idempotent — kein DROP nötig).
- v2 hat gleichen Function-Namen + gleiche Signatur (sonst pg_proc-Ambiguity → DROP alte Signatur explizit).
- Falls v1 Schema-Änderungen (CREATE TABLE/INDEX) hatte: v2 ist NICHT idempotent → DROP IF EXISTS + CREATE in v2.

**DB-Smoke gegen v2 als Single-Source-of-Truth:**
```sql
-- Nach v2 apply:
SELECT pg_get_functiondef('public.<rpc>(<args>)'::regprocedure);
-- Verifizieren: Body matcht v2-Logic, nicht v1-Logic.

-- Plus Functional-Smoke:
SELECT * FROM public.<rpc>(<test-params>) LIMIT 5;
-- Verifizieren: Output stimmt mit v2-Schema/Werten.
```

**Anti-Pattern:**
- v2 mit gleichem Timestamp wie v1 → Migration-Tracker sieht nur 1 File, v2 wird nicht applied.
- v2 ohne pg_get_functiondef-Verify → beide könnten geistert haben (siehe PATCH-AUDIT-Pflicht unten Slice 156).
- v1 + v2 als 2 separate Slice-Entries im log.md → wirkt wie 2 Failures. Besser: 1 Slice-Entry mit "v1→v2 Heal" als sub-step im selben Eintrag.

**Reference:** Slice 207 Most-Owned-Discovery-Batch v1 (CTO club-max-relative falsch) → v2 (Agent's total_managers_of_club, FPL-semantic "X% der Manager besitzen Y"). Pattern-Draft im Session-Handoff dokumentiert, jetzt promoted.

### Same-Day-Migration mit FRÜHEREM Timestamp als Vorgänger-Slice (Slice 326, 2026-06-15)

**Bug-Klasse:** Zwei Migrations am gleichen Tag redefinieren dieselbe RPC per `CREATE OR REPLACE`. Wenn der **spätere** Slice einen **niedrigeren** Filename-Timestamp trägt als der frühere, ist Filename-Order ≠ Slice-Order. Auf der Live-DB ist alles korrekt (apply_migration stempelt mit Aufruf-Zeit, später-applied gewinnt), aber bei `supabase db reset` / greenfield CI-Migration läuft die Filename-Reihenfolge → der ältere Slice überschreibt den neueren. Bei **Signatur-Änderung** (z.B. `p_league text` → `p_league_id uuid`) entstehen zwei koexistierende Overloads (alte text + neue uuid) → pg_proc-Ambiguity + toter Overload.

**Konkret (Slice 326):** Slice 326 (p_league_id) initial `20260615120000`, Slice 325 (p_league) `20260615130000`. 326 < 325 → greenfield: 326 setzt uuid, dann 325 setzt text drüber. Live-DB war korrekt (326 zuletzt applied), aber `db reset` hätte gebrochen.

**Fix:** Späteren Slice immer auf höheren Timestamp umbenennen (`git mv …120000… …140000…`, nach dem Vorgänger). Live-DB nicht re-applien nötig — nur File-Timestamp für Greenfield-Korrektheit.

**Detection (Pre-Commit bei RPC-redefinierenden Same-Day-Migrations):**
```bash
# Alle Migrations die dieselbe Funktion CREATE OR REPLACE'n, chronologisch:
grep -l "CREATE OR REPLACE FUNCTION public.<name>" supabase/migrations/*.sql | sort
# Der zeitlich SPÄTERE Slice MUSS den höheren Timestamp haben. Sonst rename.
```

**Reference:** Slice 326 Wave A — vom Cold-Context-Reviewer gefangen vor Commit. Verwandt mit "Migration-Heal v1→v2 Same-Session" oben (dort gleicher Timestamp = nur 1 File appliziert; hier umgekehrte Ordnung zwischen zwei verschiedenen Slices).

### CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT (Slice 156 FAIL)
- Beim Body-Rewrite einer SECURITY DEFINER RPC: ALLE Vorgaenger-Migrations greppen, neuester Body = current DB-State. **Nicht vom ersten Create ableiten.**
- Audit: `grep -rn "CREATE OR REPLACE FUNCTION public\\.<name>" supabase/migrations/` + zeitlich sortieren → letzter File ist Baseline. **Oder besser**: `pg_get_functiondef('public.<name>(args)'::regprocedure)` als live-truth.
- Gefahr: Silent-Revert aller Patches zwischen Original-Create und aktuellem Stand (Slice 156 v1: auth.uid()-Guard, min_tier-Gate, fee_config-Lookup alle weggeschrieben).
- Migration-Header: `-- Source-of-truth: <last-CREATE>.sql` + explizite `Applied patches`-Liste.
- Post-Apply: `pg_get_functiondef() ILIKE '%<expected-guard>%'` pro preserved Feature.

### Trigger+GUC-Invariant-Enforcement — generalisiert (D39, 2026-04-24)

Standard-Pattern fuer alle DB-Level Data-Integrity-Invariants, wo mehrere Code-Pfade die Invariant verletzen koennten (Scripts, Crons, RPCs, MCP-SQL). Code-Guards sind fragil, CHECK kann keine cross-row-Bedingungen, RLS ist wrong-layer.

**Template:**
```sql
CREATE OR REPLACE FUNCTION public.prevent_<X>() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- 1. Escape-Hatch
  IF current_setting('bescout.allow_<feature>', true) = 'true' THEN RETURN NEW; END IF;
  -- 2. NULL-Guards
  IF NEW.critical_field IS NULL THEN RETURN NEW; END IF;
  -- 3. Invariant-Check
  IF <violation> THEN RAISE EXCEPTION '<key>: <msg>' USING ERRCODE = 'unique_violation'; END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER <name> BEFORE <OP> ON public.<table>
  FOR EACH ROW EXECUTE FUNCTION public.prevent_<X>();

COMMENT ON FUNCTION public.prevent_<X>() IS
  'Slice <N>: <purpose>. Bypass: SET LOCAL bescout.allow_<feature> = true.';
```

**Bulk-Bypass:** `BEGIN; SET LOCAL bescout.allow_<feature> = 'true'; ...; COMMIT;`

**Applied:**
- Slice 179: `transactions` append-only (BEFORE UPDATE/DELETE). GUC `bescout.allow_transactions_mutation`.
- Slice 189: `players` ghost-prevention INV-39/40 (BEFORE INSERT). GUC `bescout.allow_player_ghost_insert`.
- Slice 317: `profiles` Spalten-Freeze (BEFORE UPDATE) — friert 11 sensible Spalten (verified/top_role/plan/level/subscription_*/is_demo/referral_code/invited_by[_club]) gegen direkten Client-`.update()`. **Variante:** Trigger-Funktion ist SECURITY **INVOKER** (kein DEFINER!) + Bypass via `current_user NOT IN ('authenticated','anon')` ODER GUC `bescout.allow_profile_admin_update`. So bypassen alle SEC-DEFINER-RPCs (laufen als postgres) automatisch → **kein Patch an Bestandscode**. Silent-Freeze (`NEW.col := OLD.col`) statt RAISE (legit Edits brechen nie). RLS `WITH CHECK` ungeeignet (kein OLD-Zugriff → kann „Spalte unverändert" nicht ausdrücken).

**Freeze-Trigger-Audit-Pflicht (Slice 317, Reviewer-Finding):** Vor einem Spalten-Freeze-Trigger MUSS man **beide** Achsen nach legitimen Writern der Frozen-Cols absuchen, nicht nur SQL-RPCs:
- SQL-RPCs/Trigger: `grep -rn "SET .*<col>" supabase/migrations/` (die bypassen wenn SEC DEFINER).
- **src-Layer Client-Writer:** `grep -rn "\.update(\{[^}]*<col>" src/` — ein authenticated-Client-`.update()` einer Freeze-Spalte wird silent eingefroren + die Funktion gibt trotzdem `{success:true}` → **Silent-Fail-Landmine**. Fix: solchen Write auf SEC-DEFINER-RPC umstellen (Slice 317b: `applyReferralCode` → `apply_referral_code`-RPC). Gleiche „Existenz ≠ vollständige Erfassung"-Familie wie D43/D46/D54.

**Kandidaten:** `trades` (append-only), `activity_log`, `holdings_history`, `audit_log`.

**Vollstaendige Diskussion + Alternativen:** `memory/decisions.md` D39. Pattern-Template: `memory/patterns.md` #29.

### Transactions Append-Only — enforced (Slice 179, Tier A2)
- `transactions` ist append-only. 2-Layer:
  1. `REVOKE UPDATE, DELETE FROM anon, authenticated` — Client-Rollen blockiert.
  2. BEFORE UPDATE/DELETE Trigger `transactions_append_only_guard` raises — blockt auch SECURITY DEFINER.
- Opt-In Bypass (siehe generalisiertes Pattern oben): `SET LOCAL bescout.allow_transactions_mutation = 'true'`.

### PostgREST nested-select Auth-Race (Slice 192/193)

PostgREST `parent.column, child:other_table(...)` gibt **silent NULL** für nested rows zurueck wenn JWT nicht final hydrated ist (Cookie-Resume-in-Progress). Service akzeptiert data-array, downstream Mapper appliziert Defaults — User sieht "Geister-Rows".

**Symptom-Decoder-Tabelle (Slice 192 — Manager Aufstellen-Tab):**

| Sichtbar im UI | Mapper-Default wenn `h.player == null` |
|----------------|-------------------------------------------|
| `#0` (Trikot) | `ticket: h.player?.shirt_number ?? 0` |
| `MID` (Position) | `pos: h.player?.position ?? 'MID'` |
| (leerer Name) | `first/last: h.player?.first_name ?? ''` |
| (leerer Kreis) | `imageUrl: h.player?.image_url ?? null` |
| `0 CR` (Floor) | `floorPrice: h.player?.floor_price ?? 0` |
| `0S 0T 0A` (Stats) | `matches/goals/assists: ?? 0` |

→ 7 Felder gleichzeitig auf Default-Wert = **eindeutige Signatur** fuer NULL-nested-Player. Symptom-zu-Code-Backtrack ohne Repro moeglich.

**Detection:**
```sql
-- Verify DB hat volle Daten (RLS deckt das ab)
SELECT COUNT(*) FILTER (WHERE p.first_name IS NULL OR p.image_url IS NULL)
FROM holdings h JOIN players p ON p.id = h.player_id WHERE h.user_id = '<uid>';
-- Wenn 0: Bug ist Frontend Auth-Race, nicht DB.
```

**Mitigation (Slice 192/193 Defense-in-Depth):**
1. **Type-Truth:** RPC-Return-Shape vs TS-Cast verifizieren (`pg_get_functiondef`). `MarketUserDashboard.holdings: DbHolding[]` (kein nested player, RPC liefert keine).
2. **Service-Filter:** `getHoldings` filtert `player == null` rows + `logSilentCatch` + all-ghost throw.
3. **Mapper-Throw:** `dbHoldingToUserDpcHolding` wirft `ghost_holding_row` i18n-key bei null-player.
4. **Auth-Gate:** `useHoldings` `enabled: !!userId && !profileLoading` (gates query auf vollstaendige Profile-Hydration).

**Live-Verify:** Chrome-DevTools-MCP `get_network_request` → `x-envoy-upstream-service-time` Header zeigt RPC-Server-Time. Wenn Server-Time <500ms aber Browser-Side Timeout: Race, nicht Slow-RPC.

**Referenz:** Slice 192 Proof `worklog/proofs/192-holdings-null-player-guard.md`, Slice 193 Proof `worklog/proofs/193-auth-state-perf.md`. Decision: `memory/decisions.md` D40-D43.

### Ghost-Prevention Player-Insert-Trigger (Slice 189)
- `players` BEFORE INSERT-Trigger `prevent_player_ghost_insert` erzwingt INV-39 (Cross-Club-Contamination: same first+last+contract_end mit anderem club_id) + INV-40 (Same-Club-Duplicates: exakter Name+Club-Match).
- Faengt ALLE Insert-Pfade: Scripts, Crons, manuelle SQL via MCP.
- GUC-Bypass fuer legitime Bulk-Imports: `SET LOCAL bescout.allow_player_ghost_insert = 'true'`.
- Referenz-Migration: `supabase/migrations/20260424200000_slice_189_ghost_prevention_trigger.sql`. Test: `src/lib/__tests__/db-invariants.test.ts` INV-39/40.

### Money-RPC Idempotency-Blueprint (Slice 178a-f — codifiziert 2026-04-24)
Generic `request_dedup_keys` Foundation (Slice 178) + Integration in 7 Money-RPCs (178a/c/e-a..e).

**Signatur-Erweiterung:** +`p_idempotency_key TEXT DEFAULT NULL` (backward-compat).

**Body-Integration (5 Bloecke):**
```sql
-- 1. DECLARE
v_result JSONB;  -- oder JSON, je RPC-Return
v_dedup_new BOOLEAN;
v_dedup_cached JSONB;

-- 2. NACH auth-guard + cheap validation, VOR DB-writes:
IF p_idempotency_key IS NOT NULL THEN
  SELECT is_new, existing_response INTO v_dedup_new, v_dedup_cached
  FROM public.check_or_reserve_dedup_key(p_user_id, p_idempotency_key, 300);
  IF NOT v_dedup_new THEN
    IF v_dedup_cached IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'idempotency_pending', 'idempotent_replay', true);
    END IF;
    RETURN v_dedup_cached;  -- Replay
  END IF;
END IF;

-- 3. ... normaler Body ...

-- 4. Vor RETURN: v_result assemblen statt inline-build
v_result := jsonb_build_object('success', true, ...);

-- 5. Completion-UPDATE
IF p_idempotency_key IS NOT NULL THEN
  UPDATE public.request_dedup_keys
  SET response = v_result, status = 'completed'
  WHERE user_id = p_user_id AND dedup_key = p_idempotency_key;
END IF;

RETURN v_result;
```

**REVOKE/GRANT renew (AR-44):** CREATE OR REPLACE resettet Privilegien — explicit REVOKE FROM PUBLIC + FROM anon + GRANT TO authenticated am Migration-Ende.

**DROP alte Signatur:** `DROP FUNCTION IF EXISTS public.<name>(<old-args>);` um pg_proc-Ambiguity zu vermeiden.

**Client-Side (178d+f):** `useSafeIdempotentMutation` mit `idempotencyNamespace: 'scope.action'` + `mutationFn: (vars, key) => service(..., key)`. Oder plain-async: `newIdempotencyKey('scope.action')` inline.

**Integrated RPCs:** buy_player_sc · buy_from_order · place_sell_order · place_buy_order · subscribe_to_club · liquidate_player · open_mystery_box_v2.

### ON CONFLICT validiert CHECK gegen INSERT-Defaults (Slice 075c)
- `INSERT ... ON CONFLICT DO UPDATE` validiert CHECK gegen Tuple-Defaults **bevor** UPDATE-Pfad. `.upsert()` erbt.
- Symptom: existierende Rows errorn wenn Defaults Constraint verletzen.
- Fix: echter `.update().eq('id', ...)` statt `.upsert()`.

### PL/pgSQL NULL-in-Scalar-Subquery — MONEY (2026-04-11)
- `IF (SELECT COALESCE(x, 0) FROM t WHERE ...) < y` ist FALSCH wenn keine Row. Scalar-Subquery auf leeres Set = NULL, `NULL < y` = NULL = falsy → Guard skipped.
- Richtig: `SELECT x INTO v_x; IF COALESCE(v_x, 0) < y THEN ...` ODER `IF NOT FOUND`.
- Audit: `grep 'SELECT COALESCE.*FROM.*WHERE' supabase/migrations/`

### PL/pgSQL Loop-Variable Shadowing in Nested Loops (Slice 195d, 2026-04-25)
- Nested `FOR v_i IN ... LOOP` mit gleichem Counter-Var-Namen ueberschreibt outer-Loop-Iter — bricht outer Iteration silent.
- PL/pgSQL hat KEIN block-scoped Counter wie JS `let i`. `FOR var IN range`-Variante deklariert `var` implicit als INTEGER im current Block-Scope.
- Fix: separate Variable per nested Loop. NIEMALS dieselbe FOR-counter-var in nested loops nutzen.
- Beispiel `score_event` Slice 195d: outer `FOR v_i IN 1..12 LOOP` (slot-loop) + inner `FOR v_bench_loop IN 1..3 LOOP` (bench-order-loop). Inner muss eigenen Counter haben.
- Audit: `grep -nE "FOR (v_i|i|j) IN.*LOOP" supabase/migrations/*.sql | sort -t: -k2 -n | uniq -f1 -c` — Migrations mit mehreren `FOR v_i IN`-Vorkommnissen sind Kandidaten.

### PL/pgSQL Loop-Variable Stale State (Slice 195d, 2026-04-25)
- DECLARE-Variablen sind **persistent** ueber Loop-Iterationen. Wenn Iter N einen Wert setzt und Iter N+1 die Setting-Branch nicht trifft (`IF v_player_id IS NOT NULL THEN ...`), traegt die Variable den Wert von Iter N rueber → STILLE False-Positive bei conditional Reads.
- Fix-Pattern: Am LOOP-Top alle iter-spezifischen Variablen explicit zuruecksetzen:
  ```sql
  FOR v_i IN 1..N LOOP
    v_did_sub := FALSE;
    v_starter_minutes := 0;
    v_sub_player_id := NULL;
    -- ... iter-Logic
  END LOOP;
  ```
- Regel: Alle Variablen, die innerhalb eines Loop-Bodys conditionally gesetzt werden, MUESSEN am Top jedes iteration-Cycles explizit resettet werden — nicht nur einmal vor dem Loop.
- Audit: Bei Migration-Reviews mit nested IF-Branches in Loops: pruefen welche Variablen conditionally geschrieben werden, dann checken ob am Loop-Top reset passiert.

### Trigger-Guard BEFORE UPDATE (Slice 081)
- BEFORE UPDATE auf money-Spalten kaskadiert auch bei flag-Spalten-Change → Trading-Block bei MV=0.
- Jeder Trigger-Body braucht `IF NEW.<col> IS DISTINCT FROM OLD.<col> THEN ...`.

### Holdings Zombie-Row (Slice 025)
- `UPDATE holdings SET quantity = quantity - X` → Row mit `quantity=0` bleibt. SUM/COUNT DISTINCT zaehlen mit.
- Fix: `AFTER UPDATE OF quantity WHEN (NEW.quantity = 0)` Trigger → `DELETE`.

### auth.users DELETE NO-ACTION-FK (Slice 028)
- 23 Tables mit NO-ACTION-FK verhindern `DELETE FROM auth.users` (Postgres 23503).
- Pre-Audit via `pg_constraint` (NICHT `information_schema` — cross-schema FKs ausgelassen).

### Vercel Cron-Limits + Function Timeouts (Slice 071 + 075)
- Hobby: max 2 Crons, 1×/Tag. Pro: 40 Jobs, **300s HTTP-timeout** (NICHT 900s).
- `maxDuration = 300` ist Hard-Limit. Sync-Routes >1000 rows timeouten — Batch-Pattern pflicht: `.in(all_ids)` + `Promise.all(20-50 parallel)`.

### pgBouncer Read-After-Write Transient (Slice 139)
- Direkter `.select()` nach `.upsert()`/`.insert()` findet Row **manchmal nicht**. pgBouncer-Pooling → verschiedene Connections, Read vor Commit-Visible.
- Fix: Optimistic deterministisch, NICHT blind `setX(server-read)` nach Write. Alternativ Reconcile-Delay 100-300ms.

## RPC Design

### RPC INSERT Column-Mismatch (J5 AR-42)
- CREATE OR REPLACE parst Body aber validiert keine Column-Existenz. Fehler erst beim Call.
- Beispiele: `open_mystery_box_v2` INSERT `equipment_rank` (heisst `rank`), `transactions(amount_cents)` statt `amount`+`balance_after`.
- Regel: Nach JEDER RPC-Migration: `information_schema.columns` gegen Body matchen.

### RPC Response camelCase/snake_case Cast-Mismatch
- RPC `jsonb_build_object('rewardType', ...)` → camelCase. Service `as { reward_type }` → ALLE Felder undefined.
- Check: `pg_get_functiondef()` → Return-Shape → Service-Cast vergleichen.

### Server-Validation Pflicht fuer Money/Fantasy RPCs (Slice 023 B4)
- Client-only Validation via direktem RPC-Call umgehbar. RPC ist einzige Wahrheit.
- Pattern: Billige Early-Exits (Allowlist, GK-Required, Slot-Counts, Captain-Empty) VOR teuren DB-Joins.

### pg_cron Fail-Isolation (Slice 024 B5)
- RAISE EXCEPTION auf Item #2 blockt Batch. Fix: `BEGIN ... EXCEPTION WHEN OTHERS THEN ... END` pro Item. Safety `LIMIT 50`.
- Return `{success, scored, skipped, errored, errors, ran_at}` fuer `cron.job_run_details`.

### Transaction-Type activityHelpers Sync (Slice 027)
- Neuer `transactions.type` braucht 3-File-Change: `activityHelpers.ts` + `de.json` + `tr.json`. Ohne Mapping: User sieht snake_case.

### RPC Anti-Patterns Top 5
- `::TEXT` auf UUID beim INSERT
- Record nicht initialisiert vor Zugriff in falscher Branch
- FK-Reihenfolge falsch (Child INSERT vor Parent)
- NOT NULL Spalte fehlt im INSERT
- Guards fehlen (Liquidation-Check in Trading-RPCs)

### Money-RPC Pricing-Formel Drift (Slice 108)
- RPC-Body = einzige Wahrheit. Frontend-Tier-Konstanten driften.
- Konkret: `liquidate_player` nutzte 10-Tier-Table obwohl CEO-Regel `fee = MV_EUR / 10` linear — 1,5× Drift.
- Prevention: Test-Invariant `SUCCESS_FEE_TIERS[i].fee === calcSuccessFee(...)` erzwingt Zero-Drift.
- Regel: Money-RPC mit `COMMENT ON FUNCTION` + `formula_version` in Return-JSON.

### Return-Shape: Discriminated Union (Slice 168, aus 165)
Siehe `database.md` Return-Shape-Regel. Kurz: Success IMMER `{success: true, ...}`, Error IMMER `{success: false, error: '...'}`. Service kann `if (!data.success) throw new Error(data.error)` einheitlich anwenden.

## Auth / Security

### RLS qual=true auf sensiblen Tabellen (Slice 014 + 019-021)
- `USING (true)` auf `authenticated` = keine Zugriffskontrolle. Bei holdings/transactions/activity_log/user_stats/orders = systemweiter Leak.
- Fix: `USING (auth.uid() = user_id OR <admin-check>)`.
- Cross-User-Aggregate (Orderbook, holder-count): SECURITY DEFINER RPC mit projiziertem Output (handle+is_own statt user_id).
- Rollout: (1) Projection-RPC deploy → (2) Service-Layer migriert → (3) Deploy verify → (4) RLS tighten.
- Guard: INV-26.

### SECURITY DEFINER + auth.uid()-Guard (Slice 005 + J4 Live-Exploit)
- J4-Live: `earn_wildcards` mintete 99.999 Wildcards als anon (reverted).
- Exploit-Klassen: **anon** (keine Grant-Beschraenkung) + **authenticated-to-other-user** (`p_user_id` ohne auth.uid()-Check).
- Pattern:
  ```sql
  REVOKE EXECUTE ON FUNCTION X FROM anon, authenticated;
  GRANT EXECUTE ON FUNCTION X TO authenticated;
  -- im Body:
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch';
  END IF;
  ```
  `IS NOT NULL` skippt service_role (Cron). `IS DISTINCT FROM` rejected cross-user.
- Guard: INV-21 + `public.get_auth_guard_audit()` RPC.

### Public-Wrapper + Internal-RPC Pattern (Slice 035 + 041)
- RPC mit `p_user_id` + auth-context: 2 Funktionen.
  - **Public Wrapper** `rpc_name(args_ohne_uid)`: GRANT authenticated, PERFORM internal(auth.uid()).
  - **Internal** `_rpc_internal(args, p_user_id)`: REVOKE authenticated, GRANT service_role only.
- Zweck 1: auth-context-injection fuer Client.
- Zweck 2: Trigger ruft Internal direkt (umgeht Guard bei `NEW.seller_id ≠ auth.uid()`).
- Doku: `COMMENT ON FUNCTION` fuer beide pflicht.

### RLS Policy Trap — neue Tabelle
- Neue Tabelle mit RLS braucht Policies fuer ALLE Client-Ops (SELECT + INSERT + UPDATE + DELETE). SELECT-only = silent write fail.
- Nach Migration: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`.

### SECURITY DEFINER Guard: Admin-only vs Public-safe (Slice 095)
- Beim Design: NICHT nur "wer darf Tabelle SELECT", sondern **"wo wird RPC aufgerufen?"**.
- Return-Shape KEINE user_ids/PII UND UI-page public: **kein Guard**, RPC ist selbst Security-Boundary via Projection.
- Return-Shape user_ids/PII: **admin-Guard pflicht**.
- Slice 095: `rpc_get_club_recent_trades` (public-safe) hatte falsch club-admin-guard → blockte `/club/<slug>` fuer non-admin. Fix: Guard weg.

## React Query + Supabase Cache

### setQueryData statt invalidateQueries bei deterministic optimistic (Slice 143)
- Nach `toggleFollow` war nur `qk.social.followerCount(userId)` invalidated. `qk.clubs.followers(clubId)` + `qk.clubs.isFollowing(uid, cid)` drifted bis 2min stale-cycle.
- Fix: `queryClient.setQueryData(key, (prev) => prev ± 1)` — deterministic, kein Refetch.
- Regel: Bei deterministischer Mutation (follow/unfollow, ±1) → `setQueryData`. Bei indeterministic (server uuid) → `invalidateQueries`.
- Pattern:
  ```ts
  queryClient.setQueryData<number>(qk.clubs.followers(clubId), (prev) =>
    prev === undefined ? prev : Math.max(0, prev + delta),
  );
  queryClient.setQueryData<boolean>(qk.clubs.isFollowing(uid, clubId), !wasFollowing);
  ```
