# Jarvis Cortex v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Jarvis from a stateless tool into a cognitive co-founder with layered memory, system awareness, intelligent context steering, self-improvement, and shared agent brain.

**Architecture:** 5-layer Cortex: Memory (episodic/semantic/procedural), Senses (system awareness hooks + scheduled agents), Prefrontal Cortex (context routing + compaction shield), Learning Loop (capture → draft → human gate → promote), Agent Telepathy (shared brain bus + auto-context-assembly).

**Tech Stack:** Bash hooks, Markdown files, Claude Code agents/skills, `/schedule` for cron, existing MCP servers (Supabase, Playwright).

**Design Doc:** `docs/plans/2026-04-02-jarvis-cortex-design.md`

---

## Phase 1: Gehirn (Memory Restructuring)

### Task 1.1: Create Cortex Directory Structure

**Files:**
- Create: `memory/episodisch/sessions/` (dir)
- Create: `memory/episodisch/entscheidungen/` (dir)
- Create: `memory/episodisch/fehler/` (dir)
- Create: `memory/semantisch/projekt/` (dir)
- Create: `memory/semantisch/personen/` (dir)
- Create: `memory/semantisch/systeme/` (dir)
- Create: `memory/semantisch/sprint/` (dir)
- Create: `memory/senses/` (dir)

**Step 1: Create all directories**

```bash
mkdir -p memory/episodisch/{sessions,entscheidungen,fehler}
mkdir -p memory/semantisch/{projekt,personen,systeme,sprint}
mkdir -p memory/senses
```

**Step 2: Add .gitkeep to empty dirs**

```bash
for d in memory/episodisch/{sessions,entscheidungen,fehler} memory/semantisch/{projekt,personen,systeme,sprint} memory/senses; do
  touch "$d/.gitkeep"
done
```

**Step 3: Commit**

```bash
git add memory/
git commit -m "chore(cortex): create layered memory directory structure"
```

---

### Task 1.2: Migrate Existing Memory → Semantisch

Existing flat files get categorized into semantic memory.

**Files:**
- Move: `memory/current-sprint.md` → `memory/semantisch/sprint/current.md`
- Move: `memory/patterns.md` → `memory/semantisch/projekt/patterns.md`
- Move: `memory/errors.md` → `memory/episodisch/fehler/errors.md`
- Move: `memory/project_missing_revenue_streams.md` → `memory/semantisch/projekt/revenue-streams.md`
- Move: `memory/research-agent-systems-best-practices.md` → `memory/semantisch/projekt/agent-research.md`
- Move: `memory/deps/cross-domain-map.md` → `memory/semantisch/projekt/cross-domain-map.md`
- Move: `memory/sessions/retro-*.md` → `memory/episodisch/sessions/`
- Move: `memory/metrics/sessions.jsonl` → `memory/episodisch/metriken/sessions.jsonl`
- Keep in place: `memory/features/` (already organized)
- Keep in place: `memory/learnings/` (already organized)
- Keep in place: `memory/journals/` → rename to `memory/episodisch/journals/`

**Step 1: Move files**

```bash
# Sprint
mv memory/current-sprint.md memory/semantisch/sprint/current.md

# Projekt-Wissen
mv memory/patterns.md memory/semantisch/projekt/patterns.md
mv memory/project_missing_revenue_streams.md memory/semantisch/projekt/revenue-streams.md
mv memory/research-agent-systems-best-practices.md memory/semantisch/projekt/agent-research.md
mv memory/deps/cross-domain-map.md memory/semantisch/projekt/cross-domain-map.md

# Episodisch
mv memory/errors.md memory/episodisch/fehler/errors.md
mkdir -p memory/episodisch/metriken
mv memory/metrics/sessions.jsonl memory/episodisch/metriken/sessions.jsonl
mv memory/journals memory/episodisch/journals

# Sessions (retros already in memory/sessions/)
mv memory/sessions/* memory/episodisch/sessions/ 2>/dev/null
rmdir memory/sessions memory/metrics memory/deps 2>/dev/null
```

**Step 2: Move existing user/feedback/decision/project memory files**

