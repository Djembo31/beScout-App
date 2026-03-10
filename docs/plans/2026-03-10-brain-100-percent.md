# Brain 100% — Enforcement, Learning Loop, Knowledge Hygiene

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the 5 remaining gaps so the orchestrator workflow is mechanically enforced, knowledge grows systematically, and stale information gets pruned.

**Architecture:** Combination of Claude Code hooks (mechanical enforcement), Gemini MCP tool additions (staleness detection), agent template changes (learning feedback), and rule tightening (protocol hardening).

**Tech Stack:** Bash hooks, Node.js/TypeScript (Gemini MCP), Markdown rules

---

### Task 1: Fix Gemini Permissions

**Problem:** `settings.local.json` only allows `query_knowledge` — `get_agent_context` and `refresh_cache` are blocked. The entire orchestrator flow depends on these tools.

**Files:**
- Modify: `C:/bescout-app/.claude/settings.local.json`

**Step 1: Update permissions to allow all Gemini tools**

In the `permissions.allow` array, replace:
```json
"mcp__gemini-knowledge__query_knowledge"
```
with:
```json
"mcp__gemini-knowledge__*"
```

**Step 2: Verify**

Restart Claude Code. Call `get_agent_context` and `refresh_cache` — both should work without permission prompt.

**Step 3: Commit**

```bash
git add .claude/settings.local.json
git commit -m "fix(permissions): allow all gemini-knowledge MCP tools"
```

---

### Task 2: Agent Dispatch Enforcement Hook

**Problem:** Nothing mechanically prevents me from dispatching an agent WITHOUT a Gemini briefing. Rules say "PFLICHT" but I can ignore them.

**Solution:** PreToolUse hook on the Agent tool that checks if the prompt contains the mandatory `PROJEKT-WISSEN` section.

**Files:**
- Create: `C:/bescout-app/.claude/hooks/agent-dispatch-guard.sh`
- Modify: `C:/bescout-app/.claude/settings.local.json` (register hook)

**Step 1: Create the hook script**

```bash
#!/bin/bash
# agent-dispatch-guard.sh — PreToolUse Hook
# Enforces: Agent prompts MUST contain Gemini briefing (PROJEKT-WISSEN section)
# Exit 0 = allow, Exit 2 = block

TOOL_NAME="$1"
# Tool input comes via stdin as JSON

# Only check Agent tool calls
if [ "$TOOL_NAME" != "Agent" ]; then
  exit 0
fi

# Read the tool input from stdin
INPUT=$(cat)

# Extract the prompt field
PROMPT=$(echo "$INPUT" | grep -o '"prompt"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)

# Check for subagent_type — only enforce on general-purpose agents doing implementation
# Skip enforcement for Explore, Plan, and code-reviewer agents (they don't need Gemini)
SUBAGENT=$(echo "$INPUT" | grep -o '"subagent_type"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)
if echo "$SUBAGENT" | grep -qiE '(Explore|Plan|code-reviewer)'; then
  exit 0
fi

# Check if prompt contains PROJEKT-WISSEN or GEMINI_BRIEFING marker
if echo "$PROMPT" | grep -qiE '(PROJEKT-WISSEN|GEMINI.BRIEFING|gemini briefing)'; then
  exit 0
fi

# Block: no Gemini context found in agent prompt
echo "BLOCKED: Agent dispatch without Gemini briefing."
echo "Run get_agent_context(task) first, then include output in prompt under === PROJEKT-WISSEN (Gemini) ==="
exit 2
```

**Step 2: Make executable**

```bash
chmod +x .claude/hooks/agent-dispatch-guard.sh
```

**Step 3: Register hook in settings**

Add to `settings.local.json` under a new `hooks` section (if Claude Code supports it), or document as a PreToolUse hook. Note: Claude Code hooks are configured in `.claude/settings.local.json` or `.claude/hooks/` directory with naming convention.

**Step 4: Test**

Try dispatching an Agent without PROJEKT-WISSEN in prompt — should be blocked.
Try dispatching with PROJEKT-WISSEN — should pass.

**Step 5: Commit**

```bash
git add .claude/hooks/agent-dispatch-guard.sh
git commit -m "feat(hooks): enforce Gemini briefing in agent dispatch prompts"
```

---

### Task 3: Agent Learning Feedback Template

**Problem:** Agents complete their work but don't report what they DISCOVERED. Bugs, patterns, surprises — all lost.

**Solution:** Add a mandatory LEARNINGS section to every agent output template.

