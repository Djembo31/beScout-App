# Slice 074 — sync-standings Cron (Manual-Only)

**Datum:** 2026-04-18
**Stage:** SPEC → BUILD
**Size:** S (1 Migration + 1 Cron-Route + Admin-UI + i18n)
**CEO-Scope:** Nein (Ops-Setting)

## Ziel

Liga-Tabelle (Standings) von API-Football `/standings?league=X&season=Y` pullen → neue Tabelle `league_standings`. 7 API-Calls/Run. Manual-only.

## Warum relevant

- **Autoritative Liga-Tabelle** von API-Football (vorher haben wir selbst berechnet — fehleranfällig)
- **Club-Pages**: "Platz 3, 45 Punkte, 8-3-2 Bilanz"
- **Form-Indikator** "WWDWL" für Fantasy-UI ("Welche Clubs in Form?")
- **Fantasy Context**: bei Events "Tabellen-3. vs Tabellen-15" sofort sichtbar

## Betroffene Files

1. **`supabase/migrations/YYYYMMDDHHMMSS_slice_074_league_standings.sql`** (NEU)
   - Tabelle `league_standings`:
     - `id UUID PK`
     - `league_id UUID NOT NULL REFERENCES leagues`
     - `club_id UUID NOT NULL REFERENCES clubs`
     - `season INTEGER NOT NULL`
     - `rank INTEGER NOT NULL` (1 = first place)
     - `played`, `won`, `drawn`, `lost INTEGER NOT NULL DEFAULT 0`
     - `goals_for`, `goals_against`, `goals_diff INTEGER NOT NULL DEFAULT 0`
     - `points INTEGER NOT NULL DEFAULT 0`
     - `form TEXT` (e.g. "WWDWL" last 5 matches)
     - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - UNIQUE `(league_id, club_id, season)`
   - INDEX `(league_id, season, rank)` für "Tabelle ordered by rank"
   - RLS: SELECT authenticated (public info), service_role schreibt

2. **`src/app/api/cron/sync-standings/route.ts`** (NEU)
   - Iteriert 7 active leagues
   - `/standings?league=X&season=Y` per Liga (7 API-Calls total)
   - Response-Struktur: `response[0].league.standings[0][]` (array of arrays wegen groups)
   - Upsert via `(league_id, club_id, season)` UNIQUE
   - Club-Mapping via `api_football_team_id` → skip wenn unmapped

3. **`src/app/api/admin/trigger-cron/[name]/route.ts`** (Whitelist +`sync-standings`)

4. **`src/app/(app)/bescout-admin/AdminDataSyncTab.tsx`** (7. Card)
   - Icon `Trophy` (lucide)

5. **`messages/de.json` + `messages/tr.json`** (3 Keys)

## Acceptance Criteria

- **AC1** Migration applied, `league_standings` Table + RLS + UNIQUE + Index live
- **AC2** Cron-Route funktioniert mit 7 API-Calls
- **AC3** Upsert: gleiche (league, club, season) → UPDATE, neu → INSERT
- **AC4** Groups (Champions-League-style): alle Gruppen flach abarbeiten
- **AC5** `form`-string gespeichert (API liefert last-5-match-letters)
- **AC6** Unmapped clubs → skip + count
- **AC7** KEIN vercel.json-Entry
- **AC8** Admin-UI 7. Card + i18n DE/TR
- **AC9** tsc + next build clean

## Edge Cases

- Multi-Group Liga (selten: UEFA-Tournaments): alle Groups abarbeiten
- `form` NULL für Pre-Saison → ok
- API returnt leere standings (Saison nicht gestartet) → skip mit log
- Club nicht in DB → skip mit `unmapped++`
- Rang-Änderungen zwischen Runs → einfaches UPDATE gewinnt (last-write-wins)

## Impact

Additive (neue Tabelle, keine bestehenden Consumer). Future: UI kann `league_standings` einbinden für Club-Page und Liga-Tabelle.

## Proof-Plan

1. Migration via MCP apply_migration
2. Endpoint 401 check
3. RLS policies check

## Scope-Out

- UI "Tabelle" auf Liga-Page → separate Frontend-Slice
- Historical snapshots (weekly standings trend) → später
- Notification bei Rang-Änderung (Club steigt von 5 auf 3) → Slice 075+
