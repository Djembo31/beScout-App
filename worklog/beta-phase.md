# Beta-Phase Tracker

> **Single-Source-of-Truth für Beta-Launch-Phase.** Single-Source. Detail-Tabellen
> in `worklog/audits/<date>/*.md` und `worklog/punch-list-*.md` sind Inputs;
> dieser Tracker ist das **Aggregat das Hooks/Skills lesen**.
>
> **Erzeugt:** Slice 214 (D50 Wave 2 Operationalisierung der "Fertig"-Definition).
> **Updated von:** `/auto-beta-ready` Skill, manuell von Anil/CTO.
> **Gelesen von:** `.claude/hooks/ship-phase-gate.sh`, `/auto-beta-ready status`.

```yaml
phase: A    # Re-Audit triggered, neue Findings → Heal benötigt
last_phase_run: 2026-04-27 (Targeted Phase-A Re-Audit BuyConfirmModal — 9 NEU Findings)
last_signoff: FAIL
last_signoff_date: 2026-04-26
last_signoff_verdict: "HARD-NO-GO Slice 217 + Targeted Re-Audit 2026-04-27 fand 9 NEU Findings (3 P1) im Slice-222-Diff. Tech-Side ist NICHT mehr 'maximal sauber' — Re-Audit-Wert war hoch."
findings_open:
  P0: 0
  P1: 1   # Slice 224 healed BUSINESS-NEU-1 + FM-NEU-2 → UX-NEU-2 verbleibt für Slice 225
  P2: 3   # NEU 2026-04-27: FM-NEU-3, FM-NEU-4, UX-NEU-3
  P3: 2   # Slice 224 healed BUSINESS-NEU-2 → FM-NEU-5, UX-NEU-4 verbleiben
  incomplete_reruns: 0
  test_mock_backlog: 0
  signoff_questionable: 2   # Page-Health-Score + Persona-Score numerisch
  deferred:
    - POSTHOG-NEU-1 (post-3-Tester-Beta, wenn Skala >20 User)
    - FM-RR-2 (Watchlist-Standalone-Page Feature)
  ceo_pending:
    - FANTASY-NEU-1 (FPL 60min-Rule, Money-Path Scoring-Change)
    - F-09 BPS-Bonus (pre-existing CEO-pending)
    - UX 20 MembershipSection Confirm (pre-existing CEO-pending)
  wont_fix:
    - FM-RR-1 (Slice 208 Spec-Decision: Sparkline ist Glance-Indicator, kein Detail-Tool)
    - BRAND-NEU-1 (pre-existing pre-Slice-198, audit-stale)
  stale:
    - TR-NEU-1 (event_winner-Keys existieren bereits in DE+TR)
    - FM-RR-3 (Trending-Pills Punch-List-Drift, audit-Annahme falsch)
aggregate_file: worklog/audits/2026-04-27/aggregate.md
signoff_file: worklog/sign-off/2026-04-26-readiness.md
gate: "kein 'Beta-fertig'/'launch-ready' bis last_signoff == PASS UND P0+P1 = 0"
slice_stubs_pending:
  - "Slice 224: 5-Min-Wording-Heal — BUSINESS-NEU-1 + BUSINESS-NEU-2 (heilt FM-NEU-2 automatisch)"
  - "Slice 225: InfoTooltip-Migration-Wave — UX-NEU-2 + UX-NEU-3 + UX-NEU-4 (BuyConfirmModal + MostOwnedSection Slice 216) + Pattern-Regel ui-components.md"
  - "Slice 226: getPlayerSentimentCounts Reliability-Weighting — FM-NEU-3"
  - "Slice 227: Sentiment-Bar 3-Segment + Empty-State-CTA — FM-NEU-4 + FM-NEU-5"
anil_action_blockers:
  - "memory/beta-tester-list.md erstellen (3 Tester, .gitignore-pflicht) — Recruitment-Templates fertig in memory/beta-tester-recruitment-templates.md (Slice 219)"
  - "memory/beta-onboarding.md DRAFT fertig (Slice 219), Anil finalisiert echte Email/Tel-Nr beim Versand"
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
