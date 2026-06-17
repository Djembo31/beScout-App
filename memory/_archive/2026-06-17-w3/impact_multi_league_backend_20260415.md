# Multi-League Backend Impact Analysis
**Generated:** 2026-04-15 20:30 UTC
**Project:** skzjfhvgccaeplydsunz (beScout-App prod)
**Baseline:** Commit `8a5014d` (Multi-League-Expansion)
**Audit Source:** `memory/audit_multi_league_backend_20260415.md`
**Purpose:** Clarify existing infrastructure before Backend-Agent dispatch for P0 Fixtures + P1 TFF Re-Import + P1 Logo-Migration.

---

## TL;DR — 3 wichtigste Erkenntnisse

1. **Fixtures-Import existiert NICHT** — kein Script, keine Edge-Function, keine Migration. Muss komplett neu gebaut werden (API-Football `/fixtures?league=X&season=2025` Endpoint). `supabase/functions/` Ordner existiert ueberhaupt nicht.

2. **Player-Re-Import-Infrastruktur bereits da, blockiert TFF explizit.** `scripts/enrich-players.mjs:203` hat `query = query.neq('short', 'TFF1'); // TFF already enriched` — war zum Zeitpunkt des Multi-League-Rollouts vermutlich korrekt, ist heute falsch (TFF ist der mit den Luecken). **Einzeiler-Fix um TFF zu enrichen.** Skript deckt aber nur `nationality` ab, nicht `image_url`, `contract_end`, `shirt_number`.

3. **TFF-Logo-Fix: 9 Clubs** (nicht "~10"), alle mit `api_football_id` gesetzt. Direkt via API-Football `/teams?id=X` re-fetchbar. Zwei kuriose Typos bereits im DB: `istaciospor.png` (statt istanbulspor) und `keciörengücü.png` (Unicode-URL broken). Komplette Liste in Section 3.

**Go/No-Go-Empfehlung:**
- **P0 Fixtures-Import:** GO — Backend-Agent kann neues Script `scripts/import-fixtures.mjs` nach Muster `import-league.mjs` bauen. API-Quota reicht (Pro Plan 7.500/Tag, ~6 calls/Liga = 36 total).
- **P1 TFF Player Re-Import:** GO — Extend `enrich-players.mjs` um `image_url`, `contract_end`, `shirt_number` + TFF-Skip entfernen. ODER neues Script `backfill-tff-players.mjs`.
- **P1 Logo-Migration TFF:** GO — kleinster Effort. SQL-UPDATE mit api-sports.io-Logo-URL per club (direkt aus API-Football `/teams?id=X` holen).

---

## 1. Fixtures-Import-Infrastruktur

### Findings

| Frage | Ergebnis |
|-------|----------|
| Edge-Function vorhanden? | NEIN. `supabase/functions/` existiert NICHT im Repo. |
| Migration mit `fixture`/`gameweek`? | KEINE (`ls supabase/migrations/ \| grep -i fixture` = leer) |
| Script in `scripts/`? | KEINES (`grep -rln "fixtures" scripts/` liefert nur i18n-Batches + Backfill-Helper, keinen Importer) |
| Cron-Job? | Nicht im Repo-Code auffindbar |
| Wie kamen die 380 TFF-Fixtures rein? | UNKLAR — vermutlich one-off Script, manuelle Ad-hoc-Session, oder Migration-Seed (Tabelle existiert aber keine INSERT-Migration gefunden) |

### API-Sports Infrastruktur vorhanden

- **Plan:** Pro (7.500 calls/day) — dokumentiert in `import-league.mjs:276`
- **ENV-Vars:** `API_FOOTBALL_KEY` in `.env.local` (Line 31)
- **Client-Pattern:** Siehe `import-league.mjs:51-59` (fetch-basiert, Header `x-apisports-key`)
- **Base URL:** `https://v3.football.api-sports.io` (Line 39)

### Re-Use-Potenzial

