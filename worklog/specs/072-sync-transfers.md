# Slice 072 — sync-transfers Cron (Manual-Only)

**Datum:** 2026-04-18
**Stage:** SPEC → BUILD
**Size:** S (1 Migration + 1 Cron-Route + Admin-UI + i18n)
**CEO-Scope:** Nein (Ops-Setting)

## Ziel

API-Football `/transfers?team=X` pullen für alle 134 mapped Clubs → Transfer-Historie in neue Tabelle `player_transfers` speichern + bei Transfer IN zu einem DB-Club: `players.club_id` aktualisieren.

**Manual-Only** (kein vercel.json-Eintrag wegen Hobby-Plan 2-Cron-Limit). Admin triggert via UI nach Transferfenstern.

## Warum relevant

- **Squad-Wechsel**: sync-players-daily fängt das auch, aber nur wöchentlich. Transfer-Cron bietet ad-hoc Refresh.
- **Historie**: neue `player_transfers` Tabelle trackt ALLE Wechsel → Data für Future Analytics + UI "letzte Transfers"
- **Multi-Club-Holdings**: wenn Player zu neuem Club wechselt, holdings-Impact analysierbar via Transfer-Log

## Betroffene Files

1. **`supabase/migrations/YYYYMMDDHHMMSS_slice_072_player_transfers.sql`** (NEU)
   - Tabelle `player_transfers`:
     - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
     - `player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE`
     - `transfer_date DATE NOT NULL`
     - `transfer_type TEXT NOT NULL` (Free, Loan, Fee, N/A)
     - `team_in_id UUID REFERENCES clubs(id) ON DELETE SET NULL` (nullable = team nicht in DB)
     - `team_out_id UUID REFERENCES clubs(id) ON DELETE SET NULL`
     - `team_in_api_football_id INTEGER` (tracking auch wenn team not mapped)
     - `team_out_api_football_id INTEGER`
     - `season INTEGER`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - UNIQUE `(player_id, transfer_date, team_in_api_football_id)` — Idempotenz
   - INDEX on `player_id`, `transfer_date DESC` für "letzte Transfers pro Player"
   - RLS: SELECT nur für authenticated (read-only für Users), INSERT/UPDATE nur service_role

2. **`src/app/api/cron/sync-transfers/route.ts`** (NEU)
   - Iteriert 134 Clubs mit api_football_team_id
   - `/transfers?team=X` per Club (134 API-Calls/Run)
   - Rate-Limit 300ms
   - Pro Transfer-Entry: UPSERT in `player_transfers` via UNIQUE constraint
   - Bei IN-Transfer zu mapped Club: `players.club_id = team_in_id` + `status_updated_at = NOW()`
   - Response: `clubs_processed`, `transfers_imported`, `players_club_updated`, `unmatched_players`, `api_calls`
   - Auth: CRON_SECRET Bearer

3. **`src/app/api/admin/trigger-cron/[name]/route.ts`** (Whitelist erweitert)
   - Add `'sync-transfers'`

4. **`src/app/(app)/bescout-admin/AdminDataSyncTab.tsx`** (5. Card)
   - Icon `ArrowRightLeft` (lucide)
   - Titel "Transfers (API-Football)"
   - Note: "MANUAL-ONLY — nach Transferfenster-Ende triggern"

5. **`messages/de.json` + `messages/tr.json`** (4 keys — inkl. schedule-manual-only)

## Acceptance Criteria

- **AC1** Migration deployed, `player_transfers` Tabelle + RLS + indexes live
- **AC2** Cron-Route `/api/cron/sync-transfers` mit auth + rate-limit
- **AC3** API-Call-Count: 134 per run (0.06% von Pro-Tier 7500/day)
- **AC4** Bei Transfer IN zu DB-Club: `players.club_id` wird aktualisiert + `status_updated_at` gesetzt
- **AC5** UNIQUE constraint verhindert Duplicate-Imports bei Re-Run
- **AC6** Transfer zu nicht-mappedem Club (z.B. 3. Liga): `team_in_id=NULL`, `team_in_api_football_id` wird trotzdem gespeichert
- **AC7** Admin-UI 5. Card mit Trigger-Button, Response-Display
- **AC8** KEIN vercel.json-Entry (Manual-Only wegen Hobby-Plan-Limit)
- **AC9** Logging in `cron_sync_log` step='sync-transfers'
- **AC10** tsc clean + next build clean

## Edge Cases

- API returns 0 transfers für einen Club → skip, log `no_transfers_for_team`
- Player im Transfer nicht in DB (z.B. Jugend) → unmatched++, skip
- team_in = team_out (API-bug) → skip mit warning
- Transfer-Loan + Rückkehr = 2 separate Entries → UNIQUE on date+team_in erlaubt beide
- player_transfers.transfer_date UNIQUE collision bei Re-Run → ON CONFLICT DO NOTHING
- `transfer_type = "N/A"` → erlaubt (nicht filtern)
- Zero-byte-Response oder 404 → errored++ continue
- Cron läuft parallel zu sync-players-daily → race-condition auf `players.club_id` → last-write-wins (beide nutzen upsert, ok)

## Impact

**IMPACT eingeschränkt:**
- Migration ist additive (neue Tabelle, 2 optionale FKs)
- Kein bestehender Service-Consumer — `players.club_id` Updates sind identisch zum sync-players-daily-Pattern (keine neue Semantik)
- Kein vercel.json-Entry → keine Schedule-Kollision
- Future-UI "letzte Transfers" kann direkt auf `player_transfers` lesen

## Proof-Plan

1. **Migration applied** → `SELECT column_name FROM information_schema.columns WHERE table_name='player_transfers'` → `worklog/proofs/072-migration.txt`
2. **RLS policies** → `SELECT policyname, cmd FROM pg_policies WHERE tablename='player_transfers'` → `worklog/proofs/072-rls.txt`
3. **Manual-Trigger Response** → Admin-UI Button → Response-JSON → `worklog/proofs/072-trigger-response.txt`
4. **Transfer Import Count** → `SELECT COUNT(*) FROM player_transfers WHERE created_at > NOW() - interval '1 hour'` nach Run → `worklog/proofs/072-import-count.txt`

## Scope-Out

- UI "Letzte Transfers" Section auf Player-Detail-Page → separate Frontend-Slice
- Transfer-Window-Detection (automatisches Daily-Scheduling in Jan + Jul-Aug) → nur mit Pro-Plan
- Notification on transfer-event → Slice 075+
- Downstream-Impact auf holdings (Player-Wechsel kann Marktwert ändern) → separat
- Transfer-Dashboard für Admin mit Stats → Slice 073+

## Test-Strategie

- Lokal: tsc + next build
- Live: Migration via MCP apply_migration, manueller Admin-Trigger nach Deploy
- DB-Verify: SELECT count(*), max(transfer_date) FROM player_transfers
