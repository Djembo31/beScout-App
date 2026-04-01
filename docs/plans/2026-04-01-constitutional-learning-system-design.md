# Constitutional Learning System (CLS) — Design Document

> Date: 2026-04-01 | Author: Jarvis (CTO) | Status: Approved
> Goal: S-Tier controlled emergence — agents that think proactively but can't learn bad habits

## Problem Statement

Agent Team v3 executes tasks well (Code Output: A-) but doesn't learn (D+).
Agents write observations but don't adapt behavior, don't propose fixes, don't share learnings cross-agent.
Same mistakes repeat across heartbeats. No root-cause analysis. No workflow improvement proposals.

## Architecture

```
                    ┌─────────────────────────┐
                    │     CONSTITUTION         │
                    │  CLAUDE.md + workflow.md  │
                    │  business.md + common-    │
                    │  errors.md               │
                    └────────┬────────────────┘
                             │ validates against
                             ▼
┌──────────┐    ┌──────────────────┐    ┌──────────────┐
│ Agent     │───▶│  REFLECTION      │───▶│ INSIGHT POOL │
│ does task │    │  (structured,    │    │ (scored,      │
└──────────┘    │   mandatory)     │    │  searchable)  │
                └──────────────────┘    └──────┬───────┘
                                               │ retrieves before
                                               ▼
                                        ┌──────────────┐
                                        │ PRE-FLIGHT   │
                                        │ CHECKLIST    │
                                        │ (task-       │
                                        │  specific)   │
                                        └──────────────┘
```

## Component 1: Structured Reflection

Replaces current flat learning entries. Forces root-cause analysis.

### Format

```markdown
## Date: Title
- Trigger: BES-{N} (issue link MANDATORY)
- Was: What happened
- Warum: WHY it happened (root cause, not symptom)
- Beweis: Error message / test output / QA feedback
- Vorschlag: Concrete change proposal
- Scope: KNOWLEDGE | RULE | WORKFLOW
- Score: 0 (new)
```

### Scope Levels

| Scope | Meaning | Approval |
|-------|---------|----------|
| KNOWLEDGE | Agent can self-apply (add to own checklist) | None needed |
| RULE | Changes shared rules or other agents' behavior | CTO validates |
| WORKFLOW | Changes pipeline structure or agent roles | Jarvis approves |

## Component 2: Constitution

Immutable principles that NO learning can violate.

| Principle | Source | Example Violation |
|-----------|--------|-------------------|
| Service Layer | CLAUDE.md | "Supabase direkt ist ok" |
| Security/Compliance | business.md | "$SCOUT = Investment" |
| Scope Discipline | workflow.md | "Beyond-scope ist ok wenn schnell" |
| Type Safety | common-errors.md | "as any ist akzeptabel" |
| Column Names | common-errors.md | "name statt first_name geht" |
| Fee Calculations | business.md | "Fee-Split anpassen ohne ADR" |
| Query Keys | CLAUDE.md | "Raw keys sind ok fuer einmalige Queries" |

Any insight that contradicts a constitutional principle gets Score -5 (effectively deleted).
CTO validates all RULE-scope proposals against constitution before approval.

## Component 3: Pre-Flight Checklist

Before starting any task, agent MUST:

1. Read relevant insights from pool (filter by `task_types` match)
2. Generate task-specific checklist from insights (top-k by score)
3. Post checklist as first comment on issue
4. After completion: evaluate which items were actually needed

### Example

```markdown
## Pre-Flight (BES-61: Notification Badge)
Task type: ui_component
Relevant insights (4 found):
- [x] shrink-0 on scrollable items (Insight #12, Score +3)
- [x] aria-label on interactive elements (Insight #8, Score +2)
- [ ] memo() on list components (Insight #15, Score +1) — not applicable (single element)
- [x] i18n keys in DE + TR (Insight #3, Score +4)
```

Post-task: insights #12, #8, #3 confirmed (+1 each). #15 not applicable (no score change).