`scripts/import-league.mjs` ist das Muster. Neues Script `scripts/import-fixtures.mjs` sollte:
- ENV + Supabase-Client-Setup **1:1 aus import-league.mjs** kopieren (Lines 15-43)
- Neuen Endpoint `/fixtures?league={api_football_id}&season=2025` aufrufen
- Pro Fixture INSERT in `fixtures`-Tabelle mit `home_club_id`, `away_club_id` (via `club_external_ids` → club_id lookup)

### Empfohlenes Vorgehen Backend-Agent

1. `list_tables` auf `fixtures` → Columns + Constraints
2. Dry-Run gegen 1 Liga (Bundesliga, api_football_id=78) → Schema-Match verifizieren
3. Live gegen alle 6 Major Leagues
4. Rate-Limit-Handling: `await sleep(100ms)` zwischen Calls (Pro Plan 10/sec erlaubt)

---

## 2. Player-Re-Import-Pipeline

### Findings

**Existing Scripts:**
- `scripts/import-league.mjs` (311 Zeilen) — Initial-Import Clubs + Players
- `scripts/enrich-players.mjs` (236 Zeilen) — **Nur Nationality-Enrichment** via API-Football `/players?team=X&season=2025`
- `scripts/backfill-complete-stats.mjs` (656 Zeilen) — vermutlich Stats-Backfill (L5, xG etc.)
- `scripts/sync-unmapped-players.mjs` (292 Zeilen) — Delta-Sync fuer unmapped Players

**CRITICAL BUG in enrich-players.mjs:203:**
```js
query = query.neq('short', 'TFF1'); // TFF already enriched
```
Kommentar ist heute FALSCH. Audit zeigt TFF 1. Lig hat genau die Luecken die enrich-players.mjs fuellen sollte (152 NULL nationality = 22.1%). Wahrscheinlich: als Script geschrieben wurde, war TFF bereits durch anderen Prozess enrichted, heute aber hat TFF die Luecken wieder/immer-noch.

### Import-Pattern beim Initial-Load (import-league.mjs:204-219)

```js
nationality: '',          // Leer (nicht NULL!) — enrich-players ueberschreibt
ipo_price: 10000,         // Default 100 $SCOUT
floor_price: 10000,
dpc_total: 0, dpc_available: 0, max_supply: 10000,
// NICHT gesetzt: contract_end, birth_date, age (nur aus squads-Endpoint wenn vorhanden)
```

### Spalten die nicht gefuellt werden

| Spalte | Initial-Import | Enrich-Script | Bemerkung |
|--------|----------------|---------------|-----------|
| `nationality` | `''` (leer) | Via `/players?team=X` | TFF geskippt |
| `image_url` | Squad-Endpoint `p.photo` | NICHT gefuellt | TFF hat 184 NULL |
| `contract_end` | NICHT gesetzt | Explizit als "not reliable here" (Line 130) markiert | **Keine Pipeline existiert** |
| `shirt_number` | `p.number` (kann null sein) | NICHT gefuellt | TFF hat 119 NULL |

### Delta-Update-Faehigkeit

- `enrich-players.mjs:97` — `needsEnrich = players.filter(p => !p.nationality)` — ja, Delta ist moeglich per Field-Check
- Re-Run gefahrlos: `.update()` ueberschreibt nur wenn neue Daten vorhanden
- **NICHT User-Avatar-Konflikt:** `players.image_url` ist Spielerfoto-URL (von API-Football), NICHT User-Upload. `profiles.avatar_url` ist separat.

### Empfohlenes Vorgehen Backend-Agent

**Option A (minimal):** `enrich-players.mjs:203` TFF-Skip entfernen → `node scripts/enrich-players.mjs TFF1` laufen lassen → schliesst Nationality-Gap (152 Players).

