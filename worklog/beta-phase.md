# Beta-Phase Tracker

> **Single-Source-of-Truth für Beta-Launch-Phase.** Single-Source. Detail-Tabellen
> in `worklog/audits/<date>/*.md` und `worklog/punch-list-*.md` sind Inputs;
> dieser Tracker ist das **Aggregat das Hooks/Skills lesen**.
>
> **Erzeugt:** Slice 214 (D50 Wave 2 Operationalisierung der "Fertig"-Definition).
> **Updated von:** `/auto-beta-ready` Skill, manuell von Anil/CTO.
> **Gelesen von:** `.claude/hooks/ship-phase-gate.sh`, `/auto-beta-ready status`.

```yaml
phase: C
last_phase_run: 2026-04-26T19:00
last_signoff: never
last_signoff_date: —
last_signoff_verdict: —
findings_open:
  P0: 0
  P1: 2
  P2: 2
  P3: 1
  incomplete_reruns: 2
aggregate_file: worklog/audits/2026-04-26/aggregate.md
gate: "kein 'Beta-fertig'/'launch-ready' bis last_signoff == PASS UND P0+P1 = 0"
```

## Phase-Definitionen

| Phase | Was | Done-Bedingung |
|-------|-----|----------------|
| **A** | Audit-Beta-Readiness (8 Audit-Agents, 21 Pages) | Punch-List existiert, alle P0-Items closed oder triaged |
| **B** | Polish-Sweeps (sweep-page je Findings-Page) | P1-Items abgearbeitet auf <5 |
| **C** | Persona-Walk (3 Personas FM-Power/Casual/TR-Locale) | Friction-Reports vorliegen, P0-Findings closed |
| **D** | Sign-Off (Beta-Exit-Kriterien-Check) | last_signoff == PASS + alle P0/P1 grün |
| **READY** | Beta GO-LIVE | 50-Tester-Onboarding aktiv |

## Regel-Block (von Hook gelesen)

Triggert WARN bei UserPrompt mit Phrasen:
- "fertig", "ready" (im Kontext "beta", "launch")
- "go-live", "go live", "golive"
- "beta launch"

Wenn `last_signoff != PASS` UND Phrase-Match → WARN-Output mit aktuellem Stand.

## Manuelle Updates (post-Slice-Workflow)

Nach jedem Slice-Commit der Findings closed:
```bash
# Update findings_open Counts
sed -i "s/  P1: [0-9]\+/  P1: <new-count>/" worklog/beta-phase.md
```

Nach Phase-Lauf:
```yaml
phase: <new>
last_phase_run: <ISO-timestamp>
```

Nach Sign-Off:
```yaml
last_signoff: PASS | FAIL
last_signoff_date: <ISO>
last_signoff_verdict: "<short-reasoning>"
```

## Phase-Status-Historie

| Datum | Phase | Aktion | Outcome |
|-------|-------|--------|---------|
| 2026-04-26 17:50 | C | 7 Agents dispatched (3 Persona-Walker + 4 Auditors) | ⏳ running/aggregate-pending |
| 2026-04-26 14:24 | docs | Slice 209 Audit-Cleanup (12 audit-stale-marker korrigiert) | done |
| 2026-04-25 ~18 | A | Phase-A-Audit (Brand+UX+FM+Fantasy) | 98 Findings dokumentiert |
| pre-04-25 | B | Polish-Sweeps Slice 198-202 | viele P1 closed |
| **NIE** | **D** | **Sign-Off** | **NIE GELAUFEN — Anil-Direktive 2026-04-26** |
