---
name: spec
description: Use BEFORE any feature work, redesign, or refactoring. Replaces brainstorming + writing-plans with a senior-dev specification process. Enforces mandatory code reading, DB schema verification, consumer mapping, edge case enumeration, executable acceptance criteria, and test strategy. No code is written until the user approves the spec. Trigger on any task that changes user-visible behavior, moves/renames code, or touches 3+ files.
---

# /spec — Senior Engineering Specification

A spec that doesn't prevent bugs is a wish list.
A spec without code reading is fiction.
A spec without edge cases is a happy-path fantasy.

This skill produces a DOCUMENT so complete that implementation is mechanical.
If the spec doesn't cover a case and a bug appears — that's a spec bug, not a code bug.

## When to Use

- Any feature that changes user-visible behavior
- Any redesign, refactoring, or migration
- Any task touching 3+ files
- Before dispatching agents for implementation
- When Anil gives direction ("mach das", "das muss anders")

## The 2 Phases

```
SPEC (investigate + specify — NO CODE YET)
  ↓ Anil approves
PLAN (translate to safe, shippable waves with exact tasks)
```

No Phase 3 "Execute" — that's /deliver's job with the approved spec as input.

---

## PHASE 1: SPEC

Write the spec in `docs/plans/YYYY-MM-DD-<topic>-spec.md`.
Every section is mandatory. The quality bar: a senior dev who never saw this codebase
could implement it correctly from your spec alone.

### 1.1 Discovery Probes (MUST READ CODE — not grep, not guess)

These are concrete investigations. Each probe produces evidence (file paths, line numbers,
actual code). You cannot write the spec without completing every applicable probe.

**Probe A: Feature Inventory**
- Open every page/component in the affected area. READ the JSX.
- List every user-visible feature: what can the user SEE and DO?
- Number each feature. This becomes the migration map input.

**Probe B: Data Flow Trace**
- For each feature, trace the data path:
  `Component → Hook (useQuery/useMutation) → Service → RPC/Supabase call → Table`
- Write the actual function names, not generic descriptions.
- Example: `BuyButton.onClick → useBuyPlayer.mutate → buyPlayer() → rpc('buy_player_dpc') → orders + transactions tables`

**Probe C: Consumer Map (2 levels deep)**
- For every function/type/component that will change:
  1. `grep -rn "FunctionName" src/` — direct consumers (Level 1)
  2. For each Level 1 consumer, what does IT export? Who imports THAT? (Level 2)
  3. `grep -rn "queryKeyName" src/` — query subscribers
- Document every result with file:line.

**Probe D: DB Schema Verification (if DB/RPC involved)**
- Actual column names: read the migration files or run `\d+ table_name`
- CHECK constraints: what values are allowed? (from database.md + migrations)
- RLS policies: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`
- Foreign keys: what depends on this table?
- NOT NULL columns: what MUST be provided in INSERT?

**Probe E: Known Traps Scan**
- Read common-errors.md. For each pattern, ask: "Does this apply to my change?"
- Read business.md. Does this change touch compliance-critical wording?
- Read database.md. Are there column naming traps?
- List every applicable trap with its ID/name.

**Probe F: Security Surface (if DB/RPC/auth involved)**
- Is this SECURITY DEFINER? → REVOKE + auth.uid() guard mandatory
- Does anon have EXECUTE on this? → Should they?
- Are user-provided params validated in the RPC body?
- Can a user call this for another user's data?

### 1.2 Problem Statement

- What's wrong or missing today? (1-3 sentences)
- Evidence: screenshot, error message, user report, or Anil quote
- Who is affected and how often?

### 1.3 Solution Design

- What changes and why (not how — the Plan covers how)
- Data flow AFTER the change (same format as Probe B)
- New or modified types/interfaces: write the EXACT TypeScript shape
- New or modified DB objects: write the EXACT SQL signature

### 1.4 Feature Migration Map (for redesigns/refactors)

For EVERY feature from Probe A:

| # | Feature | Current Location | Target | Action |
|---|---------|-----------------|--------|--------|
| 1 | ... | file:line | file:line | MOVE/STAYS/REMOVE/MERGE/SPLIT/ENHANCE |

Rules:
- Every feature must appear. No feature left unaccounted.
- MOVE means the old location is cleaned up in the SAME wave.
- STAYS means explicitly verified it still works after surrounding changes.

### 1.5 Acceptance Criteria (EXECUTABLE — not prose)

For each user flow affected, write criteria that can be VERIFIED by running a command,
clicking a specific path, or querying the database. Not "feature works" — SPECIFIC.

Format:
```
AC-01: [Category] [Description]
  VERIFY: [Exact command, URL path, or DB query]
  EXPECTED: [Exact result — what you see/get]
  FAIL IF: [What would indicate a bug]