```bash
# All feedback_*.md → keep flat in memory/ for now (auto-memory system)
# All decision_*.md → keep flat in memory/ for now
# These are managed by the auto-memory system and should not be reorganized yet
```

**Step 3: Create personen/anil.md from existing user prefs**

Extract from MEMORY.md the "Anil — Arbeitsweise" section into its own file:

```markdown
# Anil — Founder & CEO

## Arbeitsweise
- Direkt, pragmatisch, keine Emojis
- "mach das" = weitermachen ohne Rueckfrage
- Liebt parallele Ausfuehrung (Agents)
- DB-first Workflow: Migration → Service → Query Hook → UI → Build
- Funktionalitaet > Perfektion, Pilot-Launch ist Prioritaet

## Kommunikation
- Kurze Antworten bevorzugt
- "j" / "k" = Zustimmung
- "tun" = ausfuehren ohne weitere Fragen
- Speed-Mode nur wenn Anil explizit "schnell" sagt
```

**Step 4: Update all references to moved files**

Grep for old paths in hooks, rules, CLAUDE.md and update:
- `memory/current-sprint.md` → `memory/semantisch/sprint/current.md`
- `memory/errors.md` → `memory/episodisch/fehler/errors.md`
- `memory/metrics/sessions.jsonl` → `memory/episodisch/metriken/sessions.jsonl`
- `memory/sessions/` → `memory/episodisch/sessions/`

Files to update:
- `.claude/hooks/inject-learnings.sh` (references `memory/sessions/retro-*.md`, `memory/errors.md`)
- `.claude/hooks/session-retro.sh` (references `memory/sessions/`, `memory/metrics/sessions.jsonl`)
- `.claude/hooks/inject-context-on-compact.sh` (references `memory/current-sprint.md`)
- `.claude/rules/workflow.md` (references `current-sprint.md`, `session-handoff.md`)
- `CLAUDE.md` (references `current-sprint.md`)

**Step 5: Verify all hooks still work**

```bash
bash .claude/hooks/inject-learnings.sh
bash .claude/hooks/inject-context-on-compact.sh
```

**Step 6: Commit**

```bash
git add -A
git commit -m "chore(cortex): migrate flat memory files into layered structure"
```

---

### Task 1.3: Create Cortex-Index

**Files:**
- Create: `memory/cortex-index.md`
- Modify: `C:\Users\Anil\.claude\projects\C--bescout-app\memory\MEMORY.md` (slim down to pointer)

**Step 1: Write cortex-index.md**

```markdown
# Cortex Index

> Jarvis Routing-Tabelle. Sagt WO Wissen liegt, nicht WAS es ist.
> Geladen bei Session-Start. Jarvis laedt relevante Files on-demand.

## Immer aktiv (bei JEDEM Session-Start lesen)
- `memory/semantisch/sprint/current.md` — Was ist gerade dran
- `memory/semantisch/personen/anil.md` — Wie arbeitet der Founder
- `memory/session-handoff.md` — Uebergabe aus letzter Session
- `.claude/rules/common-errors.md` — Top-Fehler (auto-loaded by rules)

## Nach Domain laden
| Wenn Task betrifft... | Dann lade... |
|----------------------|--------------|
| Fantasy | `memory/features/fantasy.md` + `memory/semantisch/projekt/cross-domain-map.md` |
| Trading / Wallet / IPO | `memory/semantisch/projekt/patterns.md` (Trading-Sektion) |
| UI / Components | CLAUDE.md Component Registry (bereits geladen) |
| DB / Migration / RPC | `.claude/rules/database.md` (auto-loaded by path) |
| Neues Feature | `memory/semantisch/projekt/patterns.md` + Business-Regeln aus rules |
| Bug-Fix | `memory/episodisch/fehler/errors.md` + `memory/senses/health.md` |
| Agent / Workflow | `memory/semantisch/projekt/agent-research.md` |
| Performance | `memory/semantisch/projekt/patterns.md` (Performance-Sektion) |

## On-Demand (nur wenn explizit gebraucht)
| Ressource | Pfad |
|-----------|------|
| Session-Journale | `memory/episodisch/sessions/` |
| Entscheidungen (ADRs) | `memory/episodisch/entscheidungen/` |
| Feature-Specs | `memory/features/` |
| Learning-Drafts | `memory/learnings/drafts/` |
| System-Status | `memory/senses/morning-briefing.md` |
| Code-Smells | `memory/senses/code-smells.md` |
| Metriken | `memory/episodisch/metriken/sessions.jsonl` |
```

