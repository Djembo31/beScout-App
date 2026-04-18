# Slice 069 — Cron-Frequenz-Fix + Manual-Trigger-Button

**Datum:** 2026-04-18
**Stage:** SPEC → BUILD
**Size:** S (4-5 Files, eine Domain)
**CEO-Scope:** Nein (Ops-Setting, keine Money/Security-Policy)

## Ziel

Data-Sync-Crons aktivieren mit korrekten Frequenzen (CEO-Decision 2026-04-18: Pre-Launch-sparsam), plus Admin-UI fuer Manual-Trigger ad-hoc.

## Frequenz-Matrix (CEO-Decision)

| Cron | Schedule | Cron-Expression | Begruendung |
|------|----------|------------------|-------------|
| `sync-players-daily` | Montag 03:00 UTC | `0 3 * * 1` | Aktuelles API-Football-Abo klein, 1×/Woche reicht Pre-Launch; Post-Launch bei groesserem Abo auf daily |
| `sync-transfermarkt-batch` | 1. Jan/Mai/Sep 04:00 UTC | `0 4 1 1,5,9 *` | Market-Values aendern sich nur in Transferfenstern (2-3×/Jahr) |
| `transfermarkt-search-batch` | Taeglich 02:30 UTC | `30 2 * * *` | Initial-Discovery fuer 3938 unmapped Players, nach 2 Wochen manuell deaktivieren |

## Betroffene Files

1. **`vercel.json`** — Cron-Entries fuer 3 Sync-Jobs reaktivieren
2. **`src/app/api/admin/trigger-cron/[name]/route.ts`** — NEU: Admin-Auth-Proxy zum Cron-Endpoint (Admin darf nicht CRON_SECRET im Browser haben)
3. **`src/app/(app)/bescout-admin/AdminDataSyncTab.tsx`** — NEU: UI mit 3 Manual-Trigger-Buttons
4. **`src/app/(app)/bescout-admin/BescoutAdminContent.tsx`** — Neuen Tab registrieren
5. **`messages/de.json`** — i18n Keys DE
6. **`messages/tr.json`** — i18n Keys TR-Stub (Anil approved vor Commit)

## Acceptance Criteria

- **AC1** `vercel.json` enthaelt die 3 neuen Cron-Entries mit korrekten Schedules
- **AC2** `/api/admin/trigger-cron/[name]` validiert Admin-Role via `getPlatformAdminRole`, 403 wenn nicht Admin
- **AC3** Admin-Endpoint ruft intern `/api/cron/[name]` mit `CRON_SECRET` via Server-Fetch, returnt JSON-Response
- **AC4** Whitelist: nur `sync-players-daily | sync-transfermarkt-batch | transfermarkt-search-batch` triggerbar — alles andere 400
- **AC5** AdminDataSyncTab zeigt 3 Buttons (pro Cron 1), Button disabled waehrend Pending, Loader2-Icon
- **AC6** Response-JSON wird in Card angezeigt (`clubs_processed`, `players_updated`, `errors_count`, `duration_ms`)
- **AC7** Mobile 393px: Buttons stacken vertikal, keine Overflow
- **AC8** tsc clean, i18n DE fertig, TR zu Anil approval

## Edge Cases

- Parallel-Trigger (Cron laeuft gleichzeitig): Endpoints sind idempotent (upsert via UNIQUE api_football_id) → OK
- `CRON_SECRET` fehlt in env: Admin-Endpoint 500 mit klarem Error
- Vercel maxDuration: Admin-Endpoint `maxDuration = 300` (5min, wie Cron selbst)
- Cron-Endpoint gibt Error-JSON zurueck: UI zeigt Error-Toast, behaelt Response im State
- Admin-Endpoint timeout bei langer Cron-Run: UI zeigt Info "Cron laeuft noch, pruefe Supabase-Logs"
- Double-click: Button disabled via isPending
- Unauthorized Access: `/api/admin/trigger-cron/*` 403 wenn nicht Admin-Role
- i18n: Error-Messages aus Cron-Response sind technisch (English) — bleiben unuebersetzt im Admin-UI

## Impact

**IMPACT skipped** (nur neue Files + `vercel.json` + 1 Tab-Registration). Keine Services/RPCs/Schema-Aenderungen, keine bestehenden Consumer betroffen.

## Proof-Plan

1. **`vercel.json` Diff** → `worklog/proofs/069-vercel-diff.txt`
2. **Admin-Endpoint Auth-Test** (SQL-Check dass 403 korrekt gesetzt ist) → `worklog/proofs/069-auth-test.txt`
3. **Playwright Screenshot** AdminDataSyncTab auf bescout.net (nach Deploy) → `worklog/proofs/069-admin-datasync.png`
4. **Manual-Trigger Response** via `curl` gegen Admin-Endpoint → `worklog/proofs/069-trigger-response.txt`

## Scope-Out

- Cron-Results-History-Dashboard (→ Slice 071)
- User-facing Freshness-Badge (→ Slice 070)
- Admin Data-Quality-Matrix (→ Slice 073)
- Automatisches Cron-Deaktivieren nach 2 Wochen Discovery (→ Calendar-Reminder, manuell)
- Notification bei Cron-Fehler (→ Slice 071+)

## Test-Strategie

- Unit-Test: Whitelist-Validation in Admin-Endpoint (happy + invalid name)
- Integration: tsc + vitest fuer AdminDataSyncTab-Component (falls Test-File existiert)
- Manual: bescout.net nach Deploy — Admin-Login → Tab oeffnen → 1 Button klicken → Response verifizieren