```

Categories and mandatory coverage:

| Category | Mandatory for | Example |
|----------|---------------|---------|
| HAPPY | Every flow | User buys → balance reduced, holdings +1 |
| EMPTY | Every list/display | No data → empty state with CTA |
| ERROR | Every write/mutation | Service throws → translated toast |
| NULL | Every optional field | floor_price missing → shows 0, not "NaN" |
| CONCURRENT | Every DB write | 2 users buy last card → only 1 succeeds |
| MOBILE | Every UI change | 393px iPhone → no overflow, 44px touch targets |
| I18N-DE | Every user-visible string | German text correct |
| I18N-TR | Every user-visible string | Turkish text correct, no "kazan*" |
| LOADING | Every async operation | Skeleton shown during fetch, not blank |
| PENDING | Every mutation | Button disabled during mutation, modal preventClose |
| REGRESSION | Every existing feature in blast radius | Feature X still works exactly as before |

You need AT MINIMUM one AC per category per affected flow. More is better.

### 1.6 Edge Cases Table

Systematic enumeration — not "I think these might happen" but "these WILL happen":

| # | Flow | Case | Input/State | Expected Output | Why it might break | Mitigation |
|---|------|------|-------------|-----------------|-------------------|------------|

Fill this by walking through each flow and asking for EACH cell:
- What if the input is null/undefined/0/empty string/empty array?
- What if the DB returns 0 rows? 1 row? 1000 rows?
- What if the user is not authenticated? Wrong role?
- What if the network request fails? Times out? Returns 500?
- What if this runs twice (double-click, retry)?
- What if the data changed between read and write (stale)?

### 1.7 Error Strategy

For every error that can occur in this change:

| # | Error Source | Error Type | User Sees | i18n Key | Recovery |
|---|-------------|-----------|-----------|----------|----------|
| 1 | RPC | insufficient_balance | "Nicht genug $SCOUT" | trade.insufficientBalance | Dismiss toast |
| 2 | RPC | player_not_found | "Spieler nicht gefunden" | trade.playerNotFound | Redirect to /market |
| 3 | Network | timeout | "Verbindungsfehler" | common.networkError | Retry button |

Rules:
- Services THROW errors, never return null on failure.
- Error messages are i18n KEYS, consumers resolve via `t()`.
- No dynamic values in error messages (those go in pre-submit validation).
- No raw English in user-facing errors.

### 1.8 Test Strategy

Concrete test cases — not "write tests" but WHICH tests with WHAT assertions.

**Unit Tests (vitest):**
```typescript
// File: src/lib/services/__tests__/[service].test.ts
describe('[ServiceName]', () => {
  it('[exact test description]', () => {
    // Input: ...
    // Expected: ...
  })
  it('[error case]', () => {
    // Input: invalid X
    // Expected: throws '[i18n key]'
  })
})
```

**Integration Checks (against real DB — listed, not mocked):**
```sql
-- After: [action]
-- Verify: [exact query]
-- Expected: [exact result shape]
```

**Manual Verification (on bescout.net after deploy):**
```
1. Login as [user]
2. Navigate to [exact path]
3. Click [exact element]
4. See: [exact expected state]
5. Verify: [what to check]
```

### 1.9 Pre-Mortem

"It's 1 week later. This change broke something. What happened?"

| # | Failure | Probability | Impact | Mitigation | Detection |
|---|---------|-------------|--------|------------|-----------|
| 1 | ... | HIGH/MED/LOW | ... | ... | How would we notice? |

Pull from common-errors.md. At least 5 scenarios.

### SPEC GATE (Anil Approval — NO CODE before this passes)

Present the spec to Anil. He approves or requests changes.

Checklist before presenting:
- [ ] Every Discovery Probe completed with evidence?
- [ ] Every feature in affected area accounted for?
- [ ] Consumer map covers 2 levels deep?
- [ ] DB schema read from actual source (not assumed)?
- [ ] Known traps from common-errors.md listed?
- [ ] AC covers ALL categories (happy/empty/error/null/concurrent/mobile/i18n/loading/pending/regression)?
- [ ] Edge cases table has at least 1 entry per flow?
- [ ] Error strategy covers every throwable error?
- [ ] Test cases are concrete (not "write tests for X")?
- [ ] Pre-mortem has 5+ scenarios?

**THE SPEC IS THE CONTRACT. If it's not in the spec, it's not in the code.**

---

## PHASE 2: PLAN

Translate approved spec to implementation waves.

### 2.1 Wave Design

| Wave | Rule | Max Files |
|------|------|-----------|
| Wave 1: Infra | Types, DB migrations, barrel exports. No UI. | 10 |
| Wave 2: Backend | Services, RPCs, RLS policies. No UI. | 10 |
| Wave 3: Frontend | Components, pages, hooks. Uses Wave 1+2 infra. | 10 |
| Wave 4: Integration | Wiring, navigation, cache invalidation. | 5 |
| Wave 5: Polish | i18n, edge cases, loading states, empty states. | 10 |
| Wave 6: Cleanup | Delete old files, remove bridges. Only if grep shows 0 consumers. | 5 |

Rules:
- Move and Change NEVER in the same wave.
- Each wave is independently shippable (doesn't break the app).
- Each wave ends with: `tsc --noEmit` + vitest + specific ACs from the spec.

### 2.2 Task Format

Each task maps DIRECTLY to acceptance criteria from the spec.

```markdown
### Task [Wave].[N]: [Description]