**Step 2: Slim down MEMORY.md to pointer**

Replace the 200-line MEMORY.md with a slim pointer (~30 lines):

```markdown
# Jarvis Cortex — Memory Router

> Dieses File ist ein Pointer. Das eigentliche Wissen liegt in der Cortex-Struktur.
> Siehe: `memory/cortex-index.md` fuer die vollstaendige Routing-Tabelle.

## Quick Access
- Sprint: `memory/semantisch/sprint/current.md`
- Handoff: `memory/session-handoff.md`
- Fehler: `memory/episodisch/fehler/errors.md`
- Patterns: `memory/semantisch/projekt/patterns.md`
- Features: `memory/features/`
- Learnings: `memory/learnings/drafts/`

## Cortex-Architektur
- Episodisch (was passierte): `memory/episodisch/`
- Semantisch (was weiss ich): `memory/semantisch/`
- Prozedural (wie mache ich es): `.claude/skills/` + `.claude/rules/`
- Sinne (was sehe ich): `memory/senses/`
- Working-Memory (aktive Session): `memory/working-memory.md`

## Auto-Memory Files (managed by Claude Code)
Feedback, decision, project, reference files im memory/ Root
werden vom Auto-Memory-System verwaltet. Nicht manuell verschieben.
```

**Step 3: Commit**

```bash
git add memory/cortex-index.md
git commit -m "chore(cortex): add cortex-index routing table, slim down MEMORY.md"
```

---

### Task 1.4: Create Working-Memory Template

**Files:**
- Create: `memory/working-memory.md`

**Step 1: Write template**

```markdown
# Working Memory — Session [N]

> Blackboard fuer die aktuelle Session. Wird bei Session-Ende geloescht.
> Agents lesen mit. Nur Jarvis schreibt.

## Aktiver Task
[wird zur Laufzeit gefuellt]

## Geaenderte Files
[wird von track-file-changes.sh befuellt]

## Entscheidungen
[wird zur Laufzeit gefuellt]

## Fuer Agents
[Kontext den dispatched Agents brauchen]

## Blocker
[wird zur Laufzeit gefuellt]
```

**Step 2: Add to .gitignore** (Working Memory is ephemeral)

```bash
echo "memory/working-memory.md" >> .gitignore
```

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore(cortex): add working-memory template to gitignore"
```

---

### Task 1.5: Smoke Test Phase 1

**Step 1: Verify directory structure**

```bash
find memory/ -type d | sort
# Expected: episodisch/, semantisch/, senses/, learnings/, features/, episodisch/journals/ etc.
```

**Step 2: Verify all hooks work with new paths**

```bash
bash .claude/hooks/inject-learnings.sh 2>&1 | head -20
bash .claude/hooks/inject-context-on-compact.sh 2>&1 | head -20
```

**Step 3: Verify cortex-index.md is readable and all referenced files exist**

```bash
grep -oP '`[^`]+\.md`' memory/cortex-index.md | tr -d '`' | while read f; do
  [ -f "$f" ] && echo "OK: $f" || echo "MISSING: $f"
done
```

**Step 4: tsc still clean**

```bash
npx tsc --noEmit
```

---

## Phase 2: Sinne (System Awareness)

### Task 2.1: Morning Briefing Generator

**Files:**
- Create: `.claude/hooks/morning-briefing.sh`

**Step 1: Write the briefing generator script**

```bash
#!/bin/bash
# morning-briefing.sh — Generates system status snapshot
# Can be run by SessionStart hook or scheduled agent

cd C:/bescout-app || exit 0

BRIEFING="memory/senses/morning-briefing.md"
NOW=$(date +"%Y-%m-%d %H:%M")

# Find last session timestamp from handoff
LAST_SESSION=$(grep -m1 "Letzte Session:" memory/session-handoff.md 2>/dev/null | head -1)

