# Backend Journal: TFF Player-Field Backfill (Multi-League Phase 1 Task 2)

## Gestartet: 2026-04-15

### Verstaendnis
- Was: TFF 1. Lig hat 4 Gap-Felder — image_url 73.3%, nationality 77.9%, contract_end 76.1%, shirt_number 82.7%
- Betroffene Tabellen: `players` (UPDATE only, ~200 Rows)
- Root-Cause: initial /players/squads-Import liefert Photo+Number aber keine Nationality. enrich-players.mjs:203 skippt TFF explizit mit veraltetem Comment.
- Risiken:
  - API-Football `/players?team=X` benoetigt Pagination (20/Page, bis zu 3 Pages pro Club)
  - TFF-Clubs matchen alle gegen API-Football league=204&season=2025 (VERIFIED: 20/20)
  - `contract_end` ist im /players-Endpoint NICHT verfuegbar → best-effort skippen
  - `shirt_number = 0` existiert in DB (3 Rows mit Wert 0, nicht NULL) → nicht ueberschreiben
  - User-Avatar-Safety: `players.image_url` ist Spielerfoto (API-Football CDN), `profiles.avatar_url` ist User-Upload → getrennte Tabellen, kein Risiko

### Strategie
1. Pre-Flight: JSON-Snapshot der ~200 Gap-Players (id + 4 Fields) fuer Rollback
2. Script `scripts/backfill-tff-players.mjs` nach Muster von `fix-tff-logos.mjs`:
   - ENV_PATHS-Fallback (worktree → main)
   - Iteriere 20 TFF-Clubs
   - Pro Club `/players?team={api_football_id}&season=2025` (paginated, ~3 Pages)
   - Pro Club `/players/squads?team={api_football_id}` fuer shirt_number (bessere Datenquelle)
   - Match via `player_external_ids` (primary) mit Source `api_football_squad` → Fallback normalizeForMatch(last_name)
   - Delta-UPDATE: nur Fields WO bestehender Wert NULL/empty ist
3. Felder-Mapping:
   - `image_url` ← /players `player.photo` oder /squads `p.photo` (beide gleich)
   - `nationality` ← /players `player.nationality`
   - `shirt_number` ← /squads `p.number` (NICHT /players games.number — das ist Appearances-Count!)
   - `contract_end` ← KANN NICHT via API-Football gefuellt werden → DOKUMENTIERT aber nicht touched
4. Per-Field-Reporting nach Run

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | Neues Script statt enrich-players.mjs erweitern | Diff-lesbar, Scope-klar, alte Script bleibt unangetastet |
| 2 | contract_end SKIPPEN | API-Football /players-Endpoint liefert es nicht. Andere Source waere Transfermarkt-Scrape → Out-of-Scope |
| 3 | Zwei Endpoints kombiniert | /players hat nationality+photo, /squads hat number. Jeder Club 1-3 calls /players + 1 call /squads |
| 4 | Match via `player_external_ids` erst, Name-Fallback zweit | Primary-Key-Match ist robust, Name-Match ist fallback fuer legacy-imports ohne mapping |
| 5 | shirt_number=0 NICHT ueberschreiben mit API-Number | 0 ist gueltiger Wert in DB (3 Rows), koennte intentional sein (Saisonstart ohne Nummer). Nur NULL ueberschreiben |

### Target-Thresholds (Success)
- `image_url` NOT NULL >= 95% (aktuell 73.3%)
- `nationality` NOT NULL + != '' >= 95% (aktuell 77.9%)
- `contract_end` NOT NULL >= 90% (SOFT, kann nicht erreicht werden via API-Football)
- `shirt_number` NOT NULL >= 95% (aktuell 82.7%)

### Pre-Flight Baseline (verified 2026-04-15 20:50 UTC)
- Total TFF players: 689
- image_url: 505/689 = 73.3%
- nationality: 537/689 = 77.9%
- contract_end: 524/689 = 76.1%
- shirt_number: 570/689 = 82.7%

### API-Football Probe (Sivasspor team=1002, season 2025)
- /players paginated: 3 Pages, 20/Page = ~60 Players total
- /players liefert: id, name, firstname, lastname, nationality, birth.date, photo, statistics (NOT contract.end)
- /squads liefert: id, name, age, number (REAL shirt_number!), position, photo
- Rate-Limit: 10 req/sec Pro Plan, 20 Clubs × (3 pages + 1 squad) = ~80 calls, 150ms sleep = ~12s total

### Fortschritt
- [x] Journal angelegt
- [x] Pre-Flight Baseline verifiziert
- [x] API-Football Endpoint-Probe
- [x] Script schreiben
- [x] Dry-Run
- [x] Live-Run
- [x] Verify-SQL
- [ ] Commit

### Runden-Log

