# worklog/

**Die einzige Quelle aktuellen Fortschritts in BeScout.**

## Inhalt

| Datei/Ordner | Zweck |
|--------------|-------|
| `active.md` | **EIN aktiver Slice.** Stage-Tracking + aktuelle Aufgabe. |
| `log.md` | Chronologischer Log aller abgeschlossenen Slices (neueste oben). |
| `specs/` | Spec-Dateien `NNN-title.md`. Jede Spec: Ziel, ACs, Edge Cases, Proof-Plan. |
| `impact/` | Impact-Analysen `NNN-title.md`. Consumer-Liste, Side-Effects, Migration-Plan. |
| `proofs/` | Screenshots, SQL-Query-Outputs, Test-Logs. Jeder Proof linked aus `log.md`. |

## Wie benutzen

Pro Aufgabe:
1. `/ship new "Kurzbeschreibung"` — erzeugt Spec-Entwurf in `specs/NNN-title.md`, setzt `active.md` auf `stage: SPEC`.
2. CEO approved Spec (bei CEO-Scope) ODER Claude zieht durch (CTO-Scope — siehe `memory/ceo-approval-matrix.md`).
3. `/ship impact` — wenn DB/RPC/Service/Cross-Domain: Impact-Analyse in `impact/NNN-title.md`.
4. `/ship build` — Code. tsc + Tests nach jedem File.
5. `/ship prove` — Proof-Artefakt in `proofs/NNN-xxx.*`.
6. `/ship done` — Log-Eintrag in `log.md`, Slice → DONE.

## Gates (architektonisch erzwungen via Hooks)

| Hook | Wirkung |
|------|---------|
| `ship-spec-gate.sh` | Blockt Edit auf `src/lib/services/`, `supabase/migrations/`, `src/lib/queries/` ohne aktiven Slice in SPEC/IMPACT/BUILD |
| `ship-proof-gate.sh` | Warnt/blockt `git commit -m "fix(...|feat(..."` ohne `proof:` in `active.md` |
| `ship-no-audit-slice.sh` | Markiert Slices ohne Code-Diff als `audit-only`, sie zaehlen nicht als Fortschritt |
| `ship-meta-plan-block.sh` | Blockt `Write memory/project_*.md` — nur EIN Meta-Plan erlaubt |

Details: `.claude/rules/workflow.md`.

## Was NICHT hier rein gehoert

- Wissen (→ `.claude/rules/`, `memory/`, `wiki/`)
- Architektur-Entscheidungen (→ `memory/decisions.md`)
- Bug-Patterns (→ `.claude/rules/common-errors.md`)
- Session-Handoff (→ `memory/session-handoff.md`)