**Files:** [exact paths — Create/Modify/Delete]
**Acceptance Criteria:** AC-[numbers] from spec
**Edge Cases:** EC-[numbers] from spec
**Known Traps:** [from 1.5 scan — specific to this task]

**Steps:**
1. [Specific action with file:line reference]
2. [Specific action]
3. Verify: `npx tsc --noEmit`
4. Verify: `npx vitest run [specific test file]`

**DONE means:**
- [ ] AC-XX verified: [exact check]
- [ ] AC-YY verified: [exact check]
- [ ] tsc 0 errors
- [ ] Tests green: [specific test files]
```

### 2.3 Agent Dispatch Rules

Agents receive tasks that are:
- Fully specified (exact files, exact types, exact behavior)
- Self-contained (no cross-file coordination needed)
- Verifiable (agent can check their own work with tsc + vitest)
- Accompanied by: Impact Manifest + Known Traps + ACs

Agents DO NOT receive:
- Integration tasks (wiring multiple components)
- Tasks requiring architecture decisions
- Tasks with ambiguous acceptance criteria
- Geld/Wallet/Security tasks (CTO does those)

### PLAN GATE

- [ ] Every AC from spec is assigned to exactly one task?
- [ ] No AC is orphaned (missing from all tasks)?
- [ ] Each wave is independently shippable?
- [ ] Move and Change in separate waves?
- [ ] Agent tasks are fully self-contained?
- [ ] Anil approves the plan?

After approval: execute via /deliver (one wave at a time).

---

## Quality Bar

The spec is done when a developer who has NEVER seen this codebase could:
1. Read the spec
2. Implement the feature
3. Verify every AC
4. Handle every edge case
5. Pass every test
...without asking a single question.

If they would need to ask "but what if X happens?" — your spec is missing X.
