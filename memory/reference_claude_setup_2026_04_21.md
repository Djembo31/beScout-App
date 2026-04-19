---
name: Claude-Setup 2026-04-21 (Slice 085)
description: Vollständiger Überblick des Claude-Code-Setups nach Slice 085 Meta-Upgrade. Skills, Hooks, MCPs, Agents, Notion-Integration, Obsidian-Vault, Workflow-Defaults.
type: reference
tags: [reference, workflow, infrastructure]
---

# Claude-Setup Ferrari-Konfiguration — Stand 2026-04-21

Nach Slice 085 Meta-Upgrade. Siehe [[CLAUDE]] für kompakte Version, diese Datei ist die volle Referenz.

## Workflow-Defaults (neu seit 085)

### 1. Parallel-Dispatch als Default
Ab **3+ Files cross-domain** → Agent-Team in Worktrees parallel, nicht seriell.
Playbook: [[.claude/skills/parallel-dispatch/SKILL]]
Solo nur bei <3 Files oder Money/Trading/Security (CEO-Scope).

### 2. context7 aggressive Policy
Bei Library-Questions (React/Next/Supabase/Tailwind/TanStack/zustand/next-intl/lucide-react) IMMER context7 VOR Antwort.
Hook `ship-context7-gate.sh` erinnert automatisch bei Detection im User-Prompt.

### 3. CTO-Review vor Merge
Bei feat/fix Commits → Reviewer-Agent oder `/cto-review` Skill BEVOR push.
Hook `ship-cto-review-gate.sh` warnt (blockt nicht).

### 4. Silent-Fail-Audit wöchentlich
`npx tsx scripts/silent-fail-audit.ts` → `worklog/audits/silent-fail-YYYY-MM-DD.md`
Findet: PostgREST .in() unchecked, .select() 1000-cap, error-swallow, hart-codierte State-Checks.
Skill: [[.claude/skills/silent-fail-audit/SKILL]]

### 5. Plan-Stack vor Build (3 Hats)
- `/plan-ceo-review` — Business-Perspektive
- `/plan-qa-review` — Edge-Cases (12 Kategorien)
- `/plan-legal-review` — Wording/Compliance/Phase

## Skills Inventory (22 aktiv)

### Workflow (4)
- `/ship` — Master SPEC→IMPACT→BUILD→PROVE→LOG
- `/spec` — Spec-Erstellung
- `/impact` — Cross-cutting Analyse
- `/deliver` — 4 Quality Gates

### Domain (3)
- `/beScout-backend` — DB/RPC/Services
- `/beScout-frontend` — Components/Pages/i18n
- `/beScout-business` — Compliance/Wording

### Review (4) — alle NEU oder aktiviert
- `/cto-review` — Deep Code Review
- `/plan-ceo-review` — **NEU** Business-Hat
- `/plan-qa-review` — **NEU** QA-Hat
- `/plan-legal-review` — **NEU** Legal-Hat

### Analyse (4)
- `/metrics` — Session-Metriken
- `/post-mortem` — Bug-Kausalität nach P1/P2
- `/improve` — alle 10 Sessions
- `/reflect` — Learnings-Queue

### Meta (7)
- `/parallel-dispatch` — **NEU** Agent-Team Playbook
- `/optimize` — **NEU** AutoResearch-Loop (Karpathy)
- `/silent-fail-audit` — **NEU** Silent-Fail-Scan
- `/competing-hypotheses` — 3× gescheiterter Fix
- `/eval-skill` — Skill-Testing
- `/promote-rule` — Pending Rules → common-errors
- `/typography` — UI-Typographie

## Hooks Inventory (28 aktiv, +3 neu seit 085)

### Edit/Write-Gates
- `ship-spec-gate.sh` — blockt kritische Pfade ohne Slice
- `ship-meta-plan-block.sh` — blockt memory/project_*.md
- `auto-lint.sh` + `file-size-warning.sh` + `test-reminder.sh` + `ship-post-service.sh`

### Bash-Gates
- `safety-guard.sh` — blockt destruktive Commands
- `pre-commit-guard.sh`
- `ship-proof-gate.sh` — blockt feat/fix ohne Proof
- **`ship-cto-review-gate.sh` (NEU)** — warnt vor feat/fix ohne cto-review

### Prompt-Gates
- `ship-status-gate.sh` — injiziert git log bei Status-Fragen
- **`ship-context7-gate.sh` (NEU)** — Library-Keyword-Detection → context7-Reminder

### Session-Lifecycle
- `ship-session-start.sh` — Morning-Briefing
- **`ship-kanban-sync.sh` (NEU)** — Kanban-Update-Reminder (Stop + SessionStart)
- `session-handoff-auto.sh`
- `ship-no-audit-slice.sh`
- `crash-recovery.sh` (StopFailure)
- `pre-compact-backup.sh`

## MCPs (12 konfiguriert)

| MCP | Status | Typischer Use |
|-----|--------|---------------|
| `supabase` | aktiv | SQL, Migrations, RLS-Check |
| `notion` | aktiv | Kanban, Slice-DB, Status-Pages |
| `vercel` | aktiv | Deployments, Logs |
| `context7` | **jetzt aggressive** | Library-Docs on-demand |
| `playwright` | aktiv | Browser-Automation, Screenshots |
| `chrome-devtools` | aktiv | Live-Debug, Performance |
| `sequential-thinking` | on-demand | Komplexe Architektur |
| `firecrawl` | on-demand | Web-Research (ersetzt WebSearch) |
| `sentry` | konfiguriert, unterbenutzt | Error-Monitoring |
| `memory` | konfiguriert, unterbenutzt | 2. Knowledge-Graph |
| `figma` | konfiguriert | Design-Reviews |
| `posthog` | nach Neustart | Analytics |