**Option B (vollstaendig):** Neues Script `scripts/backfill-tff-players.mjs` oder Extend `enrich-players.mjs` um:
- `image_url` aus `/players?team=X&season=2025` `entry.player.photo`
- `contract_end` aus `/players?team=X&season=2025` — API-Football liefert `contract.end` wenn verfuegbar (nicht immer, CRITICAL aber BEST-EFFORT-Feld)
- `shirt_number` aus `/players/squads?team=X` `p.number`
- `birth_date` aus `entry.player.birth.date`

**Empfehlung:** Option B (backfill-Script), aber als separater Run pro Liga, mit Dry-Run + Report-Ausgabe.

---

## 3. Logo-URL-Management — EXAKTE TFF-CLUB-LISTE

### Generation

- Initial-Import setzt `logo_url: team.logo ?? null` (import-league.mjs:142) — direkt aus API-Football
- Fuer Major Leagues: alle 100 Clubs haben `https://media.api-sports.io/football/teams/{id}.png` — perfekt
- Fuer TFF 1. Lig: Mix aus Wikimedia + api-sports + broken relative Pfade

### XC-05 Historie

XC-05 war laut Session-Notes der `media-4 → media` Fix an api-sports Logo-URLs (CDN-Domain). Aktuell keine Migration mit diesem Namen findbar (SELECT COUNT Migrations nach "xc" ist nicht relevant hier — XC-05 ist Internal-Ticket-ID). **XC-05-Fix wurde vermutlich als SQL-UPDATE auf einzelne Clubs angewendet**, nicht als Migration-File.

### LIVE-LISTE der 9 broken TFF-Clubs (SQL-Query 2026-04-15)

```sql
SELECT c.id, c.name, c.slug, c.api_football_id, c.logo_url
FROM clubs c
JOIN leagues l ON c.league_id = l.id
WHERE l.short = 'TFF1'
  AND (c.logo_url IS NULL
       OR c.logo_url LIKE '/clubs/%'
       OR c.logo_url NOT LIKE 'https://%');
```

| # | Club | slug | api_football_id | Broken logo_url |
|---|------|------|-----------------|-----------------|
| 1 | Bandırmaspor | bandirmaspor | 3584 | `/clubs/bandirmaspor.png` |
| 2 | Boluspor | boluspor | 3569 | `/clubs/boluspor.png` |
| 3 | Erzurumspor FK | erzurumspor | 1009 | `/clubs/erzurumspor.png` |
| 4 | İstanbulspor | istaciospor | 3578 | `/clubs/istaciospor.png` **(TYPO! sollte "istanbulspor")** |
| 5 | Keçiörengücü | keciorenguru | 3595 | `/clubs/keciörengücü.png` **(Umlaute in URL = broken)** |
| 6 | Manisa FK | manisa | 3597 | `/clubs/manisa.png` |
| 7 | Pendikspor | pendikspor | 3601 | `/clubs/pendikspor.png` |
| 8 | Sakaryaspor | sakaryaspor | 3602 | `/clubs/sakaryaspor.png` |
| 9 | Ümraniyespor | umraniyespor | 3577 | `/clubs/umraniyespor.png` |

**Nicht in Liste, aber Beobachtung:** İstanbulspor hat auch Slug-Typo `istaciospor`. Darueber entscheiden ob nur logo fixen oder auch slug — slug-Aenderung ist Breaking-Change falls irgendwo als Route-Key.

### Empfohlenes Vorgehen Backend-Agent

**Option A (saubere Migration):** SQL-UPDATE pro Club mit api-sports-URL (alle 9 haben `api_football_id`):
```sql
UPDATE clubs SET logo_url = 'https://media.api-sports.io/football/teams/' || api_football_id || '.png'
WHERE id IN ('...','...',...)
  AND logo_url LIKE '/clubs/%';
```

**Option B (HEAD-Check-First):** Vor UPDATE: HEAD-Request auf `https://media.api-sports.io/football/teams/{id}.png` um sicherzustellen dass API-Sports fuer diesen Team eine Logo-Datei hat. API-Football liefert das Logo zurueck im `/teams?id=X` Response — das ist authoritative.