{
  echo "# System-Status (auto-generated $NOW)"
  echo ""

  # Git
  echo "## Git (seit letzter Session)"
  COMMITS=$(git log --since="24 hours ago" --oneline 2>/dev/null | head -10)
  if [ -n "$COMMITS" ]; then
    echo "$COMMITS"
  else
    echo "- Keine neuen Commits"
  fi
  echo ""

  UNCOMMITTED=$(git status --porcelain 2>/dev/null | head -10)
  if [ -n "$UNCOMMITTED" ]; then
    echo "## Uncommitted Changes"
    echo '```'
    echo "$UNCOMMITTED"
    echo '```'
    echo ""
  fi

  # Tests (quick check)
  echo "## Build Health"
  TSC_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo 0)
  echo "- tsc: $TSC_ERRORS errors"
  echo ""

  # Supabase (migration count from local files)
  MIGRATION_COUNT=$(ls supabase/migrations/*.sql 2>/dev/null | wc -l)
  LATEST_MIGRATION=$(ls -t supabase/migrations/*.sql 2>/dev/null | head -1 | xargs basename 2>/dev/null)
  echo "## Supabase"
  echo "- Migrations: $MIGRATION_COUNT, letzte: ${LATEST_MIGRATION:-unbekannt}"
  echo ""

  # Sprint
  echo "## Sprint-Prioritaet"
  if [ -f "memory/semantisch/sprint/current.md" ]; then
    grep -A 3 "## Naechste" "memory/semantisch/sprint/current.md" 2>/dev/null | head -5
  fi
  echo ""

  # Learnings pending
  DRAFT_COUNT=$(ls memory/learnings/drafts/*.md 2>/dev/null | wc -l)
  if [ "$DRAFT_COUNT" -gt 0 ]; then
    echo "## Pending Learnings: $DRAFT_COUNT Drafts"
    ls memory/learnings/drafts/*.md 2>/dev/null | xargs -I{} basename {} | sed 's/^/- /'
    echo ""
  fi

} > "$BRIEFING"

echo "Morning briefing generated: $BRIEFING"
```

**Step 2: Make executable**

```bash
chmod +x .claude/hooks/morning-briefing.sh
```

**Step 3: Test it**

```bash
bash .claude/hooks/morning-briefing.sh
cat memory/senses/morning-briefing.md
```

**Step 4: Commit**

```bash
git add .claude/hooks/morning-briefing.sh
git commit -m "feat(cortex): add morning briefing generator for system awareness"
```

---

### Task 2.2: Extend SessionStart Hook

**Files:**
- Modify: `.claude/hooks/inject-learnings.sh`
- Modify: `.claude/settings.json` (add morning-briefing to SessionStart)

**Step 1: Add morning-briefing to SessionStart hooks in settings.json**

Add to the SessionStart hooks array:

```json
{
  "type": "command",
  "command": "bash C:/bescout-app/.claude/hooks/morning-briefing.sh",
  "timeout": 30000
}
```

**Step 2: Update inject-learnings.sh to output briefing**

Add at the TOP of inject-learnings.sh (before learnings):

```bash
# 0. Morning briefing (system status)
if [ -f "memory/senses/morning-briefing.md" ]; then
  echo "$(cat memory/senses/morning-briefing.md)"
  echo ""
fi
```

**Step 3: Update inject-learnings.sh paths for new structure**

- `memory/sessions/retro-*.md` → `memory/episodisch/sessions/retro-*.md`
- `memory/errors.md` → `memory/episodisch/fehler/errors.md`

**Step 4: Test SessionStart flow**

```bash
bash .claude/hooks/morning-briefing.sh && bash .claude/hooks/inject-learnings.sh
```

**Step 5: Commit**

```bash
git add .claude/hooks/inject-learnings.sh .claude/settings.json
git commit -m "feat(cortex): wire morning briefing into SessionStart hook chain"
```

---

### Task 2.3: Upgrade Correction Capture

**Files:**
- Modify: `.claude/hooks/capture-correction.sh`

**Step 1: Fix stdin reading (same grep -oP bug as other hooks)**

The hook uses `CLAUDE_USER_PROMPT` env var. Verify this works on Windows. If not, switch to stdin reading like other hooks.

**Step 2: Add confidence estimation**

```bash
# After capturing the correction, estimate confidence
if echo "$INPUT" | grep -iE "(immer|nie|jedes mal|always|never)" > /dev/null 2>&1; then
  CONFIDENCE="high"
elif echo "$INPUT" | grep -iE "(vielleicht|maybe|probier|try)" > /dev/null 2>&1; then
  CONFIDENCE="low"
else
  CONFIDENCE="medium"
fi

echo "{\"ts\":\"$TIMESTAMP\",\"type\":\"correction\",\"confidence\":\"$CONFIDENCE\",\"text\":\"$ESCAPED\"}" >> "$QUEUE"
```

**Step 3: Test**

```bash
echo "nein, nimm sed statt grep" | CLAUDE_USER_PROMPT="nein, nimm sed statt grep" bash .claude/hooks/capture-correction.sh
cat .claude/learnings-queue.jsonl | tail -1
```

**Step 4: Commit**

```bash
git add .claude/hooks/capture-correction.sh
git commit -m "feat(cortex): upgrade correction capture with confidence levels"
```

---

### Task 2.4: Smoke Test Phase 2

**Step 1: Run full SessionStart chain**

```bash
bash .claude/hooks/morning-briefing.sh && bash .claude/hooks/inject-learnings.sh
```

Verify output contains:
- System-Status section
- Recent errors
- AutoDream counter
- Learning drafts count

**Step 2: Verify morning-briefing.md is fresh**

```bash
head -1 memory/senses/morning-briefing.md
# Should show today's date
```

**Step 3: Verify correction capture works**

```bash
CLAUDE_USER_PROMPT="nein, mach das anders" bash .claude/hooks/capture-correction.sh
tail -1 .claude/learnings-queue.jsonl
# Should show JSON with confidence
```

---

## Phase 3: Context Steering

### Task 3.1: Upgrade Compaction Shield

**Files:**
- Modify: `.claude/hooks/inject-context-on-compact.sh`

**Step 1: Rewrite to extract working memory**

```bash
#!/bin/bash
# inject-context-on-compact.sh — Write working memory before compaction
# Captures everything needed to resume after context loss

cd "C:/bescout-app" || exit 0

WORKING_MEM="memory/working-memory.md"
SESSION_FILES=".claude/session-files.txt"
NOW=$(date +"%Y-%m-%d %H:%M")

{
  echo "# Working Memory (pre-compaction $NOW)"
  echo ""

  # 1. Sprint status
  echo "## Sprint"
  if [ -f "memory/semantisch/sprint/current.md" ]; then
    head -20 "memory/semantisch/sprint/current.md"
  fi
  echo ""

  # 2. Session handoff
  echo "## Handoff"
  if [ -f "memory/session-handoff.md" ]; then
    cat "memory/session-handoff.md"
  fi
  echo ""

  # 3. Files changed this session
  echo "## Files Changed This Session"
  if [ -f "$SESSION_FILES" ]; then
    sort -u "$SESSION_FILES"
  else
    echo "- Keine tracked"
  fi
  echo ""

  # 4. Recent git state
  echo "## Git State"
  git status --porcelain 2>/dev/null | head -15
  echo ""
  echo "Last 3 commits:"
  git log --oneline -3 2>/dev/null
  echo ""

  # 5. Build state
  echo "## Build State"
  TSC_ERRORS=$(npx tsc --noEmit 2>&1 | grep -c "error TS" || echo 0)
  echo "- tsc errors: $TSC_ERRORS"

} > "$WORKING_MEM"

# Also output to stdout for Claude's context
echo "=== COMPACTION SHIELD: Working Memory saved ==="
cat "$WORKING_MEM"
echo "=== END COMPACTION SHIELD ==="
```

**Step 2: Test**

```bash
bash .claude/hooks/inject-context-on-compact.sh
cat memory/working-memory.md
```

**Step 3: Commit**

```bash
git add .claude/hooks/inject-context-on-compact.sh
git commit -m "feat(cortex): upgrade compaction shield with full working memory extraction"
```

---

### Task 3.2: Add Cortex-Index to CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Replace Memory section in CLAUDE.md**

Replace the existing `## Memory → memory/` section with:

```markdown
## Cortex (Jarvis Brain) → memory/
- **cortex-index.md**: Routing-Tabelle — sagt WO Wissen liegt, Jarvis laedt on-demand
- **working-memory.md**: Session-Blackboard (ephemeral, nicht committet)
- **Episodisch** (memory/episodisch/): Sessions, Fehler, Entscheidungen, Metriken
- **Semantisch** (memory/semantisch/): Projekt, Personen, Systeme, Sprint
- **Prozedural**: .claude/skills/ + .claude/rules/ (auto-loaded)
- **Sinne** (memory/senses/): Morning Briefing, Health, Code Smells
- **Learnings** (memory/learnings/drafts/): Pending human review
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "chore(cortex): update CLAUDE.md to reference cortex architecture"
```

---

### Task 3.3: Smoke Test Phase 3

**Step 1: Simulate compaction**

```bash
bash .claude/hooks/inject-context-on-compact.sh
cat memory/working-memory.md | wc -l
# Should have 30-50 lines of critical context
```

**Step 2: Verify cortex-index is findable**

```bash
cat memory/cortex-index.md | head -5
# Should show "Cortex Index" header
```

**Step 3: Verify CLAUDE.md references are correct**

```bash
grep "cortex-index" CLAUDE.md
# Should find the reference
```

---

## Phase 4: Lern-Loop

### Task 4.1: Upgrade AutoDream Agent

**Files:**
- Modify: `.claude/agents/autodream.md`

**Step 1: Rewrite autodream agent definition**

The AutoDream agent should now:
1. Read last 5 session retros from `memory/episodisch/sessions/`
2. Extract patterns, repeated errors, decisions
3. Write SEMANTIC summaries into `memory/semantisch/projekt/` (as drafts)
4. Archive old sessions (>30 days) into `memory/episodisch/sessions/archive/`
5. Keep `memory/cortex-index.md` under 60 lines
6. Report what was consolidated

Update the agent definition to include these instructions.

**Step 2: Test by running AutoDream manually**

```bash
# Dispatch autodream agent and verify it produces output
```

**Step 3: Commit**

```bash
git add .claude/agents/autodream.md
git commit -m "feat(cortex): upgrade AutoDream agent for episodic → semantic consolidation"
```

---

### Task 4.2: Upgrade /reflect Skill

**Files:**
- Modify: `.claude/skills/reflect/SKILL.md` (or equivalent)

**Step 1: Update reflect to show evidence**

The reflect skill should:
1. Read `memory/learnings/drafts/` for pending drafts
2. Read `.claude/learnings-queue.jsonl` for captured corrections
3. For each item: show the EVIDENCE (session number, file, output)
4. Present to user for approval: PROMOTE / EDIT / REJECT
5. Promoted → write to appropriate target (common-errors.md, Skill LEARNINGS.md)
6. Rejected → delete the draft

**Step 2: Commit**

```bash
git add .claude/skills/reflect/
git commit -m "feat(cortex): upgrade reflect skill with evidence-based review"
```

---

### Task 4.3: Smoke Test Phase 4

**Step 1: Verify drafts exist and are readable**

```bash
ls memory/learnings/drafts/
cat memory/learnings/drafts/2026-04-02-smoke-test-hooks-grep.md
```

**Step 2: Verify correction queue**

```bash
cat .claude/learnings-queue.jsonl 2>/dev/null | wc -l
```

**Step 3: Run AutoDream manually and verify output**

Dispatch the autodream agent and check it produces a consolidation report.

---

## Phase 5: Agent-Telepathie

### Task 5.1: Rewrite SHARED-PREFIX v2

**Files:**
- Modify: `.claude/agents/SHARED-PREFIX.md`

**Step 1: Add Cortex-aware Phase 0**

Replace the current Phase 0 with:

```markdown
## Phase 0: GEHIRN LADEN (VOR der ersten Zeile Code)

### Step 0: Cortex-Zugang
1. Lies: `memory/cortex-index.md` (Routing-Tabelle)
2. Lies: `memory/semantisch/sprint/current.md` (Sprint-Status)
3. Lies: `memory/senses/morning-briefing.md` (System-Status) — wenn vorhanden
4. Lies: `memory/working-memory.md` (Blackboard) — wenn vorhanden

### Step 0b: Domain-Wissen laden
Basierend auf deinem Task, konsultiere den Cortex-Index:
- Fantasy-Task → lade `memory/features/fantasy.md`
- Trading-Task → lade Patterns (Trading-Sektion)
- UI-Task → Component Registry aus CLAUDE.md reicht
- Bug-Fix → lade `memory/episodisch/fehler/errors.md`

### Step 1: Load Skill (wie bisher)
Lies: Dein Domain-Skill aus `.claude/skills/` oder main repo Pfad

### Step 1b: Load Learnings (wie bisher)
Lies: Dein Skill-LEARNINGS.md
```

**Step 2: Add Blackboard write-back instruction**

```markdown
### NACH der Arbeit: Blackboard updaten
Wenn du etwas gelernt oder entschieden hast das andere Agents betrifft:
- Schreibe es in dein Journal (wie bisher)
- Notiere im Journal-Header: "## Fuer andere Agents: [kurze Info]"
- Jarvis wird es ins Working-Memory uebertragen
```

**Step 3: Commit**

```bash
git add .claude/agents/SHARED-PREFIX.md
git commit -m "feat(cortex): SHARED-PREFIX v2 with cortex-aware brain loading"
```

---

### Task 5.2: Update All Agent Definitions

**Files:**
- Modify: `.claude/agents/frontend.md`
- Modify: `.claude/agents/backend.md`
- Modify: `.claude/agents/reviewer.md`
- Modify: `.claude/agents/healer.md`
- Modify: `.claude/agents/test-writer.md`
- Modify: `.claude/agents/business.md`
- Modify: `.claude/agents/impact-analyst.md`
- Modify: `.claude/agents/qa-visual.md`

**Step 1: Update Phase 0 references in each agent**

Each agent's "Step 0: Shared Context" should now say:

```markdown
### Step 0: Shared Context
Lies: `.claude/agents/SHARED-PREFIX.md` (Cortex-aware, laedt Gehirn automatisch)
```

No other changes needed — the SHARED-PREFIX v2 handles the cortex loading.

**Step 2: Fix skill path fallback**

Add to each agent that loads a skill:

```markdown
### Step 1: Load Skill
Lies: `.claude/skills/beScout-[domain]/SKILL.md`
Falls nicht gefunden (Worktree): Lies vom main repo: `C:/bescout-app/.claude/skills/beScout-[domain]/SKILL.md`
```

**Step 3: Commit**

```bash
git add .claude/agents/
git commit -m "feat(cortex): update all agents for cortex-aware brain loading + skill fallback"
```

---

### Task 5.3: Smoke Test Phase 5 (End-to-End)

**Step 1: Dispatch Frontend Agent with a trivial task**

Use the same smoke test pattern as Session 281: dispatch a small UI fix through the full pipeline.

**Step 2: Verify the agent loaded cortex**

Check the agent's journal — it should mention:
- Reading cortex-index.md
- Loading domain-specific files
- Reading working-memory.md (if exists)

**Step 3: Verify the reviewer agent can see context**

Dispatch reviewer — verify it references cortex knowledge in its review.

**Step 4: Final tsc + vitest**

```bash
npx tsc --noEmit
npx vitest run src/lib/services/ --reporter=dot
```

**Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore(cortex): Phase 5 smoke test complete — Jarvis Cortex v1 operational"
```

---

## Post-Implementation: Verification Checklist

- [ ] `memory/cortex-index.md` exists and all referenced files are valid
- [ ] `memory/working-memory.md` is in .gitignore
- [ ] SessionStart produces morning briefing + injects it
- [ ] PreCompact writes working-memory.md
- [ ] All hooks use `sed` not `grep -oP`
- [ ] SHARED-PREFIX v2 loads cortex in Phase 0
- [ ] All 9 agents reference SHARED-PREFIX v2
- [ ] Skill path fallback works in worktrees
- [ ] Frontend Agent smoke test PASS
- [ ] Reviewer Agent smoke test PASS
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` green
- [ ] No broken file references in hooks
