# worklog/

**Die einzige Quelle aktuellen Fortschritts in BeScout.**

## Inhalt

| Datei/Ordner | Zweck |
|--------------|-------|
| `active.md` | **EIN aktiver Slice.** Stage-Tracking + aktuelle Aufgabe. |
| `log.md` | Chronologischer Log aller abgeschlossenen Slices (neueste oben). |
| `specs/` | Spec-Dateien `NNN-title.md`. Jede Spec: Ziel, ACs, Edge Cases, Proof-Plan. |
| `impact/` | Impact-Analysen `NNN-title.md`. Consumer-Liste, Side-Effects, Migration-Plan. |
| `reviews/` | Cold-Context-Reviewer-Output `NNN-review.md`. Verdict PASS/REWORK/FAIL + Findings. |
| `proofs/` | Screenshots, SQL-Query-Outputs, Test-Logs. Jeder Proof linked aus `log.md`. |
| `audits/` | Periodische Audit-Reports (silent-fail-audit, Baseline-Updates). |

## Wie benutzen

Pro Aufgabe (6-Stufen-Loop):
1. `/ship new "Kurzbeschreibung"` — erzeugt Spec-Entwurf in `specs/NNN-title.md`, setzt `active.md` auf `stage: SPEC`.
2. CEO approved Spec (bei CEO-Scope) ODER Claude zieht durch (CTO-Scope — siehe `memory/ceo-approval-matrix.md`).
3. `/ship impact` — wenn DB/RPC/Service/Cross-Domain: Impact-Analyse in `impact/NNN-title.md`.
4. `/ship build` — Code. tsc + Tests nach jedem File.
5. `/ship review` — reviewer-Agent Cold-Context-Check in `reviews/NNN-review.md`. Pflicht bei feat/fix/refactor ab S. Bei REWORK: healer-Agent fixt, Review neu.
6. `/ship prove` — Proof-Artefakt in `proofs/NNN-xxx.*`.
7. `/ship done` — Log-Eintrag in `log.md`, Slice → idle.

## Gates (architektonisch erzwungen via Hooks)

| Hook | Wirkung |
|------|---------|
| `ship-spec-gate.sh` | Blockt Edit auf `src/lib/services/`, `supabase/migrations/`, `src/lib/queries/` ohne aktiven Slice in BUILD/REVIEW/PROVE/LOG |
| `ship-proof-gate.sh` | Blockt `git commit -m "fix(...\|feat(...\|refactor(..."` ohne existierenden `proof:` in `active.md` |
| `ship-cto-review-gate.sh` | Blockt `git commit -m "fix(...\|feat(...\|refactor(..."` ohne `worklog/reviews/<slice>-review.md` (ausser Emergency / skipped) |
| `ship-no-audit-slice.sh` | Markiert Slices ohne Code-Diff als `audit-only`, sie zaehlen nicht als Fortschritt |
| `ship-meta-plan-block.sh` | Blockt `Write memory/project_*.md` — nur EIN Meta-Plan erlaubt |

Details: `.claude/rules/workflow.md`.

## Was NICHT hier rein gehoert

- Wissen (→ `.claude/rules/`, `memory/`, `wiki/`)
- Architektur-Entscheidungen (→ `memory/decisions.md`)
- Bug-Patterns (→ `.claude/rules/common-errors.md`)
- Session-Handoff (→ `memory/session-handoff.md`)
