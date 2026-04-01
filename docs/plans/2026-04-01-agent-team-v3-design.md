# Design: BeScout Agent Team v3 — Collaborative Workflow

**Date:** 2026-04-01
**Status:** Approved
**Scope:** Paperclip agent reconfiguration — org chart, HEARTBEAT.md, communication protocol, quality gates

## Problem

Current agent team is a linear task queue: Jarvis writes full specs, agents execute independently, QA checks at the end. No inter-agent communication, no approach review, no feedback loops. Agents don't know what other agents are doing.

## Solution

Hybrid orchestration: CEO delegates via sub-issues, agents communicate via comments + @mentions, tier-dependent quality gates, CTO as approach reviewer, CodexReviewer as code reviewer.

## Org Chart

```
Board (Anil)
  └── Jarvis (direct session — not a Paperclip agent)
        └── CEO (plans, delegates, triages — proactive every 30 min)
              ├── CTO (approach review, architecture — reactive + every 60 min)
              │     ├── SeniorEngineer (backend: DB, RPCs, services)
              │     └── FrontendEngineer (UI: components, pages, hooks)
              ├── QA (testing, verification)
              ├── BusinessAnalyst (compliance, wording)
              └── CodexReviewer (adversarial code review, GPT-based)
```

Changes from current state:
- CTO: paused → active, reportsTo: CEO
- SE + FE: reportsTo: CTO (was BOARD)
- QA + BA + CodexReviewer: reportsTo: CEO (was BOARD)
- Company Goal: "Build and scale BeScout — B2B2C Fan-Engagement Platform for football clubs"

## Communication Protocol

Three channels:

| Channel | When | Cost |
|---------|------|------|
| @Mention on Issue | Quality gates, blocker escalation | 1 heartbeat per mention |
| Comment on own Issue | Progress, results, handoff | Free (part of running heartbeat) |
| Create Sub-Issue | CEO delegates, Engineer creates QA task | Free (API call) |

Rules:
1. Every agent comments BEFORE exit. No heartbeat without at least 1 status comment.
2. @Mention only for gates + blockers. Never for status updates.
3. Parent-Issue = overview. CEO summarizes sub-issue results on parent.
4. Handoff via comment, not via file. No more docs/team/handoffs/ files.

## Tier-Dependent Quality Gates

| | Tier 1 (Hotfix) | Tier 2 (Targeted) | Tier 3 (Scoped) | Tier 4 (Feature) |
|---|---|---|---|---|
| CEO plans | No — direct delegate | No — direct delegate | Yes — sub-issues | Yes — brainstorming + sub-issues |
| CTO Approach | - | - | @CTO on parent | @CTO on parent |
| Engineer implements | Fix + tsc | Fix + tsc + tests | Full pipeline | Full pipeline + impact |
| CodexReviewer | - | - | @CodexReviewer | @CodexReviewer |
| QA | tsc only | tsc + affected tests | Full suite | Full suite + visual |
| BA | - | - | - | Compliance check |
| CEO Approval | - | - | - | Business alignment |
| Target duration | <5 min | <15 min | <30 min | <60 min |

## CEO Heartbeat (proactive, every 30 min)

```
1. SURVEY — Dashboard + Issues
   → Agents in error? Reset to idle.
   → Issues blocked >2 heartbeats? Unblock or reassign.
   → in_review without reviewer? Trigger @CTO or @CodexReviewer.

2. TRIAGE — Prioritize open work
   → New issues from Jarvis? Determine tier, delegate.
   → All sub-issues done? Summarize on parent, close.
   → Engineers idle? Next priority from current-sprint.md.

3. DISPATCH — Delegate
   → Tier 1-2: Direct to engineer (skip CTO).
   → Tier 3-4: @CTO for approach first, then sub-issues after approval.
   → QA tasks: Auto-create after engineering completion.

4. REPORT — Jarvis sync
   → Comment on parent: current status.
   → Update current-sprint.md at milestones.
```

CEO does NOT: create feature issues from roadmap, review code, implement, make architecture decisions.

## CTO Role (reactivated)

Triggers: @mention from CEO/engineers + scheduled every 60 min.

```
1. APPROACH REVIEW (Tier 3-4)
   → Read issue + affected files.
   → Comment: concrete approach, which files, which pattern.
   → Never vague. Always: "Do X in file Y with pattern Z."

2. TECH SUPPORT (on @mention)
   → Engineer asks technical question → CTO answers in thread.
   → Column names, RPC parameters, pattern references.

3. ARCHITECTURE GUARD (scheduled)
   → Check: did any agent work beyond scope?
   → Check: do parallel sub-issues collide in same files?
   → If yes: comment with warning + resolution.
```

CTO does NOT: review code (CodexReviewer does), implement, QA, create issues.

## Engineer Workflow (SE + FE)

```
1. CHECK WORK — Own issues, read comment thread
2. BEFORE CODE
   → Tier 3+: CTO approach present? If not: WAIT. Comment "@CTO approach needed."
   → Parallel engineer? Read their sub-issue. Need their interface?
     Comment on parent: "@FrontendEngineer what props do you expect?"
3. IMPLEMENT — Service layer, qk.*, hooks before returns
4. AFTER CODE (tier-dependent)
   → Tier 1-2: tsc + comment → create QA issue
   → Tier 3+: tsc + tests + comment → @CodexReviewer
5. PEER INFO — Interface changed? Comment on parent for other engineer.
```

Critical rule: Engineer MUST NOT start coding Tier 3+ without CTO approach comment.

## Review + QA Loop

CodexReviewer responses:
- APPROVE → Engineer triggers QA
- REQUEST_CHANGES → Engineer fixes, re-triggers CodexReviewer (max 2 rounds)
- REJECT → Escalate to @CTO for alternative design

QA responses:
- PASS → Issue done
- FAIL → Bug issue created, assigned to original engineer (max 2 rounds)

Max loops: 2 review rounds, 2 QA rounds, then escalation to CTO/Jarvis.

## Jarvis Role (changed)

Does: Discuss with Anil, create WHAT-issues (not HOW), final merge gate, handle escalations, monitor pipeline metrics.

Does NOT: Write full specs with line numbers, look up column names, review agent code line-by-line, run QA.

Issue format (new):
```
"Player Detail: Performance tab loads all 632 players client-side for percentile calc.
 Should be server-side RPC. Tier: 3.
 Acceptance: usePlayers() no longer imported in Player Detail."
```

CTO does the approach. Engineer does the impl. Jarvis verifies the result.

## Escalation Path

Engineer 2x fail → @CTO
CTO can't resolve → @CEO
CEO can't resolve → Comment "@Jarvis escalation"
Jarvis intervenes directly or discusses with Anil.

## Success Criteria

- [ ] Agents communicate via comments (avg >3 comments per Tier 3+ issue)
- [ ] CTO provides approach before Tier 3+ implementation starts
- [ ] CodexReviewer catches at least 1 issue per 3 reviews
- [ ] No merge without Jarvis final check
- [ ] Tier 1-2 issues complete in <15 min
- [ ] Tier 3 issues complete in <30 min
- [ ] Zero @Mention spam (only gates + blockers)
