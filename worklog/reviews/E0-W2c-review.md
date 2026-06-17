# Review — Slice E0-W2c (Wissens-Welle-Cleanup, destruktiv)

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-17 · **Time-spent:** ~35 min

## verdict: CONCERNS → geheilt

Kern (cortex-Retirement, learnings-Revert, archive-not-delete, 0 HARD audit, Historie-Erhalt) sauber. Ein echter Mangel gefunden + sofort gefixt.

## Findings
| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | MEDIUM | `MASTERPLAN.md:19`, `TODO.md:11`, `memory/session-handoff.md:49` | Always-loaded Navigations-Files zeigten mit Money-SSOT-Pointern (D86 „NIE neu erarbeiten") auf die in W2c gelöschten `worklog/concepts/`-Pfade → 404, Failure-Mode = Money-Modell neu herleiten | ✅ GEFIXT — auf `docs/knowledge/domain/polls.md`/`treasury.md` umgebogen |
| 2 | LOW (Spec-Gap) | W2c-Spec AC5 | Broken-Ref-Grep deckte nur hooks/skills/src/scripts/INDEX, NICHT die Doku-/Status-Schicht (MASTERPLAN/TODO/handoff) wo die Money-Pointer lebten → Proof meldete fälschlich „sauber" | ✅ Lehre nach `errors-infra.md` (Removal-Slice: Live-Doku-Schicht mit-greppen) |

## Spec-Coverage (alle AC ✅)
- AC1 cortex → _archive (Rename R, Historie); 4 Consumer repointet (INDEX.md/active.md), autodream gebannert · AC2 18 Stubs weg · AC3 ephemere Files in _archive/2026-06-17-w2c (journals 42, features 7, projekt 10, sprint, personen, cortex) · AC4 learnings/ intakt (6 Templates + drafts/, 9 Agent-Schreibpfade) · AC5 LIVE broken-refs 0 (nach Finding-#1-Fix, inkl. Doku-Schicht) · AC6 audit:knowledge 0 HARD/0 SOFT.

## Positive (Reviewer)
- cortex-Retirement vorbildlich: erst alle Consumer repointen, dann Rename → kein toter Hook.
- learnings-Revert war der wichtigste Save (hätte 9 Agent-Schreibpfade + reflect/promote stillgelegt) — broken-ref-grep fing's, genau wofür er da ist.
- 6 aktive Files (sessions.jsonl, episodisch/sessions, senses, session-handoff, tr-review-queue, user-feedback-queue) nachweislich NICHT verschoben.
- Scope-Out (38 root beta-/phase3-Files + MEMORY.md-Trim → W3) explizit, kein silent-cap.

## Hinweis
User-level `MEMORY.md` (C:\Users\…, außerhalb Repo) — treasury/polls-Pointer bereits in W2b auf docs/knowledge umgebogen (erledigt).
