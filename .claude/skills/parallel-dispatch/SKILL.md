---
name: parallel-dispatch
description: Playbook für Parallel-Agent-Orchestration mit Worktrees. Nutze bei Multi-Domain-Tasks (>3 Files cross-domain). Zeigt konkret Dispatch-Pattern für backend+frontend+test-writer+reviewer parallel. Ersetzt Solo-Claude-Sequenziell bei grossen Features.
---

# /parallel-dispatch — Agent-Team Orchestrierung

**Regel:** Solo für <3 Files. Team-of-Agents für alles darüber cross-domain.

## Wann parallel vs. seriell

| Task | Muster |
|------|--------|
| 1 Hook-Fix / 1 File-Edit | Solo |
| 2-3 Files 1 Domain | Solo ODER 1 Agent |
| 3+ Files 1 Domain | **1 Agent (backend ODER frontend) in Worktree** |
| Cross-Domain (DB + UI + Tests) | **PARALLEL**: 3 Agents in separate Worktrees |
| Neue Feature-Spec | `/spec` zuerst, dann Parallel-Dispatch |
| Bug-Investigation | Explore-Agent (read-only) zuerst, dann targeted |

## Standard-Dispatch-Block (Cross-Domain)

EIN assistant turn, MEHRERE Agent tool calls parallel:

```
Agent(backend, worktree)    : "Spec NNN. Baue RPC + Service. Verify: vitest run <file>."
Agent(frontend, worktree)   : "Spec NNN. Baue Component + Page + i18n. Verify: tsc + 393px screenshot."
Agent(test-writer, worktree): "Spec NNN. Schreibe Tests AUS SPEC (ohne Code zu lesen). Muss rot sein."

[warten auf alle 3]

Agent(reviewer, read-only): "Review alle 3 Worktrees gegen common-errors.md + business.md + patterns.md. Output PASS/REWORK."
```

## Agent-Briefing Template (PFLICHT)

```
KONTEXT: [Was Anil will + Business-Kontext + Slice-Nr]
SPEC: worklog/specs/NNN-*.md (LIES ZUERST)
ZIEL: [Konkretes Ergebnis, nicht Schritte]
CONSTRAINTS: 
  - Mobile 393px PFLICHT
  - i18n DE + TR
  - Pattern X nutzen (NICHT neu erfinden)
DU ENTSCHEIDEST: [Component-Struktur, Naming, interne Helper]
VERIFY: [tsc clean + vitest run <file> + Screenshot]
PRE-WORK: Lies deine SKILL.md + LEARNINGS.md. Check common-errors.md für bekannte Fallen.
```

NIEMALS:
- "Editiere Zeile 45" (Micromanagement)
- "Baue mal was" (kein Ziel)
- "Wird schon passen" (keine VERIFY-Kriterien)

IMMER:
- Ziel + Constraints + Verify
- Trust aber VERIFY (nach Agent: `git diff --stat` + ls changes)

## Worktree-Naming-Konvention

- `wt-<slice>-backend`
- `wt-<slice>-frontend`
- `wt-<slice>-tests`
- `wt-<slice>-review` (nur wenn big)

## Merge-Strategie nach Parallel-Run

1. Reviewer prüft alle Worktrees einzeln → PASS/REWORK
2. Bei REWORK → Healer-Agent fixt im jeweiligen Worktree
3. Bei PASS:
   - **Backend zuerst** mergen (Service-Contract ist Dependency)
   - Frontend rebase auf main → merge
   - Tests mergen (nur wenn Code-Changes komplett)
4. `tsc --noEmit` auf main nach Merge
5. Worktrees löschen (`git worktree remove`)

## Agent-Model-Override

- `backend` + `reviewer` = **Opus** (tief + Pattern-sicher)
- `frontend` + `healer` + `test-writer` = **Sonnet** (schnell + günstig)
- `impact-analyst` = **Opus** (cross-cutting ist anspruchsvoll)
- `business` + `qa-visual` = **Sonnet**

Override via `model: opus` in `.claude/agents/<name>/SKILL.md` frontmatter.

## Anti-Patterns

- **5 Agents für 1 File** → Overhead > Win, bleib solo
- **Agent ohne Spec-Referenz** → unklare Outputs, Merge-Hölle
- **Kein Reviewer am Ende** → Fehler durch-gerutscht, nachts entdeckt
- **Worktree-Merge ohne tsc** → Commit mit Build-Error
- **Parallel bei Money-Path** → Pattern ist richtig, aber Money braucht Solo-Claude mit Hypothese

## Beispiel-Session (ideal)

```
1. /spec "Neues Fantasy-Leaderboard mit Filtern"
   → Claude erstellt worklog/specs/NNN-fantasy-leaderboard.md
   
2. /plan-ceo-review + /plan-qa-review + /plan-legal-review
   → 3 Perspektiven, Spec refined

3. /impact
   → 18 Consumers + 2 Side-Effects identified, test-plan generated

4. Parallel-Dispatch:
   - backend (worktree) : RPC rpc_get_fantasy_leaderboard + Service + Tests
   - frontend (worktree): LeaderboardPage + FilterBar + EmptyState + i18n
   - test-writer (worktree): Integration-Tests aus Spec (sieht Code nicht)

5. Reviewer (read-only)
   → PASS

6. Merge (backend first, frontend rebase, tests last)

7. Proof: Playwright gegen bescout.net + SQL result sample

8. /ship log
```

Gesamt-Zeit: ~2h. Solo-seriell hätte 5h gedauert.