**Files:**
- Modify: `C:/bescout-app/.claude/research/agent-prompts.md`

**Step 1: Add LEARNINGS section to prompt structure**

In the "Prompt-Aufbau" section, add to the bottom of the template:

```
=== OUTPUT ===
{Was der Agent zurueckliefern soll}

=== LEARNINGS (PFLICHT — auch wenn leer) ===
Nenne 0-3 Dinge die du waehrend der Arbeit entdeckt hast:
- Bug/Fehler: [was + wo] (fuer errors.md)
- Pattern: [was + warum nuetzlich] (fuer patterns.md)
- Fehlende/Falsche Doku: [was stimmt nicht] (fuer Korrektur)
- Ueberraschung: [was unerwartet war]
Wenn nichts: "Keine neuen Erkenntnisse."
```

**Step 2: Add to EACH implementation agent template**

Append the LEARNINGS section to: DB Agent, Service Agent, UI Agent, Test Agent, Review Agent output sections.

**Step 3: Add post-wave learning rule to orchestrator.md**

After each wave completes, add mandatory step:

```markdown
### Post-Wave Learning (PFLICHT nach jeder Welle)
1. Lies LEARNINGS-Sektion jedes Agent-Ergebnisses
2. Fuer JEDEN gemeldeten Bug/Pattern/Fehler:
   - Bug → errors.md (mit Agent-Name als Quelle)
   - Pattern → patterns.md
   - Falsche Doku → sofort korrigieren
3. Gemini refresh_cache() wenn irgendwas geschrieben wurde
4. Anil informieren: "Agent [X] hat entdeckt: [Y]. Dokumentiert in [Z]."
```

**Step 4: Commit**

```bash
git add .claude/research/agent-prompts.md .claude/rules/orchestrator.md
git commit -m "feat(agents): add mandatory LEARNINGS section to agent output templates"
```

---

### Task 4: Gemini Answer Verification Protocol

**Problem:** Gemini could return wrong information (hallucinations). No verification happens.

**Solution:** Lightweight spot-check — verify 1 concrete fact from every Gemini briefing before using it.

**Files:**
- Modify: `C:/bescout-app/.claude/rules/orchestrator.md`

**Step 1: Add verification step to Gemini workflow**

Update the "Workflow mit Gemini" section:

```markdown
### Workflow mit Gemini
1. Anil beschreibt Task
2. ICH: `get_agent_context(task)` → kuratiertes Briefing
3. ICH: **Spot-Check** — verifiziere 1 konkreten Fakt aus dem Briefing:
   - Wenn DB Column genannt → `query_knowledge("exact column name of X?", exact: true)`
   - Wenn Component genannt → Glob/Grep ob sie existiert
   - Wenn Pattern genannt → stimmt die Beschreibung?
   - Dauer: 30 Sekunden, 1 Tool-Call
   - Wenn falsch → Briefing verwerfen, manuell kuratieren
4. ICH: dispatche Agent MIT verifiziertem Briefing im Prompt
5. Agent liest NUR Source Code, Wissen hat er von mir
```

**Step 2: Commit**

```bash
git add .claude/rules/orchestrator.md
git commit -m "feat(orchestrator): add Gemini spot-check verification step"
```

---

### Task 5: Knowledge Staleness Detection

**Problem:** errors.md (58KB, 100+ entries) and patterns.md (768 lines) grow but never shrink. Stale entries could mislead agents.

**Solution:** Add a `check_staleness` tool to Gemini MCP + monthly hygiene rule.

**Files:**
- Modify: `C:/Users/Anil/.claude/mcp-servers/gemini-knowledge/src/index.ts`
- Modify: `C:/bescout-app/.claude/rules/core.md`

**Step 1: Add check_staleness tool to MCP server**

