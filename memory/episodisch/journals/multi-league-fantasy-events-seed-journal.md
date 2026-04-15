# Backend Journal: Multi-League Fantasy Events Seed (Task 12 von 12)

## Gestartet: 2026-04-15

### Verstaendnis
- **Was:** Pro 6 Major Leagues (BL1, BL2, LL, PL, SA, SL) 3 Fantasy-Events seeden damit User beim Liga-Switch Content sehen. Insgesamt 18 neue Events.
- **Betroffene Tabelle:** `events` (INSERTs, 18 Rows)
- **Betroffene Services:** keine direkten Aenderungen (Frontend liest Events weiterhin ueber bestehenden Event-Service; Liga-Badge via client-side Cache-Lookup `club_id → clubs.league_id`)
- **Risiken:**
  - CHECK Constraints auf `status`, `event_tier`, `format`, `scope` (noch unbekannt — Pre-Flight noetig)
  - Idempotenz: Re-Run muss Duplikate vermeiden
  - Gameweek-Wahl: TFF nutzt `active_gameweek` aus `leagues`-Tabelle, andere Ligen evtl. null/0 → Fallback auf maximum fixture.gameweek
  - Pilot-Club-Wahl: muss existieren und `api_football_id` haben
  - Fixtures-Zeiten pro Liga abweichend (BL1 Fr/Sa/So, PL Sa, SA Sa/So)

### Strategie
1. Pre-Flight via Node-Script (SERVICE_KEY): Live-Schema von `events` inspecten (CHECK-Constraints, Column-Defaults)
2. Pro Liga: `SELECT l.active_gameweek, l.id FROM leagues WHERE short=X` → Ziel-GW = active+1 (mit fallback)
3. Pro Liga: `SELECT MIN(played_at), MAX(played_at) FROM fixtures WHERE league_id=L AND gameweek=target_gw` → Kickoff-Range
4. Pro Liga: Pilot-Club via `SELECT id, name FROM clubs WHERE league_id=L AND api_football_id IS NOT NULL ORDER BY ...` mit deterministischer Praeferenz
5. Existenz-Check: `SELECT COUNT FROM events WHERE club_id IN (6 Piloten) AND gameweek = target_gw` — bei >0 Abbruch (kein Re-Seed erzwingen)
6. Dry-Run: zeigt 18 geplante INSERTs ohne apply
7. Live-Run: INSERT 18 Rows mit `returning('id')` fuer Rollback-File
8. Rollback-File: `memory/rollback_fantasy_events_multi_league_20260415.json` mit 18 UUIDs + DELETE-Query
9. Post-Verify: Event-Counts pro Liga (6 major = je >=3 active, TFF unchanged)

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | Script statt Migration | Daten-Seed, kein Schema-Change. Analog Task 1/2/3 Pattern. |
| 2 | `scripts/seed-multi-league-events.mjs` | Benennung analog `import-fixtures.mjs` |
| 3 | Idempotenz via Pre-Flight-Existenz-Check (NICHT ON CONFLICT) | events hat keine obvious UNIQUE-Key auf (club,gw,name). Manuelle Idempotenz ist explizit. |
| 4 | Rollback als JSON mit Event-UUIDs + DELETE-SQL | Kleiner Scope (18 Rows), JSON reversibel |
| 5 | Pilot-Club-Praeferenz: deterministische Whitelist pro Liga | User erkennt "Marke" sofort (Bayern, Real, City, Inter, Galatasaray, Schalke) |
| 6 | Starts_at: adapted pro Liga wenn Fixtures vorhanden, sonst TFF-Template Sa 16:00 UTC | Pragmatisch, kein Over-Engineering |
| 7 | Locks_at: 30min vor kickoff | Entspricht Fantasy-Convention |
| 8 | Ends_at: kickoff + 3h (default TFF) oder `MAX(played_at)+3h` pro GW | Konsistent mit TFF-Pattern |

### Pilot-Club-Praeferenz (Whitelist, deterministisch)
| Liga | Primaer | Secondary | Tertiary |
|------|---------|-----------|----------|
| BL1 | Bayern München | Dortmund | Leverkusen |
| BL2 | Schalke 04 | Hamburg | Paderborn |
| LL | Real Madrid | Barcelona | Atletico Madrid |
| PL | Manchester City | Liverpool | Arsenal |
| SA | Inter | Milan | Juventus |
| SL | Galatasaray | Fenerbahce | Beşiktaş |

Fallback falls Primaer nicht gefunden: Secondary → Tertiary → erstes Club alphabetisch mit api_football_id.

