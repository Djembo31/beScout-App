# Slice 284a — Live-Lifecycle: Cron-Window + Status-Modell + Self-Heal + Scoring-Guard

**Größe:** L (Migration + 2 Crons + Types + UI-Guards) · **Slice-Type:** Migration + Service + UI
**Datum:** 2026-06-12 · **CEO-Scope:** Nein (Bugfix-Kette; Blast-Radius Geld = 0 verifiziert)
**Quelle:** Punch-List `worklog/audits/2026-06-12/stab-284-punchlist.md` — FANT-01/02/03/04/14 (3×P0+2×P1), Wave 1.

## 1. Problem (Evidence = Punch-List + DB-verifiziert)

Kausalkette: (FANT-01) live-score-sync-Window schließt laufende Matches aus → live→finished passiert strukturell nicht via Live-Cron; Live-Feed (`?live=`) liefert beendete Spiele ohnehin nie. (FANT-14) mapStatus schreibt `halftime/postponed/cancelled` — `fixtures_status_check` (DB-verifiziert) erlaubt nur 4 Werte → tägliche Updates failen SILENT → 154 Geister + HT-Spiele nicht im Live-Bucket. (FANT-02) 2 stuck-live seit 08.05. von keinem Cron erreichbar. (FANT-03) Scoring würde Spieler unaufgelöster Fixtures als No-Show werten (hier: 0 Schaden, aber Invariante fehlt). (FANT-04) UI vertraut status='live' blind — pulsierende Geister.

## 2. Lösung (5 Tracks, 1 Slice)

**T1 — Window-Fix (live-score-sync):** Pre-Check als OR: `status='live'` (jede Age) ODER (`status='scheduled'` AND played_at ±15min). Supabase `.or()`.

**T2 — Status-Modell (Migration + Types + mapStatus):**
- Migration: `fixtures_status_check` → 6 Werte (+`postponed`, +`cancelled`). Kein Function-Change (AR-44 n/a).
- `FixtureStatus`-Union + DbFixture erweitern.
- mapStatus: `HT/BT/P → 'live'` (halftime raus — ist live), PST→'postponed', CANC/ABD/AWO/WO→'cancelled'; SUSP/INT→'postponed' (wird fortgesetzt).
- **Done-Semantik:** `cancelled` zählt überall als „GW-done" (sonst blockt ein abgesagtes Spiel Advance/Scoring für immer): gameweek-sync done-Sets + dbTruthAllDone, getGameweekStatuses, useGameweek-complete. `postponed` zählt NICHT done (wird nachgeholt; blockt wie heute via dbTruthAllDone — bewusst, FPL-konform erst werten wenn gespielt).

**T3 — Stale-Live-Recovery (live-score-sync, neue Branch):** Fixtures `status='live' AND played_at < now()-4h` → API-Lookup per `/fixtures?ids=a-b-c` (Batch ≤20) → finalen Status+Score schreiben (mapStatus-normalisiert, einmal OHNE den `.neq('status','finished')`-Lock weil Ziel = finished). Läuft VOR dem Window-Skip (auch bei leerem Live-Window!). **Heilt die 2 stuck-Fixtures automatisch beim ersten Prod-Lauf** — kein manueller SQL-Heal.

**T4 — Pre-Scoring-Invariant (gameweek-sync score_events):** Vor score_event pro Liga: count past-Fixtures der GW in `('scheduled','live','postponed')` → >0 ⇒ skip mit Log `scoring_blocked_unresolved_fixtures` (Defense-in-Depth zusätzlich zu dbTruthAllDone).

**T5 — UI-Staleness-Guard:** Helper `isFixtureLive(status, playedAt, now)` = `status==='live' && playedAt > now-5h` in `src/features/fantasy/constants` (o.ä.). Konsumenten: SpieltagBrowser live/pending-Buckets (stale-live → pending; `cancelled` raus aus pending+upcoming), FixtureCard Live-Renders, FixtureDetailModal Badge+60s-Polling-Gate. TopspielCard = Wave 4.

## 3. Files

| File | Track |
|------|-------|
| `supabase/migrations/20260612*_slice_284a_fixture_status_union.sql` | T2 |
| `src/types/index.ts` (FixtureStatus) | T2 |
| `src/app/api/cron/sync-fixtures-future/route.ts` (mapStatus) | T2 |
| `src/app/api/cron/live-score-sync/route.ts` | T1+T3 |
| `src/app/api/cron/gameweek-sync/route.ts` (+advance-helpers?) | T2-done +T4 |
| `src/features/fantasy/services/fixtures.ts` (getGameweekStatuses done-set) | T2 |
| `src/features/fantasy/hooks/useGameweek.ts` | T2 |
| `src/components/fantasy/spieltag/SpieltagBrowser.tsx` + `FixtureCard.tsx` + `FixtureDetailModal.tsx` | T5 |
| Tests: advance-helpers/useGameweek/Browser-Buckets | alle |

