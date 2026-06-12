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

## AC-01 — Stuck-Live-Heilung ✅ (mit kritischem Neben-Befund)

**Verlauf:** Deploy ✓ → neuer OR-Pre-Check + Recovery liefen (cron_sync_log:
skipped=false, api_calls=2/Tick) → recovered_count blieb 0 → Forensik ergab den
**kritischsten Fund des Slices:**

### 🚨 Production-API-Football-Key ist seit 06.05.2026 tot

cron_sync_log check_fixtures: letztes max_total > 0 am **2026-05-05** (10 Fixtures).
Seit 06.05.: total=0 für ALLE Ligen täglich — auch für beendete GWs, die die API
sicher kennt. Lokaler Key-Test: `{"access":"Your account is suspended"}`.

Das ist die WAHRE Wurzel hinter FANT-02 (die 2 Fixtures vom 08.05. froren ein,
weil der Live-Feed ab 06.05. leer war) und Mit-Ursache der 154 Geister.
**CEO-Action: dashboard.api-football.com — Abo/Zahlung reaktivieren.**

Der Review-F-01-Empty-Response-Guard funktionierte exakt wie designed: statt
echte Ergebnisse als cancelled zu verschlucken, skippte die Recovery sauber
(recovered_count=0 + warn) — der Guard bewies sich im ersten Prod-Lauf.

### Heal (manuell, da API blind — Scores extern verifiziert)

Endstände gegen kicker.de/DFB-Datencenter verifiziert (KL 2:0 Bielefeld,
SCP 2:2 KSC — identisch mit den eingefrorenen DB-Scores). UPDATE mit
status-Guard, RETURNING bestätigt: beide finished. Nachkontrolle:
fixtures mit status=live → **0**. Self-Heal-Mechanik (league+season+date,
Slice-275-Pattern) bleibt für künftige Fälle scharf, sobald der Key lebt.
