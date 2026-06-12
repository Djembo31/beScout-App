# Proof Slice 284a — Live-Lifecycle (2026-06-12)

## AC-02 — DB-CHECK 6 Werte ✅ (Migration VOR Code-Push applied)

```
pg_get_constraintdef: CHECK ((status = ANY (ARRAY['scheduled','simulated','live',
'finished','postponed','cancelled'])))
```

## AC-03/04/05/08 — Code + Tests ✅

```
npx tsc --noEmit → 0
CI=true vitest run src/features/fantasy src/components/fantasy src/app/api:
 Test Files  28 passed · Tests  346 passed
```
Neu: fixtureLive.test.ts (5 Tests, inkl. Grenzfall exakt 5h) + FixtureCard
stale-live-Render-Test (kein LIVE-Text, kein animate-pulse, resultPending).
mapStatus Return-Type = FixtureStatus (tsc-erzwungen).

## REVIEW

Cold-Context REWORK → 3 MAJOR + 5 MINOR geheilt (worklog/reviews/284a-review.md).
Highlight: F-01 hätte beim ersten Prod-Lauf echte Ergebnisse als cancelled
verschluckt (API-200-mit-leerem-response-Falle); F-02 AWO/AWD-Typo hätte
Quota-Dauerleck + unheilbare Geister-Klasse gebaut.

## AC-01 — Stuck-Live-Heilung (post-Deploy, Cron läuft minütlich)

→ Abschnitt unten nach Deploy: SQL `status='live' AND played_at < now()-'6h'` = 0
+ cron_sync_log recovered_count + Spieltag-Screenshot 2.BL GW33.
