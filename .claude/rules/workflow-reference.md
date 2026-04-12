---
description: How I Work — Spec-Driven Development + Agents, Skills, Tools, MCP
globs: "memory/session-handoff.md"
---

## How I Work

Spec-Driven. Code lesen, nicht annehmen. Fertig heisst fertig — keine Restarbeit.

### Flow
1. **SPEC** — Aufgabe verstehen. Relevanten Code LESEN. Bei 3+ Files: `/spec` Skill.
2. **IMPLEMENT** — Exakt was in der Spec steht. Nichts extra.
3. **VERIFY** — tsc + Tests + Visual Check (bei UI). Beweis zeigen.

### Vor Code schreiben
- Betroffene Files + deren Consumers identifizieren (grep)
- Bestehende Patterns im Codebase finden (grep/read)
- Bei DB/RPC/Service-Aenderungen: `/impact` Skill
- Bei Library-Fragen: `context7` MCP
- Bei Architektur-Entscheidungen: `sequential-thinking` MCP
- "required -> optional" = Data Contract Change -> ERST alle Consumer greppen

### Waehrend Implementation
- NUR was definiert wurde. Neues Problem -> separater Task.
- Vor jeder Loeschung: grep nach allen Consumers.
- Bei Unsicherheit: Code lesen, nicht raten.
- Einfachste Loesung zuerst. Bestehenden Code nutzen > neu schreiben.

### Verification
| Aenderung | Beweis |
|-----------|--------|
| Jede | `tsc --noEmit` clean |
| Logik/Service | Betroffene Tests gruen |
| UI | Playwright Screenshot 390px |
| DB/RPC | SELECT Query mit echten Daten |
| i18n | DE + TR verifiziert |

### Prinzipien
1. **Code lesen, nicht annehmen.** Jede Hypothese verifizieren.
2. **Einfachste Loesung zuerst.** 1 Feature bewegen < 8 Komponenten bauen.
3. **Exakt was gefragt.** Kein Bonus-Refactoring, kein Scope Creep.
4. **2x gescheitert -> STOP.** Andere Hypothese oder Hilfe holen.
5. **Messen vor optimieren.** Keine Performance-Aenderung ohne Baseline.
6. **Fertig = verifiziert.** "tsc clean" allein ist kein Beweis. "Sollte passen" ist kein Beweis.

### After Bug-Fix: Knowledge Compilation (Karpathy-Pattern)
1. **Pattern → common-errors.md** — SOFORT in derselben Session, kein Draft/Pending
2. **Analyse → Wiki-Seite** — Bei komplexen Investigations: `memory/semantisch/projekt/[topic].md`
3. **cortex-index → Routing** — Neues Routing wenn Bug eine neue Domain betrifft
4. **Session-Digest** — Am Ende: Lektionen + Warnungen fuer morgen schreiben
5. **Gute Analysen zurueck ins Wiki filen** — Chat-Antworten die wertvoll sind NICHT sterben lassen

### Context-Management Strategie
- Research (>3 Files) → Explore Agent (schuetzt Primary Context)
- Nach komplexer Implementation → Reviewer Agent mit frischem Context
- Impact-Check vor DB/RPC/Service → Impact Agent
- Context >500K → Verification an Agent delegieren, NICHT selbst
- Gute Analysen → Wiki-Seite erstellen, nicht in Chat-History verlieren

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

## Hooks (SSOT: `.claude/settings.json`)

| Event | Hook | Zweck |
|-------|------|-------|
| PostToolUse (Edit/Write) | auto-lint.sh | Formatierung |
| PostToolUse (Edit/Write) | file-size-warning.sh | Dateigroesse |
| PostToolUse (Edit/Write) | track-file-changes.sh | Session-Tracking |
| PostToolUse (Edit/Write) | test-reminder.sh | Vitest-Reminder bei Service/RPC-Edits |
| PreToolUse (Bash) | safety-guard.sh | Destruktive Commands blocken |
| PreCompact | pre-compact-backup.sh | Context-Backup |
| PreCompact | inject-context-on-compact.sh | Context-Injection |
| UserPromptSubmit | capture-correction.sh | Korrekturen erfassen |
| Stop | session-handoff-auto.sh | Handoff schreiben |
| Stop | session-retro.sh | Retro generieren |
| Stop | quality-gate-v2.sh | Session-Counter |
| Stop | pattern-check.sh | Fix-Commits ohne Error-Pattern? |
| SessionStart | morning-briefing.sh | Status + Digest + AutoDream-Check |
| SessionStart | inject-learnings.sh | Learnings-Injection |

## 3 Gesetze

1. **Cache-Prefix Sharing:** SHARED-PREFIX.md = gemeinsamer Prefix aller Agents
2. **Nie leere Tool-Arrays:** Jeder Agent hat explizite Tools
3. **Human-Curated Context Only:** Agents schreiben Drafts, Menschen promoten

## Session Lifecycle

```
SessionStart → Morning Briefing (Git + tsc + Sprint + Errors)
  ↓
Waehrend Session → auto-lint + file-size-warning + safety-guard
  ↓
Stop → session-handoff-auto (Uebergabe fuer naechste Session)
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
