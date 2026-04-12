# Ferrari Knowledge System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform our framework into a self-improving system where every session makes the next one better — zero preventable bugs, zero stale knowledge, zero crumbs.

**Architecture:** 9 surgical changes across CLAUDE.md, rules, hooks, and workflow. No new tools, no new infrastructure — just markdown, shell scripts, and discipline. The compound effect comes from closing the feedback loop: Bug → Fix → Pattern → Rule → Prevention.

**Tech Stack:** Markdown (CLAUDE.md, rules), Bash hooks (Windows Git Bash), existing Claude Code infrastructure

**Karpathy Alignment:** Three-layer architecture (raw sources → wiki → schema) with real-time compilation (me) instead of batch AutoDream. Key addition: "file analyses back into wiki" + wiki-lint.

---

### Task 1: CLAUDE.md v2 — Pre-Edit Checklisten + Work Rhythm

**Files:**
- Modify: `CLAUDE.md` (append new sections after line 83)

**Step 1: Add Pre-Edit Checklists section**

Append to `CLAUDE.md`:

```markdown

## Pre-Edit Checks (PFLICHT — vor JEDER Datei-Aenderung pruefen)

### RPC / Migration (`supabase/migrations/*.sql`, jede `CREATE FUNCTION`)
- NULL-in-scalar: `COALESCE` auf Variable AUSSERHALB Subquery, NIE `(SELECT COALESCE(x,0) FROM t WHERE ...)`
- CHECK constraints: Column-Werte gegen `database.md` verifizieren
- RLS: neue Tabelle → ALLE Ops brauchen Policies (SELECT + INSERT + UPDATE + DELETE)
- Return-Shape: camelCase oder snake_case? Service-Cast MUSS matchen
- Holdings/Balance-Check: `NOT FOUND` oder `COALESCE(v_var, 0)`, NIE inline

### Service (`src/lib/services/*.ts`)
- Error-Handling: THROW bei Error, NIEMALS `return null` wenn UI "loading" interpretiert
- Return-Type: MUSS RPC-Response-Shape matchen (pruefen: was returned die RPC wirklich?)
- Nach Edit: `npx vitest run` auf zugehoeriges Test-File
- Consumer-Check: wer konsumiert den Return? Typ noch kompatibel?

### Component (`src/components/`, `src/features/`, `src/app/`)
- Mobile: passt in 393px (iPhone 16)?
- Loading-State: Skeleton statt conditional-hide (pattern: `$ Balance Pill`)
- Error-State: sichtbar, nicht silent
- Hooks vor Returns (React Rules)

### Vor JEDEM Commit
- `npx tsc --noEmit` (Pflicht)
- `npx vitest run [betroffene Test-Files]` (Pflicht)
- Diff reviewen: riecht was nach common-errors.md Pattern?
- Bug-Fix? → `common-errors.md` JETZT updaten, nicht spaeter

## Work Rhythm (PFLICHT — jeder Task folgt diesem Takt)

1. **VERSTEHEN** — Task lesen. Relevante Files lesen. LAUT sagen was ich vorhabe.
   Bei 3+ Files: `/impact` oder Explore Agent ERST.
2. **PLANEN** — Welche Files aendern sich? Welche Checks gelten?
   Explizit benennen: "Das ist ein Service-File → throw-not-swallow, return-type, vitest."
3. **IMPLEMENTIEREN** — Ein File nach dem anderen. Nach JEDEM File:
   → Checklist fuer diesen Dateityp pruefen
   → Service? vitest SOFORT. RPC? SQL-Verify SOFORT. Component? 393px mental-check.
4. **VERIFIZIEREN** — Vor Commit: tsc + vitest + Diff-Review gegen Patterns.
   Bug-Fix? → common-errors.md JETZT updaten.
5. **BEWEISEN** — Nicht "sollte passen". Screenshot, DB-Query, oder Test-Output.
   "Fertig" = BEWIESEN, nicht COMMITTED.
6. **AUFRAUMEN** — Tests gefixt? i18n DE+TR? Barrel-Exports? Memory aktuell?

## After Bug-Fix: Same-Session Knowledge Compilation (Karpathy-Regel)

Nach JEDEM Bug-Fix in derselben Session:
1. **Pattern** → common-errors.md sofort updaten (kein Draft, kein Pending)
2. **Analyse** → Bei komplexen Investigations: Wiki-Seite in `memory/semantisch/projekt/` erstellen
3. **cortex-index** → Neues Routing wenn der Bug eine neue Domain betrifft
4. **Session-Digest** → Am Session-Ende: Lektionen + Warnungen fuer morgen

## Agent-Delegation (Context-Management)

### Delegieren an Agents:
- Research (>3 Files lesen) → Explore Agent
- Impact-Analyse vor DB/RPC/Service → Impact Agent
- Code Review nach Implementation → Reviewer Agent (cto-review)
- Tests schreiben → test-writer Agent (Worktree)
- Visual QA → qa-visual Agent
- Context >500K + Verification noetig → Agent spawnen (frische Augen)

### IMMER selbst:
- Bug-Fixes (brauche vollen Problem-Context)
- Anil-Alignment (Gespraech, keine Delegation)
- Einzelne Files (<3)
- Geld/Security-Logik (zu kritisch)
```

**Step 2: Verify CLAUDE.md is under ~200 lines**

Run: `wc -l CLAUDE.md`
Expected: ~150-170 lines (original 83 + ~80 new). Under the 200-line effectiveness threshold.

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "feat(system): CLAUDE.md v2 — pre-edit checklists + work rhythm + agent delegation

Karpathy-aligned schema evolution: CLAUDE.md is the 'operating system' that
disciplines the LLM. Now includes mandatory pre-edit checklists per file type
(RPC: NULL-scalar, return shape; Service: throw-not-swallow, vitest; Component:
393px mobile, skeleton-not-hide), a 6-step work rhythm protocol, same-session
knowledge compilation rules, and an explicit agent delegation strategy for
context management. All content is in the system prompt and survives compaction."
```

---

### Task 2: common-errors.md — Add Yesterday's Patterns

**Files:**
- Modify: `.claude/rules/common-errors.md` (append new sections)

**Step 1: Add the 3 new patterns from 2026-04-11**

Append to `common-errors.md`:

```markdown

## PL/pgSQL NULL-in-Scalar (Session 2026-04-11 — CRITICAL Money Bug)
- `IF (SELECT COALESCE(x, 0) FROM t WHERE ...) < y` ist FALSCH wenn keine Row existiert
- Scalar-Subquery auf leeres Result-Set → NULL (nicht 0), weil COALESCE per-Zeile laeuft
- `NULL < y` = NULL = falsy in PL/pgSQL IF → Guard wird UEBERSPRUNGEN
- Richtig: `SELECT x INTO v_x FROM t WHERE ...; IF COALESCE(v_x, 0) < y THEN reject`
- Oder: `IF NOT FOUND THEN reject` (sicherstes Pattern, wie in `place_sell_order`)
- Betroffen: JEDE RPC die Holdings/Balance/Ownership checkt
- Audit-Signal: `grep 'SELECT COALESCE.*FROM.*WHERE' supabase/migrations/`

## Service Error-Swallowing (Session 2026-04-11 — Tickets Pop-In Bug)
- `if (error) { console.error(...); return null; }` → React Query cached null als SUCCESS
- Kein Retry, kein Error-State → UI zeigt Skeleton/Empty fuer 30s (staleTime)
- Besonders kritisch bei Auth-Race: RPC wirft `'Nicht authentifiziert'`, Service schluckt
- Richtig: `if (error) { logSupabaseError(...); throw new Error(error.message); }`
- React Query retried automatisch (3x exponential backoff) → nach ~1s ist Auth ready
- Audit-Signal: `grep -rn 'if (error).*return null' src/lib/services/`

## RPC Response camelCase/snake_case Mismatch (Session 2026-04-11 — Mystery Box)
- RPC `jsonb_build_object('rewardType', ...)` → camelCase Keys im Response
- Service castet als `data as { reward_type: ... }` → snake_case → ALLE Felder undefined
- TypeScript faengt das NICHT weil `as` ein unchecked assertion ist
- Richtig: Service-Cast MUSS die ECHTEN Keys der RPC matchen
- Check: `pg_get_functiondef()` lesen → Return-Shape identifizieren → Service-Cast vergleichen
- Audit-Signal: Neuer RPC deployed? → Service-Datei pruefen ob Cast die echten Keys nutzt
```

**Step 2: Commit**

```bash
git add .claude/rules/common-errors.md
git commit -m "docs(rules): 3 new error patterns from 2026-04-11 session

NULL-in-scalar (CRITICAL money bug in accept_offer/create_offer),
service error-swallowing (tickets pop-in: return null defeats React Query
retry), RPC camelCase/snake_case mismatch (mystery box reward display).
Each pattern includes the root cause, the correct fix, and an audit signal
(grep command to find other instances). Same-session extraction per the
Ferrari knowledge system — no draft/pending pipeline, straight to rules."
```

---

### Task 3: Session-Digest + Morning-Briefing Enhancement

**Files:**
- Create: `memory/session-digest.md` (template for first run)
- Modify: `.claude/hooks/morning-briefing.sh` (read and inject digest)

**Step 1: Create session-digest.md template**

```markdown
# Session Digest

> Auto-updated at session end. Read by morning-briefing at session start.
> Captures what the NEXT session needs to know.

## Letzte Session: [DATUM]

### Neue Patterns (in common-errors.md)
- (none yet)

### Offene Warnungen
- (none yet)

### Anil Feedback
- (none yet)

### Naechste Prioritaet
- Market Polish: Watchlist-Move + Marktplatz-Tabs
```

**Step 2: Enhance morning-briefing.sh to inject digest**

Add BEFORE the final `cat "$BRIEFING"` line in `morning-briefing.sh`:

```bash
# Session Digest from last session (learnings + warnings)
if [ -f "memory/session-digest.md" ]; then
  echo ""
  echo "## Letzte Session Digest"
  # Extract only the content sections, skip the header
  sed -n '/^## Letzte Session/,$ p' "memory/session-digest.md" | head -30
  echo ""
fi
```

**Step 3: Verify hook runs correctly**

Run: `bash .claude/hooks/morning-briefing.sh`
Expected: Output includes "## Letzte Session Digest" section with template content.

**Step 4: Commit**

```bash
git add memory/session-digest.md .claude/hooks/morning-briefing.sh
git commit -m "feat(system): session-digest + morning-briefing injection

New file memory/session-digest.md captures session-end learnings (new
patterns, warnings, Anil feedback, next priorities). Morning-briefing
hook now reads and injects this digest at session start so inter-session
knowledge gap is closed. Part of the Ferrari feedback loop."
```

---

### Task 4: Hook A — Test-Reminder after Service Edit

**Files:**
- Create: `.claude/hooks/test-reminder.sh`
- Modify: `.claude/settings.json` (add to PostToolUse hooks)

**Step 1: Create test-reminder.sh**

```bash
#!/bin/bash
# test-reminder.sh — PostToolUse(Edit|Write) hook
# Reminds to run vitest when editing service or hook files.
# Reads the edited file path from $CLAUDE_FILE_PATHS (space-separated).

# Parse file paths from environment or stdin
FILE_PATHS="${CLAUDE_FILE_PATHS:-}"

for fp in $FILE_PATHS; do
  case "$fp" in
    src/lib/services/*.ts|src/features/*/services/*.ts|src/features/*/hooks/*.ts|src/app/*/hooks/*.ts)
      # Find corresponding test file
      DIR=$(dirname "$fp")
      BASE=$(basename "$fp" .ts)
      TEST_FILE=""
      if [ -f "$DIR/__tests__/$BASE.test.ts" ]; then
        TEST_FILE="$DIR/__tests__/$BASE.test.ts"
      elif [ -f "$DIR/__tests__/$BASE.test.tsx" ]; then
        TEST_FILE="$DIR/__tests__/$BASE.test.tsx"
      fi
      if [ -n "$TEST_FILE" ]; then
        echo "SERVICE EDITED: $fp → run: npx vitest run $TEST_FILE"
      else
        echo "SERVICE EDITED: $fp → kein Test-File gefunden. Manuell pruefen."
      fi
      ;;
    supabase/migrations/*.sql)
      echo "MIGRATION EDITED: $fp → RPC-Return-Shape + NULL-scalar Check + RLS Policies pruefen"
      ;;
  esac
done

exit 0
```

**Step 2: Add to settings.json PostToolUse hooks**

Add `test-reminder.sh` to the existing `PostToolUse` → `Edit|Write` hooks array.

**Step 3: Test the hook**

Run: `CLAUDE_FILE_PATHS="src/lib/services/tickets.ts" bash .claude/hooks/test-reminder.sh`
Expected: `SERVICE EDITED: src/lib/services/tickets.ts → run: npx vitest run ...`

**Step 4: Commit**

```bash
git add .claude/hooks/test-reminder.sh .claude/settings.json
git commit -m "feat(hooks): test-reminder after service/migration edits

PostToolUse hook that fires after Edit|Write on service files or
migrations. Surfaces the corresponding test file path and a reminder
to run vitest. For migrations, reminds about NULL-scalar check and
RLS policies. Backup enforcement for the Work Rhythm — catches the
case where I forget to run tests after a service change."
```

---

### Task 5: Hook B — Pattern-Check at Session End

**Files:**
- Create: `.claude/hooks/pattern-check.sh`
- Modify: `.claude/settings.json` (add to Stop hooks)

**Step 1: Create pattern-check.sh**

```bash
#!/bin/bash
# pattern-check.sh — Stop hook
# Warns if fix() commits exist but common-errors.md wasn't updated.

cd C:/bescout-app || exit 0

# Count fix commits in last 4 hours
FIX_COMMITS=$(git log --since="4 hours ago" --oneline 2>/dev/null | grep -c "^[a-f0-9]* fix(" || true)

if [ "$FIX_COMMITS" -gt 0 ]; then
  # Check if common-errors.md was modified
  ERRORS_CHANGED=$(git diff --name-only HEAD~"$FIX_COMMITS" HEAD 2>/dev/null | grep -c "common-errors.md" || true)
  
  if [ "$ERRORS_CHANGED" -eq 0 ]; then
    echo ""
    echo "PATTERN-CHECK: $FIX_COMMITS fix() Commits aber common-errors.md NICHT aktualisiert."
    echo "Hast du die neuen Error-Patterns eingetragen? (Ferrari-Regel: Same-Session Extraction)"
    echo ""
  fi
fi

# Check if session-digest.md was updated
DIGEST_AGE=$(find memory/session-digest.md -mmin +240 2>/dev/null | wc -l)
if [ "$DIGEST_AGE" -gt 0 ] 2>/dev/null; then
  echo "SESSION-DIGEST: memory/session-digest.md ist aelter als 4h. Bitte aktualisieren."
fi

exit 0
```

**Step 2: Add to settings.json Stop hooks**

Add `pattern-check.sh` to the existing `Stop` hooks array.

**Step 3: Commit**

```bash
git add .claude/hooks/pattern-check.sh .claude/settings.json
git commit -m "feat(hooks): pattern-check at session end

Stop hook that warns if fix() commits exist in the session but
common-errors.md wasn't updated (missing same-session knowledge
extraction). Also warns if session-digest.md is stale. Part of the
Ferrari feedback loop — ensures bug-fix knowledge flows into rules."
```

---

### Task 6: workflow-reference.md Update

**Files:**
- Modify: `.claude/rules/workflow-reference.md`

**Step 1: Add Ferrari sections to workflow-reference.md**

Add after the existing "Verification" table:

```markdown
### After Bug-Fix: Knowledge Compilation (Karpathy-Pattern)
1. **Pattern → common-errors.md** — SOFORT in derselben Session, kein Draft
2. **Analyse → Wiki-Seite** — Bei komplexen Investigations: `memory/semantisch/projekt/[topic].md`
3. **cortex-index → Routing** — Neues Routing wenn Bug eine neue Domain betrifft
4. **Session-Digest** — Am Ende: Lektionen + Warnungen fuer morgen schreiben

### Context-Management Strategie
- Research (>3 Files) → Explore Agent (schuetzt meinen Primary Context)
- Nach komplexer Implementation → Reviewer Agent mit frischem Context
- Impact-Check vor DB/RPC/Service → Impact Agent
- Context >500K → Verification an Agent delegieren, NICHT selbst
- Gute Analysen → als Wiki-Seite filen, nicht in Chat-History sterben lassen
```

**Step 2: Commit**

```bash
git add .claude/rules/workflow-reference.md
git commit -m "docs(rules): Ferrari workflow additions — knowledge compilation + context management

Adds two new sections to workflow-reference.md: post-bug-fix knowledge
compilation (Karpathy-pattern: pattern → rules, analysis → wiki page,
cortex → routing, session → digest) and context management strategy
(when to delegate to agents for fresh-context verification)."
```

---

### Task 7: AutoDream Trigger Reduction

**Files:**
- Modify: `.claude/hooks/quality-gate-v2.sh` (counter check)

**Step 1: Review current trigger logic**

The current `quality-gate-v2.sh` only increments the counter. The trigger check happens in the `morning-briefing.sh` output or the SessionStart hook system-reminder. Find where the "AutoDream faellig" threshold is.

**Step 2: Update threshold from 50 to 20**

Search for `50` or `58` in the startup injection and change to `20`.

**Step 3: Commit**

```bash
git add [affected file]
git commit -m "feat(system): lower AutoDream trigger from 50 to 20 sessions

AutoDream (wiki consolidation) was falling behind at 50-session trigger.
With 76 sessions since last run, episodic data piled up faster than
compilation. Lowering to 20 sessions keeps the wiki fresh. AutoDream
remains as cleanup service — real-time knowledge compilation now happens
during sessions via the same-session extraction rule in CLAUDE.md v2."
```

---

### Task 8: Wiki-Lint Enhancement for AutoDream

**Files:**
- Create: `memory/wiki-lint-report.md` (output template)

**Step 1: Create wiki-lint checklist**

This is a PROMPT file that AutoDream reads when running its consolidation pass. It tells AutoDream what to check.

```markdown
# Wiki-Lint Checklist (for AutoDream)

> AutoDream runs this checklist after consolidating retros.
> Output: update this file with findings.

## Checks

### Contradictions
- Are there pages that claim opposite things about the same topic?
- Does session-handoff.md contradict current-sprint.md?
- Do feature specs match the actual code state?

### Stale Claims
- Pages referencing features/files that no longer exist?
- Status claims ("in progress") that are actually done or abandoned?

### Orphan Pages
- Files in memory/ with no inbound references from cortex-index or wiki-index?

### Missing Concepts
- Topics mentioned frequently in retros/handoffs that lack their own page?
- New domains discovered (e.g., "offer system", "mystery box economy") without dedicated semantic pages?

### Cross-Reference Gaps
- cortex-index routing entries that point to deleted/moved files?
- wiki-index entries with wrong line counts or descriptions?

## Last Run
- Date: (filled by AutoDream)
- Findings: (filled by AutoDream)
- Actions Taken: (filled by AutoDream)
```

**Step 2: Commit**

```bash
git add memory/wiki-lint-report.md
git commit -m "feat(system): wiki-lint checklist for AutoDream health-checks

Karpathy's lint operation: contradictions, stale claims, orphan pages,
missing concepts, cross-reference gaps. AutoDream reads this checklist
during consolidation and fills in findings. Humans review findings at
session start if flagged."
```

---

### Task 9: Final Integration Test

**Step 1: Verify CLAUDE.md loads correctly**

Run: `wc -l CLAUDE.md` → should be ~160-170 lines (under 200 threshold)

**Step 2: Verify hooks parse correctly**

Run: `bash .claude/hooks/test-reminder.sh` with test paths
Run: `bash .claude/hooks/pattern-check.sh`
Run: `bash .claude/hooks/morning-briefing.sh | grep -c "Session Digest"` → should be ≥1

**Step 3: Verify tsc clean**

Run: `npx tsc --noEmit`

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(system): Ferrari Knowledge System — complete installation

9-part system for zero-preventable-bugs workflow:
1. CLAUDE.md v2: pre-edit checklists + work rhythm + agent delegation
2. common-errors.md: 3 new patterns from 2026-04-11 (NULL-scalar, error-swallow, camelCase)
3. session-digest.md + morning-briefing injection
4. Hook: test-reminder after service/migration edits
5. Hook: pattern-check at session end (fix commits without error updates)
6. workflow-reference.md: knowledge compilation + context management
7. AutoDream trigger: 50 → 20 sessions
8. wiki-lint-report.md: contradiction/orphan/gap checklist for AutoDream
9. Integration verification

Karpathy-aligned: schema (CLAUDE.md) enforces discipline, real-time
compilation (same-session pattern extraction) replaces batch pipeline,
wiki-lint adds health-checks. Compound interest: every bug-fix makes
the system smarter, every session feeds the next."
```

---

## Execution Notes

- **No new dependencies.** Everything is markdown + bash.
- **No breaking changes.** All additions are additive to existing files.
- **Hooks are non-blocking.** They output warnings, never block execution.
- **CLAUDE.md stays under 200 lines.** Above that, compliance degrades.
- **All hooks are Windows Git Bash compatible.** No `grep -P`, no GNU-only flags.
- **Settings.json must be valid JSON after edits.** Parse-test before committing.