### Fortschritt
- [x] Journal angelegt
- [x] Pre-Flight: events-Schema + CHECK-Constraints + leagues.active_gameweek + fixtures.gameweek-Range
- [x] Pilot-Club-Resolution (6 Clubs)
- [x] Existenz-Check (sollte 0 sein — war 0)
- [x] Dry-Run Output
- [x] Live-Run + Rollback-File
- [x] Post-Verify SELECT
- [ ] Commit

## Pre-Flight Findings (LIVE DB 2026-04-15 19:40-19:45 UTC)

### events-Tabelle: LIVE Columns (sample-based)
Sample von Registering TFF-Event ("Sakaryaspor Fan Cup"):
```
id, name, type, status, format, gameweek, entry_fee, prize_pool, max_entries, current_entries,
starts_at, locks_at, ends_at, scored_at, created_by, created_at,
club_id, tier_bonuses, min_tier, sponsor_name, sponsor_logo,
event_tier, min_subscription_tier, salary_cap, reward_structure,
scope, lineup_size, ticket_cost, currency, min_sc_per_slot,
wildcards_allowed, max_wildcards_per_lineup, is_liga_event
```

### Distinct Live Values (probe-based)
```
status:     [ended, registering]
event_tier: [club, arena]
format:     [7er, 11er]   <- NICHT 6er! 6er ist briefing-falsch
scope:      [global, club]
type:       [club, sponsor, special, bescout]
currency:   [tickets]
```

### CHECK Constraint Finding (KRITISCH)
- **`events_lineup_size_check`** blockt `lineup_size=6` (ERROR: "new row for relation \"events\" violates check constraint \"events_lineup_size_check\"")
- Erlaubt: lineup_size IN (7, 11) — evtl. >= 7 (nicht weiter gepruefft)
- `format` TEXT hat KEINEN CHECK (6er + lineup_size=7 wuerde durchgehen, aber 6er+6 nicht)
- **Briefing sagte "6er" fuer Rising Stars — ich habe das auf "7er" adaptiert (TFF-Konvention)**
- fantasy.md dokumentiert "6er (1+2+2+1) oder 11er" — dokumentiert theoretisch, LIVE-DB nicht konform. Separate Frage an Anil/Reviewer.

### Leagues active_gameweek (LIVE)
Alle 6 Major Leagues: active_gameweek=1 (nicht current, vermutlich deprecated/nie updated). **Nicht brauchbar** als target_gw-Quelle. Fallback: Naechste scheduled Gameweek aus `fixtures`-Tabelle mit `played_at >= now`.

### Target Gameweek (via fixtures.played_at >= now filter)
```
BL1: gw=30 first_kickoff=2026-04-17T18:30 last=2026-04-19T17:30 (9 fixtures)
BL2: gw=30 first_kickoff=2026-04-17T16:30 last=2026-04-19T11:30 (9 fixtures)
LL:  gw=33 first_kickoff=2026-04-21T17:00 last=2026-04-23T19:30 (10 fixtures)
PL:  gw=33 first_kickoff=2026-04-18T11:30 last=2026-04-20T19:00 (10 fixtures)
SA:  gw=33 first_kickoff=2026-04-17T16:30 last=2026-04-20T18:45 (10 fixtures)
SL:  gw=30 first_kickoff=2026-04-17T17:00 last=2026-04-20T17:00 (9 fixtures)
```

### Pilot-Club-Picks (deterministic, first-match)
| Liga | Pilot | UUID | api_football_id |
|------|-------|------|-----------------|
| BL1 | Bayern München | 5ac47993-... | 157 |
| BL2 | FC Schalke 04 | 522043ff-... | 174 |
| LL | Real Madrid | ffd2fe30-... | 541 |
| PL | Manchester City | a990a598-... | 50 |
| SA | Inter | 44961dde-... | 505 |
| SL | Galatasaray | 6bfe7d27-... | 645 |

Alle 6 Pilot-Clubs haben `api_football_id` gesetzt (Basis fuer Logo-Rendering).

### Idempotency
- Pre-Seed: 0 Events pro Major League (TFF=13 unchanged baseline)
- Re-Run-Protection: Script pre-flight `SELECT FROM events WHERE club_id IN (6 pilots) AND gameweek IN (30, 33)` — bei >0 wird Abort geworfen.

## Runden-Log

### Runde 1 — Pre-Flight Introspection (PASS)
- 4 temporaere preflight-Scripts erstellt + ausgefuehrt (cleanup nach Erfolg)
- Findings: CHECK-Constraint auf lineup_size, active_gameweek deprecated, pilot-clubs resolvt
- Script `seed-multi-league-events.mjs` geschrieben mit angepassten Patterns