```typescript
server.tool(
  "check_staleness",
  {
    days: z.number().optional().default(30).describe("Flag files not modified in N days"),
  },
  async ({ days }) => {
    try {
      currentIndex = indexDocs(config, PROJECT);
      const now = Date.now();
      const threshold = days * 24 * 60 * 60 * 1000;
      const stale: string[] = [];
      const fresh: string[] = [];

      for (const doc of currentIndex.docs) {
        try {
          const { mtimeMs } = statSync(doc.path);
          const ageDays = Math.round((now - mtimeMs) / (24 * 60 * 60 * 1000));
          if (now - mtimeMs > threshold) {
            stale.push(`${doc.path.split("/").pop()} (${doc.category}) — ${ageDays} days old, ${doc.sizeKB}KB`);
          } else {
            fresh.push(`${doc.path.split("/").pop()} (${doc.category}) — ${ageDays} days old`);
          }
        } catch {
          stale.push(`${doc.path.split("/").pop()} — unable to check`);
        }
      }

      return {
        content: [{
          type: "text",
          text: `Staleness Report (threshold: ${days} days):\n\nStale (${stale.length}):\n${stale.map(s => `  - ${s}`).join("\n") || "  None"}\n\nFresh (${fresh.length}):\n${fresh.map(s => `  - ${s}`).join("\n")}`,
        }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `[ERROR] ${(err as Error).message}` }],
        isError: true,
      };
    }
  }
);
```

Add import at top of index.ts:
```typescript
import { statSync } from "fs";
```

**Step 2: Add monthly hygiene rule to core.md**

Append to Knowledge Capture section:

```markdown
### Knowledge Hygiene (monatlich, Session-Start)
Wenn >30 Tage seit letzter Hygiene:
1. `check_staleness(30)` → Liste veralteter Files
2. Fuer jedes stale File entscheiden:
   - Noch relevant → Inhalt pruefen, ggf. updaten → Timestamp aktualisiert
   - Teilweise obsolet → Stale Eintraege entfernen/archivieren
   - Komplett obsolet → Archivieren oder loeschen
3. errors.md: Eintraege die seit 3+ Monaten nicht mehr aufgetreten → archivieren
4. patterns.md: Patterns die im Code nicht mehr vorkommen → entfernen
5. Gemini refresh_cache() nach Cleanup
6. Notiz in sessions.md: "Knowledge Hygiene durchgefuehrt: [was geaendert]"
```

**Step 3: Build MCP server**

```bash
cd ~/.claude/mcp-servers/gemini-knowledge && npm run build
```

**Step 4: Commit**

```bash
git add .claude/rules/core.md
git commit -m "feat(knowledge): add staleness detection + monthly hygiene rule"
```

---

### Task 6: Session Handoff Hardening

**Problem:** I start each session fresh. current-sprint.md + MEMORY.md help but the handoff is lossy.

**Solution:** Strengthen the session-end protocol to write a `session-handoff.md` with EXACTLY what the next session needs.

**Files:**
- Modify: `C:/bescout-app/.claude/rules/core.md`
- Create on first use: `C:/Users/Anil/.claude/projects/C--bescout-app/memory/session-handoff.md`

**Step 1: Add session-handoff protocol to core.md Session-Ende**

Replace current Session-Ende with:

```markdown
## Session-Ende (PFLICHT — auch wenn Anil nicht fragt)
1. `session-handoff.md` schreiben/updaten (MAX 50 Zeilen):
   ```markdown
   # Session Handoff
   ## Letzte Session: #N (Datum)
   ## Was wurde gemacht
   - [1 Zeile pro Ergebnis]
   ## Offene Arbeit
   - [was angefangen aber nicht fertig ist, mit File-Pfaden]
   ## Naechste Aktion
   - [exakt was als erstes getan werden muss]
   ## Aktive Entscheidungen
   - [Entscheidungen die noch nicht umgesetzt sind]
   ## Blocker
   - [was blockiert ist und warum]
   ```
2. `current-sprint.md` — Letzter Stand + Aktive Features updaten
3. Feature-File — **Aktueller Stand** Sektion updaten
4. `sessions.md` — Session #, Datum, Thema, Ergebnis
5. Betroffene Topic-Files — errors.md, patterns.md, decisions.md wenn relevant
6. **Gemini `refresh_cache()`** — wenn memory/ oder rules/ Files geaendert
7. **Knowledge-Check:** "Gibt es Entscheidungen/Fehler/Patterns die ich noch nicht festgehalten habe?"
```

**Step 2: Update Session-Start to read handoff FIRST**

```markdown
## Session-Start (ERSTE AKTION jeder Session)
1. `session-handoff.md` lesen → WAS ZULETZT PASSIERT IST (50 Zeilen, schnell)
2. MEMORY.md ist auto-loaded → Projekt-Kontext da
3. `current-sprint.md` lesen → Stand, Aktive Features, Blocker
4. Wenn aktives Feature: Feature-File lesen
5. Anil sagt was ansteht → los
```

**Step 3: Add session-handoff.md to Gemini config**

Update `config.json` — the memory glob `*.md` already catches it automatically since it's in the memory directory.