## Agents (9 verfügbar)

| Agent | Model | Skill | Isolation | Use-Case |
|-------|-------|-------|-----------|----------|
| `backend` | Sonnet 4.6 | beScout-backend | worktree | DB/RPC/Services |
| `frontend` | Sonnet 4.6 | beScout-frontend | worktree | UI/Components/i18n |
| `reviewer` | Opus 4.6 | cto-review | read-only | Code Review |
| `business` | Sonnet 4.6 | beScout-business | read-only | Compliance |
| `healer` | Sonnet 4.6 | — | main | Build/Test-Fixes |
| `test-writer` | Sonnet 4.6 | — | worktree | Tests aus Spec |
| `impact-analyst` | Opus 4.6 | — | read-only | Cross-cutting |
| `qa-visual` | Sonnet 4.6 | — | read-only | Playwright Screenshots |
| `autodream` | Sonnet 4.6 | — | main | Memory-Consolidation |
| `Explore` (built-in) | — | — | read-only | Deep Codebase-Research |
| `Plan` (built-in) | — | — | read-only | Architecture-Planning |

**Parallel-Dispatch-Regel:** Bei Multi-Domain-Feature → backend + frontend + test-writer in Worktrees GLEICHZEITIG starten. Dann reviewer prüft alle 3. Merge: backend zuerst (Service-Contract), frontend rebase, tests mergen.

## Notion-Integration

### Slice-Database (neu 2026-04-21)
URL: https://www.notion.so/57670082f03a4ac4a305f68186c981a0
Data Source: `764b2667-22fd-4207-8320-7c97a6706ca5`

Properties:
- Name (title)
- Slice-Nr (text, e.g. "085")
- Stage (SPEC/IMPACT/BUILD/PROVE/LOG/idle)
- Status (In Bearbeitung / Nicht begonnen / Erledigt)
- Started + Completed (dates)
- Commit (hash)
- Spec-URL + Proof-URL
- Kanban-Item (relation → Kanban)

Views:
- **Aktive Slices** (Board, grouped by Stage, filtered != Erledigt)
- **Timeline** (by Started/Completed)
- **Table** (all, default)

### Kanban (existierend)
URL: https://www.notion.so/20273b4a80e98050b014f37d659bed5c
Priority-Property: CRITICAL/P0/P1/P2/P3
Slices-Relation (neu): zeigt an welche Slices dieses Kanban-Item bearbeiten

### Status-Page (existierend)
URL: https://www.notion.so/34773b4a80e9814e97fac38763659dc0
Executive-View für CEO.

## Obsidian-Vault (memory/)

`memory/` ist plain Markdown + `.obsidian/` config.
Öffnen: Obsidian → "Open folder as vault" → `C:\bescout-app\memory`

### Aktive Plugins
file-explorer, global-search, switcher, graph, backlink, outgoing-link, tag-pane, properties, page-preview, daily-notes, templates, note-composer, command-palette, editor-status, bookmarks, outline, word-count, file-recovery

### Tags (siehe [[tags]])
Typ: `#user #project #reference #feedback #decision`
Domain: `#pattern #bug #compliance #money #security #data-quality #workflow #infrastructure`
Lebenszyklus: `#active #archive #stale #draft`
Prio: `#p0-critical #p1-high #p2-medium #p3-low`

### Graph-Color-Coding (in graph.json)
user=rot, feedback=orange, project=gelb, reference=blau, pattern=grün, bug=rot, decision=blau

## Workflow-Integration-Overview

```
User prompt
  ↓
UserPromptSubmit hooks (status-gate + context7-gate)
  ↓
Spec + Impact + CEO/QA/Legal reviews (Hats)
  ↓
/ship new "<task>" → active.md + Notion Slice-DB "In Bearbeitung"
  ↓
Parallel-Dispatch (backend + frontend + tests in Worktrees)
  ↓
Reviewer-Agent → PASS oder REWORK
  ↓
Healer (wenn REWORK)
  ↓
Merge (backend first)
  ↓
PreToolUse Bash-Hooks (proof-gate + cto-review-gate) on git commit
  ↓
Stop-Hooks (session-handoff + kanban-sync reminder)
  ↓
Log in worklog/log.md + Notion Slice-DB "Erledigt" + Kanban-Item update
```

## Scripts

### Silent-Fail-Audit
```bash
npx tsx scripts/silent-fail-audit.ts
```
Output: `worklog/audits/silent-fail-YYYY-MM-DD.md`
Scans: .in() chunking, .select() range, silent catch, error-swallow, data-destructure ohne error, hart-codierte state-checks.

## Next Upgrades (Post-Slice-085 Backlog)

- Memory-MCP Entity-Bootstrap (Knowledge-Graph parallel zu Files)
- `/improve` Cron-Schedule (alle 10 Sessions)
- Firecrawl TM-Parser-Experiment (Cloudflare-Bypass)
- Sentry-MCP Full-Integration (Error→Issue→Fix Workflow)
- Monitor-Loop Script für Deploy-Checks
- Role-Stack Erweiterung (Plan-Eng-Review, Plan-Security-Review)

## Historische Kontext

- Bis 2026-04-20: Solo-Claude sequenziell, 0 Agent-Dispatches in Worklog (trotz 9 Agents verfügbar)
- Retro-Befund: Setup matched 2026-Best-Practices fast 1:1, aber nur ~30% Aktivierung
- Deep-Research (Jock.pl, Codebridge, Razbakov, Till Freitag, Karpathy, Garry Tan) → Konsens-Patterns identifiziert
- Slice 085 aktiviert was vorhanden war + ergänzt fehlende Skills/Hooks
