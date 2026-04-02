# SKYNET Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Selbstlernendes Agent-Oekosystem — Agents die lernen, mitdenken, kollektiv arbeiten. Jede Verwendung macht das System besser.

**Architecture:** 9 Saeulen (MCP Stack, Skills, Hooks, Agents, Memory, Trigger-Rules, Self-Improvement Loop, Skill Eval-Loop, AutoDream). 3 harte Gesetze (Cache-Prefix Sharing, keine leeren Tool-Arrays, Human-Curated Context Only).

**Tech Stack:** Claude Code CLI, Claude Agent SDK (Python), Bash Hooks, MCP Servers, Markdown Skills/Rules

**Design Doc:** `docs/plans/2026-04-02-skynet-agent-ecosystem-design.md`

---

## Wave 1: Foundation (Tasks 1-10)

### Task 1: MCP Stack konsolidieren

**Files:**
- Modify: `C:\bescout-app\.mcp.json`

**Step 1: Backup aktuelle Config**

```bash
cp .mcp.json .mcp.json.bak
```

**Step 2: Schreibe konsolidierte .mcp.json**

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["./node_modules/@playwright/mcp/cli.js", "--user-data-dir", "C:/Users/Anil/AppData/Local/ms-playwright/mcp-isolated"]
    },
    "supabase": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "supabase-mcp-server@latest"],
      "env": {
        "SUPABASE_URL": "${NEXT_PUBLIC_SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}"
      }
    },
    "context7": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@anthropic-ai/context7-mcp@latest"]
    },
    "sequential-thinking": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@anthropic-ai/sequential-thinking-mcp@latest"]
    }
  }
}
```

**Hinweis:** Figma + Memory MCP bleiben als Plugins (global). Supabase + Context7 + Sequential-Thinking werden projekt-lokal. Kein Overengineering — nur was wir taeglich brauchen.

**Step 3: Verify**

Starte Claude Code neu, pruefe ob MCP Server verbinden.

**Step 4: Commit**

```bash
git add .mcp.json
git commit -m "chore(skynet): consolidate MCP stack — 4 servers in .mcp.json"
```

---

### Task 2: Domain-Skill beScout-backend erstellen

**Files:**
- Create: `C:\bescout-app\.claude\skills\beScout-backend\SKILL.md`
- Create: `C:\bescout-app\.claude\skills\beScout-backend\LEARNINGS.md`

**Step 1: Erstelle SKILL.md**

Extrahiere aus `common-errors.md`, `database.md`, `trading.md` die Backend-relevanten Sections.

```markdown
---
name: beScout-backend
description: DB migrations, RPCs, services, Supabase operations — column names, CHECK constraints, RPC patterns, fee-split
---

## DB Column Names (Top Fehlerquelle)
- `players`: `first_name`/`last_name` (NICHT `name`)
- `wallets`: PK=`user_id` (KEIN `id`, KEIN `currency`)
- `orders`: `side` (NICHT `type`), KEIN `updated_at`
- `post_votes.vote_type` = SMALLINT 1/-1 (NICHT boolean)
- `profiles.top_role` (NICHT `role`), Wert `'Admin'` mit grossem A
- `notifications.read` (NICHT `is_read`)
- `activity_log.action` (NICHT `action_type`)
- `user_follows.following_id` (NICHT `followed_id`)
- `trades.executed_at` (NICHT `created_at`)
- `offers.price` (NICHT `price_cents`)
- `research_posts`: hat KEINE upvotes/downvotes Spalten

## CHECK Constraints
- `club_subscriptions.tier`: 'bronze'/'silber'/'gold' (silber, NICHT silver!)
- `user_stats.tier`: 'Rookie'/'Amateur'/'Profi'/'Elite'/'Legende'/'Ikone'
- `research_posts.call`: 'Bullish'/'Bearish'/'Neutral' (Capitalized)
- `lineups.captain_slot`: 'gk'/'def1' etc. (KEIN 'slot_' Prefix)

## RPC Anti-Patterns
- `::TEXT` auf UUID beim INSERT — 5x gleicher Bug
- Record nicht initialisiert vor Zugriff in falscher Branch
- FK-Reihenfolge falsch (Child INSERT vor Parent)
- NOT NULL Spalte fehlt im INSERT
- Guards fehlen (Liquidation-Check in allen Trading-RPCs)