**Step 4: Commit**

```bash
git add .claude/rules/core.md
git commit -m "feat(sessions): add session-handoff.md for lossless context transfer"
```

---

### Task 7: Gemini Refresh Hook (Auto-Sync)

**Problem:** After writing to memory/rules files, I must manually call `refresh_cache()`. Easy to forget.

**Solution:** PostToolUse hook that detects writes to memory/ or rules/ and reminds to refresh (or auto-refreshes).

**Files:**
- Create: `C:/bescout-app/.claude/hooks/gemini-sync-reminder.sh`

**Step 1: Create the hook**

```bash
#!/bin/bash
# gemini-sync-reminder.sh — PostToolUse Hook
# After Edit/Write on memory/*.md or rules/*.md, remind to refresh Gemini
# Exit 0 = allow (PostToolUse hooks should always allow)

TOOL_NAME="$1"

# Only check Edit and Write tools
if [ "$TOOL_NAME" != "Edit" ] && [ "$TOOL_NAME" != "Write" ]; then
  exit 0
fi

# Read tool input from stdin
INPUT=$(cat)

# Check if file path contains memory/ or rules/
if echo "$INPUT" | grep -qiE '(memory/|rules/|MEMORY\.md|CLAUDE\.md)'; then
  echo "REMINDER: Knowledge file modified. Run gemini-knowledge refresh_cache() to sync."
fi

exit 0
```

**Step 2: Make executable**

```bash
chmod +x .claude/hooks/gemini-sync-reminder.sh
```

**Step 3: Commit**

```bash
git add .claude/hooks/gemini-sync-reminder.sh
git commit -m "feat(hooks): auto-remind Gemini refresh after knowledge file writes"
```

---

### Task 8: Final Integration + Verification

**Files:**
- Modify: `C:/Users/Anil/.claude/projects/C--bescout-app/memory/MEMORY.md`
- Modify: `C:/Users/Anil/.claude/projects/C--bescout-app/memory/current-sprint.md`

**Step 1: Update MEMORY.md GOD MODE section**

Update to reflect 100% enforcement status.

**Step 2: Update current-sprint.md**

Mark Brain 100% as completed.

**Step 3: Run full verification**

```
1. get_agent_context("test task") → should work (Task 1 permissions)
2. Dispatch Agent WITHOUT Gemini → should be BLOCKED (Task 2 hook)
3. Dispatch Agent WITH Gemini → should PASS (Task 2 hook)
4. check_staleness(30) → should return report (Task 5)
5. refresh_cache() → should work (Task 1 permissions)
6. Write to memory file → should see reminder (Task 7)
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(brain): 100% enforcement — hooks, learning loop, staleness, handoff"
```

---

## Verification Checklist

- [ ] `get_agent_context` works without permission prompt (Task 1)
- [ ] Agent dispatch blocked without PROJEKT-WISSEN (Task 2)
- [ ] Agent dispatch allowed with PROJEKT-WISSEN (Task 2)
- [ ] Agent templates include LEARNINGS output section (Task 3)
- [ ] Orchestrator has post-wave learning step (Task 3)
- [ ] Gemini spot-check step in workflow (Task 4)
- [ ] `check_staleness` tool returns report (Task 5)
- [ ] Monthly hygiene rule in core.md (Task 5)
- [ ] session-handoff.md protocol in Session-Ende (Task 6)
- [ ] Gemini refresh reminder after knowledge writes (Task 7)
- [ ] MEMORY.md + current-sprint.md updated (Task 8)

## Gap Closure Map

| Gap | Solution | Enforcement Type | Task |
|-----|----------|-----------------|------|
| Session-Amnesie | session-handoff.md (50 Zeilen, first read) | Protocol (auto-loaded) | 6 |
| Keine Gemini-Verifikation | Spot-Check 1 Fakt pro Briefing | Protocol (Rule) | 4 |
| Wissen veraltet | check_staleness Tool + monatliche Hygiene | Tool + Protocol | 5 |
| Kein Enforcement | PreToolUse Hook blockt Agents ohne Briefing | Mechanical (Hook) | 2 |
| Agent-Learnings verloren | LEARNINGS Pflichtfeld + Post-Wave Review | Template + Protocol | 3 |
| Gemini Permissions fehlen | Wildcard allow | Config Fix | 1 |
| Gemini Refresh vergessen | PostToolUse Reminder Hook | Mechanical (Hook) | 7 |
