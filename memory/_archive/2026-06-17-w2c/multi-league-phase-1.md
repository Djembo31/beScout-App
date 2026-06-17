# Multi-League Phase 1 — Retrospektive (2026-04-15)

> Verdichtung aus: audit_multi_league_backend_20260415.md, audit_multi_league_frontend_20260415.md,
> impact_multi_league_backend_20260415.md, 6 Journals (tff-logo, tff-player, fixtures,
> fantasy-events-seed, backfill-scoring-historical, xc15), 3 Learnings-Drafts, 21 Commits.

## Was gemacht wurde

### Task 1 — TFF Club-Logo-Migration (9 Clubs)
- 9 TFF 1. Lig Clubs hatten broken relative `/clubs/*.png` Logo-URLs
- Script `scripts/fix-tff-logos.mjs`: API-Football `/teams?id=X` roundtrip → authoritative logo_url
- Resultat: 20/20 TFF Clubs auf `https://media.api-sports.io/football/teams/{id}.png`
- Blocker entdeckt: CDN blockt HEAD-Requests (403), GET mit Range-Header notig
- OPEN: Slug-Typos `istaciospor` + `keciorenguru` — dokumentiert, NICHT in diesem Scope (route-breaking)

### Task 2 — TFF Player-Field Backfill (~200 Rows)
- Pre-Audit zeigte: TFF image_url 73.3%, nationality 77.9%, shirt_number 82.7%
- Script `scripts/backfill-tff-players.mjs`: zwei API-Endpoints kombiniert (`/players` + `/squads`)
- Resultat: image_url 99.7%, nationality 95.8% — beide Targets erreicht
- shirt_number 84.8% (target miss): API-Football /squads liefert nur aktuelle 30er Roster, Reservisten fehlen
- contract_end: API-Football liefert es nicht — bleibt bei 76.1%, Out-of-Scope-Quellenproblematik

### Task 3 — Fixtures-Import 6 Major Leagues (2.058 neue Rows)
- Pre-Audit: alle 6 Major Leagues hatten ZERO Fixtures — Fantasy-Multi-League komplett blockiert
- Script `scripts/import-fixtures.mjs`: `/fixtures?league=X&season=2025`, 6 API-Calls total
- Schema-Drift-Preflight (5 Felder falsch in Briefing): `api_fixture_id` (nicht `api_football_id`), `played_at` (nicht `kickoff_at`), `home_score`/`away_score` (nicht `home_goals`/`away_goals`)
- Resultat: BL1=306, BL2=306, LL=380, PL=380, SA=380, SL=306 — alle gameweek-Ranges korrekt, Club-Mapping 100%

### Task 12 — Fantasy Events Seed für 6 Major Leagues (18 neue Events)
- Script `scripts/seed-multi-league-events.mjs`: pro Liga 3 Events, Pilot-Club per deterministischer Whitelist
- Whitelist: Bayern/Schalke/Real/City/Inter/Galatasaray als Erstpräsenz
- Idempotenz via Existenz-Check (kein ON CONFLICT, events hat keinen UNIQUE-Key auf club+gw)

### Task 13 — Historical Scoring Backfill (Pre-Flight done, Script vorbereitet)
- 1.732 abgeschlossene Fixtures in 6 Ligen brauchen `fixture_player_stats` + `player_gameweek_scores`
- RPC `cron_process_gameweek` + `cron_recalc_perf` identifiziert und verified
- Script `scripts/backfill-scoring-historical.mjs` vorbereitet, Live-Run OFFEN (Session-Ende)

### XC-15 — expire_pending_orders Column Fix
- RPC referenzierte `orders.filled_quantity` (existiert nicht), korrekt ist `filled_qty`
- AR-42-Pattern 3rd Occurrence: diesmal SELECT FOR UPDATE statt INSERT
- Bug war ~9h aktiv im Cron — Buy-Order-Expiry und Escrow-Release gestoppt
- Fix: Migration `20260415210000_xc15_*` — minimaler Scope, REVOKE-Block beibehalten

## Warum (Motivation)

Phase 1 der Multi-League-Expansion: 7 Ligen in DB seit Commit 8a5014d, aber Fantasy-Scoring unmöglich
wegen fehlender Fixtures und unvollständiger Pilot-Liga-Daten. Phase 1 unblocked Fantasy-Multi-League
für alle 6 Major Leagues. TFF 1. Lig (Pilot-Liga) war Qualitäts-Sorgenkind (D+ Scorecard).

## Blocker die auftraten