## RLS Policy Pflicht
- Neue Tabelle mit RLS MUSS Policies fuer ALLE Client-Ops (SELECT + INSERT + DELETE)
- SELECT-only = Client kann lesen aber NICHT schreiben → silent failure
- Nach Migration: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`

## Service Layer Pattern
```
Component → Service Function → Supabase RPC/Query
Write → Service → Supabase RPC → invalidateQueries → Toast
```
- NIEMALS Supabase direkt in Components
- IMMER `qk.*` Factory fuer Query Keys
- `invalidateQueries` nach Writes, NICHT `staleTime: 0`

## Fee-Split
| Quelle | Platform | PBT | Club |
|--------|----------|-----|------|
| Trading | 3.5% | 1.5% | 1% |
| IPO | 10% | 5% | 85% |

## Geld
- IMMER als BIGINT cents (1,000,000 = 10,000 $SCOUT)
- `floor_price ?? 0` — IMMER Null-Guard

## Learnings
→ Lies `LEARNINGS.md` VOR Task-Start
→ Schreibe neue Erkenntnisse als DRAFT nach Task-Ende in `memory/learnings/drafts/`
```

**Step 2: Erstelle leere LEARNINGS.md**

```markdown
# Learnings — beScout-backend

> Human-approved only. Agents schreiben Drafts in memory/learnings/drafts/.
> Jarvis/Anil promoted hierher nach Review.

## Active Rules
(noch leer — wird durch Erfahrung gefuellt)
```

**Step 3: Commit**

```bash
git add .claude/skills/beScout-backend/
git commit -m "chore(skynet): create beScout-backend domain skill + learnings"
```

---

### Task 3: Domain-Skill beScout-frontend erstellen

**Files:**
- Create: `C:\bescout-app\.claude\skills\beScout-frontend\SKILL.md`
- Create: `C:\bescout-app\.claude\skills\beScout-frontend\LEARNINGS.md`

**Step 1: Erstelle SKILL.md**

Extrahiere aus `ui-components.md`, `common-errors.md`, `CLAUDE.md` die Frontend-relevanten Sections.

```markdown
---
name: beScout-frontend
description: UI components, pages, hooks — design tokens, component registry, CSS patterns, i18n
---

## Design Tokens
| Token | Wert | Usage |
|-------|------|-------|
| Background | `#0a0a0a` | Body, alle Screens |
| Gold | `var(--gold, #FFD700)` | `text-gold`, `bg-gold` |
| Button Gradient | `from-[#FFE44D] to-[#E6B800]` | Primary Buttons |
| Card Surface | `bg-white/[0.02]` | Card-Hintergrund |
| Card Border | `border border-white/10 rounded-2xl` | Card-Rahmen |
| Subtle Border | `border-white/[0.06]` | Divider, Sections |
| Text Readable | `white/50+` | WCAG AA auf #0a0a0a |
| Headlines | `font-black` (900) | Alle Ueberschriften |
| Numbers | `font-mono tabular-nums` | Preise, Stats, Counts |

## Component Registry (IMMER pruefen bevor neu gebaut)
| Component | Import | Props |
|-----------|--------|-------|
| PlayerPhoto | `@/components/player/index` | `first`, `last`, `pos` (NICHT firstName) |
| Modal | `@/components/ui/index` | IMMER `open={true/false}` prop |
| Card, Button | `@/components/ui/index` | Button hat `active:scale-[0.97]` |
| TabBar | `@/components/ui/TabBar` | Tabs + TabPanel |
| Loader2 | `lucide-react` | EINZIGER Spinner |

## CSS Traps
- `flex-1` auf Tabs → iPhone overflow → `flex-shrink-0` nutzen
- Dynamic Tailwind `border-[${var}]/40` → JIT scannt nur statische Strings
  → Nutze `style={{ borderColor: hex }}` + statische Class (`border-2`)
- `::after`/`::before` mit `position: absolute` → Eltern MUSS `relative` haben

## React Patterns
- `'use client'` auf allen Pages
- Hooks VOR early returns (React Rules)
- `Array.from(new Set())` statt `[...new Set()]`
- Loading Guard VOR Empty Guard
- `cn()` fuer classNames
- Cancellation Token: `let cancelled = false; return () => { cancelled = true; }`

## i18n
- `next-intl`, `useTranslations()`, Cookie `bescout-locale`
- Messages in `messages/{locale}.json`
- DE + TR. Neue Keys IMMER in beiden Sprachen

## Learnings
→ Lies `LEARNINGS.md` VOR Task-Start
→ Schreibe neue Erkenntnisse als DRAFT nach Task-Ende in `memory/learnings/drafts/`
```

**Step 2: Erstelle leere LEARNINGS.md** (gleiche Struktur wie backend)

**Step 3: Commit**

```bash
git add .claude/skills/beScout-frontend/
git commit -m "chore(skynet): create beScout-frontend domain skill + learnings"
```

---

### Task 4: Domain-Skill beScout-business erstellen

**Files:**
- Create: `C:\bescout-app\.claude\skills\beScout-business\SKILL.md`
- Create: `C:\bescout-app\.claude\skills\beScout-business\LEARNINGS.md`

**Step 1: Erstelle SKILL.md**

Extrahiere aus `business.md` die Compliance-relevanten Sections.

```markdown
---
name: beScout-business
description: Compliance, wording, legal — forbidden words, licensing phases, geofencing, fee calculations
---

