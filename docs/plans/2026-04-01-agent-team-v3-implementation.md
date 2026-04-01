# Agent Team v3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reconfigure Paperclip agent team from linear task queue to collaborative team with comment-based communication, CTO approach reviews, and tier-dependent quality gates.

**Architecture:** Paperclip API calls to restructure org chart (reportsTo), rewrite HEARTBEAT.md for all 7 agents to include comment protocol + @mention gates, activate CTO, set company goal.

**Tech Stack:** Paperclip REST API (localhost:3100), Markdown (HEARTBEAT.md, KNOWLEDGE.md), curl

---

## Constants

```
COMPANY_ID=cab471f1-96c2-403d-b0a7-1c5bf5db0b5d
CEO_ID=35f1ae98-0117-41aa-8bfe-6ecb8afd6270
CTO_ID=b9833192-2f62-420a-9cdd-a71bf5a10378
SE_ID=696e7864-5234-4466-982b-6c52c7d8cb3c
FE_ID=56e93bfc-3f91-43a4-a99f-ad7578029a4a
QA_ID=6792bfc9-855f-416f-b9f1-b5a0f8ef378a
BA_ID=35626122-c3bb-49b1-a7fd-aa04d3641a80
CODEX_ID=fbfc77b0-6224-4f44-95e5-e9e482383091
AGENT_HOME=~/.paperclip/instances/default/companies/$COMPANY_ID/agents
```

---

### Task 1: Set Company Goal

**Step 1: Set goal via API**

```bash
curl -s -X PATCH http://localhost:3100/api/companies/$COMPANY_ID \
  -H "Content-Type: application/json" \
  -d '{"goal":"Build and scale BeScout — B2B2C Fan-Engagement Platform for football clubs. Pilot: Sakaryaspor."}'
```

**Step 2: Verify**

```bash
curl -s http://localhost:3100/api/companies/$COMPANY_ID | node -e "..."
# Expected: goal = "Build and scale BeScout..."
```

---

### Task 2: Restructure Org Chart

**Step 1: Activate CTO**

```bash
curl -s -X PATCH http://localhost:3100/api/agents/$CTO_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"idle"}'
```

**Step 2: Set reporting lines — CTO reports to CEO**

```bash
curl -s -X PATCH http://localhost:3100/api/agents/$CTO_ID \
  -H "Content-Type: application/json" \
  -d '{"reportsToAgentId":"'$CEO_ID'"}'
```

**Step 3: SE + FE report to CTO**

```bash
curl -s -X PATCH http://localhost:3100/api/agents/$SE_ID \
  -H "Content-Type: application/json" \
  -d '{"reportsToAgentId":"'$CTO_ID'"}'

curl -s -X PATCH http://localhost:3100/api/agents/$FE_ID \
  -H "Content-Type: application/json" \
  -d '{"reportsToAgentId":"'$CTO_ID'"}'
```

**Step 4: QA + BA + CodexReviewer report to CEO**

```bash
curl -s -X PATCH http://localhost:3100/api/agents/$QA_ID \
  -H "Content-Type: application/json" \
  -d '{"reportsToAgentId":"'$CEO_ID'"}'

curl -s -X PATCH http://localhost:3100/api/agents/$BA_ID \
  -H "Content-Type: application/json" \
  -d '{"reportsToAgentId":"'$CEO_ID'"}'

curl -s -X PATCH http://localhost:3100/api/agents/$CODEX_ID \
  -H "Content-Type: application/json" \
  -d '{"reportsToAgentId":"'$CEO_ID'"}'
```

**Step 5: Verify org chart**

```bash
curl -s http://localhost:3100/api/companies/$COMPANY_ID/agents | node -e "..."
# Expected:
# CEO -> BOARD
# CTO -> CEO
# SE -> CTO
# FE -> CTO
# QA -> CEO
# BA -> CEO
# CodexReviewer -> CEO
```

---

### Task 3: Rewrite CEO HEARTBEAT.md

**File:** `$AGENT_HOME/$CEO_ID/instructions/HEARTBEAT.md`

New content incorporates: proactive 30-min cycle, survey/triage/dispatch/report, comment protocol, @mention gates, tier-dependent delegation, no feature creation without Jarvis input.

Key changes from current:
- Add comment-before-exit rule
- Add @CTO trigger for Tier 3+ approach review
- Add parent-issue summarization
- Add stuck-detection (2 heartbeats same issue → escalate)
- Remove handoff-file references (use comments instead)

---

### Task 4: Rewrite CTO HEARTBEAT.md

**File:** `$AGENT_HOME/$CTO_ID/instructions/HEARTBEAT.md`

Complete rewrite for new role: approach reviewer + tech lead + architecture guard.

