# BeScout Agent Team v2 — Design

**Date:** 2026-03-31
**Author:** Jarvis (CTO) + Anil (Founder)
**Status:** Approved

## Problem

Session 272 Full Loop Test revealed: Paperclip agents deliver good code but the orchestration is broken. Agents lack context, don't use skills, can't communicate, and need manual intervention at every step. They work like isolated LLMs instead of a coordinated team.

## Decisions

| Question | Answer |
|----------|--------|
| Autonomy level | **Fully autonomous** — CEO plans, agents coordinate, Jarvis oversees |
| Context flow | **Bootstrap-Chain** — slim instructions, agents build own context |
| Team scope | **Real startup team** — not just dev, includes business + marketing |
| Pipeline | **Sprint-based + role-based** — CEO plans sprints, agents self-coordinate |
| Knowledge location | **Repo is source of truth** — agents get navigation, not duplication |
| Communication | **Structured handoffs** — `docs/team/handoffs/BES-{N}.md` |
| Skills | **superpowers + domain skills** — agents use the same tools as Jarvis |

## Team Structure

```
Anil (Founder) <-> Jarvis (CTO, direct sessions)
                      |
                   CEO Agent (Opus 4.6)
                      |
        +-------------+------------------+
        |             |                  |
  Engineering    Business           Marketing*
  +-- Senior Eng  +-- BA              +-- (later)
  +-- Frontend Eng
  +-- QA

  On-Demand: CodexReviewer (GPT-5.4-mini)
```

### Roles

| Agent | Model | Role | Reports To |
|-------|-------|------|------------|
| CEO | Opus 4.6 | Sprint planning, delegation, status reports, coordinates with Jarvis | Jarvis |
| Senior Engineer | Sonnet 4.6 | Backend: DB, RPCs, Services, Migrations, Trading logic | CEO |
| Frontend Engineer | Sonnet 4.6 | UI: Components, Pages, i18n, Accessibility, Visual polish | CEO |
| QA | Sonnet 4.6 | Tests: Unit, E2E, Visual QA, Regression | CEO |
| Business Analyst | Sonnet 4.6 | Compliance, Wording audits, Fee calculations, Revenue models, Pitch material | CEO |
| Marketing* | Sonnet 4.6 | Content, SEO, Social Media, Community (activate later) | CEO |
| CodexReviewer | GPT-5.4-mini | Adversarial reviews: race conditions, auth, data loss (on-demand) | CEO |

**Not an agent:**
- CTO = Jarvis (direct sessions with Anil)
- Architecture decisions = Jarvis
- Security/Wallet code = Jarvis

### Agent Configuration

| Agent | maxTurns | intervalSec | timeoutSec | Trigger |
|-------|----------|-------------|------------|---------|
| CEO | 50 | 3600 | 300 | Daily Standup 09:00, On-Demand |
| Senior Engineer | 200 | 1800 | 600 | Issue Assignment |
| Frontend Engineer | 150 | 1800 | 600 | Issue Assignment |
| QA | 50 | 3600 | 300 | Issue Assignment |
| Business Analyst | 80 | 7200 | 300 | Weekly Audit Mo 10:00, On-Demand |
| CodexReviewer | 50 | — | 300 | On-Demand only |

## Context Architecture (Bootstrap-Chain)

### Agent Startup Sequence

```
1. AGENTS.md loads (slim: who am I, bootstrap instructions)
2. CLAUDE.md auto-loads (project context — Claude Code does this)
3. .claude/rules/*.md auto-load (path-specific rules)
4. Agent reads KNOWLEDGE.md (which repo files to read for my role)
5. Agent reads docs/team/handoffs/ (pending work for me)
6. Agent reads issue description (what to do now)
7. Agent invokes relevant skills (superpowers, domain skills)
8. Agent works
```

### KNOWLEDGE.md per Role

Each agent gets a `KNOWLEDGE.md` in their Paperclip instructions that maps role to repo files:

**Senior Engineer:**
```
Read in order:
1. .claude/rules/common-errors.md (DB columns, React patterns)
2. .claude/rules/database.md (if DB work)
3. .claude/rules/trading.md (if trading work)
4. memory/backend-systems.md (RPCs, schema — on-demand)
5. Relevant service file before modifying
6. Context7: fetch docs for any library you're unsure about
```

**Frontend Engineer:**
```
Read in order:
1. .claude/rules/ui-components.md (design tokens, patterns)
2. .claude/rules/common-errors.md (CSS gotchas, React rules)
3. Component Registry in CLAUDE.md (check before building new)
4. Relevant component file before modifying
5. Context7: fetch docs for any library you're unsure about
```

**QA:**
```
Read in order:
1. .claude/rules/common-errors.md (known failure patterns)
2. .claude/rules/ui-components.md (if visual QA)
3. docs/team/handoffs/BES-{N}.md (what to test)
4. The changed files listed in handoff
```

**Business Analyst:**
```
Read in order:
1. .claude/rules/business.md (licensing, wording, fees)
2. docs/BeScout_Context_Pack_v8.md (business master doc)
3. memory/project_business_layer_insights.md (deep business knowledge)
4. docs/VISION.md (product vision)
```

**CEO:**
```
Read in order:
1. memory/current-sprint.md (current state)
2. memory/session-handoff.md (last session context)
3. .claude/rules/workflow.md (team workflow)
4. docs/team/handoffs/ (all pending handoffs)
5. Paperclip dashboard (agent status, open issues)
```

## Skills per Agent

### superpowers (Workflow-Discipline)