## Wording-Compliance (KRITISCH)
NIEMALS: Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership, "guaranteed returns"
IMMER: Utility Token, Platform Credits, Scout Assessment, "at BeScout's discretion"

- $SCOUT = "Platform Credits" (nicht Kryptowaehrung)
- Scout Card = "Digitale Spielerkarte" (nicht Spieleranteil, kein Eigentum)
- Code-intern: Variable/DB-Column-Namen mit "dpc" bleiben (nur UI umbenannt)
- Disclaimers auf JEDER Seite mit $SCOUT/DPC (TradingDisclaimer Component)

## Licensing-Phasen
- Phase 1 (jetzt): Scout Card Trading ($SCOUT-Credits), Free Fantasy, Votes, Events
- Phase 3 (nach CASP): $SCOUT Token, Cash-Out, Exchange — NICHT BAUEN
- Phase 4 (nach MGA): Paid Fantasy Entry, Turniere mit Preisen — NICHT BAUEN

## Geofencing-Tiers
| Tier | Laender | Zugang |
|------|---------|--------|
| TIER_FULL | Rest EU | Alles |
| TIER_CASP | EU ohne Gaming | Trading ja, Paid Fantasy nein |
| TIER_FREE | DE/FR/AT/UK | Free only |
| TIER_RESTRICTED | TR | Content + Free Fantasy only |
| TIER_BLOCKED | USA/China/OFAC | Kein Zugang |

## Fee-Split
| Quelle | Platform | PBT | Club | Creator |
|--------|----------|-----|------|---------|
| Trading | 3.5% | 1.5% | 1% | — |
| IPO | 10% | 5% | 85% | — |
| Research | 20% | — | — | 80% |
| Bounty | 5% | — | — | 95% |

## Learnings
→ Lies `LEARNINGS.md` VOR Task-Start
→ Schreibe neue Erkenntnisse als DRAFT nach Task-Ende in `memory/learnings/drafts/`
```

**Step 2: Erstelle leere LEARNINGS.md**

**Step 3: Commit**

```bash
git add .claude/skills/beScout-business/
git commit -m "chore(skynet): create beScout-business domain skill + learnings"
```

---

### Task 5: Memory-Verzeichnisstruktur anlegen

**Files:**
- Create: `C:\bescout-app\memory\learnings\deliver.md`
- Create: `C:\bescout-app\memory\learnings\cto-review.md`
- Create: `C:\bescout-app\memory\learnings\impact.md`
- Create: `C:\bescout-app\memory\learnings\beScout-backend.md`
- Create: `C:\bescout-app\memory\learnings\beScout-frontend.md`
- Create: `C:\bescout-app\memory\learnings\beScout-business.md`
- Create: `C:\bescout-app\memory\learnings\drafts\.gitkeep`
- Create: `C:\bescout-app\memory\metrics\.gitkeep`
- Create: `C:\bescout-app\memory\post-mortems\.gitkeep`
- Create: `C:\bescout-app\memory\improvement-proposals\.gitkeep`
- Create: `C:\bescout-app\memory\rules-pending\common-errors-pending.md`

**Step 1: Erstelle Verzeichnisse und Dateien**

```bash
mkdir -p memory/learnings/drafts memory/metrics memory/post-mortems memory/improvement-proposals memory/rules-pending
```

**Step 2: Erstelle Learnings-Templates**

Jede `memory/learnings/[skill].md` bekommt:

```markdown
# Learnings — [Skill Name]

> Human-approved only. Agents schreiben Drafts in memory/learnings/drafts/.

## Active Rules
(wird durch Erfahrung gefuellt)
```

**Step 3: Erstelle rules-pending Template**

`memory/rules-pending/common-errors-pending.md`:
```markdown
# Pending Rule Proposals

> Automatisch generiert bei 2x gleichem Fehler. Jarvis/Anil reviewed via /promote-rule.

