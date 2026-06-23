# Active Slice

```
status: idle
slice: 354
title: ✅ DONE — 349 Live-Verify (Prod-Bug gefunden+gefixt) + fan_rankings→profiles FK + Stale-Prävention
stage: LOG complete
size: S
slice-type: Migration + Tool/Doc
spec: inline (Anil: 349-Verify + Stale-Ursache beheben + für neue Session finalisieren)
proof: worklog/proofs/354-fan-leaderboard-fk.txt (vorher Error-State → nachher 38 Fans, desktop+393px)
review: worklog/reviews/354-review.md (reviewer-Agent PASS, 2 INFO, kein Money/Tally-Effekt)
next: Pro-Stand-Roadmap (Polls-Reste / S7-Leaderboard scout_scores↔user_stats / Dormant-Hygiene)
```

## Plan (Anil-Alignment 2026-06-23)

**Tracks #2 + #3 erledigt** (Ops-Spur): #2 `ship-status-gate.sh` log.md-Injection 5→1 Eintrag + git log 5→3. #3 workflow.md Ops/Tooling-Slice-Spur definiert.

**#1 — Anil-Entscheidung nach Code-Reading-Finding:** „feiner path-scopen" trifft .tsx-Kollaps-Wand (i18n/CSS/Modal/React-Patterns feuern alle beim .tsx-Edit → Path-Split würde Patterns verstecken = Safety-Regression). Gewählt: **Navigator-Regel inline (always-loaded) + Detail on-demand**.

- `errors-frontend.md` behält `paths:`-Frontmatter (lädt bei .tsx-Edit) → wird zu **Navigator**: je Pattern 1 Zeile mit der ACTIONABLE Regel + Pointer auf Detail-Anker. Auto-Show der Guardrail bleibt.
- NEU `errors-frontend-detail.md`: voller verbose Inhalt (Root-Cause, Code-Blöcke, Audits) aller Patterns. **Non-matching glob** → NIE auto-geladen, nur on-demand via Read.
- **Verify (Pflicht):** Heading-Diff — jeder `### Pattern` aus dem Original überlebt in Detail UND erscheint im Navigator. Null Pattern-Verlust.
- Danach errors-db / errors-infra als eigene Folge-Slices (gleiche Mechanik).
