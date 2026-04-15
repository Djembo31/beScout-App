# Backend Journal: Multi-League Fixtures Import (Task 3 von 3)

## Gestartet: 2026-04-15

## Verstaendnis
- **Was:** Fantasy-Scoring fuer 6 Major Leagues unblocken. Alle 6 Ligen haben 0 Fixtures in `fixtures`-Tabelle, nur TFF 1. Lig hat 380. Ohne Gameweek-Struktur kein Fantasy-Event moeglich.
- **Betroffene Tabelle:** `fixtures` (INSERTs), `clubs` (lookup), `leagues` (lookup)
- **Betroffener Service:** N/A (nur Daten-Import-Script, kein Service-Layer)
- **Risiken:**
  - Schema-Drift zwischen `20260331_baseline_fantasy.sql` und Live-DB (Baseline heisst `api_fixture_id`, nicht `api_football_id`)
  - Club-Mapping-Gap: Fixture-Team-ID vielleicht nicht in `clubs.api_football_id`
  - Round-Parsing Edge-Cases (Playoffs, Cup-Runden)
  - Rate-Limit API-Sports (7.500/day → dieser Task braucht ~8-10 Calls)

## Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | Baseline-SQL sagt Column `api_fixture_id` (nicht `api_football_id`) | Muster in DB, kein Raten |
| 2 | Live-Schema VOR Script-Write introspecten | Schema-Drift-Regel (LEARNINGS AR-42) |
| 3 | Season = 2025 (hardcoded wie in import-league.mjs) | Konsistent mit existierendem Muster |
| 4 | Club-Lookup ueber `clubs.api_football_id` (direkt) | Existierende Daten so mappen wie in import-league.mjs |
| 5 | Club-Mapping-Gap: Fixture SKIPPEN mit Warning | Anil-Direktive "dokumentieren + nicht abbrechen" |
| 6 | ON CONFLICT Verhalten: via live-Schema entscheiden (UNIQUE pruefen) | Keine Annahme, echte Data |
| 7 | Dry-Run ZUERST fuer alle 6 Ligen → Count bestaetigen → Live-Run | Safe-First |

## Fortschritt
- [x] Task 1: Journal angelegt
- [x] Task 2: Pre-Flight Schema-Introspection (fixtures, leagues, clubs)
- [x] Task 3: api_football_ids verifizieren
- [x] Task 4: Dry-Run aller 6 Ligen
- [x] Task 5: Script-Write `scripts/import-fixtures.mjs`
- [x] Task 6: Live-Run
- [x] Post-Verify SELECT
- [x] Commit

## Pre-Flight Findings (Live DB Schema)

### `fixtures`-Tabelle LIVE Columns (wie tatsaechlich existiert)
```
id               UUID PRIMARY KEY
gameweek         INTEGER NOT NULL
home_club_id     UUID NOT NULL (FK clubs)
away_club_id     UUID NOT NULL (FK clubs)
home_score       INTEGER NULLABLE
away_score       INTEGER NULLABLE
status           TEXT NOT NULL DEFAULT 'scheduled' (distinct values in use: 'scheduled', 'finished')
played_at        TIMESTAMPTZ NULLABLE
created_at       TIMESTAMPTZ DEFAULT now()
league_id        UUID NULLABLE (FK leagues)
api_fixture_id   INTEGER NULLABLE (UNIQUE INDEX confirmed via onConflict test)
home_formation   VARCHAR(10)
away_formation   VARCHAR(10)
```

### Schema-Drift vs Briefing-Annahme
| Briefing sagte | Live-DB hat | Action |
|----------------|-------------|--------|
| `api_football_id` | `api_fixture_id` | Script nutzt `api_fixture_id` |
| `kickoff_at` | `played_at` | Script nutzt `played_at` |
| `home_goals`, `away_goals` | `home_score`, `away_score` | Script nutzt `*_score` |
| `venue_name` | (fehlt) | Venue wird NICHT importiert |
| `status` als 'NS'/'FT' | nur `'scheduled'` / `'finished'` in use | Status wird auf DB-Werte gemappt |

### Leagues-Status (alle 6 Target + TFF1)
```
BL1   api_id=78   active=true
BL2   api_id=79   active=true
LL    api_id=140  active=true
PL    api_id=39   active=true
SA    api_id=135  active=true
SL    api_id=203  active=true
TFF1  api_id=204  active=true   380 fixtures vorhanden
```

### Club-Mapping-Coverage
```
BL1: 18/18 clubs mit api_football_id ✓
BL2: 18/18 ✓
LL:  20/20 ✓
PL:  20/20 ✓
SA:  20/20 ✓
SL:  18/18 ✓
```
→ **Keine Mapping-Gaps erwartet**. Falls API-Football doch ein neues Team liefert das nicht in DB existiert: Fixture SKIPPEN + Warning.