## 4. Impact (kombiniert)

- **Status-Union-Konsumenten** grep-verifiziert: Buckets nutzen Exclusion-Filter (neue Werte fallen safe in pending/upcoming nach Datum); einzige IN-('finished','simulated')-done-Sets siehe T2-Liste. `isLocked` (fixtures.ts:363) = FANT-08, Wave 4.
- **Migration:** CHECK-Replace, kein RLS/Function-Touch. Verify: `pg_get_constraintdef`.
- **Realtime (Slice 267):** fixtures-UPDATEs auf postponed/cancelled fließen durch bestehende Subscription — Konsument SpieltagTab patcht status generisch ✓.
- **Money:** score_event unverändert; Invariante ist additiver Guard. Blast-Radius alt = 0 (verifiziert).

## 6. ACs

- AC-01: stuck-live=0 nach erstem Prod-Cron-Lauf. VERIFY: SQL `status='live' AND played_at<now-6h` = 0 + cron_sync_log Recovery-Step.
- AC-02: CHECK = 6 Werte. VERIFY: pg_get_constraintdef.
- AC-03: mapStatus liefert NUR Union-Werte. VERIFY: Unit-resistenter Code-Read + tsc (Return-Type `FixtureStatus`).
- AC-04: Window-Pre-Check matcht live-anywhere. VERIFY: Code + Test des .or-Strings.
- AC-05: cancelled zählt done (advance nicht geblockt), postponed nicht. VERIFY: vitest advance-helpers/gw-done.
- AC-06: UI: stale-live rendert als „Ausstehend" (kein Pulse), Modal pollt nicht. VERIFY: Komponenten-Test isFixtureLive + Live-Screenshot nach Heal.
- AC-07: Scoring-Skip-Log bei unaufgelösten Fixtures. VERIFY: Code + Unit für Count-Guard wenn extrahierbar.
- AC-08: tsc + betroffene Suiten grün.

## 7. Edge Cases (Kern)

| # | Case | Handling |
|---|------|----------|
| 1 | API liefert stuck-Fixture nicht mal per ?ids | Nach 2. Fehl-Lauf: Status→'cancelled' + WARN-Log (Operator-Sicht via cron_sync_log) |
| 2 | Recovery findet Spiel noch echt live (Verlängerung>4h Unwetter) | mapStatus schreibt 'live' zurück → kein Schaden, nächster Lauf |
| 3 | postponed-Fixture bekommt neuen Termin | sync-fixtures-future updated played_at + status→scheduled (prüfen: Update-Pfad überschreibt status? ja, mapped NS→scheduled ✓) |
| 4 | cancelled in aktiver GW + Events offen | done-Semantik: zählt complete → Scoring läuft, Spieler des Spiels = 0/Auto-Sub (korrekt — Spiel findet nie statt) |
| 5 | last_live_update_at NULL bei legitim-live | Guard nutzt played_at (immer gesetzt), nicht last_live_update_at |
| 6 | ?ids-Batch >20 stuck | chunk(20) |
| 7 | Geister-'scheduled' Vergangenheit (154) | NICHT dieser Slice (Wave 2) — aber T2 macht künftige Syncs heilfähig |
| 8 | TS-Switches auf FixtureStatus exhaustive | tsc nach Union-Change zeigt alle Stellen |

## 8.-13. (kompakt)

Self-Verify: tsc · vitest fantasy+helpers · Migration-Verify-SQL · Prod: cron manuell curlen + SQL AC-01 · Spieltag-Screenshot 2.BL GW33.
Open-Q: keine CEO. Proof: worklog/proofs/284a-live-lifecycle.md. Scope-Out: FANT-07-UI-Bucket „verlegt", FM-*, FANT-05/09/10/13, Geister-Batch (Wave 2-4). Stage-Chain: SPEC→IMPACT(inline §4)→BUILD→REVIEW(Cold-Context Pflicht, Migration+Cron)→PROVE→LOG. Pre-Mortem: (1) CHECK-Erweiterung vor Code-Deploy nötig (sonst schreibt neuer mapStatus weiter in alten CHECK → Reihenfolge: Migration ZUERST applizieren, dann Push). (2) done-Set-Stelle übersehen → grep `'finished','simulated'` exhaustiv. (3) .or()-Syntax-Fehler PostgREST → lokal gegen Prod-DB testen (read-only count). (4) Recovery-Branch API-Quota — ≤1 Call/30min nur wenn stuck existiert. (5) Realtime-Publication deckt UPDATE generisch ✓.
