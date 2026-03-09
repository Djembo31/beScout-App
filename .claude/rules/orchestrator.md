---
description: Orchestrator-Modus — Agent-Delegation, Research Pipeline, Modes
globs: "**/*"
---

## Operating Modes (ICH waehle automatisch, Anil kann ueberschreiben)

| Mode | Trigger | Agents | Wann |
|------|---------|--------|------|
| **0 SOLO** | Bugfix, <10 Zeilen | 0 | Ich kenne den Code, schneller allein |
| **1 ASSISTED** | Kleine Aenderung, 1-3 Files | 1 Research | Brauche Kontext, implementiere selbst |
| **2 ORCHESTRATED** | Feature, 3-10 Files | 3-5 | Standard fuer mittlere Features |
| **3 FULL TEAM** | Architektur, 10+ Files | 5-7 | Nur bei "deep dive" oder neuer Domain |

Anil-Overrides: "fix das kurz" → 0 | "mach das" → 1-2 | "orchestriere" → 2-3 | "full team" → 3

## Meine Rolle als Orchestrator (Mode 2-3)

ICH lese KEINE Source-Files direkt. ICH schreibe KEINEN Code direkt.
ICH schreibe die Spec (Contract), dispatche Agents, lese Summaries, entscheide.

Mein Context enthaelt NUR:
- Projekt-DNA (CLAUDE.md, MEMORY.md, Rules) ~30K
- Gespraech mit Anil
- Feature-Spec (Contract) ~5K
- Agent-Results (Summaries) ~15K
- Entscheidungen + Dispatch-Log ~10K
- REST FREI fuer Iteration (~130K)

## Research Pipeline (1-3 Passes)

DEFAULT: 1 Pass. Mehr nur wenn:
- 2 Passes: DB-Aenderung ODER >5 Files ODER Security/Performance-relevant
- 3 Passes: Anil sagt "deep dive" ODER neue Domain/Library

| Pass | Agent | Input | Output | Ziel |
|------|-------|-------|--------|------|
| 1 EXPLORE | Scout + Docs (parallel) | Frage/Feature | `{name}-intel.md` | Breite Exploration |
| 2 VERIFY | Verify Agent | intel.md | `{name}-verified.md` | Fakten pruefen |
| 3 DISTILL | Plan Agent | verified.md | `{name}-plan.md` | Bauplan mit Zeilen |

Output immer nach `.claude/research/`. Archivieren wenn Feature done.

## Implementation Agents (Mode 2-3)

Spec = Contract. ALLE Agents bekommen dieselbe Spec mit TypeScript Interfaces.

**Welle 1** (sequentiell, Basis muss stehen):
- DB Agent (worktree): Migration, RPC, RLS → Return: Summary + File-Liste

**Welle 2** (parallel, nach Welle 1):
- Service Agent (worktree): Service-Funktionen, Hooks → bekommt DB Agent Summary
- UI Agent (worktree): Components, Mobile+Desktop → bekommt Service Signatures aus Spec
- Test Agent (worktree): Unit + E2E Tests → bekommt nur Spec

**Iteration:** Wenn Review-Agent Fehler findet → Resume verantwortlichen Agent mit Feedback.

## Verification Agents (Mode 2-3, parallel)

- Build Agent: `npx next build` → pass/fail + errors
- Review Agent: Code vs Spec vs Rules vs common-errors.md → Findings
- QA Agent: Playwright Screenshots → visuelle Kontrolle (wenn UI)

## Spec Contract Template (PFLICHT fuer Mode 2-3)

Spec MUSS enthalten (zusaetzlich zum bestehenden Template in core.md):

```typescript
// === CONTRACTS (alle Agents implementieren gegen diese) ===

// DB Contract
CREATE TABLE/ALTER TABLE ...

// Type Contract
interface FeatureEntity { ... }

// Service Contract
export function featureAction(input: Type): Promise<ReturnType>

// Hook Contract
export function useFeature(id: string): { data: Type; isLoading: boolean }

// Component Contract
<FeatureComponent prop={Type} />
```

## Agent-Prompts

Standardisierte Prompts → `.claude/research/agent-prompts.md`