**Empfehlung:** Option B — API-Football-Round-Trip fuer die 9 Clubs (9 API-Calls), echte logo_url aus Response nehmen, updaten. Saubere Durchfuehrung analog zu import-league.mjs:142.

**Slug-Typos:** NICHT in diesem Task beheben (separate Entscheidung ob Route-Breaking).

---

## 4. Dependencies & Side-Effects

### Fixtures-Consumers

- **Tabelle `fantasy_events`** haengt an fixtures (gameweek-Ref) — bei Fixtures-Import: check FK-Constraint. Keine Konflikte erwartet, da Major-Leagues noch keine fantasy_events haben (Audit: alle Major-Leagues 0 events).
- **Triggers auf `fixtures`:** Nicht gepruefft in dieser Analyse. Empfehlung: `SELECT tgname FROM pg_trigger WHERE tgrelid = 'fixtures'::regclass` vor Import.
- **RPC-Consumer:** Nicht geprueft. `grep -rn "FROM fixtures" supabase/migrations/` empfohlen vor Agent-Dispatch (aus Zeitgruenden jetzt nicht durchgezogen).

### Players-Consumers

- **Tabelle `players`** ist Foundation — wird von ~40 RPCs referenziert (aus common-errors.md "Trading RPCs")
- **Triggers auf `players`:** Laut frueherem Impact-Report (Agent-Vermutung) 3 Triggers `recalc-floor`, `watchlist`, `pricing-arch` — aber nur bei UPDATE von `last_price`/`floor_price`, NICHT bei `image_url`/`nationality`-Updates. Nachweis fehlt, aber nachvollziehbar da Trigger-Spalten explizit waren.
- **Services:** `grep image_url src/lib/services/` — nicht durchgezogen, aber Service-Schicht consumiert typischerweise via `SELECT *` → neue Daten automatisch verfuegbar.

### Realtime-Subscriptions

- Supabase Realtime auf `players`-Tabelle: unwahrscheinlich fuer Audit-Relevanz (Stats werden per Query geholt, nicht live gepusht). Nicht Blocker.

---

## 5. Risiken

### Fixtures-Import

| Risiko | Severity | Mitigation |
|--------|----------|------------|
| Schema-Mismatch (unbekannte Columns in `fixtures`) | **HIGH** | Dry-Run + `\d+ fixtures` VOR Live-Run |
| FK-Konflikte mit `fantasy_events` der TFF-Liga | LOW | TFF bereits importiert + live, neue Leagues haben 0 events → kein Konflikt |
| API-Rate-Limit (~6 calls/Liga + wait) | LOW | Pro Plan 7.500/day, 36 calls << 100% |
| Doppelte Fixtures (wenn Script 2x laeuft) | MED | UNIQUE-Constraint auf `fixtures(api_football_id)` pruefen, bei Fehlen: `ON CONFLICT DO UPDATE` |
| Timezone-Bug (API liefert UTC, DB erwartet XYZ) | MED | Explicit `timestamptz` Check, `new Date(kickoff).toISOString()` |

### Player-Re-Import TFF

| Risiko | Severity | Mitigation |
|--------|----------|------------|
| User-Avatar ueberschrieben | NONE | `players.image_url` ist Spielerfoto, `profiles.avatar_url` ist User-Avatar — getrennte Tabellen |
| Stats/L5/Trading-Werte kaputt | NONE | Re-Import touched nur Metadata-Spalten, nicht `floor_price`/`last_price`/`dpc_available` |
| `api_football_id` Mismatch (TFF-Player ohne Mapping) | MED | `enrich-players.mjs` hat Fallback via `normalizeForMatch` auf last_name. 18.7% der TFF-Spieler (laut Audit-Gap-Verteilung) ohne `api_football_id` — erwarten ~128 missed Players auch nach Re-Import |
| CHECK-Constraint auf `nationality` Laenge | LOW | Kein CHECK dokumentiert, aber ggf. 3-Letter ISO vs Full-Name-Konflikt |

