# Constitutional Learning System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Agent Team v3 from a task executor (D+ learning) to a self-improving system with controlled emergence (S-tier).

**Architecture:** 8 components deployed across 4 phases. All changes are Paperclip agent config files (HEARTBEAT.md, memory files, wiki files). No application code changes.

**Tech Stack:** Paperclip AI (localhost:3100), JSON config files, Markdown instruction files

**Base Path:** `C:\Users\Anil\.paperclip\instances\default\companies\cab471f1-96c2-403d-b0a7-1c5bf5db0b5d`

**Agent IDs:**
| Agent | ID | Has Memory? |
|-------|----|-------------|
| CEO | `35f1ae98-0117-41aa-8bfe-6ecb8afd6270` | Yes |
| CTO | `b9833192-2f62-420a-9cdd-a71bf5a10378` | **NO** |
| SeniorEngineer | `696e7864-5234-4466-982b-6c52c7d8cb3c` | Yes |
| FrontendEngineer | `56e93bfc-3f91-43a4-a99f-ad7578029a4a` | Yes |
| QA | `6792bfc9-855f-416f-b9f1-b5a0f8ef378a` | Yes |
| BusinessAnalyst | `35626122-c3bb-49b1-a7fd-aa04d3641a80` | **NO** |
| CodexReviewer | `fbfc77b0-6224-4f44-95e5-e9e482383091` | **NO** |

---

## Phase 1: Foundation (Reflection + Constitution + Pre-Flight)

### Task 1: Create missing memory infrastructure

**Files:**
- Create: `agents/b9833192-.../memory/insights.json`
- Create: `agents/b9833192-.../memory/mistakes.md`
- Create: `agents/35626122-.../memory/insights.json`
- Create: `agents/35626122-.../memory/mistakes.md`
- Create: `agents/fbfc77b0-.../memory/insights.json`
- Create: `agents/fbfc77b0-.../memory/mistakes.md`

**Step 1:** Create memory directories and seed files for CTO, BA, CodexReviewer.

Each `insights.json`:
```json
{
  "agent": "{AgentName}",
  "insights": [],
  "last_updated": "2026-04-01"
}
```

Each `mistakes.md`:
```markdown
# Mistakes Log
> Max 20 entries. Delete oldest non-repeated first.
```

**Step 2:** Verify all 7 agents have `memory/insights.json` + `memory/mistakes.md`.

**Step 3:** Commit: `chore: create memory infrastructure for CTO, BA, CodexReviewer`

---

### Task 2: Migrate existing learnings to Insight Pool format

**Files:**
- Read: `agents/{CEO,FE,SE,QA}/memory/learnings.md`
- Create: `agents/{CEO,FE,SE,QA}/memory/insights.json`

**Step 1:** For each of the 4 agents with existing learnings.md, convert entries to JSON format.

Mapping:
```
learnings.md entry:
  ## Date: Title
  - Kontext: ...
  - Learning: ...
  - Status: NOTED|CONFIRMED|RULE CANDIDATE

→ insights.json entry:
  {
    "id": (auto-increment),
    "text": (Learning field),
    "why": (Kontext field),
    "domain": (infer: "ui"|"backend"|"workflow"|"testing"|"compliance"),
    "task_types": (infer from context),
    "score": NOTED=0, CONFIRMED=2, RULE_CANDIDATE=3,
    "evidence": [],
    "proposed_by": "{AgentName}",
    "confirmed_by": [],
    "scope": "KNOWLEDGE",
    "constitutional_check": "PASS",
    "created": "2026-04-01",
    "last_confirmed": "2026-04-01"
  }
```

**Step 2:** Keep `learnings.md` as backup (rename to `learnings.md.bak`). New system uses `insights.json` only.

**Step 3:** Verify: `node -e "JSON.parse(require('fs').readFileSync('insights.json'))"` for each file.

**Step 4:** Commit: `chore: migrate agent learnings to Insight Pool JSON format`

---

### Task 3: Create Constitution file