(leer)
```

**Step 4: Erstelle .gitkeep in leeren Ordnern**

```bash
touch memory/learnings/drafts/.gitkeep memory/metrics/.gitkeep memory/post-mortems/.gitkeep memory/improvement-proposals/.gitkeep
```

**Step 5: Commit**

```bash
git add memory/learnings/ memory/metrics/ memory/post-mortems/ memory/improvement-proposals/ memory/rules-pending/
git commit -m "chore(skynet): create memory directory structure for learning system"
```

---

### Task 6: Quality-Gate von Command-Hook zu Agent-Hook upgraden

**Files:**
- Modify: `C:\bescout-app\.claude\settings.json`

**Step 1: Ersetze quality-gate.sh Hook mit Agent-Hook**

In `.claude/settings.json`, im `"Stop"` Array, ersetze den quality-gate.sh Eintrag:

Vorher:
```json
{
  "type": "command",
  "command": "bash C:/bescout-app/.claude/hooks/quality-gate.sh"
}
```

Nachher:
```json
{
  "type": "command",
  "command": "bash C:/bescout-app/.claude/hooks/quality-gate-v2.sh"
}
```

**Hinweis:** Wir behalten den command-type weil agent-type Hooks noch Beta sind und auf Windows instabil sein koennen. Das Script `quality-gate-v2.sh` fuehrt `tsc --noEmit` aus und prueft geaenderte Files.

**Step 2: Erstelle quality-gate-v2.sh**

Create: `C:\bescout-app\.claude\hooks\quality-gate-v2.sh`

```bash
#!/bin/bash
# quality-gate-v2.sh — Enhanced Quality Gate (Skynet)
# Runs on Stop event. Exit 2 = block (agent continues), Exit 0 = pass.

set -e
cd "C:/bescout-app"

ERRORS=0

# 1. TypeScript Check
TSC_OUTPUT=$(npx tsc --noEmit 2>&1 || true)
TSC_ERRORS=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)
if [ "$TSC_ERRORS" -gt 0 ]; then
  echo "QUALITY GATE: $TSC_ERRORS TypeScript errors found"
  echo "$TSC_OUTPUT" | grep "error TS" | head -5
  ERRORS=$((ERRORS + TSC_ERRORS))
fi

# 2. Check for empty catch blocks in changed files
CHANGED=$(git diff --name-only HEAD 2>/dev/null || true)
if [ -n "$CHANGED" ]; then
  EMPTY_CATCH=$(echo "$CHANGED" | xargs grep -l "\.catch(() => {})" 2>/dev/null || true)
  if [ -n "$EMPTY_CATCH" ]; then
    echo "QUALITY GATE: Empty .catch(() => {}) found in: $EMPTY_CATCH"
    ERRORS=$((ERRORS + 1))
  fi
fi

# 3. Increment session counter for AutoDream
COUNTER_FILE=".claude/session-counter"
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
  echo $((COUNT + 1)) > "$COUNTER_FILE"
else
  echo "1" > "$COUNTER_FILE"
fi

if [ "$ERRORS" -gt 0 ]; then
  echo "QUALITY GATE FAILED: $ERRORS issues found"
  exit 2
fi

echo "QUALITY GATE PASSED"
exit 0
```

**Step 3: Commit**

```bash
git add .claude/hooks/quality-gate-v2.sh .claude/settings.json
git commit -m "chore(skynet): upgrade quality-gate to v2 with tsc check + session counter"
```

---

### Task 7: PostCompact Context Injection Hook

**Files:**
- Create: `C:\bescout-app\.claude\hooks\inject-context-on-compact.sh`
- Modify: `C:\bescout-app\.claude\settings.json`

**Step 1: Erstelle inject-context-on-compact.sh**

```bash
#!/bin/bash
# inject-context-on-compact.sh — Re-inject critical context after compaction
# Runs on PreCompact. Outputs context that gets injected into conversation.

cd "C:/bescout-app"

echo "=== CONTEXT RE-INJECTION (post-compaction) ==="

# 1. Current sprint status
if [ -f "memory/current-sprint.md" ]; then
  echo ""
  echo "## Current Sprint"
  head -30 "memory/current-sprint.md"
fi

# 2. Session handoff
if [ -f "memory/session-handoff.md" ]; then
  echo ""
  echo "## Session Handoff"
  cat "memory/session-handoff.md"
fi

echo ""
echo "=== END CONTEXT RE-INJECTION ==="
```

**Step 2: Registriere in settings.json**

Fuege einen zweiten Hook zum bestehenden `"PreCompact"` Array hinzu:

```json
"PreCompact": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "bash C:/bescout-app/.claude/hooks/pre-compact-backup.sh"
      },
      {
        "type": "command",
        "command": "bash C:/bescout-app/.claude/hooks/inject-context-on-compact.sh"
      }
    ]
  }
]
```

**Step 3: Commit**

```bash
git add .claude/hooks/inject-context-on-compact.sh .claude/settings.json
git commit -m "chore(skynet): add PostCompact context injection hook"
```

---

### Task 8: Trigger-Rules in CLAUDE.md einbetten

**Files:**
- Modify: `C:\bescout-app\CLAUDE.md`

**Step 1: Fuege Trigger-Rules Section hinzu**

Vor der `## Referenzen` Section am Ende von CLAUDE.md, fuege ein:

```markdown
## Proaktive Regeln (IMMER aktiv waehrend Arbeit)
- Datei >500 Zeilen bearbeiten → Hinweis: "Datei hat X Zeilen, Aufteilung pruefen?"
- >5 useState in Component → Hinweis: "useReducer in Betracht ziehen"
- Supabase Query ohne .limit() → WARNUNG: "Unbounded Query"
- staleTime: 0 → WARNUNG: "invalidateQueries statt staleTime: 0"
- .env in git add → BLOCKIEREN
- "Investment"/"ROI" in UI-Text → BLOCKIEREN (Compliance)
- RLS-lose neue Tabelle → WARNUNG: "RLS Policies fehlen"
- Import aus geloeschter Datei → SOFORT fixen
```

**Step 2: Update Workflow Section**

Ersetze die Paperclip-Referenzen mit Skynet-Kontext:

```markdown
## Workflow → `.claude/rules/workflow.md`
- **4-Tier Tasks:** Hotfix / Targeted / Scoped / Full Feature
- **Execution:** Direkte Session (Anil+Jarvis) + Agent SDK (autonom)
- **Agent Teams:** frontend, backend, reviewer, healer, test-writer, business, impact-analyst, qa-visual
- **Verification:** tsc + vitest + Reviewer Agent + a11y
- **Sub-Agents** in `.claude/agents/` — laden SKILL.md + LEARNINGS.md (Phase 0)
- **Codex Plugin:** `/codex:rescue` fuer Circuit-Breaker Eskalation
- **Context7:** Bei Library-Arbeit aktuelle Docs holen
- **Sequential Thinking:** Bei Design-Entscheidungen — NICHT raten
- **3 Gesetze:** Cache-Prefix Sharing | Nie leere Tool-Arrays | Human-Curated Context Only
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "chore(skynet): add trigger-rules + update workflow section in CLAUDE.md"
```

---

### Task 9: Meta-Rules fuer Regel-Qualitaet

**Files:**
- Modify: `C:\bescout-app\CLAUDE.md`

**Step 1: Fuege Meta-Rules Section hinzu**

Nach `## Proaktive Regeln`, fuege ein:

```markdown
## Meta-Regeln (Regeln ueber Regeln)
- Neue Regel hinzufuegen → ERST pruefen: existiert bereits in common-errors.md?
- Doppelte Eintraege → Konsolidieren, nicht beide behalten
- Veraltete Regel → Loeschen statt auskommentieren
- Format konsistent halten: `- backtick-code` fuer DB-Columns, **FETT** fuer Warnungen
- LEARNINGS.md: NUR human-approved Eintraege. Drafts in memory/learnings/drafts/
- Machine-generated Context SCHADET. Weniger human-curated > mehr auto-generated
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "chore(skynet): add meta-rules for rule quality in CLAUDE.md"
```

---

### Task 10: Session-Counter + AutoDream Trigger initialisieren

**Files:**
- Create: `C:\bescout-app\.claude\session-counter`
- Create: `C:\bescout-app\.claude\autodream-last-run`
- Modify: `C:\bescout-app\.claude\hooks\inject-learnings.sh`

**Step 1: Initialisiere Counter-Files**

```bash
echo "0" > .claude/session-counter
date -u +"%Y-%m-%dT%H:%M:%SZ" > .claude/autodream-last-run
```

**Step 2: Erweitere inject-learnings.sh um AutoDream Check**

Fuege am ENDE von `.claude/hooks/inject-learnings.sh` hinzu:

```bash
# === AutoDream Trigger Check ===
COUNTER_FILE="C:/bescout-app/.claude/session-counter"
AUTODREAM_FILE="C:/bescout-app/.claude/autodream-last-run"

if [ -f "$COUNTER_FILE" ] && [ -f "$AUTODREAM_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
  LAST_RUN=$(cat "$AUTODREAM_FILE")
  LAST_EPOCH=$(date -d "$LAST_RUN" +%s 2>/dev/null || echo 0)
  NOW_EPOCH=$(date +%s)
  HOURS_SINCE=$(( (NOW_EPOCH - LAST_EPOCH) / 3600 ))

  if [ "$COUNT" -ge 5 ] || [ "$HOURS_SINCE" -ge 24 ]; then
    echo "AUTODREAM: Trigger conditions met (sessions=$COUNT, hours=$HOURS_SINCE). Run /autodream to consolidate memory."
  fi
fi
```

**Step 3: Commit**

```bash
git add .claude/session-counter .claude/autodream-last-run .claude/hooks/inject-learnings.sh
git commit -m "chore(skynet): init session-counter + autodream trigger check"
```

---

## Wave 2: Collective Intelligence (Tasks 11-17)

### Task 11: Agent-Definitionen mit Phase 4 (LERNEN) upgraden

**Files:**
- Modify: `C:\bescout-app\.claude\agents\backend.md`
- Modify: `C:\bescout-app\.claude\agents\frontend.md`
- Modify: `C:\bescout-app\.claude\agents\reviewer.md`
- Modify: `C:\bescout-app\.claude\agents\business.md`
- Modify: `C:\bescout-app\.claude\agents\healer.md`
- Modify: `C:\bescout-app\.claude\agents\test-writer.md`