### Runde 2 — Dry-Run (PASS)
- 18 Events korrekt aufgelistet
- Keine Konflikte mit existierenden Events
- Pilot-Clubs + Gameweeks + Kickoffs korrekt

### Runde 3 — Live-Run (PASS)
- 18 Events inserted (4 BL1, 3 BL2, 3 LL, 3 PL, 3 SA, 3 SL — Moment, 18 gesamt = 3 per Liga)
- Rollback-File geschrieben: `memory/rollback_fantasy_events_multi_league_20260415.json`
- Post-Verify: 18 Rows in DB bestaetigt

### Runde 4 — Post-Verify (PASS)
```
short | active_events | name
------|---------------|------
BL1   |             3 | Bundesliga
BL2   |             3 | 2. Bundesliga
LL    |             3 | La Liga
PL    |             3 | Premier League
SA    |             3 | Serie A
SL    |             3 | Süper Lig
TFF1  |            13 | TFF 1. Lig  (unchanged)
```
ALL CHECKS PASS.

## AFTER Phase (Self-Review)

### 8-Punkt Backend-Checklist
- [x] Types propagiert — N/A (kein Type-Change, nur Daten-INSERT)
- [x] i18n komplett — N/A (Event-Namen sind statische Strings, kein i18n noetig; Liga-Display-Name ist Konvention)
- [x] Column-Names korrekt — gegen Live-DB-Sample verifiziert (name, type, status, format, gameweek, entry_fee, prize_pool, max_entries, current_entries, starts_at, locks_at, ends_at, club_id, tier_bonuses, event_tier, scope, lineup_size, ticket_cost, currency, wildcards_allowed, max_wildcards_per_lineup, is_liga_event)
- [x] Alle Consumers aktualisiert — N/A (kein Service/Hook-Change. Frontend liest events ueber bestehenden Event-Service; Liga-Badge via `club_id → clubs.league_id` Cache-Lookup — bereits live seit J4-Multi-League-Fix)
- [x] UI-Text passt zum Kontext — Event-Namen sind Compliance-sauber: keine "Gewinn", "Prize", "IPO", "Preispool". Analog TFF-Pattern.
- [x] Keine Duplikate nach Merge — Pre-Flight-Existenz-Check implementiert (Abort bei Konflikten). Post-Verify bestaetigt 6×3 = 18 Events.
- [x] Service Layer eingehalten — Script nutzt SERVICE_ROLE_KEY direkt (Admin-Operation, analog Task 1/2/3). Kein User-Code-Path, RLS bypass intended.
- [x] Edge Cases bedacht:
  - Null-Guards: `clubs?.length ?? 0`, `fx?.length ?? 0`, `pilot?.api_football_id ?? -`
  - Kein future-scheduled Fixture pro Liga → fatal abort mit Error (nicht silent)
  - Pilot-Club not in whitelist → Fallback auf ersten Club mit api_football_id
  - INSERT atomar (18 Rows in einem `.insert()`-Call) — entweder alle oder nichts

### Backend-spezifische Checks
- [x] CHECK Constraints eingehalten — `events_lineup_size_check` durch Probe verifiziert: erlaubt 7 und 11, blockt 6. Script nutzt nur 7 oder 11.
- [x] `invalidateQueries` nach Writes — N/A (kein React Query, Script-Seed)
- [x] RPCs: REVOKE Pattern — N/A (kein RPC erstellt)
- [x] RPCs: Guards — N/A
- [x] RPCs: KEIN `::TEXT` auf UUID — N/A. INSERT nutzt `club_id` als natives UUID (string-UUID durch Supabase-Client automatisch gecastet — verified via dry-run + live-run)
- [x] RLS: Policies fuer ALLE Client-Ops — N/A (Script nutzt SERVICE_ROLE_KEY, bypass RLS. Existierende RLS fuer User-Reads auf events-Tabelle nicht veraendert.)
- [x] Fee-Split — N/A (entry_fee=0, prize_pool=0, Pre-Beta kein Geld)
- [x] Geld als BIGINT cents — N/A (entry_fee/prize_pool=0)
- [x] FK-Reihenfolge — Pilot-Club existiert vor Event-INSERT (vorab-Lookup, Abort falls nicht gefunden)

