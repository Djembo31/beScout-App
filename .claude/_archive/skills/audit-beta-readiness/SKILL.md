---
name: audit-beta-readiness
description: Phase A des Beta-Launch-Pakets. Dispatcht 8 Audit-Agents parallel auf alle 21 Pages (oder Sub-Scope). Konsolidiert Findings in einem Master-Bericht mit Severity-Sort. Nutze als Wahrheits-Feststellung VOR Polish-Sweep.
---

# /audit-beta-readiness — Phase A

**Ziel:** Vollstaendige Wahrheit ueber Stand der App ueber alle Pages und Linsen. EIN konsolidierter Bericht statt 8 verstreute.

## Wann benutzen

- Vor Beta-Launch-Endspurt (50-Tester-Vorbereitung)
- Nach groesseren Refactors zur Regression-Detection
- Bei Stand-Unsicherheit ("was ist eigentlich kaputt?")

## Scope

**Default:** alle 21 Pages unter `src/app/(app)/`
**Optional:** Sub-Scope via `args` (z.B. `/audit-beta-readiness manager,market,fantasy`)

## Die 8 Audit-Linsen

| # | Agent | Linse | Output-Path |
|---|-------|-------|-------------|
| 1 | brand-coherence-auditor | Visual-DNA, Tokens, Components | `worklog/audits/<date>/brand.md` |
| 2 | ux-coherence-auditor | Loading/Empty/Error/Modal-Pattern | `worklog/audits/<date>/ux.md` |
| 3 | fm-mechanics-expert | Manager-Hub, Trading, Market | `worklog/audits/<date>/fm-mechanics.md` |
| 4 | fantasy-scoring-expert | Spieltag, Lineup, Captain, Scoring | `worklog/audits/<date>/fantasy.md` |
| 5 | reviewer | Code-Quality, Patterns | `worklog/audits/<date>/code.md` |
| 6 | impact-analyst | Money-Path + Cross-cutting | `worklog/audits/<date>/impact.md` |
| 7 | (manual) `/silent-fail-audit` | Code-Hygiene | `worklog/audits/<date>/silent-fail.md` |
| 8 | (manual) `/beScout-business` | Compliance + Wording | `worklog/audits/<date>/compliance.md` |

## Dispatch-Pattern

EIN assistant turn, alle Agents parallel:

```
DATE=$(date +%Y-%m-%d)
mkdir -p worklog/audits/$DATE/

Agent(brand-coherence-auditor, scope=alle 21 Pages): "Phase 0 + Audit alle Pages..."
Agent(ux-coherence-auditor, scope=alle 21 Pages): "Phase 0 + Audit alle Pages..."
Agent(fm-mechanics-expert, scope=manager+market+player+transactions+missions+inventory): "..."
Agent(fantasy-scoring-expert, scope=fantasy+community-predictions+rankings): "..."
Agent(reviewer, scope=letzte 30 Commits): "Code-Quality-Sweep gegen common-errors.md..."
Agent(impact-analyst, scope=Money-Pfade): "Cross-cutting Money-Path-Audit..."

[Bash: npm run audit:silent-fail (parallel)]
[Skill: /beScout-business compliance-sweep (parallel)]
```

## Master-Bericht-Konsolidierung

Nach allen 8 Reports → erstelle `worklog/audits/<date>/MASTER.md`:

```markdown
# Beta-Readiness Master-Audit — <YYYY-MM-DD>

## Executive Summary
- Total Findings: X (P0:a P1:b P2:c P3:d)
- Beta-Blocker: [Liste P0]
- Recommended Action: GO / FIX-FIRST / BLOCKED

## P0 Findings (sofort fixen, Beta-Blocker)
[Tabelle aus allen 8 Audits, P0-Severity gefiltert, sortiert nach File]

## P1 Findings (diese Woche)
[Tabelle, gruppiert nach Page]

## P2 Findings (Backlog)
[Tabelle kompakt]

## P3 Findings (Monitor)
[Liste]

## Per-Page-Health-Score
| Page | Brand | UX | Domain | Code | Compliance | Total |
|------|-------|----|----|------|------------|-------|
| /manager | 7/10 | 8/10 | 6/10 | 9/10 | 10/10 | 40/50 |
| ...

## Empfehlung
[2-3 Saetze: was zuerst, in welcher Reihenfolge, Tester-Ready-ETA]
```

## Token-Budget

8 parallel Agents = ~120-180k Token. Reichen Cold-Context-Caches aller 8 mit SHARED-PREFIX-Cache-Hit.

## Anti-Patterns

- **NICHT** sequentiell ausfuehren (verschwendet Zeit)
- **NICHT** ohne Konsolidierung (du brauchst 1 Bericht, nicht 8)
- **NICHT** Sub-Scope per default (alle 21 Pages = vollstaendige Wahrheit)
- **NICHT** Per-Agent-Healer-Cycle (Phase A ist Read-Only-Wahrheit, Fixes kommen in Phase B)

## Nach Phase A: Naechster Schritt

1. Anil liest MASTER.md (~30 Min)
2. Anil priorisiert P0/P1
3. → `/sweep-page <page>` startet Phase B Fließband
