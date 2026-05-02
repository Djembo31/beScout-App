# D62 Pre-Review — Slice 267 Realtime-Live-Score

**Reviewer:** reviewer-Agent (Cold-Context, Read-Only)
**Date:** 2026-05-02
**Spec-Version reviewed:** v2
**Verdict:** **CONCERNS** (BUILD-ready mit Notes-Patch in Spec — 1 P1 + 1 P1 + 5 P2 + 3 MINOR)

## Summary

Spec ist gut strukturiert, alle 13 Pflicht-Sektionen + Capacity-Sanity vorhanden, M-Slice-Mindest-Anforderungen erfüllt (≥6 Code-Reading, ≥8 Edge-Cases, ≥8 ACs, 11 Pre-Mortem-Szenarien). Die Architektur (Vercel Cron + REPLICA IDENTITY FULL + Liga-Scope-Channel) ist solide und folgt dem `social.ts`-Goldstandard. **Größte Risk-Klasse: zwei i18n-Konflikte (P1) — eine davon ein direkter Slice-263-D62-Catch (Top-Level-String/Object-Drift), die andere ein cross-namespace Doppel-Key der Verwirrung schafft.** Daneben: Spec-interne Drifts (D54 Build-without-Wire angedeutet aber nicht klar als DoD, Service-Mapper-Drift D46), Realtime-Filter-RLS-Detail unklar, FixtureDetailModal-Branch-Logik unter-spezifiziert.

## Findings (alle 8 in v3 adressiert)

### F-01 [P1] Cross-Namespace-Doppel-Key `liveLabel` ✅ ADRESSIERT v3
- **Issue:** `fantasy.liveLabel` existiert bereits (Player-Lock-Indicator). Spec proposed `spieltag.liveLabel` mit identischem String — verschiedene Namespaces aber gleiches Konzept-Risk.
- **CTO-Decision v3:** Neuer `spieltag.liveLabel` (semantisch verschieden: Match-Status ≠ Player-Lock). Drift-Risk akzeptiert für saubere Kontext-Trennung.
- **Spec-Patch:** §3 Tabelle annotiert mit Cross-Namespace-Hinweis, IMPACT §8 erweitert um Doppel-Key-Audit.

### F-02 [P1] i18n-Audit-Command falsch ✅ ADRESSIERT v3
- **Issue:** `grep -E "spieltag\.(browserLive|liveLabel|minute)"` matched falsche Patterns (Konsumenten-`t()`-Calls statt JSON-Keys).
- **Spec-Patch:** IMPACT §8 ersetzt mit korrekter `python -c "import json..."`-Variante (namespace-aware).

### F-03 [P2] Realtime-Filter-Risk bei `league_id IS NULL` ✅ ADRESSIERT v3
- **Issue:** `filter: 'league_id=eq.${leagueId}'` schließt rows mit NULL silent aus.
- **Spec-Patch:** AC-16 hinzugefügt + IMPACT §12 Pre-Migration-Verify-Block.

### F-04 [P2] D54 Definition-of-Done je Layer fehlt ✅ ADRESSIERT v3
- **Issue:** Slice 267 ist Multi-Type (Migration + Service + UI + Cron + i18n + Hook + Type), aber keine explizite Per-Type-DoD.
- **Spec-Patch:** Sektion 13b hinzugefügt mit DoD-Checklist je Layer.

### F-05 [P2] Cron-Race Idempotency-Lock fehlt ✅ ADRESSIERT v3
- **Issue:** Spec sagt "'finished' überschreibt 'live' nicht reversibel" als Mitigation, aber keine explizite SQL-Constraint.
- **Spec-Patch:** Layer 2 ergänzt um `WHERE status != 'finished'` Idempotency-Lock + AC-17.

### F-06 [P2] FixtureDetailModal 3-State-Branch unter-spezifiziert ✅ ADRESSIERT v3
- **Issue:** Heute binary `isSimulated`-Logic. Spec sagt Live aber spezifiziert nicht 3-State-Hierarchy.
- **Spec-Patch:** Layer 3 ergänzt um 3-State-Tabelle (scheduled/live/simulated) + Branch-Hierarchy.