**Aktion:** Fuege in JEDEN Agent am Ende hinzu:

```markdown
## Phase 4: LERNEN (NACH jeder Arbeit)
1. Was habe ich gelernt das nicht in SKILL.md/common-errors.md steht?
2. Welcher Fehler waere vermeidbar gewesen?
3. Schreibe 1-3 Zeilen als Draft in `memory/learnings/drafts/YYYY-MM-DD-[agent]-[topic].md`
4. Format: `**[Datum] — [Task-Typ]** / Observation / Confidence (high/medium/low)`
5. NICHT in LEARNINGS.md direkt schreiben — nur Drafts. Jarvis promoted nach Review.
```

Fuege in backend.md, frontend.md, business.md zusaetzlich in Phase 0 hinzu:
```markdown
3. Lies `.claude/skills/beScout-[domain]/LEARNINGS.md`
```

---

### Task 12: Shared System-Prompt Prefix fuer Cache-Sharing

**Files:**
- Create: `C:\bescout-app\.claude\agents\SHARED-PREFIX.md`

**Aktion:** Erstelle eine Datei die den gemeinsamen Prefix fuer ALLE Agents definiert:

```markdown
# BeScout Agent Shared Context

> Dieser Block wird von ALLEN Agents als Prefix geladen.
> Aenderungen hier betreffen ALLE Agents. Cache-Prefix Sharing spart Tokens.

## Projekt
BeScout: B2B2C Fan-Engagement-Plattform. Next.js 14, TypeScript strict, Tailwind, Supabase.
Pilot: Sakaryaspor (TFF 1. Lig).

## Harte Regeln
- Service Layer: Component → Service → Supabase (NIE direkt)
- Hooks VOR early returns
- Array.from(new Set()) statt [...new Set()]
- qk.* Factory fuer Query Keys
- floor_price ?? 0 — Null-Guard
- $SCOUT = Platform Credits (NIEMALS: Investment, ROI, Profit)
- Code-intern: "dpc" bleibt in Variablen/DB-Columns

## 3 Gesetze
1. Cache-Prefix Sharing: Dieser Block ist der gemeinsame Prefix
2. Nie leere Tool-Arrays: Jeder Agent hat explizite Tools
3. Human-Curated Context Only: Drafts in memory/learnings/drafts/, NICHT direkt in LEARNINGS.md
```

Fuege in JEDEN Agent-Definition als erste Zeile in Phase 0 hinzu:
```markdown
1. Lies `.claude/agents/SHARED-PREFIX.md` (gemeinsamer Context, Cache-Prefix)
```

---

### Task 13: Correction-Capture Hook

**Files:**
- Create: `C:\bescout-app\.claude\hooks\capture-correction.sh`
- Create: `C:\bescout-app\.claude\learnings-queue.jsonl`
- Modify: `C:\bescout-app\.claude\settings.json`

**Step 1: Erstelle capture-correction.sh**

```bash
#!/bin/bash
# capture-correction.sh — Captures user corrections for later review
# UserPromptSubmit hook. Appends to learnings-queue.jsonl.

QUEUE="C:/bescout-app/.claude/learnings-queue.jsonl"
INPUT="$CLAUDE_USER_PROMPT"

if [ -z "$INPUT" ]; then
  exit 0
fi

# Check for correction patterns (German + English)
if echo "$INPUT" | grep -iE "(nein[, ]|nicht so|falsch|stattdessen|eigentlich[, ]|hoer auf|das war|no[, ].*instead|wrong|don't|stop doing)" > /dev/null 2>&1; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  # Escape input for JSON
  ESCAPED=$(echo "$INPUT" | head -c 500 | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ')
  echo "{\"ts\":\"$TIMESTAMP\",\"type\":\"correction\",\"text\":\"$ESCAPED\"}" >> "$QUEUE"
fi

exit 0
```

**Step 2: Registriere Hook in settings.json**

Fuege `UserPromptSubmit` zum hooks-Objekt hinzu:

```json
"UserPromptSubmit": [
  {
    "hooks": [
      {
        "type": "command",
        "command": "bash C:/bescout-app/.claude/hooks/capture-correction.sh"
      }
    ]
  }
]
```

**Step 3: Initialisiere Queue**

```bash
touch .claude/learnings-queue.jsonl
```

---

### Task 14: Track-File-Changes Hook fuer Metriken

**Files:**
- Create: `C:\bescout-app\.claude\hooks\track-file-changes.sh`
- Modify: `C:\bescout-app\.claude\settings.json`

**Aktion:** PostToolUse Hook der geaenderte Files in `.claude/session-files.txt` trackt.

