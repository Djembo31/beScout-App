# Active Slice

```
status: idle
slice: 353
title: ✅ DONE — errors-db + errors-infra Navigator-Split (D95) + DISTILL
stage: LOG complete
size: S
slice-type: Doc
spec: inline (Folge-Slices zu 352, gleiche Navigator-Mechanik, D95)
proof: Heading-Diff verifiziert (db 44 ###, infra 41 ### verbatim erhalten; navigator 44/41 Bullets 1:1)
review: self-review (Ops/Doc, kein Money/Security) + unabhängige Verifikation der 2 Parallel-Agent-Outputs
next: Pro-Stand-Roadmap (Polls-Reste / S7-Leaderboard) ODER offene Backlog-Items
```

## Plan (Anil-Alignment 2026-06-23)

**Tracks #2 + #3 erledigt** (Ops-Spur): #2 `ship-status-gate.sh` log.md-Injection 5→1 Eintrag + git log 5→3. #3 workflow.md Ops/Tooling-Slice-Spur definiert.

**#1 — Anil-Entscheidung nach Code-Reading-Finding:** „feiner path-scopen" trifft .tsx-Kollaps-Wand (i18n/CSS/Modal/React-Patterns feuern alle beim .tsx-Edit → Path-Split würde Patterns verstecken = Safety-Regression). Gewählt: **Navigator-Regel inline (always-loaded) + Detail on-demand**.

- `errors-frontend.md` behält `paths:`-Frontmatter (lädt bei .tsx-Edit) → wird zu **Navigator**: je Pattern 1 Zeile mit der ACTIONABLE Regel + Pointer auf Detail-Anker. Auto-Show der Guardrail bleibt.
- NEU `errors-frontend-detail.md`: voller verbose Inhalt (Root-Cause, Code-Blöcke, Audits) aller Patterns. **Non-matching glob** → NIE auto-geladen, nur on-demand via Read.
- **Verify (Pflicht):** Heading-Diff — jeder `### Pattern` aus dem Original überlebt in Detail UND erscheint im Navigator. Null Pattern-Verlust.
- Danach errors-db / errors-infra als eigene Folge-Slices (gleiche Mechanik).