| Blocker | Root Cause | Fix | Zeit verloren |
|---------|-----------|-----|---------------|
| CDN HEAD 403 | api-sports.io blockt HEAD | GET Range:bytes=0-0 | ~15min |
| .in() URL-Limit | PostgREST URL-Length bei 689 IDs | Batching BATCH=200 | ~10min |
| Schema-Drift: 5 Felder falsch | Briefing-Annahmen vs Live-DB | Preflight-Introspection | 0min (via Preflight abgefangen) |
| XC-15 Column-Mismatch | `filled_quantity` vs `filled_qty` | Migration + 2-Rename | ~9h Cron-Ausfall |

## Follow-Ups offen

### P0 (vor Fantasy-Multi-League-Launch)
- Historical Scoring Backfill (Task 13) — Script ready, Live-Run ausstehend
- perf_l5 für alle 6 Major Leagues ist noch 50.0 (default) bis Backfill läuft

### P1 (Qualität)
- shirt_number TFF: 84.8% (target 95% verfehlt) — API-Football Coverage-Gap, Transfermarkt als Alternative
- contract_end TFF: 76.1% — API-Football liefert es nicht, andere Source nötig (post-Beta)
- Slug-Typos TFF: `istaciospor` → `istanbulspor`, `keciorenguru` → `kecioerengucu` — Breaking-Change, /impact vor Fix

### P2 (Frontend, aus audit_multi_league_frontend_20260415.md)
- Club Type fehlt leagueId/leagueShort/leagueLogoUrl (ClubHero + ClubCard zeigen kein Logo)
- 6 Pages ohne Liga-Filter (Market, Fantasy, IPO, Watchlist, Clubs, Clubs)
- Hardcoded 'TFF' in welcome/page.tsx:121 + SpieltagTab.tsx

## Scorecard nach Phase 1

| Liga | Status | Fixture-Coverage | Player-Completeness | Fantasy-Events |
|------|--------|-----------------|--------------------|----|
| Bundesliga | READY | 306 GWs ✓ | 99.7% ✓ | 3 seeded |
| 2. Bundesliga | READY | 306 GWs ✓ | 99.6% ✓ | 3 seeded |
| La Liga | READY | 380 GWs ✓ | 99.9% ✓ | 3 seeded |
| Premier League | READY | 380 GWs ✓ | 100% ✓ | 3 seeded |
| Serie A | READY | 380 GWs ✓ | 99.9% ✓ | 3 seeded |
| Süper Lig | READY | 306 GWs ✓ | 99.8% ✓ | 3 seeded |
| TFF 1. Lig | PARTIAL | 380 GWs ✓ | 92% (shirt/contract gaps) | 139 live |

## Scripts (6 neue in scripts/)

| Script | Zweck | Idempotent |
|--------|-------|-----------|
| `scripts/fix-tff-logos.mjs` | TFF Club Logo-CDN-Migration | Ja (overwrite) |
| `scripts/backfill-tff-players.mjs` | TFF Player image/nationality/shirt | Ja (NULL-only update) |
| `scripts/import-fixtures.mjs` | Fixtures für alle Ligen | Ja (upsert on api_fixture_id) |
| `scripts/seed-multi-league-events.mjs` | Fantasy Events pro Liga seeden | Nein (Existenz-Check) |
| `scripts/backfill-scoring-historical.mjs` | Historical fps + pgw_scores | Ja (RPC idempotent) |
| `scripts/_inspect-rpc.mjs` + `_preflight-*.mjs` | Debug/Preflight-Helpers | Ja |

## Entscheidungen

1. Scripts statt Migrations für alle Daten-Imports (API-Football-Roundtrip nötig, kein reines SQL)
2. Preflight-Introspection via `supabase.from().select('*').limit(1) + Object.keys()` als Standard vor jedem neuen Import-Script
3. Pilot-Club-Whitelist für Fantasy-Events (deterministisch, keine zufälligen Clubs)
4. Historical-Scoring via bestehendem `cron_process_gameweek` RPC (nicht direktes INSERT) — idempotent + production-proven

## Lessons (verdichtet, Details in Learnings-Drafts)

1. CDN HEAD 403: Reachability-Check in Scripts immer via GET+Range, nicht HEAD
2. Preflight-Introspection rettet Stunden: 5 Schema-Drift-Punkte hätten Fixture-Script zum Crash gebracht
3. AR-42 Pattern hat eine SELECT-Variante (XC-15): nicht nur INSERT/UPDATE, jede Column-Referenz ist betroffen