```bash
#!/bin/bash
# track-file-changes.sh — Tracks changed files for session metrics
FILE_PATH="$CLAUDE_FILE_PATH"
TRACKER="C:/bescout-app/.claude/session-files.txt"

if [ -n "$FILE_PATH" ]; then
  echo "$FILE_PATH" >> "$TRACKER"
fi
exit 0
```

Registriere als PostToolUse Hook mit matcher `Edit|Write`.

---

### Task 15: Session-Retro erweitern um Metriken-Output

**Files:**
- Modify: `C:\bescout-app\.claude\hooks\session-retro.sh`

**Aktion:** Am Ende von session-retro.sh, fuege JSONL Metriken-Zeile hinzu:

```bash
# === Session Metrics (Skynet) ===
METRICS_FILE="C:/bescout-app/memory/metrics/sessions.jsonl"
SESSION_FILES="C:/bescout-app/.claude/session-files.txt"
COUNTER_FILE="C:/bescout-app/.claude/session-counter"
QUEUE_FILE="C:/bescout-app/.claude/learnings-queue.jsonl"

FILES_CHANGED=0
if [ -f "$SESSION_FILES" ]; then
  FILES_CHANGED=$(sort -u "$SESSION_FILES" | wc -l)
  rm -f "$SESSION_FILES"
fi

CORRECTIONS=0
if [ -f "$QUEUE_FILE" ]; then
  CORRECTIONS=$(wc -l < "$QUEUE_FILE")
fi

COUNT=0
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE")
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "{\"ts\":\"$TIMESTAMP\",\"session\":$COUNT,\"files_changed\":$FILES_CHANGED,\"corrections\":$CORRECTIONS}" >> "$METRICS_FILE"
```

---

### Task 16: Deprecated Agent + Skills aufraeumen