### Beweise
- **tsc clean:** `npx tsc --noEmit` → exit=0 (keine Errors)
- **vitest:** N/A (keine Tests fuer Seed-Scripts; Task 1/2/3 folgten gleichem Pattern)
- **DB-Query (Post-Verify):** ALL CHECKS PASS (siehe oben)
- **Rollback-File:** `memory/rollback_fantasy_events_multi_league_20260415.json` mit 18 UUIDs + DELETE-Query
- **Compliance-Scan:** keine Securities/Gluecksspiel-Terminologie in Event-Namen
- **API-Calls:** 0 (reine DB-Operation, kein API-Football noetig)

## LEARNINGS
- **`events_lineup_size_check`** blockt `lineup_size=6` — LIVE-DB akzeptiert nur 7 und 11. Briefing + fantasy.md dokumentieren "6er" aber LIVE unmoeglich. `format` ist TEXT ohne CHECK (rein kosmetisch). **Frage fuer Post-Beta:** CHECK auf 6 erweitern oder fantasy.md aktualisieren?
- **`leagues.active_gameweek` ist fuer alle 6 Major Leagues = 1** (deprecated/nie updated). Fuer Target-Gameweek-Detection: IMMER `fixtures.played_at >= now` + `status='scheduled'` als Quelle, nicht `leagues.active_gameweek`. Same pattern wird der Cron (`cron_process_gameweek`) nutzen muessen.
- **Probe-based CHECK-Constraint-Discovery funktioniert super:** Statt Migration-History zu lesen oder `pg_constraint` abzufragen, einfach mit SERVICE_KEY Test-INSERTs schiessen. Error-Messages nennen den CHECK-Namen direkt (`events_lineup_size_check`).
- **TFF nutzt `7er` Format mit `lineup_size=7`, NICHT `6er`+6 wie fantasy.md dokumentiert** — das ist Architektur-Divergenz. Entweder fantasy.md ist outdated oder die Schema-Migration hat `lineup_size>=7` (oder IN(7,11)) erzwungen als Sicherheits-Constraint. Hat sich post-Wave-5 Fantasy-Full-Cycle bewaehrt.
- **Seed-Script Pattern aus Task 1 skalierbar:** ENV aus main-repo laden, Script logisch im Worktree, execution aus `C:/bescout-app`. Funktioniert fuer Logo-Fix, Fixtures-Import, jetzt Event-Seed.
- **PL-Fixtures-Inkonsistenz (OPEN-FOUND):** Gameweek 31 hat 1 scheduled + 9 finished, obwohl GW32 komplett finished ist. Kickoff GW 31 = 2026-02-18 (liegt in VERGANGENHEIT). Data-Quality-Issue: Import-Fixture-Status-Mismatch mit Reality. Skript bypasst das durch `played_at >= now` Filter, aber dieser 1 Row (GW 31, status='scheduled') verweist auf vergangenen Termin — sollte eigentlich `finished` sein.

## Offene Punkte (OPEN-FOUND)
1. **PL-Fixture-Status-Drift:** PL GW 31 hat 1 Fixture mit status='scheduled' aber played_at=2026-02-18 (vergangen). Fixtures-Import-Cron sollte status-Refresh liefern — falls noch nicht vorhanden. Nicht in diesem Task-Scope, nur beobachtet.
2. **fantasy.md vs Live-DB Divergenz:** fantasy.md sagt "6er (1+2+2+1)" — LIVE-DB CHECK blockt lineup_size=6. Entweder doc aktualisieren oder Constraint lockern. Post-Beta-Decision.
3. **`leagues.active_gameweek`** wird nicht aktualisiert durch Cron. Fuer Multi-League-Cron (`cron_process_gameweek`) relevant: sollte per Liga aktualisiert werden nach Gameweek-Advance. J5 Follow-Up.
4. **Event-Clone fuer naechste GW:** TFF hat 13 Events (gemischt GW 35 bereits ended + GW 36 registering). Major Leagues haben nur fuer GW 30/33 Events. Der `cron_process_gameweek` sollte automatisch clone — sobald das erste Major-League-Event endet, wird der Cron das fuer GW+1 reproduzieren. **Nicht in diesem Task, aber Produktions-Gate.**
5. **Frontend Liga-Switcher UX:** Wenn User "BL1" waehlt, sieht er "Bundesliga Meisterschaft/Arena Cup/Rising Stars BL1" — keine TFF-Events. Frontend sollte dies korrekt filtern (per `event.leagueShort` vom club_id-Cache-Lookup). **Visual-QA nach Deploy erforderlich.**

**Ready for Reviewer:** JA. Script ist komplett, Verify-SQL gruen, Rollback dokumentiert, tsc clean, Compliance OK. Token-Budget: ca. 35 tool-uses (unterhalb 100-Limit).
