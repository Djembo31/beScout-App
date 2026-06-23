# Active Slice

```
status: idle
slice: 351
title: ✅ DONE — Knowledge-Coupling-Gate (Workflow-Härtung gegen Stale)
stage: LOG complete
size: S
slice-type: Tool
spec: inline (Trigger = Anil: Knowledge-Stale darf nicht durchrutschen)
proof: worklog/proofs/351-knowledge-coupling-gate.txt
review: worklog/reviews/351-review.md (self-review, Tooling, positiv+negativ getestet)
next: Slice 349 Live-Playwright-Verify (offen) → dann Pro-Stand-Roadmap (Polls-Reste / S7-Leaderboard)
```

## Stand (Session-Ende 2026-06-23)

**Slices diese Session:** 348 (csf_multiplier raus) · 349 (Fan-Board, ⚠ Playwright offen) · 350 (CI-grün + Push-Fix + Nightly-Fix) · 351 (Knowledge-Coupling-Gate).

**Slice 351 — Workflow-Härtung (D45: Hooks > Text-Regeln):**
Die Knowledge-Stale-Klasse, die diese Session durchrutschte (INDEX D93 vs D94, `updated:` nicht gebumpt), ist jetzt ein **blockierender pre-commit-Gate** in `audit-knowledge.ts`:
- **Check 7 (HARD):** INDEX „D1–D<n>"-Range muss == max-D in `decisions.md`.
- **Check 8 (HARD):** staged `docs/knowledge/**.md` mit Content-Change → `updated:` MUSS heute sein.
Beide positiv+negativ getestet, 0 False-Positives, bereits verdrahtet (pre-commit Step 7 + nightly).

**Wichtig nächste Session:** Wer ein Knowledge-File ändert, MUSS `updated:` auf heute setzen — sonst blockt der Commit. Wer D<n> zu decisions.md hinzufügt, MUSS INDEX-Range mitziehen.
