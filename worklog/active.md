# Active Slice

```
status: idle
slice: 352
title: ✅ DONE — Workflow-Effizienz #1+#2+#3 (Navigator-Split + Status-Trim + Ops-Spur)
stage: LOG complete
size: S
slice-type: Doc
spec: inline (3 Tracks aus worklog/notes/workflow-efficiency-analysis.md, Anil-Alignment 2026-06-23)
proof: worklog/proofs/352-navigator-split.txt
review: worklog/reviews/352-review.md (self-review, Ops/Doc, kein Money/Security)
next: errors-db.md (787 Z.) + errors-infra.md (538 Z.) gleiche Navigator-Mechanik (eigene Ops-Slices)
```

## Plan (Anil-Alignment 2026-06-23)

**Tracks #2 + #3 erledigt** (Ops-Spur): #2 `ship-status-gate.sh` log.md-Injection 5→1 Eintrag + git log 5→3. #3 workflow.md Ops/Tooling-Slice-Spur definiert.

**#1 — Anil-Entscheidung nach Code-Reading-Finding:** „feiner path-scopen" trifft .tsx-Kollaps-Wand (i18n/CSS/Modal/React-Patterns feuern alle beim .tsx-Edit → Path-Split würde Patterns verstecken = Safety-Regression). Gewählt: **Navigator-Regel inline (always-loaded) + Detail on-demand**.

- `errors-frontend.md` behält `paths:`-Frontmatter (lädt bei .tsx-Edit) → wird zu **Navigator**: je Pattern 1 Zeile mit der ACTIONABLE Regel + Pointer auf Detail-Anker. Auto-Show der Guardrail bleibt.
- NEU `errors-frontend-detail.md`: voller verbose Inhalt (Root-Cause, Code-Blöcke, Audits) aller Patterns. **Non-matching glob** → NIE auto-geladen, nur on-demand via Read.
- **Verify (Pflicht):** Heading-Diff — jeder `### Pattern` aus dem Original überlebt in Detail UND erscheint im Navigator. Null Pattern-Verlust.
- Danach errors-db / errors-infra als eigene Folge-Slices (gleiche Mechanik).
