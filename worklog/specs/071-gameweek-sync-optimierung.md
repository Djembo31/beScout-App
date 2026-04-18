# Slice 071 — gameweek-sync Optimierung (3× täglich + Phase-A-Skip)

**Datum:** 2026-04-18
**Stage:** SPEC → BUILD
**Size:** S (2 Files: vercel.json + route.ts)
**CEO-Scope:** Nein (Performance/Schedule, keine Money/Security)

## Ziel

gameweek-sync läuft 3× täglich (statt 1×) für Late-Match-Coverage UND skipt überflüssige API-Calls in der "alle fixtures DB-finished, nur events-scoring offen"-Phase.

## Why (Daten-basiert)

**Spielzeit-Verteilung pro Liga (letzte 120 Tage Real-Data):**
- BL2: Fr+Sa+So EXKLUSIV — Mo-Do 0 Matches
- BL1: Sa+So+Fr (kein Mo)
- TFF1, SA, SL: Sa+So+Mo+Mi (Mid-week games)
- PL: breit (Champions-League-Wochen)

**Aktuell:** Cron 06:00 UTC → Late-Match (z.B. Süper Lig Mo 22:00 UTC) erst Di 06:00 UTC synced → **8h Datenlatenz**.

**Mit 3×/Tag (06:00, 14:00, 22:00):** Late-Match um 22:00 UTC → spätestens 30min später synced (vorausgesetzt API-Football-Daten ready). Worst-Case Latenz: ~1.5h.

**Phase-A-Skip-Lücke (heute):**
- Wenn alle DB-fixtures `status='finished'` aber events ungescored → fall-through zu Phase A (1 API-Call/Liga: `/fixtures?...&round=Regular Season - X`)
- Tatsächlich brauchen wir den API-Call NICHT — alle Daten sind bereits in DB. Nur Events-Scoring fehlt.
- Saved: 7 API-Calls/Run pro "unfinished-events-only"-Pfad. Bei 30 GW × 1× pro Saison = ~210 Calls/Saison gespart.

## Betroffene Files

1. **`vercel.json`** — Schedule-Update
   - alt: `{"path": "/api/cron/gameweek-sync", "schedule": "0 6 * * *"}` (1×)
   - neu: `{"path": "/api/cron/gameweek-sync", "schedule": "0 6,14,22 * * *"}` (3×)

2. **`src/app/api/cron/gameweek-sync/route.ts`** — Phase-A-Skip
   - Pfad "fixtures done but events not scored" (Zeile ~459) → direkt zu Phase B (events scoring)
   - Vermeide `check_api_fixtures` + `load_mappings` + `fetch_stats` + `import_data`
   - Setze `allFixturesDone = true` (lokal abgeleitet aus DB)

## Acceptance Criteria

- **AC1** vercel.json: 3× täglich (06:00 + 14:00 + 22:00 UTC)
- **AC2** route.ts: Wenn `unfinishedFixtures.length === 0` UND `unscoredEvents.length > 0` → skip Phase A, jump zu Phase B mit `allFixturesDone=true`
- **AC3** cron_sync_log step `phase_a_skipped` mit reason `'all_fixtures_db_finished_only_scoring'`
- **AC4** Phase B (events scoring + clone events + advance_gameweek + recalc_perf) läuft normal
- **AC5** API-Call-Count: -7 Calls pro "events-only"-Run (eine pro Liga, ggf. weniger wenn nur 1-2 ligen aktiv)
- **AC6** tsc clean + Build OK
- **AC7** Live-Test: 1 manueller Trigger nach Deploy → Response zeigt skip-Steps in `globalSteps`/`leagues[].steps`

## Edge Cases

- League hat keine fixtures in DB → existing skip-Pfad (`No clubs for league`) bleibt
- League hat unfinished + past fixtures → existing API-Call-Pfad bleibt (Phase A normal)
- League hat unfinished aber alle in Future → existing skip (`No fixtures past kickoff`) bleibt
- 3× Cron + manueller Admin-Trigger gleichzeitig → upserts sind idempotent
- Worst-Case API-Call-Count bei "Spieltagswochenende alle 7 Ligen aktiv": 7 base + 7×9.7×3 = ~210/Run × 3 Runs/Tag = ~630/Tag (immer noch 8% von Pro-Quota 7500/day)
- gameweek-sync 22:00 UTC Run + sync-injuries 12:00 UTC + sync-players-daily 03:00 UTC Mo → alle laufen unabhängig

## Impact

**IMPACT eingeschränkt:**
- vercel.json change ist additive (häufigerer Schedule)
- route.ts change ist BACKWARDS-COMPATIBLE (Phase B war schon implementiert, wir setzen nur "allFixturesDone" lokal an einer neuen Stelle)
- Keine Service-/RPC-/Schema-Änderung
- Keine UI-Änderung

## Proof-Plan

1. **Schedule live** → `vercel.json` diff → `worklog/proofs/071-vercel-diff.txt`
2. **Code-Logik korrekt** → diff `gameweek-sync/route.ts` → `worklog/proofs/071-route-diff.txt`
3. **Live-Trigger** → manueller Admin-Trigger nach Deploy → JSON Response zeigt `phase_a_skipped` step → `worklog/proofs/071-trigger-response.txt`
4. **API-Call-Count Verify** → `cron_sync_log` Query: vor/nach Deploy `details->>'api_calls'` vergleichen

## Scope-Out

- Pre-fetch optimization (1 master-query statt 7 per-league) → Slice 076+
- 30-Minuten-Schedule während Live-Window → Overengineering, nicht jetzt
- Per-Liga-eigener-Schedule (BL2 nur Fr-So) → komplex via 7 separate Cron-Jobs, in Slice 076+ wenn 3×/Tag nicht reicht
- Admin-UI mit Cron-Status-Dashboard → Slice 073 (separat)

## Test-Strategie

- Lokal: tsc + next build
- Live: manueller Admin-Trigger nach Deploy → Response Check
- Nach 1 Tag: cron_sync_log Audit
