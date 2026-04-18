# Slice 073 — sync-fixtures-future Cron (Manual-Only)

**Datum:** 2026-04-18
**Stage:** SPEC → BUILD
**Size:** S (1 Cron-Route + Admin-UI + i18n, KEINE Migration)
**CEO-Scope:** Nein (Ops-Setting)

## Ziel

Saison-Fixtures für alle 7 aktiven Ligen bulk-laden/aktualisieren. Insert neue Fixtures + Update `played_at` bei Spielverlegungen. **Manual-only** wegen Hobby-Plan.

## Warum relevant

- **Neue Saison-Onboarding**: wenn 2025/26 endet, für 2026/27 alle 380 Fixtures × 7 Ligen laden
- **Fixture-Time-Updates**: Bundesliga verlegt Sa-Match auf Fr → `played_at` muss synchronisiert werden
- **Liga-Backfill**: falls neue Liga hinzugefügt wird mid-season
- **Clone-events-Vorbereitung**: gameweek-sync Phase B verwendet `nextGw` fixtures für timing → wenn die fehlen, events bekommen far-future-Timestamps

**Daten-Stand (2026-04-18):** Alle 7 Ligen haben 306-380 Fixtures (volle Saison). 30-70 noch future.

## Betroffene Files

1. **`src/app/api/cron/sync-fixtures-future/route.ts`** (NEU)
   - Iteriert 7 active leagues
   - `/fixtures?league=X&season=Y` per Liga (7 API-Calls total)
   - Rate-Limit 300ms
   - Upsert via `api_fixture_id` UNIQUE (bereits vorhanden)
   - Pro Fixture: Club-Mapping via `api_football_team_id` → skip if unmapped
   - Response: `leagues_processed`, `fixtures_imported`, `fixtures_updated`, `fixtures_skipped_unmapped`, `api_calls`

2. **`src/app/api/admin/trigger-cron/[name]/route.ts`** (Whitelist +`sync-fixtures-future`)

3. **`src/app/(app)/bescout-admin/AdminDataSyncTab.tsx`** (6. Card)
   - Icon `CalendarClock` (lucide)

4. **`messages/de.json` + `messages/tr.json`** (3 Keys)

**KEINE Migration** — `fixtures` Tabelle + `api_fixture_id` UNIQUE bestehen bereits.

## Acceptance Criteria

- **AC1** Cron-Route läuft mit 7 API-Calls
- **AC2** UPSERT via `api_fixture_id` — updates `played_at`, `status`, `home_score`, `away_score`, `gameweek`
- **AC3** Club-Mapping: wenn home oder away-team nicht in DB → skip mit count `fixtures_skipped_unmapped`
- **AC4** Logging in `cron_sync_log` step='sync-fixtures-future'
- **AC5** KEIN vercel.json-Entry (Manual-Only)
- **AC6** Admin-UI 6. Card mit Trigger-Button + Response-Display
- **AC7** tsc + next build clean

## Edge Cases

- `api_fixture_id` NULL in response → skip fixture (erfordert UNIQUE-Target)
- Club in `home.id`/`away.id` nicht mapped → `fixtures_skipped_unmapped++`
- API returnt 0 fixtures (Saison nicht gestartet oder League-ID falsch) → log + continue
- `status` values: `"NS" | "1H" | "HT" | "2H" | "FT" | "AET" | "PEN" | "PST" | "CANC"` → map zu DB `{scheduled, live, halftime, live, finished, finished, finished, postponed, cancelled}` oder einfach raw
- `played_at` in Vergangenheit aber `status=NS` → API-bug, trotzdem updaten (authoritative)
- Concurrent gameweek-sync write → last-write-wins, beide upsert via same key (ok)

## Impact

**IMPACT minimal:** Kein Schema-Change. Pattern wie sync-transfers. Update von `fixtures.played_at` könnte UI rendering in Fantasy-Kalender betreffen — aber das ist gewünscht (Spielverlegung durchreichen).

## Proof-Plan

1. **Endpoint-Existence** → POST /api/admin/trigger-cron/sync-fixtures-future → 401 (auth-protected) → `worklog/proofs/073-deploy-status.txt`
2. **Live-Trigger** (Anil via UI) → Response-JSON geloggt
3. **Impact-Verify** → `SELECT COUNT(*) FROM fixtures WHERE updated_at > NOW() - interval '1h'` (wenn updated_at-col existiert, sonst via created_at)

## Scope-Out

- Notification bei Fixture-Verlegung → Slice 075+
- UI-Toast "Spieltag verlegt" → separate frontend-slice
- Automatisches GW-Create für neue Saison (new-season-onboarding-wizard) → Slice 074+
- Historisches Fixture-Update-Log → nicht nötig (fixtures.updated_at reicht)

## Test-Strategie

- Lokal tsc + next build
- Live: Admin-Trigger nach Deploy → Response check
