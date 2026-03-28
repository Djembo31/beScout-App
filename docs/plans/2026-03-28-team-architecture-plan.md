# BeScout Team Architecture — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build 3 domain skills + 3 specialized agents that replace the generic implementer with BeScout-specific knowledge.

**Architecture:** Skills provide static domain knowledge (patterns, anti-patterns, registries). Agents load their skill in Phase 0, receive dynamic task-context from CTO. Existing implementer structure (journal, self-healing loop, circuit breaker) is inherited.

**Tech Stack:** Claude Code Skills (SKILL.md), Custom Agents (.claude/agents/*.md), Supabase CLI

---

### Task 1: Create beScout-frontend Skill

**Files:**
- Create: `~/.claude/skills/beScout-frontend/SKILL.md`

**Step 1: Write the skill**

Extract from existing sources:
- `CLAUDE.md` → Design Tokens, Component Registry, Import Map
- `.claude/rules/ui-components.md` → Full component details
- `.claude/rules/common-errors.md` → CSS/React section

Structure (~150 lines):
```markdown
---
name: beScout-frontend
description: Internal BeScout domain knowledge for frontend agents.
  Use in beScout-app when implementing UI components, pages, or hooks.
  Covers component registry, design tokens, CSS patterns, React patterns, i18n.
---

## Dependencies (MUST exist)
- src/components/ui/index.tsx
- src/components/player/index.tsx
- src/types/index.ts
- messages/de.json

## Component Registry
[PlayerPhoto, Modal, Card, TabBar, Button, Loader2 — mit Props + Import]

## Design Tokens
[Exakte Werte: Background, Gold, Gradient, Card Surface, Borders, Positions]

## React Patterns (PFLICHT)
[Hooks vor Returns, Loading→Empty Guard, cn(), Array.from, Tab-gated]

## CSS Anti-Patterns (VERBOTEN)
[flex-1 iPhone, dynamic Tailwind, overflow containing block]

## i18n
[next-intl t(), DE Labels EN Code, Cookie bescout-locale]

## On-Demand References
- → .claude/rules/ui-components.md (vollständiges Registry)
- → .claude/rules/common-errors.md (CSS/React Sektion)
```

**Step 2: Validate skill loads correctly**

Run: `cat ~/.claude/skills/beScout-frontend/SKILL.md | head -5`
Expected: YAML frontmatter with name + description

**Step 3: Verify all declared dependencies exist**

Run: `ls src/components/ui/index.tsx src/components/player/index.tsx src/types/index.ts messages/de.json`
Expected: All 4 files listed, no errors

---

### Task 2: Create beScout-backend Skill

**Files:**
- Create: `~/.claude/skills/beScout-backend/SKILL.md`

**Step 1: Write the skill**

Extract from existing sources:
- `CLAUDE.md` → Code Conventions, Top 10 DONT
- `.claude/rules/common-errors.md` → DB Column Names, CHECK Constraints, RPC Anti-Patterns
- `.claude/rules/database.md` → Full DB patterns
- `.claude/rules/trading.md` → Fee-Split, Trading RPCs

Structure (~150 lines):
```markdown
---
name: beScout-backend
description: Internal BeScout domain knowledge for backend agents.
  Use in beScout-app when implementing DB migrations, RPCs, services,
  or query hooks. Covers column names, constraints, RPC patterns,
  service layer, Supabase CLI.
---

## Dependencies (MUST exist)
- src/types/index.ts
- src/lib/supabaseClient.ts
- src/lib/queryKeys.ts

## DB Column Names (KOMPLETT — Top Fehlerquelle)
[players, wallets, orders, profiles, notifications, etc.]

## CHECK Constraints (exakte Werte)
[club_subscriptions.tier, user_stats.tier, research_posts.call, lineups.captain_slot]

## RPC Patterns
[REVOKE Pattern, Wrapper-RPCs, Guards, FK-Reihenfolge, ::TEXT Verbot]

## Service Layer (PFLICHT)
[Component → Service → Supabase, qk.* Factory, invalidateQueries]

## Supabase CLI (statt MCP)
[db execute, migration new, db diff]

## RLS Regeln
[Neue Tabelle = SELECT + INSERT + DELETE Policies]

## On-Demand References
- → .claude/rules/database.md
- → .claude/rules/trading.md
- → .claude/rules/common-errors.md (DB/RPC Sektion)
```

**Step 2: Validate skill loads correctly**

Run: `cat ~/.claude/skills/beScout-backend/SKILL.md | head -5`
Expected: YAML frontmatter with name + description

**Step 3: Verify all declared dependencies exist**

Run: `ls src/types/index.ts src/lib/supabaseClient.ts src/lib/queryKeys.ts`
Expected: All 3 files listed

---

### Task 3: Create beScout-business Skill

**Files:**
- Create: `~/.claude/skills/beScout-business/SKILL.md`

**Step 1: Write the skill**

Extract from existing sources:
- `.claude/rules/business.md` → Compliance, Licensing, Fee-Split, Geofencing
- `CLAUDE.md` → Kern-Business section

Structure (~100 lines):
```markdown
---
name: beScout-business
description: Internal BeScout business and compliance knowledge.
  Use when reviewing UI text for legal compliance, checking fee calculations,
  verifying licensing phase restrictions, or auditing wording.
---

## Dependencies (MUST exist)
- .claude/rules/business.md

## Wording-Compliance (KRITISCH)
[NIEMALS/IMMER Listen, $SCOUT = Platform Credits, Scout Card = Digitale Spielerkarte]

## Licensing-Phasen
[Phase 1 jetzt, Phase 3/4 NICHT BAUEN, Kill-Switch]

## Fee-Split (exakte Prozente)
[Trading, IPO, Research, Bounty, P2P, Club Abos — Tabelle]

## Geofencing-Tiers
[FULL/CASP/FREE/RESTRICTED/BLOCKED mit Ländern]

## $SCOUT Regeln
[Platform Credits, BIGINT cents, code-intern "dpc"]

## On-Demand References
- → .claude/rules/business.md (vollständige Regeln)
```

**Step 2: Validate + verify dependencies**

Run: `cat ~/.claude/skills/beScout-business/SKILL.md | head -5 && ls .claude/rules/business.md`
Expected: Frontmatter + file exists

---

### Task 4: Create frontend Agent

**Files:**
- Create: `.claude/agents/frontend.md`
- Read: `.claude/agents/implementer.md` (inherit structure)

**Step 1: Write agent definition**

Inherit from implementer: Journal, Self-Healing Loop, Circuit Breaker, Context-Decay-Check.
Add: beScout-frontend Skill loading, Fail-Fast validation, LEARNINGS output.

Key frontmatter:
```yaml
---
name: frontend
description: BeScout Frontend Engineer. Implements UI components, pages,
  and hooks. Loads beScout-frontend skill. Works in worktree isolation.
tools: [Read, Write, Edit, Grep, Glob, Bash]
model: inherit
isolation: worktree
maxTurns: 100
memory: project
---
```

Key sections:
- Phase 0: Load `beScout-frontend` skill → Validate dependencies → Read task-package from prompt → STOP if anything missing
- Phase 1: Journal starten → Implement in self-healing loop → tsc after each change
- Phase 2: Self-Check (Acceptance Criteria) → LEARNINGS output (Pflicht)
- Conventions: Inherited from implementer (UI section expanded)
- Anti-Patterns: Inherited + frontend-specific

**Step 2: Verify agent is discoverable**

Run: `head -5 .claude/agents/frontend.md`
Expected: YAML frontmatter with name: frontend

---

### Task 5: Create backend Agent

**Files:**
- Create: `.claude/agents/backend.md`
- Read: `.claude/agents/implementer.md` (inherit structure)

**Step 1: Write agent definition**

Same structure as frontend agent, but:
- Loads `beScout-backend` skill
- Conventions section focuses on DB/Service/RPC patterns
- Self-Check includes: Column names correct? Service layer used? qk.* factory? RLS policies?

Key frontmatter:
```yaml
---
name: backend
description: BeScout Backend Engineer. Implements DB migrations, RPCs,
  services, and query hooks. Loads beScout-backend skill. Worktree isolation.
tools: [Read, Write, Edit, Grep, Glob, Bash]
model: inherit
isolation: worktree
maxTurns: 100
memory: project
---
```

**Step 2: Verify agent is discoverable**

Run: `head -5 .claude/agents/backend.md`
Expected: YAML frontmatter with name: backend

---

### Task 6: Create business Agent

**Files:**
- Create: `.claude/agents/business.md`

**Step 1: Write agent definition**

Different from frontend/backend:
- NO worktree (read-only analysis)
- NO Write/Edit tools (compliance review only)
- Loads `beScout-business` skill
- Output: Compliance Report (PASS/CONCERNS/FAIL)

Key frontmatter:
```yaml
---
name: business
description: BeScout Business & Compliance Agent. Reviews UI text, fee
  calculations, and licensing compliance. Read-only. Loads beScout-business skill.
tools: [Read, Grep, Glob]
disallowedTools: [Write, Edit, Bash]
model: inherit
maxTurns: 25
memory: project
---
```

Output format:
```markdown
## Compliance Review: [Scope]
### Verdict: PASS | CONCERNS | FAIL
### Wording Check
### Fee-Split Check
### Licensing Phase Check
### Findings
### LEARNINGS
```

**Step 2: Verify agent is discoverable**

Run: `head -5 .claude/agents/business.md`
Expected: YAML frontmatter with name: business

---

### Task 7: Deprecate implementer Agent

**Files:**
- Modify: `.claude/agents/implementer.md:1-5`

**Step 1: Add deprecation notice**

Add to top of implementer.md after frontmatter:
```markdown
> ⚠️ DEPRECATED: Use `frontend` agent for UI work, `backend` agent for
> DB/Service work. This agent remains as fallback for mixed-domain tasks.
```

**Step 2: Verify all agents are listed**

Run: `ls .claude/agents/*.md`
Expected: 8 files (frontend, backend, business, reviewer, test-writer, qa-visual, healer, impact-analyst, implementer)

---

### Task 8: Update workflow.md with new agent roster

**Files:**
- Modify: `.claude/rules/workflow.md`

**Step 1: Update Agents table**

Replace the 6-agent table with:
```markdown
| Agent | Rolle | Skill | Isolation |
|-------|-------|-------|-----------|
| frontend | UI Components, Pages, Hooks | beScout-frontend | worktree |
| backend | DB, RPCs, Services, Hooks | beScout-backend | worktree |
| business | Compliance & Wording Review | beScout-business | read-only |
| reviewer | Code Review (READ-ONLY) | keiner (cross-domain) | — |
| test-writer | Tests aus Spec only | keiner | worktree |
| qa-visual | Playwright Screenshots | keiner | read-only |
| healer | Build/Test Fix Loop | keiner | — |
| impact-analyst | Cross-cutting Analysis | keiner | read-only |
```

**Step 2: Add Task-Package Assembly section**

Add to Pre-Dispatch Checkliste:
```markdown
### Task-Package Assembly (CTO Pflicht — VOR jedem Agent-Dispatch)
1. Agent + Skill bestimmen (frontend/backend/business)
2. Relevante Types LESEN und in Prompt KOPIEREN
3. Relevante Service-Signaturen LESEN und in Prompt KOPIEREN
4. Ähnliche Components als Pattern-Beispiel KOPIEREN
5. DB Column-Names für betroffene Tabellen KOPIEREN
6. i18n Keys prüfen, fehlende VORHER anlegen
7. Acceptance Criteria formulieren (binäre ja/nein Checkliste)
8. Reviewer-Briefing vorbereiten: "Implementiert von [Agent] mit [Skill]"
```

**Step 3: Verify workflow.md is consistent**

Run: `grep -c "frontend\|backend\|business" .claude/rules/workflow.md`
Expected: Multiple matches confirming new agents referenced

---

### Task 9: Smoke-Test — Dispatch frontend Agent

**Step 1: Pick a real micro-task**

Choose a small UI task from current-sprint.md (e.g., a minor component fix).

**Step 2: Assemble Task-Package**

Read relevant types, services, components. Build complete prompt with:
- Task description
- Copied types
- Copied service signatures
- Pattern example
- Acceptance criteria

**Step 3: Dispatch frontend agent**

Verify:
- Phase 0 loads skill successfully
- Phase 0 validates dependencies
- Agent uses correct patterns from skill
- Agent outputs LEARNINGS section
- Output quality > generic implementer

**Step 4: Document result**

Note what worked, what was missing in the package. Adjust if needed.

---

### Task 10: Smoke-Test — Dispatch backend Agent

**Step 1: Pick a real micro-task**

Choose a small service/query task.

**Step 2: Assemble + Dispatch + Verify**

Same process as Task 9 but for backend agent.

**Step 3: Document result + adjust**

---

### Task 11: Commit everything

**Step 1: Stage all new files**

```bash
git add ~/.claude/skills/beScout-frontend/SKILL.md
git add ~/.claude/skills/beScout-backend/SKILL.md
git add ~/.claude/skills/beScout-business/SKILL.md
git add .claude/agents/frontend.md
git add .claude/agents/backend.md
git add .claude/agents/business.md
git add .claude/agents/implementer.md
git add .claude/rules/workflow.md
git add docs/plans/2026-03-28-team-architecture-design.md
git add docs/plans/2026-03-28-team-architecture-plan.md
```

**Step 2: Commit**

```bash
git commit -m "feat: add BeScout team architecture (3 skills + 3 agents)"
```

---

## Execution Order

```
Task 1-3: Skills (parallel — keine Abhängigkeiten)
Task 4-6: Agents (parallel — nur Skill muss existieren)
Task 7-8: Workflow updates (nach Agents)
Task 9-10: Smoke-Tests (nach allem)
Task 11: Commit
```

## Estimated Effort

| Tasks | Was | Aufwand |
|-------|-----|--------|
| 1-3 | 3 Skills schreiben | ~20 Min |
| 4-6 | 3 Agents schreiben | ~20 Min |
| 7-8 | Workflow updates | ~10 Min |
| 9-10 | Smoke-Tests | ~15 Min |
| 11 | Commit | ~2 Min |
| **Total** | | **~67 Min** |
