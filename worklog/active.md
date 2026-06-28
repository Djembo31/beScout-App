# Active Slice

```
status: idle
slice: 431
title: Workflow-Reset Phase 1 — Ballast-Schnitt (Hooks subtrahieren + 2 Priority-Fixes)
size: S
type: Hook/Doc (Ops-Lane, money-neutral)
stage: LOG (DONE)
spec: inline (unten) + worklog/notes/workflow-ballast-audit.md
proof: worklog/proofs/431-ballast-cut.txt (38→32 Hooks, JSON valid, 0 dangling, bash -n OK)
review: self-review PASS (Ops-Lane, kein Money/Security)
```

## 431 — Ballast-Schnitt (Scope B, Anil approved „sichere Schnitte autonom")
**Problem:** Meta-Akkretion gemessen — 38 Hooks (April: 28), 8 davon kaputt/Dublette/Theater. Audit: `worklog/notes/workflow-ballast-audit.md`.
**Plan (dieser Slice = Hook-Hälfte + Skill-Archiv):**
- CUT 6 Hooks (de-register + gelöscht, git history = Archiv): test-reminder, ship-stage-timer, ship-build-goal-suggest (kaputt), ship-task-enforcement (Dublette), ship-deferred-reeval-reminder (Dublette), quality-gate-v2 (no-op).
- DEDUP: ship-kanban-sync nur 1× (SessionStart), Stop-Verdrahtung raus.
- FIX 2 (Priority): crash-recovery (unbegrenztes handoff-Append → dedizierte Backup-Datei), session-handoff-auto (volle tsc bei jedem Stop raus).
- ARCHIVE Skills: 5 Beta (Beta abgebrochen D111) + 3 dormant (metrics/improve/optimize, null Nutzungs-Spur).
**Deferred (FIX-Pass 2, eigener Slice):** pre-commit-guard (unconditional-run), run_tests_on_change (volle Suite blockierend), auto-lint (debounce), pattern-check (offset-bug), effort-gate-Asymmetrie. **Judgment-Cut (Anil-Frage offen):** Auditor-Agents 4→1-2.

## ➡️ DANACH (Workflow-Reset Phasen)
Phase 2 Anti-Akkretion-Gegengewicht (Regel+Ritual+Signal) · Phase 3 schlanker workflow.md/CLAUDE.md-Kern · Phase 4 Operating-Agreement (wie Anil mich nutzt). Einstieg-Diagnose: `worklog/notes/workflow-ideal-prep.md`. Feature pausiert (428b DROP, Welle 3).

## Zuletzt
- **430** (2026-06-28) — Prozess-Elite-Optimierung P1+P2+P5 (Doc/Hook, self-review PASS).
- **429** (2026-06-28) — finalize entkoppeln „Score≠Advance" (M, PASS). GW-Fork 3/3.

## ➡️ NÄCHSTE SESSION = WORKFLOW-IDEAL / ANTI-AKKRETION durchplanen (Anil, ZUERST vor Mock→Pro)
Einstieg: `worklog/notes/workflow-ideal-prep.md` (Diagnose + 7 Entscheidungs-Punkte fertig).
DANACH Feature: 428b DROP (post-Deploy) · 427 Live-Screenshot · Ranking-Konsolidierung · Welle 3.
Stand: `memory/session-handoff.md`.

## Zuletzt
- **430** (2026-06-28) — Prozess-Elite-Optimierung P1+P2+P5 (Doc/Hook, self-review PASS).
- **429** (2026-06-28) — finalize entkoppeln „Score≠Advance" (M, PASS). GW-Fork 3/3.