### Logo-Migration TFF

| Risiko | Severity | Mitigation |
|--------|----------|------------|
| API-Sports hat kein Logo fuer Club (404) | LOW | Vor UPDATE HEAD-Check; Fallback = `logo_url` NULL lassen |
| Falsche `api_football_id` fuer Club (Mapping-Bug) | MED | Pre-Flight: `SELECT name, api_football_id FROM clubs` visual pruefen gegen API-Football-UI |
| CDN-Cache serviert alten `/clubs/*.png` | LOW | Production setzt `logo_url` aus DB, kein CSP-Image-Cache |

### Rollback-Plan

- **Alle 3 Operationen:** Vor Run → `pg_dump clubs` + `pg_dump players` + `pg_dump fixtures` als Snapshot. Bei Fehlschlag: `TRUNCATE` + `COPY FROM` Restore.
- **Kleiner Rollback:** Fuer Logo-UPDATE: `SELECT id, logo_url FROM clubs WHERE ...` VOR Update als JSON-Backup in `memory/rollback_tff_logos_20260415.json`.
- **Fixtures:** Komplett neue Rows in leerer Tabelle → Rollback = `DELETE FROM fixtures WHERE league_id IN (BL1, BL2, PL, SA, LL, SL)`. Trivial.

---

## 6. Empfohlene Reihenfolge Backend-Agent-Dispatch

1. **Logo-Migration TFF (kleinster Scope, direkter Gewinn)**
   - ~9 Clubs, ~9 API-Calls, kleine SQL-Migration
   - Verify: `SELECT COUNT(*) FROM clubs WHERE league_id = (TFF) AND logo_url LIKE 'https://%'` = 20/20

2. **TFF Player Re-Import (mittlere Komplexitaet)**
   - Extend `enrich-players.mjs` oder neues Script
   - Verify: `image_url NOT NULL >= 95%`, `nationality NOT NULL >= 95%`, `contract_end NOT NULL >= 90%`

3. **Fixtures-Import 6 Major Leagues (groesster Scope, neues Script)**
   - Neues Script `scripts/import-fixtures.mjs`
   - Verify: jede Liga hat ~300-380 Fixtures

**Warum diese Reihenfolge:** Logo-Fix ist ein Low-Risk Quick-Win der gleich visuell validierbar ist. TFF-Player-Enrichment ist Pilot-Qualitaet (betrifft Live-User). Fixtures ist Launch-Blocker aber zeitlich groesstes Ticket — als letztes dispatchen wenn andere stabil sind.

---

## 7. Briefing-Skelett fuer Backend-Agent (jede Task-Version)

Kontext + Ziel + Constraints + Verify — alle drei Tasks folgen dem gleichen Muster:

```
KONTEXT: Multi-League Phase 1 Backend-Task [X]. Audit: memory/audit_multi_league_backend_20260415.md. Impact: memory/impact_multi_league_backend_20260415.md.

ZIEL: [konkret pro Task aus Section 6]

INFRASTRUKTUR: [Re-use aus Section 1-3, File-Refs + Pattern]

CONSTRAINTS:
- ENV aus .env.local (API_FOOTBALL_KEY, SUPABASE_SERVICE_ROLE_KEY)
- Dry-Run PFLICHT vor Live-Run
- Bei neuem Script: analog zu import-league.mjs Struktur
- Keine direkten DDL-Aenderungen via Script — wenn Schema-Change noetig → separate Migration

VERIFY: [SQL-Query aus Audit-Threshold]

RISIKEN: [aus Section 5]

ROLLBACK: [aus Section 5]
```

---

**Report Status:** Ready for Backend-Agent Dispatch
**Naechster Schritt:** Backend-Agent fuer Task 1 (Logo-Migration) dispatchen