Key changes:
- Approach review protocol: read issue + files, comment concrete approach
- @mention reactive: answer engineer questions in thread
- 60 min scheduled check: beyond-scope detection, file collision detection
- Remove code review (CodexReviewer does that)
- Add "never vague" rule: always "Do X in file Y with pattern Z"

---

### Task 5: Rewrite SE HEARTBEAT.md

**File:** `$AGENT_HOME/$SE_ID/instructions/HEARTBEAT.md`

Key changes from current:
- Add "read comment thread" before working
- Add CTO approach gate: Tier 3+ must wait for CTO comment
- Add peer communication: interface changes → comment on parent
- Add @CodexReviewer trigger after implementation (Tier 3+)
- Replace handoff-file with comment-based handoff
- Add review-feedback loop: read CodexReviewer comments, fix, re-trigger

---

### Task 6: Rewrite FE HEARTBEAT.md

**File:** `$AGENT_HOME/$FE_ID/instructions/HEARTBEAT.md`

Same changes as SE but for frontend context. Identical communication protocol.

---

### Task 7: Rewrite QA HEARTBEAT.md

**File:** `$AGENT_HOME/$QA_ID/instructions/HEARTBEAT.md`

Key changes:
- Read issue thread for context (not handoff files)
- Comment results on issue (not handoff file)
- FAIL: create bug issue assigned to original engineer
- Max 2 rounds, then escalate @CTO
- Add PASS/FAIL structured comment format

---

### Task 8: Write CodexReviewer HEARTBEAT.md

**File:** `$AGENT_HOME/$CODEX_ID/instructions/HEARTBEAT.md`

Currently minimal or missing. New:
- Triggered by @CodexReviewer mention on issues
- Read full comment thread + git diff
- Three response types: APPROVE / REQUEST_CHANGES / REJECT
- REQUEST_CHANGES: specific file:line feedback
- REJECT: escalate to @CTO
- Max 2 review rounds per issue

---

### Task 9: Update KNOWLEDGE.md for all agents

Update agent IDs, org chart, and @mention names in KNOWLEDGE.md for CEO, CTO, SE, FE, QA, CodexReviewer so every agent knows who to @mention.

---

### Task 10: Update CEO KNOWLEDGE.md with new org

Add CTO to CEO's knowledge map. Update agent table with reportsTo info. Add comment protocol reference.

---

### Task 11: Smoke Test — Tier 2 Issue

**Step 1: Create test issue via Jarvis**

```bash
curl -s -X POST http://localhost:3100/api/companies/$COMPANY_ID/issues \
  -H "Content-Type: application/json" \
  -d '{"title":"Test: Remove unused import in bounties.ts","description":"**Tier: 2**\n\nRemove the unused mapRpcError import if no longer needed after BES-25 changes.\n\nAcceptance: tsc clean, no unused imports in bounties.ts.","status":"todo","priority":"low","assigneeAgentId":"'$CEO_ID'"}'
```

**Step 2: Trigger CEO heartbeat**

```bash
curl -s -X POST http://localhost:3100/api/agents/$CEO_ID/heartbeat/invoke -H "Content-Type: application/json" -d '{}'
```

**Step 3: Observe** — CEO should:
1. Read the issue
2. Determine Tier 2 → skip CTO approach
3. Delegate to SE (create sub-issue or reassign)
4. SE picks up, implements, creates QA issue
5. QA verifies

**Step 4: Verify comments exist on the issue thread**

```bash
curl -s http://localhost:3100/api/issues/{issueId}/comments
# Expected: >= 3 comments (CEO delegation, SE completion, QA result)
```

---

### Task 12: Smoke Test — Tier 3 Issue (with CTO approach gate)

**Step 1: Create test issue**

Something small but Tier 3 — e.g., "Add staleTime to a query that's missing it."

**Step 2: Trigger CEO**

**Step 3: Observe full loop:**
CEO → @CTO approach → CTO comments approach → CEO creates sub-issue for SE → SE implements → @CodexReviewer → review → QA → CEO closes

**Step 4: Verify**
- >= 5 comments on issue thread
- CTO approach comment exists before SE starts
- CodexReviewer comment exists before QA starts

---

### Task 13: Update workflow docs

**Files:**
- `.claude/rules/workflow-reference.md` — update agent table with new reportsTo
- `memory/MEMORY.md` — add Agent Team v3 reference
- `memory/current-sprint.md` — note Agent Team v3 deployed

---

### Task 14: Commit

```bash
git add docs/plans/2026-04-01-agent-team-v3-*.md
git commit -m "docs: Agent Team v3 design + implementation plan"
```

Note: HEARTBEAT.md files are in ~/.paperclip/ (not in repo). Only design docs are committed.