## Component 4: Insight Pool

Structured JSON replacing static learnings.md files.

### Schema

```json
{
  "insights": [
    {
      "id": 12,
      "text": "Scrollable containers brauchen shrink-0, nie flex-1",
      "why": "flex-1 verursacht overflow auf iPhone Safari",
      "domain": "ui",
      "task_types": ["component", "layout", "mobile"],
      "score": 3,
      "evidence": ["BES-42", "BES-61"],
      "proposed_by": "FrontendEngineer",
      "confirmed_by": ["QA", "CTO"],
      "scope": "KNOWLEDGE",
      "constitutional_check": "PASS",
      "created": "2026-04-01",
      "last_confirmed": "2026-04-01"
    }
  ]
}
```

### Scoring Rules

| Event | Score Change |
|-------|-------------|
| New insight created | 0 |
| Confirmed in another task | +1 |
| Confirmed by different agent | +1 |
| Contradicted by evidence | -1 |
| Flagged by CTO as incorrect | -3 |
| Violates constitution | -5 |

### Lifecycle

| Score | Status |
|-------|--------|
| < 0 | Deleted (prevents bad learning accumulation) |
| 0 | New, unconfirmed |
| 1-2 | Active, local only |
| 3+ | Auto-promoted to SHARED (global pool) |
| 5+ | Candidate for permanent rules (common-errors.md, patterns.md) |

### Decay

Insights not confirmed for 30 days get Score -1 per month.
Prevents stale rules from accumulating.

## Component 5: Automated Retro Phase

Mandatory phase at end of every agent task. Not a separate agent.

### HEARTBEAT Addition (all agents)

```
## Phase 4: RETRO (after task completion, MANDATORY)

1. Read git diff HEAD~1 (what did I change?)
2. Write Structured Reflection (Component 1 format)
3. Update Insight Pool:
   a. New insight discovered? → Add with Score 0
   b. Existing insight confirmed? → Score +1
   c. Existing insight contradicted? → Score -1
4. Evaluate Pre-Flight Checklist: which items helped?
5. If any insight Score >= 3 and not in SHARED: promote to global pool
6. If any insight Score >= 5: comment "@Jarvis Rule-Promotion: [insight] → [target file]"
```

Time budget: ~30 seconds per task. No extra heartbeat needed.

## Component 6: Cross-Agent Insight Sharing

### Two Pools

1. **Agent-local pool:** `$AGENT_HOME/memory/insights.json` — agent's own insights
2. **Global pool:** `$COMPANY_HOME/wiki/INSIGHT_POOL.json` — shared across all agents

### Flow

```
Agent finds insight → local pool (Score 0) →
  confirmed 3x → auto-promoted to global pool →
  all agents read global pool during Pre-Flight →
  relevant insights injected into task context
```

### Constitutional Validation

When insight promotes to global pool:
1. CTO heartbeat reads new global entries
2. Checks each against constitution
3. Constitutional violation → Score -5 (deleted from global)
4. Pass → remains in global pool

This is the "kein Schwachsinn" gate.

## Component 7: Proactive Analysis

Agents use 10% of idle heartbeats for proactive code scanning.

### HEARTBEAT Addition (engineers only)

```
## Phase 0.5: PROACTIVE SCAN (only when idle, no assigned tasks)

1. Read top-5 SHARED insights with highest score
2. For each insight with domain matching your role:
   a. Grep for violations in codebase
   b. If found: create Tier 1 issue with label "proactive"
3. Limit: max 1 proactive issue per heartbeat
4. Proactive issues need CEO approval before execution
```

### Control Limits

- Proactive issues are ALWAYS Tier 1 (max 10 LOC)
- Agent cannot self-assign proactive issues
- CEO reviews and can reject ("not priority")
- Max 3 proactive issues per agent per day

## Component 8: Fast Communication

### 8a. Structured Completion Signal

Agents post structured JSON on issue completion (replaces free-form comments):