| Skill | CEO | Sr Eng | FE Eng | QA | BA |
|-------|-----|--------|--------|----|----|
| brainstorming | yes | — | — | — | — |
| writing-plans | yes | — | — | — | — |
| systematic-debugging | — | yes | yes | — | — |
| verification-before-completion | yes | yes | yes | yes | yes |
| test-driven-development | — | yes | yes | yes | — |
| impact | — | yes | — | — | — |
| requesting-code-review | — | yes | yes | — | — |
| receiving-code-review | — | yes | yes | — | — |

### Domain Skills

| Skill | Who |
|-------|-----|
| beScout-backend | Senior Engineer |
| beScout-frontend | Frontend Engineer |
| beScout-business | Business Analyst |
| fixing-accessibility | Frontend Engineer |
| baseline-ui | Frontend Engineer |
| testing-best-practices | QA |
| typography | Business Analyst, Frontend Engineer |
| cto-review | CEO (for quality gate) |

### MCP Tools

| Tool | Who | When |
|------|-----|------|
| Context7 | Engineers | Any library work — fetch current docs |
| Sequential Thinking | CEO | Design decisions, spec review, sprint prioritization |
| Sequential Thinking | Senior Engineer | Complex logic, multi-step DB operations, not guessing |
| Sequential Thinking | QA | Test strategy for complex features, edge case analysis |
| Sequential Thinking | Business Analyst | Compliance questions, fee calculation verification, legal ambiguity |
| Supabase MCP | Senior Engineer | DB queries, migrations |

## Pipeline Flow

### Sprint Cycle (Weekly)

```
Monday:
  CEO reads current-sprint.md + handoffs
  CEO + Jarvis plan sprint (Jarvis sets priorities)
  CEO creates issues with tags + priority

Daily:
  CEO standup: check agent status, unblock, re-prioritize

Friday:
  CEO aggregates status, updates current-sprint.md
  Reports to Jarvis
```

### Issue Lifecycle

```
CEO creates issue (status: todo, assigned to agent)
  -> Agent picks up (heartbeat)
  -> Agent reads KNOWLEDGE.md + handoffs
  -> Agent invokes relevant skills
  -> Agent implements
  -> Agent runs verification-before-completion
  -> Agent writes handoff (docs/team/handoffs/BES-{N}.md)
  -> Agent creates follow-up issue (QA/review)
  -> Agent sets own issue to in_review

QA picks up follow-up
  -> QA reads handoff
  -> QA tests per checklist
  -> QA pass: marks done
  -> QA fail: creates bug issue -> back to engineer

Quality Gate (CEO or Jarvis):
  -> Reads handoff + QA result
  -> Approve: done
  -> Reject: back to engineer with feedback
```

### Bug Flow

```
QA finds bug
  -> Creates bug issue (priority: high, tag: bug)
  -> Assigns to original engineer
  -> Engineer reads handoff + bug description
  -> Engineer invokes systematic-debugging
  -> Fix -> new handoff -> back to QA
  -> 3x fail: escalate to Jarvis (or CodexReviewer)
```

## Handoff Format

File: `docs/team/handoffs/BES-{N}.md`

```markdown
# BES-{N}: {Title}

**Agent:** {name}
**Date:** {YYYY-MM-DD}
**Status:** ready-for-qa | ready-for-review | blocked | bug-fix

## Changes
- `path/to/file1.tsx` — what changed and why
- `path/to/file2.ts` — what changed and why

## Test Checklist
- [ ] Specific test 1
- [ ] Specific test 2
- [ ] tsc --noEmit passes
- [ ] Relevant vitest tests pass

## Risks
- Known risk or edge case

## Next
- QA: verify [specific things]
- Or: CTO review needed for [reason]
```

## Autonomy Rules

### Agents MAY independently:
- Create follow-up issues (QA, bug, review)
- Reassign issues to other agents
- Write and read handoffs
- Update sprint status
- Use skills and MCP tools
- Invoke Context7 for library docs

### Agents MUST escalate to Jarvis:
- Architecture changes
- DB schema changes outside spec
- Security/Wallet/Trading code
- 3x failed fix (circuit breaker)
- Business rule ambiguity (via BA -> Jarvis)
- Breaking changes to existing behavior

## Operational Config

### Paperclip Defaults (all agents)
- `cwd`: `C:/bescout-app` (FORWARD SLASHES — never backslash)
- `dangerouslySkipPermissions`: true
- Issues created with status: `todo` (never `backlog`)
- Error recovery: reset to `idle` before retry

### File Structure (new)
```
docs/team/
  handoffs/          # Agent handoff files (BES-{N}.md)

# Agent instructions (in Paperclip)
~/.paperclip/.../agents/{id}/instructions/
  AGENTS.md          # Slim: role + bootstrap
  KNOWLEDGE.md       # What to read for this role
  HEARTBEAT.md       # Heartbeat checklist
  SOUL.md            # Persona + principles
```

## Migration from v1

1. Delete CTO agent (Jarvis handles this directly)
2. Rename Engineer -> Senior Engineer, update instructions
3. Rename Engineer2 -> Frontend Engineer, add full instructions
4. Rewrite all AGENTS.md (slim bootstrap)
5. Create KNOWLEDGE.md for each agent
6. Rewrite HEARTBEAT.md (include skills + handoff steps)
7. Rewrite SOUL.md (include autonomy rules)
8. Create `docs/team/handoffs/` directory
9. Update CEO instructions for sprint planning
10. Update QA instructions (maxTurns: 50, scoped verification)
11. Fix all agent configs (cwd, timeouts, turns)
12. Test full loop: CEO creates issue -> Engineer builds -> handoff -> QA tests -> done