### F-07 [P2] D46-Service-Drift falsch beschrieben ✅ ADRESSIERT v3
- **Issue:** `lib/services/fixtures.ts` ist 2-line Bridge-Re-Export, NICHT paralleler Mapper. Spec/IMPACT hat falsche D46-Behauptung.
- **Spec-Patch:** IMPACT §3 korrigiert — canonical = `features/fantasy/services/fixtures.ts`, lib = bridge.

### F-08 [MINOR] Polling-Trigger-Method unklar ✅ ADRESSIERT v3
- **Issue:** Spec sagt "WS-disconnect-Detection" generisch. Empfohlene Methode (`channel.subscribe(callback)` 2nd-arg) fehlt.
- **Spec-Patch:** §9 Autonom-Zone explizit mit `channel.subscribe((status) => ...)` empfohlen, navigator.onLine verboten.

### F-09 [MINOR] maxDuration-Verify fehlt als AC ✅ ADRESSIERT v3
- **Issue:** Spec sagt `<10s/Call` als Annahme, kein AC verifiziert das.
- **Spec-Patch:** AC-18 hinzugefügt für Cron-Runtime <30s p95.

### F-10 [MINOR] Pre-Mortem #1 obsolet (pg_cron) ✅ ADRESSIERT v3
- **Issue:** Pre-Mortem #1 referenziert pg_cron-http-Extension, aber Q1=Vercel-Cron greenlit.
- **Spec-Patch:** Pre-Mortem #1 ersetzt durch D36-Hobby-Plan-Drift-Pattern.

## Spec-Strengths

- **Capacity-Sanity Sektion 0** ist exzellent — verifizierte Plan-Limits + Auslastungsprozente + Post-Beta-Scale-Cliff explizit.
- **Q1-Q4 Audit-Trail** behalten als Decisions-History.
- **Pre-Mortem 11 Szenarien** > M-Slice-Pflicht 5+.
- **Code-Reading-Liste 12 Items** mit "Zu prüfen"-Spalte.
- **Edge-Cases Tabelle 11 Cases** systematisch enumeriert.
- **Wave-Plan innerhalb Slice** klar geschnitten für parallel-Worktree-Dispatch.
- **Re-use des social.ts-Patterns** als Goldstandard (Konsistenz-Win).

## Recommended Action

**CONCERNS → SPEC v3 mit allen 8 Patches eingearbeitet.** BUILD-ready greenlit nach v3-Lock.

Total Patch-Time: ~40 min (eingearbeitet 2026-05-02). Keine REWORK, keine Architektur-Änderung — alles Drift-Prevention im Sinne D62.

## Time-Spent

42 min (Spec + IMPACT lesen, 8 Files cross-referenziert, common-errors/business/database/fantasy/ui-components/workflow Rules durch-grep, i18n-keys verifiziert, decisions D40-D54 abgeglichen).

---

## Spec-v3 Diff-Summary

| Patch | Spec/IMPACT-Sektion | Status |
|---|---|---|
| F-01 | Spec §3 Tabelle + IMPACT §8 | ✅ v3 |
| F-02 | IMPACT §8 + Spec §13 Pre-Mortem #8 | ✅ v3 |
| F-03 | Spec ACs (AC-16) + IMPACT §12 | ✅ v3 |
| F-04 | Spec §13b NEU | ✅ v3 |
| F-05 | Spec §2 Layer 2 + ACs (AC-17) | ✅ v3 |
| F-06 | Spec §2 Layer 3 mit 3-State-Tabelle | ✅ v3 |
| F-07 | IMPACT §3 | ✅ v3 |
| F-08 | Spec §9 Autonom-Zone | ✅ v3 |
| F-09 | Spec ACs (AC-18) | ✅ v3 |
| F-10 | Spec §13 Pre-Mortem #1 | ✅ v3 |