**Files:**
- Delete: `C:\bescout-app\.claude\agents\implementer.md` (deprecated laut Analyse)
- Delete: `C:\bescout-app\.claude\skills\bencium-code-conventions\` (veraltet)
- Delete: `C:\bescout-app\.claude\skills\bencium-impact-designer\` (veraltet)

**Nur loeschen wenn Grep bestaetigt: KEINE aktiven Referenzen.**

---

### Task 17: Workflow-Reference updaten

**Files:**
- Modify: `C:\bescout-app\.claude\rules\workflow-reference.md`

**Aktion:** Paperclip-Referenzen durch Agent SDK + Skynet ersetzen. Agent-Tabelle aktualisieren.

---

## Wave 3: Feedback Automation + AutoDream (Tasks 18-23)

### Task 18: /reflect Skill erstellen

**Files:**
- Create: `C:\bescout-app\.claude\skills\reflect\SKILL.md`

**Aktion:** Skill der `.claude/learnings-queue.jsonl` reviewed, gute Eintraege zu `memory/learnings/drafts/` promoted, Queue leert.

---

### Task 19: /post-mortem Skill erstellen

**Files:**
- Create: `C:\bescout-app\.claude\skills\post-mortem\SKILL.md`

**Aktion:** Skill der nach Bug-Fixes Root Cause analysiert: Warum? Warum nicht frueher gefunden? Welche Regel haette verhindert? Output in `memory/post-mortems/`.

---

### Task 20: /metrics Skill erstellen

**Files:**
- Create: `C:\bescout-app\.claude\skills\metrics\SKILL.md`

**Aktion:** Skill der `memory/metrics/sessions.jsonl` aggregiert und zusammenfasst: Avg files/session, corrections trend, session count.

---

### Task 21: Fehler-zu-Regel Pipeline

**Files:**
- Modify: `C:\bescout-app\.claude\hooks\session-retro.sh`

**Aktion:** Nach Session-Retro: Grep in `memory/errors.md` nach wiederholten Fehler-Patterns. Bei 2x gleich → Draft-Regel in `memory/rules-pending/common-errors-pending.md`.

---

### Task 22: /promote-rule Skill erstellen

**Files:**
- Create: `C:\bescout-app\.claude\skills\promote-rule\SKILL.md`

**Aktion:** Skill der `memory/rules-pending/common-errors-pending.md` liest, Jarvis/Anil entscheiden lässt, approved Regeln nach `common-errors.md` synced.

---

### Task 23: AutoDream Subagent

**Files:**
- Create: `C:\bescout-app\.claude\agents\autodream.md`

**Aktion:** Agent-Definition fuer Memory Consolidation. 4 Phasen (Orient → Gather → Consolidate → Prune). Max 3 Min Timeout. Read + Glob + Grep + Edit Tools. NIEMALS <7 Tage altes loeschen. MEMORY.md max 25KB, ~150 chars/Zeile.

---

## Wave 4: Self-Improvement (Tasks 24-28)

### Task 24: /improve Skill erstellen

**Files:**
- Create: `C:\bescout-app\.claude\skills\improve\SKILL.md`

**Aktion:** Analysiert letzte 10 Session-Metriken + Retros. Identifiziert Patterns. Schreibt Proposal in `memory/improvement-proposals/`.

---

### Task 25: Session-Counter Threshold Check

**Files:**
- Modify: `C:\bescout-app\.claude\hooks\inject-learnings.sh`

**Aktion:** Bei Counter % 10 == 0: Ausgabe "Improvement-Review faellig. Nutze /improve."

---

### Task 26: Competing Hypotheses Prompt-Template

**Files:**
- Create: `C:\bescout-app\.claude\skills\competing-hypotheses\SKILL.md`

**Aktion:** Template fuer 3x-gescheiterter-Fix Eskalation. 3 Agents mit je 1 Hypothese, explizit gegenseitig widerlegen.

---

### Task 27: Skill Eval-Loop (/eval-skill)

**Files:**
- Create: `C:\bescout-app\.claude\skills\eval-skill\SKILL.md`
- Create: `C:\bescout-app\.claude\skills\eval-skill\cases\deliver.md`
- Create: `C:\bescout-app\.claude\skills\eval-skill\cases\cto-review.md`

**Aktion:** Meta-Skill der andere Skills gegen Test-Cases evaluiert. 5-10 Cases pro Skill. Pass-Rate berechnen. Bei <80% Prompt-Aenderung vorschlagen.

---

### Task 28: Workflow-Learnings fuer /deliver und /cto-review

**Files:**
- Create: `C:\bescout-app\.claude\skills\deliver\LEARNINGS.md`
- Create: `C:\bescout-app\.claude\skills\cto-review\LEARNINGS.md`

**Aktion:** Leere LEARNINGS.md mit Template. Agents schreiben Drafts, Jarvis promoted.

---

## Wave 5: Polish & Cleanup (Tasks 29-33)

### Task 29: Redundante Plugins deaktivieren

**Files:**
- Modify: `C:\Users\Anil\.claude\settings.json`

**Aktion:** Pruefe ob `greptile` und `ralph-loop` noch gebraucht werden. Deaktiviere ungenutzte.

---

### Task 30: Performance Rule erstellen

**Files:**
- Create: `C:\bescout-app\.claude\rules\performance.md`

**Aktion:** Extrahiere Performance-Regeln aus memory/decisions + patterns: Query-Limits, staleTime, React.memo, lazy imports.

---

### Task 31: Testing Rule erstellen

**Files:**
- Create: `C:\bescout-app\.claude\rules\testing.md`

**Aktion:** Test-Konventionen: vitest, test-writer Spec-Only, Snapshot-Tests vermeiden, DB-Tests mit echten Daten.

---

### Task 32: Full System Smoke Test

**Aktion:**
1. Starte neue Session → inject-learnings.sh laeuft? AutoDream Check?
2. Mache eine Code-Aenderung → auto-lint.sh + file-size-warning.sh + track-file-changes.sh?
3. Beende Session → quality-gate-v2.sh + session-retro.sh + Metriken?
4. Pruefe `.claude/session-counter` inkrementiert?
5. Pruefe `memory/metrics/sessions.jsonl` hat neue Zeile?
6. Spawne backend Agent → laedt SKILL.md + LEARNINGS.md?

---

### Task 33: Finaler Commit + Design Doc Update

**Aktion:**
1. Update Design Doc mit finalen Aenderungen
2. Update MEMORY.md mit Skynet-Status
3. Commit alles

```bash
git add -A
git commit -m "feat(skynet): complete agent ecosystem — 5 waves implemented"
```

---

## Abhaengigkeiten

```
Wave 1 (Foundation)
  Tasks 1-10: Unabhaengig voneinander, parallel ausfuehrbar

Wave 2 (Collective) → haengt von Wave 1 ab
  Task 11 (Agent Phase 4) → benoetigt Task 5 (Memory-Dirs)
  Task 12 (Shared Prefix) → benoetigt Task 2-4 (Domain Skills)
  Task 13-15 → unabhaengig

Wave 3 (Feedback) → haengt von Wave 1+2 ab
  Task 18 (/reflect) → benoetigt Task 13 (Correction-Capture)
  Task 21 (Fehler-Pipeline) → benoetigt Task 5 (rules-pending Dir)
  Task 23 (AutoDream) → benoetigt Task 10 (Counter + Timestamp)

Wave 4 (Self-Improvement) → haengt von Wave 3 ab
  Task 24 (/improve) → benoetigt Task 15 (Metriken)
  Task 27 (Eval-Loop) → benoetigt Task 28 (Skill Learnings)

Wave 5 (Polish) → haengt von allem ab
  Task 32 (Smoke Test) → benoetigt Wave 1-4
```