```json
{
  "signal": "DONE",
  "agent": "SeniorEngineer",
  "issue": "BES-51",
  "files_changed": ["supabase/migrations/...sql", "src/lib/services/watchlist.ts"],
  "files_added": ["src/lib/queries/watchlist.ts"],
  "tsc": "pass",
  "tests": "N/A",
  "ready_for": ["FrontendEngineer", "QA"],
  "context_for_next": "RPC: get_most_watched_players(p_limit). Service: getMostWatchedPlayers(limit). Query key: qk.watchlist.mostWatched(limit)."
}
```

### 8b. Direct Chaining

Engineers trigger successor agents directly (CEO monitors, doesn't route):

```
Tier 2 Pipeline:  Engineer → QA → Done
Tier 3 Pipeline:  CTO → Engineer(s) → [QA + CodexReviewer] → Done
Tier 4 Pipeline:  CTO → Engineer(s) → [QA + CodexReviewer + BA] → Done
```

After task completion, engineer runs:
```
POST /api/agents/{NEXT_AGENT_ID}/heartbeat/invoke
```

CEO intervenes only on blockers, not standard handoffs.

### 8c. Context Board

Living context document per feature:

File: `wiki/boards/{ISSUE_ID}.json`

```json
{
  "feature": "Most Watched Players Strip",
  "parent_issue": "BES-49",
  "tier": 3,
  "pipeline": ["CTO", "SE", "FE", "QA", "CodexReviewer"],
  "state": {
    "cto_approach": {
      "status": "done",
      "decision": "New RPC + wrapper...",
      "risks": ["watchlist might be empty"]
    },
    "se_output": {
      "status": "done",
      "files": ["..."],
      "api": "getMostWatchedPlayers(limit)",
      "migration_applied": true
    },
    "fe_output": null,
    "qa_verdict": null,
    "codex_verdict": null
  }
}
```

Each agent reads the board before starting, writes their output when done.
Eliminates redundant code exploration and context gathering.

## Speed Impact

| Scenario | Current | With CLS |
|----------|---------|----------|
| SE → QA handoff | ~5 min (CEO routing) | ~10 sec (direct chain) |
| QA finds files to review | ~2 min (git diff parse) | ~0 sec (completion signal) |
| FE discovers SE API | ~3 min (read code) | ~0 sec (context board) |
| CEO checks pipeline | ~1 min (read all issues) | ~5 sec (read board) |
| Full Tier 3 pipeline | ~15 min | ~5 min |

## Implementation Priority

| Phase | Components | Effort |
|-------|-----------|--------|
| Phase 1 | Structured Reflection + Constitution + Pre-Flight | 2-3h |
| Phase 2 | Insight Pool (JSON) + Automated Retro | 2-3h |
| Phase 3 | Fast Communication (Signals + Chaining + Boards) | 3-4h |
| Phase 4 | Cross-Agent Sharing + Proactive Analysis | 2-3h |

Total: ~10-13 hours across 4 phases.

## Success Metrics

| Metric | Current | Target (after 20 tasks) |
|--------|---------|-------------------------|
| Same mistake repeated | ~40% | <5% |
| Insights with Score ≥3 | 0 | 20+ |
| Pre-Flight checklist usage | 0% | 100% |
| Agent-proposed workflow fixes | 0 | 5+ |
| Pipeline Tier 3 time | ~15 min | ~5 min |
| CodexReviewer invoked (Tier 3) | 0% | 100% |
| Proactive issues created | 0 | 10+ |

## References

- ExpeL: LLM Agents Are Experiential Learners (Zhao et al., 2023)
- Reflexion: Verbal Reinforcement Learning (Shinn et al., 2023)
- MAR: Multi-Agent Reflexion (arXiv 2512.20845)
- Anthropic: Effective Harnesses for Long-Running Agents
- Cognition: Deterministic Orchestration Spine pattern
- Voyager: Skill Library pattern (NVIDIA/Caltech)
- AgentDebug: Error Taxonomy + Cascade Detection
