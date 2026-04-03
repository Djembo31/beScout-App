---
description: Workflow Reference — Agents, Skills, Tools, MCP (Skynet v1)
globs: "memory/session-handoff.md"
---

## Agent-Team (Skynet)

| Agent | Model | Skill | Isolation | Zweck |
|-------|-------|-------|-----------|-------|
| backend | Sonnet 4.6 | beScout-backend | worktree | DB, RPCs, Services |
| frontend | Sonnet 4.6 | beScout-frontend | worktree | UI, Components, i18n |
| reviewer | Opus 4.6 | cto-review | read-only | Code Review |
| business | Sonnet 4.6 | beScout-business | read-only | Compliance |
| healer | Sonnet 4.6 | — | main | Fix Build/Test Errors |
| test-writer | Sonnet 4.6 | — | worktree | Tests from Spec |
| impact-analyst | Opus 4.6 | — | read-only | Cross-cutting Analysis |
| qa-visual | Sonnet 4.6 | — | read-only | Visual QA (Playwright) |
| autodream | Sonnet 4.6 | — | main | Memory Consolidation |

Alle Agents laden: SHARED-PREFIX.md → Domain-SKILL.md → LEARNINGS.md → Phase 4 LERNEN

## MCP Stack

| Server | Zweck | Wann nutzen |
|--------|-------|-------------|
| playwright | Browser Automation, Screenshots | Visual QA, E2E Testing |
| supabase | DB Operations, SQL, Migrations | Backend-Arbeit, RLS Check |
| context7 | Library Docs on-demand | Bei JEDER Library-Frage (React, Next, Tailwind, Supabase) |
| sequential-thinking | Strukturiertes Denken | Architektur-Entscheidungen, komplexe Design-Fragen |

## Skill-Arsenal (17 Skills)

### Domain (3)
| Skill | Trigger |
|-------|---------|
| `/beScout-backend` | DB, RPCs, Services, Supabase |
| `/beScout-frontend` | UI, Components, Hooks, i18n |
| `/beScout-business` | Compliance, Wording, Legal |

### Workflow (3)
| Skill | Trigger |
|-------|---------|
| `/deliver` | Feature implementieren (4 Quality Gates) |
| `/cto-review` | Code Review nach Implementation |
| `/impact` | VOR DB/RPC/Service-Aenderungen |

### Spec + Planung (1 — PFLICHT)
| Skill | Trigger |
|-------|---------|
| `/spec` | **PFLICHT bei Feature/Redesign/Refactoring (3+ Files).** Migration-First Spec → Plan → Execute. Ersetzt brainstorming + writing-plans. |

### Feedback (4)
| Skill | Trigger |
|-------|---------|
| `/reflect` | Alle 5 Sessions oder Queue >10 |
| `/post-mortem` | Nach P1/P2 Bug-Fix |
| `/metrics` | Session-Metriken anzeigen |
| `/promote-rule` | Pending Rules >3 oder >7 Tage |

### Meta (3)
| Skill | Trigger |
|-------|---------|
| `/improve` | Alle 10 Sessions |
| `/competing-hypotheses` | 3x gescheiterter Fix |
| `/eval-skill [name]` | Skill testen |

### Superpowers (extern, 4)
| Skill | Trigger |
|-------|---------|
| `/superpowers:brainstorming` | Neues Feature, Architektur |
| `/superpowers:writing-plans` | Nach Brainstorming |
| `/superpowers:subagent-driven-development` | Plan ausfuehren (diese Session) |
| `/superpowers:executing-plans` | Plan ausfuehren (neue Session) |

### Tools (extern, 3)
| Tool | Trigger |
|------|---------|
| `/skill-creator` | Neuen Skill erstellen/verbessern |
| `/codex:rescue` | Circuit-Breaker Eskalation |
| `context7` MCP | Library-Docs (React, Next, Tailwind) |

## Hooks (14)

| Event | Hook | Typ |
|-------|------|-----|
| PostToolUse (Edit/Write) | auto-lint.sh | command |
| PostToolUse (Edit/Write) | file-size-warning.sh | command |
| PostToolUse (Edit/Write) | track-file-changes.sh | command |
| PreToolUse (Bash) | safety-guard.sh | command |
| PreCompact | pre-compact-backup.sh | command |
| PreCompact | inject-context-on-compact.sh | command |
| Stop | session-handoff-auto.sh | command |
| Stop | quality-gate-v2.sh | command (Lock-Guard) |
| SessionEnd | session-retro.sh + JSONL Metriken | command |
| SessionStart | inject-learnings.sh + AutoDream Check | command |
| StopFailure | crash-recovery.sh | command |
| Notification | PowerShell Alert (global) | command |

## 3 Gesetze

1. **Cache-Prefix Sharing:** SHARED-PREFIX.md = gemeinsamer Prefix aller Agents
2. **Nie leere Tool-Arrays:** Jeder Agent hat explizite Tools
3. **Human-Curated Context Only:** Agents schreiben Drafts, Menschen promoten

## Self-Improvement Loop

```
SessionStart → inject-learnings + AutoDream Check
  ↓
Waehrend Session → Trigger-Rules + Correction-Capture + File-Tracking
  ↓
SessionEnd → Quality-Gate + Retro + JSONL Metriken + Handoff
  ↓
Periodisch → /reflect (5 Sessions) → /improve (10 Sessions) → AutoDream (24h/5 Sessions)
```

## Wann Agent, wann selbst?

| Sub-Agent | Selbst |
|---|---|
| Neue Datei (isoliert) | Quick Fix <2 Min |
| 10+ Files durchsuchen | Kontext-schwere Logik |
| Tests schreiben | Geld/Wallet/Security |
| Code Review | Brainstorming |
| Compliance Audit | Architektur-Entscheidungen |

## Paperclip (Dashboard-Only)

Server: localhost:3100. Company: `cab471f1-96c2-403d-b0a7-1c5bf5db0b5d`.
Nur noch fuer Status-Dashboard bei Bedarf. Execution laeuft ueber Agent SDK.

## Agent SDK (Python)

```bash
python scripts/agent-sdk/run_agent.py --agent engineer --task "Fix X"
python scripts/agent-sdk/paperclip_bridge.py --agent qa --issue-id UUID --task "Run tests"
```

Config: `scripts/agent-sdk/config.py` | Hooks: `scripts/agent-sdk/hooks.py`
