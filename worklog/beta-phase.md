# Beta-Phase Tracker

> **Single-Source-of-Truth für Beta-Launch-Phase.** Single-Source. Detail-Tabellen
> in `worklog/audits/<date>/*.md` und `worklog/punch-list-*.md` sind Inputs;
> dieser Tracker ist das **Aggregat das Hooks/Skills lesen**.
>
> **Erzeugt:** Slice 214 (D50 Wave 2 Operationalisierung der "Fertig"-Definition).
> **Updated von:** `/auto-beta-ready` Skill, manuell von Anil/CTO.
> **Gelesen von:** `.claude/hooks/ship-phase-gate.sh`, `/auto-beta-ready status`.

```yaml
phase: D
last_phase_run: 2026-04-26T21:30 (Slice 216 P1-Wave-Heal completed)
last_signoff: FAIL
last_signoff_date: 2026-04-26
last_signoff_verdict: "HARD-NO-GO (post-Slice-216 P1=0): noch 2 hard-FAIL Kriterien (tester-list + onboarding-doc), 4 unverifizierbare ❓. P1-Heals erledigt — nächster Re-Trial wird SOFT-NO-GO statt HARD-NO-GO produzieren."
findings_open:
  P0: 0
  P1: 0
  P2: 4
  P3: 3
  incomplete_reruns: 0
  test_mock_backlog: 1   # ClubContent.test.tsx: useLeagueActiveGameweek + useEventPlayerPickRates nicht gemockt seit Slice 204 — Slice 218+
aggregate_file: worklog/audits/2026-04-26/aggregate.md
signoff_file: worklog/sign-off/2026-04-26-readiness.md
gate: "kein 'Beta-fertig'/'launch-ready' bis last_signoff == PASS UND P0+P1 = 0"
slice_stubs_pending:
  - worklog/specs/214-derived-p1-fm-001.md   # FM-NEU-1 PickRateBadge cards-only
  - worklog/specs/214-derived-p1-ux-002.md   # UX-NEU-1 FeedbackModal preventClose
  - worklog/specs/214-derived-p1-k-003.md    # K-RR-1 Floor-Preis Tooltip
  - worklog/specs/214-derived-p2p3-bundle.md # 5 P2/P3 mixed
anil_action_blockers:
  - "memory/beta-tester-list.md erstellen (3 Tester, .gitignore-pflicht)"
  - "memory/beta-onboarding.md erstellen (DE+TR 1-Page)"
  - "TR-Native-Reviewer organisieren"
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
