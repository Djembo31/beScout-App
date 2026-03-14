# Jarvis v3 — CTO Mode Design

## Date: 2026-03-14
## Status: Implemented
## Session: #233

## Problem

Anil muss bei jeder Aenderung mehrfach drueber gehen. Neue Fehler tauchen bei jedem Fix auf.
Das liegt an:
1. Keine automatische Iteration (Whack-a-Mole statt Loop)
2. Anil ist die Quality Gate (statt automatische Verification)
3. RPC Parity Bugs durch fehlende Cross-Cutting Analysis
4. Agents bekommen zu wenig Kontext (200K-Limit-Aera)
5. Context-Budget-System obsolet mit 1M

## Solution: Jarvis v3

### Architektur-Aenderungen

**1. Self-Healing Verification Loop**
```
Implement → Build → Test → Lint → Review → [Fehler?]
    ↑                                         |
    └────── Healer Agent mit Feedback ────────┘
Max 5 Iterationen, dann Eskalation.
```

**2. Agent Definitions (`.claude/agents/`)**
6 definierte Agents mit klaren Rollen:
- impact-analyst: Cross-cutting Impact Analysis (read-only)
- implementer: Code schreiben nach Spec (worktree-isoliert)
- reviewer: Code Review (READ-ONLY, kann nicht schreiben)
- test-writer: Tests aus Spec (sieht NIE Implementation-Code)
- qa-visual: Playwright Screenshots
- healer: Fix Loop (Build/Test/Lint Fehler beheben)

**3. Level System**
- A (default): Jarvis liefert, Anil macht visuelles QA
- B: Inkl. Screenshots, Anil sagt "ship it"
- C: Sprint autonom, taegliche Summaries

**4. 3 CTO Skills**
- `/deliver`: Self-Healing Implementation Loop (end-to-end)
- `/impact`: Cross-Cutting Impact Analysis (verhindert Parity Bugs)
- `/cto-review`: Deep Review gegen 100+ bekannte Fehler

**5. Neue Hooks**
- PreCompact: Git Diff Backup (Context-Schutz)
- Stop: Uncommitted Changes Warnung

**6. 1M Context Optimierung**
- Context-Budget-System entfernt (obsolet)
- Agents bekommen VOLLE errors.md + patterns.md
- ~845K Token frei fuer Iteration

### Kern-Prinzipien
- Builder != Validator (wer Code schreibt, reviewed ihn nicht)
- Eskalation statt Approval (Anil ist nicht die Quality Gate)
- Iterieren bis fertig (nicht "fast fertig" liefern)
- Tests unabhaengig (test-writer sieht nie den Code)

## Research Basis

3 parallele Deep-Research Agents:
1. 1M Context Elite Patterns (20+ Quellen)
2. Claude Code Official Docs (Agent Teams, Skills, Hooks, Subagents)
3. SOTA Agent Orchestration (Devin, Factory, OpenHands, AgentCoder)

Key Sources:
- Anthropic: Building Effective Agents, Context Engineering, Effective Harnesses
- Builder-Validator Pattern (claudefa.st)
- Ralph Wiggum Loop (Geoffrey Huntley)
- Evaluator-Optimizer Loop (Anthropic)
- AgentCoder Triad: Programmer → Test Designer → Test Executor
- Factory DroidShield: Pre-commit Static Analysis
- levnikolaevich/claude-code-skills: 4-Level Quality Gate

## Implementierte Files

### Neue Files
- `.claude/agents/impact-analyst.md`
- `.claude/agents/implementer.md`
- `.claude/agents/reviewer.md`
- `.claude/agents/test-writer.md`
- `.claude/agents/qa-visual.md`
- `.claude/agents/healer.md`
- `.claude/skills/deliver/SKILL.md`
- `.claude/skills/impact/SKILL.md`
- `.claude/skills/cto-review/SKILL.md`
- `.claude/hooks/pre-compact-backup.sh`
- `.claude/hooks/session-handoff-auto.sh`
- `docs/plans/2026-03-14-jarvis-v3-cto-mode.md` (dieses File)

### Geaenderte Files
- `.claude/settings.json` — PreCompact + Stop Hooks
- `.claude/rules/orchestrator.md` — v3 komplett neu
- `.claude/rules/core.md` — 1M Context + Level System + Skills
- `CLAUDE.md` — Jarvis v3 Sektion + Agents Tabelle
- `memory/MEMORY.md` — Orchestrator v3 Sektion