### API-Football Response-Shape (bestaetigt mit /fixtures?league=78&season=2025)
```
results: 306  (Bundesliga 18 teams * 17 rounds * 2 = 306 ✓)
fixture.id            → api_fixture_id
fixture.date          → played_at (ISO timestamptz)
fixture.status.short  → map zu DB status
league.round          → parse "Regular Season - N" → gameweek INTEGER
teams.home.id         → lookup clubs.api_football_id → home_club_id UUID
teams.away.id         → dito → away_club_id UUID
goals.home / goals.away → home_score / away_score (nullable wenn NS)
```

### Status-Mapping (entschieden)
```
FT, AET, PEN          → 'finished'
NS, TBD, PST, CANC,
ABD, AWD, WO          → 'scheduled'
LIVE, 1H, HT, 2H, BT  → 'scheduled'  (Import-Zeit; Scoring-Cron updated live-games spaeter)
```

### Gameweek-Parse (entschieden)
- Regex: `/^Regular Season - (\d+)$/` → captures N
- Fallback: wenn nicht matched (Playoff/Cup) → SKIP Fixture + Warning
- Premier League bis Serie A haben "Regular Season - N" Format (bestaetigt)

### UNIQUE-Constraint
- `fixtures.api_fixture_id` hat UNIQUE Index (bestaetigt via onConflict-Test)
- Script nutzt `.upsert({...}, { onConflict: 'api_fixture_id' })` fuer Idempotency

### Rollback-Query
```sql
DELETE FROM fixtures
WHERE league_id IN (
  '4f968f3a-b70d-454d-9353-74a5ce288c79',  -- BL1
  '2c9768e6-63c3-4044-8660-053c60eeb9f2',  -- BL2
  '70ef464a-1351-480a-b36a-3a1c87bb130d',  -- LL
  '9f01e92c-db36-4c5d-958c-a87226303f20',  -- PL
  'ef641939-7683-4bea-a26f-12ea101e843c',  -- SA
  '05ec9bf8-d507-4ba2-ad76-ca7ea61c1099'   -- SL
);
```

## Runden-Log

### Runde 1 (PASS)
**Pre-Flight:** Live-Schema introspected, 5 Drift-Punkte vs Briefing dokumentiert, Schema-first-Regel befolgt.
**Dry-Run:** 6 Ligen, 2058 Fixtures, 0 skipped, 0 mapping-gaps, 6 API-Calls.
**Live-Run:** 2058 Fixtures inserted (306+306+306+380+380+380 = 2058).
**Post-Verify SQL:**
```
short | name                 | fixtures
------|----------------------|---------
BL1   | Bundesliga           |  306 ✓
BL2   | 2. Bundesliga        |  306 ✓
LL    | La Liga              |  380 ✓
PL    | Premier League       |  380 ✓
SA    | Serie A              |  380 ✓
SL    | Süper Lig            |  306 ✓
TFF1  | TFF 1. Lig           |  380 ✓
TOTAL: 2438
```
**Qualitaets-Checks:**
- BL1 gameweek-range 1..34 (distinct=34) ✓
- BL1 gameweek=1 fixtures = 9 (18 Teams / 2 ✓)
- PL: 20 distinct home-clubs + 20 distinct away-clubs → Club-Mapping komplett
- Status-Distribution sinnvoll: finished (~86%) + scheduled (~14%)

## AFTER Phase (Self-Review)

### 8-Punkt Backend-Checklist
- [x] Types propagiert — N/A (kein Type-Layer, nur Script)
- [x] i18n komplett — N/A (kein UI)
- [x] Column-Names korrekt — `api_fixture_id`, `played_at`, `home_score`, `away_score` gegen Live-Schema verifiziert
- [x] Alle Consumers aktualisiert — N/A (neuer Script, kein Impact auf bestehende Services)
- [x] UI-Text passt zum Kontext — N/A
- [x] Keine Duplikate nach Merge — `.upsert(..., { onConflict: 'api_fixture_id' })` idempotent
- [x] Service Layer eingehalten — N/A (Daten-Import-Script, nicht Runtime-Code)
- [x] Edge Cases bedacht:
  - Null-Guards: `fx.fixture?.id`, `fx.goals?.home ?? null`, `fx.fixture?.status?.short`
  - Nicht-Regular-Season-Rounds: SKIP mit Warning
  - Club-Mapping-Gaps: SKIP mit Warning (nicht abbrechen)
  - API-Errors: Abort pro Liga, nicht global

### Backend-spezifische Checks
- [x] CHECK Constraints eingehalten — `status` auf DB-Werte `'scheduled'` / `'finished'` gemappt
- [x] `invalidateQueries` nach Writes — N/A (Data-Import via Service-Key, kein React Query)
- [x] RPCs: REVOKE Pattern — N/A (kein RPC erstellt)
- [x] RPCs: Guards — N/A
- [x] RPCs: KEIN `::TEXT` auf UUID — N/A
- [x] RLS: Policies fuer ALLE Client-Ops — N/A (Script nutzt SERVICE_ROLE_KEY → RLS bypass; bestehende RLS fuer Reads durch Clients bleibt)
- [x] Fee-Split — N/A
- [x] Geld als BIGINT cents — N/A
- [x] FK-Reihenfolge — Parent (clubs) existiert vor Child (fixtures) INSERT, Null-Check auf club-lookup VOR INSERT

