# Slice 070 — Sync-Injuries-Cron (kritischste Lücke für Fantasy-UX)

**Datum:** 2026-04-18
**Stage:** SPEC → BUILD
**Size:** S (1 Migration + 1 Cron-Route + Admin-UI Tweak + i18n)
**CEO-Scope:** Nein (Ops-Setting, keine Money/Security)

## Ziel

Verletzte/gesperrte Spieler aus API-Football pullen und in `players` markieren, damit Fantasy-User sie bei Lineup-Auswahl erkennen.

## Why now (CEO-Begründung Slice 070-Series)

Größte Pre-Launch-Lücke: User stellt verletzten Müller in Lineup → 0 Punkte → frustriert. Mit Pro-Tier (7500/day) sind 7 Calls/Tag (eine pro Liga) trivial.

## Betroffene Files

1. **`supabase/migrations/YYYYMMDDHHMMSS_slice_070_player_injuries.sql`** (NEU)
   - ADD `players.injury_reason TEXT NULL` (z.B. "Knee Injury", "Suspended")
   - ADD `players.injury_until DATE NULL` (geschätztes Comeback, oft NULL)
   - ADD `players.status_updated_at TIMESTAMPTZ DEFAULT NOW()`
   - **CHECK constraint** `status IN ('fit','doubtful','injured','suspended')` (aktuell unconstrained)

2. **`src/app/api/cron/sync-injuries/route.ts`** (NEU)
   - Iteriert 7 active leagues
   - 1 API-Call pro Liga: `/injuries?league=X&season=Y`
   - Resolve player via `api_football_id`
   - Upsert `status` + `injury_reason` + `injury_until`
   - Re-mark `status='fit'` für Players die nicht mehr in /injuries-Response sind (Recovery)

3. **`vercel.json`** (Cron-Entry)
   - Schedule: `0 12 * * *` (täglich 12:00 UTC, mid-day = oft frische injuries)

4. **`src/app/(app)/bescout-admin/AdminDataSyncTab.tsx`** (Erweitert)
   - 4. Cron-Card: "Verletzungen sync (Injuries)"

5. **`messages/de.json` + `messages/tr.json`** (3 neue keys)

## Acceptance Criteria

- **AC1** Migration deployed, `players.status` CHECK constraint aktiv mit 4 Werten
- **AC2** Cron-Route `/api/cron/sync-injuries` returnt JSON mit `injuries_imported`, `players_updated`, `players_recovered`
- **AC3** Cron läuft täglich 12:00 UTC + manueller Trigger via Admin-UI
- **AC4** API-Call-Count: max 7 per run (1 per league), Rate-Limit 300ms zwischen Calls
- **AC5** Recovery-Logik: Players die in vorigen runs `injured`/`suspended` waren aber nicht in aktueller API-Response → `fit`
- **AC6** `status_updated_at` wird bei jedem Status-Change gesetzt (Audit-Trail)
- **AC7** Logging in `cron_sync_log` (step='sync-injuries')
- **AC8** tsc clean, Manual-Test-Trigger via UI funktioniert

## Edge Cases

- API-Football `/injuries` returnt 0 Entries → KEINE Recovery-Wave (würde sonst alle injured → fit setzen). Guard: `if response.length === 0 → log + skip update`.
- Player in API-Response aber `api_football_id` nicht in DB → silent skip + count `unmatched`
- `type=Suspended` → status='suspended', sonst status='injured'
- `reason=null` → behalten als injury_reason='Unknown'
- Player in mehreren leagues (transfer mid-season) → nur 1 status-update pro Player
- API timeout (>5min) → Vercel kill, partial run wird nicht als success geloggt
- Concurrent sync-players-daily-Run: Race-Condition auf players-Update — beide sind UPSERT, kein Conflict
- `last_appearance_gw`-Doubtful-Logik (gameweek-sync) vs neue injury-Logik: explizit definieren wie sie zusammenspielen → injury HAS PRIORITY (überschreibt doubtful)

## Impact

**IMPACT eingeschränkt:** 
- Migration ist additive (3 neue NULLABLE columns + CHECK constraint)
- CHECK constraint muss `'doubtful'` enthalten (aktuell 405 rows mit doubtful)
- gameweek-sync Phase 13 (`sync_activity_status`) setzt `status='doubtful'`/`'fit'` — bleibt funktional, da beide Werte erlaubt
- Zero existing service queries existing UI-Display von `players.status` (nur in gameweek-sync) → ein new-line in Admin-UI sinnvoll, aber Scope-Out

## Proof-Plan

1. **Migration deployed** → SQL-Check: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name='players' AND column_name IN ('injury_reason','injury_until','status_updated_at')` → `worklog/proofs/070-migration.txt`
2. **CHECK constraint aktiv** → `\d players` output mit constraint → `worklog/proofs/070-check-constraint.txt`
3. **Cron-Endpoint Test** → Manueller Trigger via Admin-UI → JSON-Response geloggt → `worklog/proofs/070-trigger-response.txt`
4. **Real injuries imported** → SQL: `SELECT status, COUNT(*) FROM players GROUP BY status` nach Run → `worklog/proofs/070-status-distribution.txt`

## Scope-Out

- Notification on injury-change (→ Slice 074+)
- UI-Display in Player-Cards (→ separate Frontend-Slice)
- Admin-Manual-Override für Injuries (→ Slice 075+)
- Historical injury-table (→ später wenn Analytics gebraucht)
- gameweek-sync Optimierung (→ Slice 071)

## Test-Strategie

- Unit: Parser (status mapping, recovery-logic) → falls extracted to lib
- Integration: Cron-Run gegen Test-Liga → mock not needed, real API
- Manual: Admin-UI Button → Response checken → SQL-Verify
