# Review Slice 284a — Live-Lifecycle-Fix

**Typ:** Cold-Context-Reviewer-Agent (a7292ab4926d69454), L-Slice-Pflicht (Migration + 2 Crons)
**Verdict:** REWORK → **alle PFLICHT-Findings geheilt** → merge-ready
**Datum:** 2026-06-12 · time-spent Reviewer: ~35 min

## Findings + Heal-Status

| # | Sev | Issue | Heal |
|---|-----|-------|------|
| F-01 | **MAJOR** | Cancelled-Fallback 1-Strike + vertraut leerer API-Response blind — API-Football liefert Rate-Limit als HTTP 200 + `errors` + leerem response → ALLE stale-Fixtures des Chunks wären sofort cancelled (= GW-done → Scoring mit fehlenden Daten, kein Re-Score). Hätte beim ALLERERSTEN Prod-Lauf echte 2:0/2:2-Ergebnisse verschlucken können. | ✅ Empty-Response-Guard (skip + errors-Log) + Cancel erst nach 24h-Cutoff (pragmatisches 2-Strike, Daily-Sync hat Vorrang) |
| F-02 | **MAJOR** | `'AWO'` existiert nicht als API-Code (korrekt: `'AWD'`) — AWD-Fixtures wären auf scheduled/null gefallen → neue unheilbare Geister-Klasse + OR-Pre-Check-Quota-Dauerleck (1440 Calls/Tag). Typo stammte aus der Punch-List und wanderte ungeprüft in 2 Files. | ✅ AWD an beiden Stellen |
| F-03 | **MAJOR** | FixtureCard-Accent nutzte RAW-Status — stale-live pulsierte im Border/Glow weiter trotz korrektem Label (AC-06 wörtlich verletzt; Anils Original-Symptom) | ✅ Accent vom effektiven Status |
| F-04 | MINOR | SpieltagTab simulatedCount ohne cancelled → grüner „Offen"-Pulse für immer bei abgesagtem Spiel | ✅ +cancelled |
| F-05 | MINOR | activity-status-MaxGW-Query hatte cancelled fälschlich im done-Set — „max GESPIELTE GW" braucht Spiel-Evidenz (Wave-2-Interaktion: Süper-Lig-Triage hätte Massen-doubtful ausgelöst) | ✅ revertiert + Kommentar (Done-Set-Semantik ist NICHT uniform) |
| F-06 | MINOR | Spec-Drift 2-Strike vs 1-Strike | ✅ via F-01 aufgelöst |
| F-07 | MINOR | API-seitiges allDone zählt CANC nicht → +24h Finalisierungs-Latenz (funktional korrekt) | Backlog-Notiz (optional) |
| F-08 | MINOR | 2 stale 4-Wert-Casts in fixtures.ts (Type-Truth-Drift) | ✅ → `as FixtureStatus` |
| F-09 | MINOR | Test-Gaps | ✅ +stale-live-FixtureCard-Render-Test (kein LIVE-Text, kein animate-pulse, resultPending) — Bucket-Test via Helper-Unit abgedeckt |
| F-10 | NIT | Mid-File-Import | ✅ an Top |

**Heal-Verify:** tsc 0 · fantasy+api-Suiten **346/346** grün.

## Verifizierte Kern-Ketten (Reviewer)

- **T3-Erreichbarkeit exakt bestätigt:** OR-Pre-Check zählt live ohne Age-Filter → kein Skip solange stale-live existiert → Recovery läuft → nach Heilung fällt Count auf 0, Quota-Sparen reaktiviert. Bei minütlichem Cron: Heilung < 1 min nach Deploy.
- T4 blockt event_close nicht (Gate ist dbTruthAllDone, by design).
- T5-Konsumenten vollständig (SpieltagPulse/SpieltagTab/Home-isEventLive geprüft).
- Migration-First-Reihenfolge eingehalten ✓.

## Observations → Backlog

- Live→Finished-Latenz ~2-4h by design (Recovery-Cutoff); Verbesserung via `last_live_update_at < now-15min`-Trigger = Wave-3/4-Kandidat.
- Live-Fixture ohne api_fixture_id würde Window dauerhaft offen halten — Detection-SQL als Operator-Smoke-Kandidat.

## Knowledge-Capture (→ LOG)

1. errors-scraper.md: **API-Football liefert Fehler als HTTP 200 + errors-Body + leerem response** — „nicht in Response = existiert nicht"-Schlüsse brauchen Empty-Guard (Slice-140-Verwandtschaft).
2. **Externe Enum-Codes nie aus Audit-Texten abschreiben** (AWO-Typo wanderte aus Punch-List in 2 Files; der korrekte Code stand im Nachbar-Kommentar).
3. **UI-Staleness-Guards müssen ALLE Style-Ableitungen erfassen** (Label gefixt, Accent-Helper vergessen = halber Fix).
4. **Done-Set-Erweiterungen sind nicht uniform** — cancelled=done für Advance/Scoring-Gates, NICHT für „max gespielte GW".