### Beweise
- tsc clean: `npx tsc --noEmit` → keine Errors (Script ist .mjs, ausserhalb TS-Scope, aber kein Drift in anderen Files)
- vitest: N/A (kein existierender Test fuer import-Scripts; ist Einmal-Daten-Import)
- DB-Query: siehe Post-Verify SQL oben (2438 total, alle 7 Ligen >=300)
- API-Calls: 6 / 7500 (0.08% des Tages-Limits)

## Rollback-Strategie
Falls der Import rueckgaengig gemacht werden muss:
```sql
DELETE FROM fixtures
WHERE league_id IN (
  '4f968f3a-b70d-454d-9353-74a5ce288c79',  -- BL1
  '2c9768e6-63c3-4044-8660-053c60eeb9f2',  -- BL2
  '70ef464a-1351-480a-b36a-3a1c87bb130d',  -- LL
  '9f01e92c-db36-4c5d-958c-a87226303f20',  -- PL
  'ef641939-7683-4bea-a26f-12ea101e843c',  -- SA
  '05ec9bf8-d507-4ba2-ad76-ca7ea61c1099'   -- SL
);
-- Erwartet: 2058 DELETE
```

## LEARNINGS
- **Schema-Drift zwischen Baseline-Migration und Live-DB war HART:** `api_fixture_id` (nicht `api_football_id`), `played_at` (nicht `kickoff_at`), `home_score`/`away_score` (nicht `home_goals`/`away_goals`). Preflight-Introspect via REST-API mit SERVICE-Key ist goldwert — Briefing-Annahme waere ohne Preflight in 5 Columns falsch gewesen.
- **onConflict-Test via REST ist Live-UNIQUE-Constraint-Check:** `.upsert(..., { onConflict: 'X' })` → wenn kein Error, existiert UNIQUE-Index auf X. Cleaner Pattern als pg_indexes-Query.
- **API-Football `/fixtures?league=X&season=Y` = 1 Call fuer alle Fixtures einer Liga:** Fuer 6 Ligen nur 6 Calls noetig (0.08% vom 7.500 Tages-Limit). Kein Paging bei <500 Fixtures pro Liga.
- **`league.round` parsing:** Format ist `"Regular Season - N"` fuer alle 6 Ligen. Fuer Cup-Runden/Playoffs (falls je: Champions League, DFB-Pokal-Bezug) wuerde das Pattern nicht matchen → SKIP-Warning, nicht Abort.
- **Status-Normalisierung:** DB nutzt nur `'scheduled'` / `'finished'`, API-Football liefert `FT`/`NS`/`LIVE`/etc. Scoring-Cron wird live-Spiele spaeter zu `finished` transitieren — Import-Zeit mappen wir alles ausser FT/AET/PEN auf `scheduled`.
- **Club-Mapping war 100% komplett:** Alle 114 Clubs der 6 Ligen haben `api_football_id` aus Task 1 (import-league.mjs) → 0 mapping-gaps im Fixture-Import.

## Offene Punkte (OPEN-FOUND)
- **Live-Game-Updates:** Dieser Import ist statisch (Snapshot 2026-04-15). Um laufende Spielstaende zu tracken, brauchen wir einen Cron der regelmaessig `/fixtures?league=X&season=2025&from=YYYY-MM-DD&to=YYYY-MM-DD` abfragt (Delta-Sync). Das ist **explizit OUT OF SCOPE** fuer diesen Task (Fantasy-Multi-League-Unblock = statische Gameweek-Struktur reicht).
- **Fixture-substitutions + fixture_player_stats:** Der Fantasy-Scoring-Cron (`cron-multi-league-journal.md`) fuellt diese Tabellen. Braucht **separat** Ausfuehrung pro Liga fuer abgeschlossene Gameweeks.
- **Venue-Info fehlt:** DB-Schema hat kein Venue-Field — API liefert `fixture.venue.{id,name,city}` die derzeit nicht gespeichert werden. Falls future Feature Venue zeigen soll → ALTER TABLE + Backfill Script. **Post-Beta Backlog.**
- **home_formation / away_formation:** Diese Spalten sind NULL fuer die neuen Fixtures. Das ist OK — API-Football liefert Formations nicht im `/fixtures`-Endpoint, sondern in `/fixtures/lineups/{id}`. Der Scoring-Cron wird Formations aus Lineup-Calls nachtragen.
- **Playoff-Rounds:** Aktuell alle 2058 Fixtures = "Regular Season - N". Falls Saison-Ende Playoffs addiert (z.B. La Liga Relegations), wuerden sie beim Re-Import via `round` nicht matchen und geskipped werden. → Kein Regression-Risiko, nur Lueckenhaftigkeit fuer Playoff-Tage.
- **Ready for Reviewer:** JA — Script ist komplett, Verify-SQL gruen, kein Impact auf bestehende Services/RPCs, Idempotent (re-runnable), Rollback dokumentiert.
