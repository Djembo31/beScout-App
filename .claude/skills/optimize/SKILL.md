---
name: optimize
description: AutoResearch-Loop nach Karpathy-Pattern. Definiere Metric → baseline messen → in Iterationen experimentieren → bei improve KEEP, bei regression REVERT. Nutze wenn messbare Quality-Metric existiert (Gold-%, Bundle-Size, Match-Rate, Test-Coverage, Render-Perf) und systematische Optimierung gewünscht. Nicht für Money/Trading-Paths.
---

# /optimize — AutoResearch Loop (Karpathy-Pattern)

Karpathy: 700 Experimente → 11% GPT-2-Training-Speedup. Shopify: 93 Commits → 53% Rendering-Gain.
Prinzip: 1 Metric, 1 Change pro Iteration, automatische Revert-Entscheidung.

## Gate vor Start (PFLICHT)

1. **Metric messbar in <30s?** — 1 Query/Test, ein Zahlwert
2. **Baseline etabliert?** — jetzt messen, in `worklog/optimize/NNN-<metric>.md` loggen
3. **Bounded?** — max Iterationen (Empfehlung 10) ODER Ziel-Wert definiert
4. **Nicht Money/Trading-Path?** — Revenue-Code braucht Hypothese + Review, nicht Experiment

## Loop-Regeln

- 1 Change per Iteration (isoliert, commit nach jeder)
- Messe VOR + NACH → `result: +X.X%` oder `-X.X%`
- **KEEP wenn ≥ +0.5%**, sonst **REVERT** (`git restore <file>` oder `git reset --hard HEAD~1`)
- Nach 3 consecutive REVERTs → STOP (local optimum erreicht)
- Bei Ziel-Wert → STOP + final commit

## Artefakt-Template

`worklog/optimize/NNN-<metric>.md`:

```md
## Baseline
- date: YYYY-MM-DD HH:MM
- metric: <name>
- value: <number>
- measurement: <SQL/command/test>

## Iterations
| # | Change | Before | After | Delta | Action |
|---|--------|--------|-------|-------|--------|
| 1 | ... | ... | ... | ... | KEEP/REVERT |

## Final
- value: <final>
- commit: <hash>
- stopped at: iter N (reason)
- total delta: +X.X%
```

## Beispiel-Kandidaten BeScout

- TM-Match-Rate (aktuell ~50-68%)
- Bundle-Size (`npx next build` summary)
- `/api/players` latency
- Gold-% pro Liga
- Leaderboard-Render-Time

## Anti-Patterns

- **Theorie weglassen:** Erst context7/Firecrawl/Literatur, dann Experiment. Random-Change = Brute-Force.
- **Multi-Change pro Iter:** Wenn Delta nicht eindeutig attributierbar → nutzlos.
- **Metric-Drift:** Identisches SQL/Test pro Iter, sonst keine Vergleichbarkeit.
- **Optimieren ohne Ziel:** "Mach schneller" ist kein Ziel. "<500ms" ist Ziel.

## Meta-Metric: Keep-Rate

Tracke keep-rate über alle Iterations:
- Hoch (>70%) → Lernen funktioniert, weitermachen
- Niedrig (<30%) → Random-Changes, STOP + Literatur