**Files:**
- Create: `wiki/CONSTITUTION.md`

**Step 1:** Create the constitution — immutable principles that no learning can violate.

```markdown
# BeScout Agent Constitution
> These principles are IMMUTABLE. No insight, learning, or proposal may violate them.
> CTO validates all RULE-scope proposals against this document.

## Architecture Principles
1. Component → Service → Supabase (NEVER direct DB access in components)
2. Query keys MUST use qk.* factory (no raw keys)
3. Types in types/index.ts, UI in ui/index.tsx (central registries)
4. Hooks BEFORE early returns (React Rules)

## Security & Compliance
5. NEVER use: Investment, ROI, Profit, Rendite, Dividende, Ownership
6. $SCOUT = "Platform Credits" (not cryptocurrency)
7. Scout Card = "Digitale Spielerkarte" (not ownership)
8. Fee calculations follow ADR-defined splits exactly
9. Phase 3/4 features MUST NOT be built (CASP/MGA gated)

## Data Integrity
10. Column names per common-errors.md (first_name NOT name, side NOT type)
11. Money as BIGINT cents (1,000,000 = 10,000 $SCOUT)
12. All money RPCs: quantity guard (IF p_quantity < 1 THEN error)
13. REVOKE from PUBLIC, authenticated, anon (all 3)

## Code Quality
14. No empty .catch(() => {}) — minimum console.error
15. Array.from(new Set()) not [...new Set()] (strict TS)
16. No dynamic Tailwind classes (border-[${var}]/40)
17. Modal ALWAYS needs open={true/false} prop
18. Loading guard BEFORE empty guard

## Workflow
19. Scope discipline: new problem = separate issue, NEVER fix inline
20. No code without DEFINE + SCOPE + CRITERIA
21. Agent output is a DRAFT — every line must be reviewed
22. "tsc clean" ≠ done, "agent says done" ≠ done
```

**Step 2:** Verify file is readable and well-formatted.

**Step 3:** Commit: `docs: create Agent Constitution — immutable learning boundaries`

---

### Task 4: Create global Insight Pool

**Files:**
- Create: `wiki/INSIGHT_POOL.json`

**Step 1:** Migrate SHARED_LEARNINGS.md entries into structured JSON.

```json
{
  "version": 1,
  "insights": [
    {
      "id": 1,
      "text": "Sub-Issue Zuweisungen triggern Agent-Wake zuverlaessig",
      "why": "@Mention wake unreliable, sub-issue assignment is reliable",
      "domain": "workflow",
      "task_types": ["delegation", "orchestration"],
      "score": 4,
      "evidence": ["BES-50", "BES-51", "BES-52"],
      "proposed_by": "CEO",
      "confirmed_by": ["CEO", "SeniorEngineer"],
      "scope": "KNOWLEDGE",
      "constitutional_check": "PASS",
      "created": "2026-04-01",
      "last_confirmed": "2026-04-01"
    }
  ],
  "next_id": 2,
  "last_updated": "2026-04-01"
}
```

Convert all 23 SHARED_LEARNINGS entries. Assign scores based on status (CONFIRMED 2x = score 4).

**Step 2:** Keep SHARED_LEARNINGS.md as human-readable view (will be auto-generated from JSON in future).

**Step 3:** Verify JSON: `node -e "const d=JSON.parse(require('fs').readFileSync('INSIGHT_POOL.json')); console.log(d.insights.length + ' insights loaded')"`.

**Step 4:** Commit: `chore: create global Insight Pool JSON from SHARED_LEARNINGS`

---

### Task 5: Update ALL agent HEARTBEAT.md — add Reflection + Pre-Flight + Retro

This is the core change. Update the learning protocol section in every agent's HEARTBEAT.md.

**Files:**
- Modify: `agents/{all 7 agents}/instructions/HEARTBEAT.md`

**Step 1:** For EACH agent, replace the existing `## LEARNING PROTOCOL` section with:

```markdown
## LEARNING PROTOCOL (Constitutional Learning System)

### Phase 0: PRE-FLIGHT (before starting any task)

1. Read `$COMPANY_HOME/wiki/CONSTITUTION.md` — these are immutable.
2. Read `$COMPANY_HOME/wiki/INSIGHT_POOL.json` — global insights.
3. Read `$AGENT_HOME/memory/insights.json` — your insights.
4. Filter insights by task_types matching your current task.
5. Generate Pre-Flight Checklist from top insights (by score).
6. Post checklist as FIRST comment on the issue:
   ```
   ## Pre-Flight ({ISSUE_ID})
   Task type: {type}
   Relevant insights ({N} found):
   - [ ] {insight text} (#{id}, Score {score})
   ...
   ```

### Phase 4: RETRO (after task completion, MANDATORY)

1. Read `git diff HEAD~1` — what did you change?
2. Write Structured Reflection:
   ```
   ## {Date}: {Title}
   - Trigger: {ISSUE_ID}
   - Was: {what happened}
   - Warum: {WHY — root cause, not symptom}
   - Beweis: {error msg / test output / QA feedback}
   - Vorschlag: {concrete change proposal}
   - Scope: KNOWLEDGE | RULE | WORKFLOW
   - Score: 0
   ```
3. Update Insight Pool (`$AGENT_HOME/memory/insights.json`):
   a. New insight? → Append with score 0, constitutional_check: validate against CONSTITUTION.md
   b. Existing insight confirmed? → Increment score +1, update last_confirmed
   c. Existing insight contradicted? → Decrement score -1
   d. Score <= 0? → Delete entry
4. Evaluate Pre-Flight Checklist: which items actually helped? Update scores.
5. If any insight score >= 3 and NOT in global pool: copy to `$COMPANY_HOME/wiki/INSIGHT_POOL.json`
6. If any insight score >= 5: comment on issue: "@Jarvis Rule-Promotion: [{text}] → [{target file}]"
7. If insight scope is RULE: comment "@CTO please validate against Constitution"
8. If insight scope is WORKFLOW: comment "@Jarvis please approve workflow change: [{proposal}]"

### Insight Pool Schema

File: `$AGENT_HOME/memory/insights.json`
```json
{
  "agent": "{YourName}",
  "insights": [
    {
      "id": 1,
      "text": "...",
      "why": "...",
      "domain": "ui|backend|workflow|testing|compliance",
      "task_types": ["component", "rpc", "migration", ...],
      "score": 0,
      "evidence": ["BES-{N}"],
      "proposed_by": "{YourName}",
      "confirmed_by": [],
      "scope": "KNOWLEDGE|RULE|WORKFLOW",
      "constitutional_check": "PASS|FAIL",
      "created": "YYYY-MM-DD",
      "last_confirmed": "YYYY-MM-DD"
    }
  ],
  "next_id": 2,
  "last_updated": "YYYY-MM-DD"
}
```

### Scoring Rules
- New insight: score 0
- Confirmed in task: +1
- Confirmed by different agent: +1
- Contradicted: -1
- CTO flags incorrect: -3
- Violates constitution: -5 (auto-delete)
- Score >= 3: auto-promote to global pool
- Score >= 5: candidate for common-errors.md / patterns.md
- Not confirmed 30 days: -1 decay
```

**Step 2:** Verify each HEARTBEAT.md is well-formatted: `cat {file} | head -5` to confirm no corruption.

**Step 3:** Commit: `feat: add Constitutional Learning Protocol to all agent HEARTBEATs`

---

## Phase 2: Fast Communication

### Task 6: Add Completion Signal protocol to engineer HEARTBEATs

**Files:**
- Modify: `agents/696e7864-.../instructions/HEARTBEAT.md` (SeniorEngineer)
- Modify: `agents/56e93bfc-.../instructions/HEARTBEAT.md` (FrontendEngineer)

**Step 1:** Add to the AFTER CODE section of both engineer HEARTBEATs:

```markdown
## COMPLETION SIGNAL (post on issue after task done)

Post this structured signal as a comment on your issue:

```json
{
  "signal": "DONE",
  "agent": "{YourName}",
  "issue": "{ISSUE_ID}",
  "files_changed": ["path/to/file1.ts", "path/to/file2.tsx"],
  "files_added": ["path/to/new_file.ts"],
  "tsc": "pass|fail",
  "tests": "pass|fail|N/A",
  "ready_for": ["QA", "CodexReviewer"],
  "context_for_next": "Brief description of what you built, API signatures, key decisions."
}
```

Then update the Context Board (if exists):
- Read `$COMPANY_HOME/wiki/boards/{PARENT_ISSUE_ID}.json`
- Update your section (se_output or fe_output)
- Write the file back
```

**Step 2:** Commit: `feat: add Completion Signal protocol to engineer HEARTBEATs`

---

### Task 7: Add Direct Chaining to engineer HEARTBEATs

**Files:**
- Modify: `agents/696e7864-.../instructions/HEARTBEAT.md` (SeniorEngineer)
- Modify: `agents/56e93bfc-.../instructions/HEARTBEAT.md` (FrontendEngineer)

**Step 1:** Add after the Completion Signal section:

```markdown
## DIRECT CHAINING (trigger next agent in pipeline)

After posting Completion Signal, trigger the next agent(s) directly.
Do NOT wait for CEO to dispatch — you chain directly.

### Pipeline by Tier

**Tier 2:** You → QA
```bash
# Create QA sub-issue
curl -s -X POST "$PAPERCLIP_URL/api/companies/$COMPANY_ID/issues" \
  -H "Content-Type: application/json" \
  -d '{"title":"QA: {ISSUE_ID} {brief}","description":"...","status":"todo","priority":"medium","assigneeAgentId":"6792bfc9-855f-416f-b9f1-b5a0f8ef378a","parentId":"{PARENT_ISSUE_ID}"}'
# Trigger QA
curl -s -X POST "$PAPERCLIP_URL/api/agents/6792bfc9-855f-416f-b9f1-b5a0f8ef378a/heartbeat/invoke" -H "Content-Type: application/json" -d '{}'
```

**Tier 3:** You → QA + CodexReviewer (parallel)
```bash
# Create + trigger QA (same as Tier 2)
# ALSO create + trigger CodexReviewer:
curl -s -X POST "$PAPERCLIP_URL/api/companies/$COMPANY_ID/issues" \
  -H "Content-Type: application/json" \
  -d '{"title":"CodexReview: {ISSUE_ID} {brief}","description":"...","status":"todo","priority":"medium","assigneeAgentId":"fbfc77b0-6224-4f44-95e5-e9e482383091","parentId":"{PARENT_ISSUE_ID}"}'
curl -s -X POST "$PAPERCLIP_URL/api/agents/fbfc77b0-6224-4f44-95e5-e9e482383091/heartbeat/invoke" -H "Content-Type: application/json" -d '{}'
```

**Tier 4:** You → QA + CodexReviewer + BA (parallel)
```bash
# Same as Tier 3, ALSO trigger BA:
curl -s -X POST "$PAPERCLIP_URL/api/agents/35626122-c3bb-49b1-a7fd-aa04d3641a80/heartbeat/invoke" -H "Content-Type: application/json" -d '{}'
```

### Variables
- PAPERCLIP_URL: `http://localhost:3100`
- COMPANY_ID: `cab471f1-96c2-403d-b0a7-1c5bf5db0b5d`

### Rules
- ALWAYS update issue status to "done" BEFORE chaining
- ALWAYS post Completion Signal BEFORE chaining
- ALWAYS create sub-issue with parentId BEFORE triggering agent
```

**Step 2:** Commit: `feat: add Direct Chaining — engineers trigger QA/CodexReviewer directly`

---

### Task 8: Create Context Board infrastructure

**Files:**
- Create: `wiki/boards/` directory
- Create: `wiki/boards/TEMPLATE.json`

**Step 1:** Create boards directory and template.

```json
{
  "feature": "",
  "parent_issue": "",
  "tier": 0,
  "pipeline": [],
  "created": "",
  "state": {
    "cto_approach": { "status": "pending", "decision": "", "risks": [] },
    "se_output": { "status": "pending", "files": [], "api": "", "migration_applied": false },
    "fe_output": { "status": "pending", "files": [], "i18n_keys": [], "commit": "" },
    "qa_verdict": { "status": "pending", "bugs_found": [], "passed": false },
    "codex_verdict": { "status": "pending", "issues_found": [], "verdict": "" },
    "ba_verdict": { "status": "pending", "compliance_issues": [], "passed": false }
  }
}
```

**Step 2:** Add to CEO HEARTBEAT.md (Dispatch section):

```markdown
## CONTEXT BOARD (create for Tier 3+ issues)

After determining Tier and creating sub-issues, create a Context Board:

1. Copy `$COMPANY_HOME/wiki/boards/TEMPLATE.json` to `$COMPANY_HOME/wiki/boards/{ISSUE_ID}.json`
2. Fill in: feature, parent_issue, tier, pipeline
3. Agents update their section when they complete work
```

**Step 3:** Commit: `feat: add Context Board infrastructure for pipeline visibility`

---

### Task 9: Update CEO HEARTBEAT — Monitor role + Board reading

**Files:**
- Modify: `agents/35f1ae98-.../instructions/HEARTBEAT.md` (CEO)

**Step 1:** Replace CEO's dispatch routing with monitor role. In the SURVEY section, add:

```markdown
## SURVEY ADDITIONS (CLS)

### Board Check
- Read all `$COMPANY_HOME/wiki/boards/*.json` for active features
- Any board with all agent sections "done"? → Close parent issue, archive board
- Any board stuck (same status >2 heartbeats)? → Investigate + unblock

### Pipeline Monitor
Engineers now chain directly (no CEO routing needed for standard flows).
CEO intervenes ONLY when:
1. Agent is stuck (no progress for 2 heartbeats)
2. Blocker requires reassignment
3. Multiple agents conflict on same files
4. Proactive issue needs approval
```

**Step 2:** In the TRIAGE section, update Tier 3 to remove CEO-as-router:

```markdown
### Tier 3 (updated): Sub-Issues + CTO Approach + Direct Chain
1. Create Context Board (`wiki/boards/{ISSUE_ID}.json`)
2. Comment on issue: "@CTO Approach-Review bitte"
3. WAIT for CTO approach
4. After CTO comments: create sub-issues with parentId + assigneeAgentId
5. Engineers will chain to QA/CodexReviewer themselves (Direct Chaining)
6. Monitor via Context Board — intervene only on blockers
```

**Step 3:** Commit: `feat: CEO transitions from router to monitor (Direct Chaining enabled)`

---

## Phase 3: CTO Constitutional Validator

### Task 10: Add Constitutional Validator to CTO HEARTBEAT

**Files:**
- Modify: `agents/b9833192-.../instructions/HEARTBEAT.md` (CTO)

**Step 1:** Add a new section to CTO's HEARTBEAT:

```markdown
## CONSTITUTIONAL VALIDATION (every heartbeat)

1. Read `$COMPANY_HOME/wiki/INSIGHT_POOL.json`
2. Check for new entries since last heartbeat (compare last_updated)
3. For each new entry:
   a. Read `$COMPANY_HOME/wiki/CONSTITUTION.md`
   b. Does the insight contradict ANY constitutional principle?
   c. If YES: set score to -5 in INSIGHT_POOL.json + comment on source issue:
      "Constitutional violation: Insight '{text}' contradicts principle #{N}: '{principle}'. Removed."
   d. If NO: set constitutional_check to "PASS" (no action needed)
4. Check for RULE-scope proposals (from issue comments):
   a. Read proposal against Constitution
   b. If valid: approve in comment "@{Agent} RULE approved: {proposal}"
   c. If violates: reject in comment "@{Agent} RULE rejected: violates principle #{N}"

### RULES
- NEVER approve an insight that violates the Constitution
- NEVER modify the Constitution yourself — only Jarvis can change it
- When in doubt: reject and escalate to Jarvis
```

**Step 2:** Commit: `feat: CTO as Constitutional Validator — guards insight quality`

---

## Phase 4: Proactive Analysis

### Task 11: Add Proactive Scan to engineer HEARTBEATs

**Files:**
- Modify: `agents/696e7864-.../instructions/HEARTBEAT.md` (SeniorEngineer)
- Modify: `agents/56e93bfc-.../instructions/HEARTBEAT.md` (FrontendEngineer)

**Step 1:** Add before the CHECK WORK section:

```markdown
## PROACTIVE SCAN (only when idle — no assigned issues)

If you have NO assigned issues (todo or in_progress):

1. Read `$COMPANY_HOME/wiki/INSIGHT_POOL.json`
2. Filter insights by your domain (backend/ui) with score >= 3
3. For the top-scoring insight: Grep the codebase for violations
4. If violations found (>= 3 instances):
   a. Create a Tier 1 issue (max 10 LOC fix):
      Title: "Proactive: {insight text} ({count} violations)"
      Description: List files + line numbers. Label: proactive.
      Do NOT assign to yourself — CEO approves first.
5. LIMIT: max 1 proactive issue per heartbeat, max 3 per day

### Examples of good proactive scans:
- "transition-all should be transition-colors" → grep → 67 violations → issue
- "Missing aria-label on icon-only buttons" → grep → 12 violations → issue
- "Raw query keys not using qk.*" → grep → 5 violations → issue

### NOT proactive (don't create issues for):
- Architectural changes (Tier 3+)
- Business logic changes
- Things that require brainstorming
```

**Step 2:** Commit: `feat: add Proactive Scan — engineers scan for known violations when idle`

---

## Phase 5: Verification

### Task 12: Pipeline test — run one Tier 3 feature through CLS

**Step 1:** Create a test issue on Paperclip (small real feature).

**Step 2:** Verify the following CLS components activate:
- [ ] CEO creates Context Board
- [ ] CTO does Approach Review
- [ ] Engineer posts Pre-Flight Checklist
- [ ] Engineer posts Completion Signal (structured JSON)
- [ ] Engineer triggers QA + CodexReviewer directly (no CEO routing)
- [ ] QA reads Context Board (not issue thread)
- [ ] CodexReviewer receives and reviews
- [ ] Engineer writes Structured Reflection (Retro phase)
- [ ] Insight Pool is updated (new insight or score change)
- [ ] CTO validates insight against Constitution

**Step 3:** Measure pipeline time. Target: <5 min for Tier 3 (down from ~15 min).

**Step 4:** Fix any protocol gaps discovered during test.

**Step 5:** Commit: `test: CLS pipeline verification — first controlled run`

---

## Summary

| Task | Phase | What | Effort |
|------|-------|------|--------|
| 1 | Foundation | Create missing memory dirs | 10 min |
| 2 | Foundation | Migrate learnings → Insight Pool JSON | 30 min |
| 3 | Foundation | Create Constitution file | 15 min |
| 4 | Foundation | Create global Insight Pool JSON | 30 min |
| 5 | Foundation | Update ALL HEARTBEATs with CLS protocol | 45 min |
| 6 | Communication | Completion Signal protocol | 15 min |
| 7 | Communication | Direct Chaining protocol | 20 min |
| 8 | Communication | Context Board infrastructure | 15 min |
| 9 | Communication | CEO Monitor role update | 15 min |
| 10 | Governance | CTO Constitutional Validator | 15 min |
| 11 | Proactive | Engineer Proactive Scan | 15 min |
| 12 | Verification | Pipeline test run | 30 min |
| | | **Total** | **~4 hours** |