**Runde 1 — Dry-Run #1 (FAIL bei player_external_ids loading):**
- Fehler: "Failed to load player_external_ids: Bad Request"
- Root-Cause: `.in('player_id', allPlayers.map(...))` mit 689 UUIDs → URL-Laenge-Limit (PostgREST)
- Fix: Batching mit BATCH=200 aufsplitten

**Runde 2 — Dry-Run #2 (PASS):**
- 20 TFF-Clubs verarbeitet, 73 API-Calls, 182 matched / 16 unmatched
- Plan: 182 image_url Updates, 123 nationality, 14 shirt_number, 0 contract_end
- API-Cost: 73 Calls / 7.500 Pro-Quota = 1%

**Runde 3 — Live-Run (PASS):**
- 182/182 Updates applied, 0 failures
- API-Cost: 73 Calls (gleich wie Dry — kein extra Traffic)

**Runde 4 — Post-Verify:**
- image_url:    687/689 = 99.7% (was 73.3%) → target 95% PASS
- nationality:  660/689 = 95.8% (was 77.9%) → target 95% PASS
- contract_end: 524/689 = 76.1% (unchanged) → NOT IN SCOPE (API-Football liefert es nicht)
- shirt_number: 584/689 = 84.8% (was 82.7%) → target 95% MISS (API coverage-limit, 105 Players nicht im aktuellen API-Squad)

### AFTER-Phase Checks
- [x] Types propagiert: N/A (Daten-Korrektur, kein Type-Change)
- [x] i18n komplett: N/A (keine UI-Text-Aenderung)
- [x] Column-Names korrekt: `image_url`, `nationality`, `shirt_number`, `contract_end` (verifiziert via SELECT * Probe)
- [x] Alle Consumers aktualisiert: N/A — Felder sind Anzeige-Data (PlayerPhoto consumiert image_url, Flag-Component nationality, PlayerRow shirt_number), kein Contract-Change
- [x] Service Layer eingehalten: Script nutzt Service-Role direkt (Admin-Op, kein Client-Path)
- [x] Edge Cases bedacht:
  - shirt_number=0 nicht ueberschrieben (3 DB-Rows haben gueltigen Wert 0)
  - nationality='' nicht ueberschrieben wenn API nichts liefert
  - Unmatched players in rollback-file dokumentiert (16 Rows)
  - image_url-Delta: nur wenn NULL, nicht ueberschreiben wenn bereits gefuellt
  - Rate-Limit: 150ms sleep zwischen Calls
  - URL-length-Limit: Batching bei .in() mit 689 IDs
- [x] CHECK Constraints eingehalten: N/A (keine CHECK auf diese Felder)
- [x] RLS-Context: Service-Role bypasst RLS — Admin-Script, kein Client-Code
- [x] Rollback-Plan: JSON-Snapshot VOR UPDATE geschrieben, per-row reapplyable
- [x] User-Avatar-Safety: `players.image_url` ist Spielerfoto (api-sports CDN), `profiles.avatar_url` ist User-Upload — separater Table, kein Risiko

### OPEN-FOUND (nicht im Scope, dokumentiert)
1. **shirt_number unter 95% Threshold (84.8%)** — API-Football /squads-Endpoint liefert nur aktuell-registrierte Spieler (~30 pro Club von 30-45 lokalen). Restliche 105 Players (Reservisten/Akademie/Ex-Squad) nicht in API verfuegbar. Empfehlung: separate data-source wie Transfermarkt-Scrape post-Beta
2. **contract_end bleibt bei 76.1%** — API-Football /players-Endpoint liefert KEINEN contract.end. Dokumentiert, nicht behebbar via diese Quelle. Alternative Source (Transfermarkt oder TFF-Offizielle-API) out-of-scope
3. **16 unmatched players** — Namen wie "T I" (Tuerkisch-initialen) oder auslaendische Transfers ohne API-Football-Squad-Eintrag (Dia Saba, Yorro Savage, Ussumane Djabi). Full-Liste im rollback_tff_players_20260415.json post_run.unmatched
4. **name_fallback war Default fuer 176/182** — d.h. DB-`api_football_id` fuer die meisten TFF-Player hat nicht direkt gemacht. Moeglich dass bei initial-Import api_football_id NICHT korrekt gesetzt wurde. Nicht in-Scope dieses Tasks

### LEARNINGS (Draft für common-errors)
- **Supabase .in() + viele UUIDs:** URL-Length-Limit (PostgREST). Bei > ~100-200 IDs: batch-splitten
- **API-Football /players vs /squads:**
  - /players `statistics[0].games.number` = APPEARANCES COUNT, NICHT shirt_number (subtle Bug-trap)
  - /squads liefert shirt_number in Field `number` (Real value)
  - /players hat nationality+photo+birth, /squads hat number+photo+position
  - Kombinieren beide fuer komplette Daten
- **API-Football Coverage-Gap:** /squads liefert nur aktuell-registrierte Roster (~30 pro Club). Ex-Squad/Reserve-Players fehlen im API — shirt_number fuer diese nicht fuellbar

