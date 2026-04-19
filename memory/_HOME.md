---
name: Memory Vault Home
description: Obsidian Landing-Page für memory/ Vault. Einstieg nach "Open folder as vault". Navigations-Hub mit Wiki-Links zu allen Kern-Files gruppiert nach Thema.
type: reference
tags: [reference, workflow, index]
---

# 🏠 BeScout Memory Vault

> Obsidian-Vault für persistentes Gedächtnis. Karpathy-Pattern: LLM pflegt, Anil kuratiert.
> Source-of-Truth Split siehe [[reference_notion_integration]].

## Quick-Start

1. **Links öffnen** — Ctrl+Click auf jede `[[wiki-link]]` unten
2. **Graph-View** — `Ctrl+G` zeigt farbcodiertes Wissensnetz nach Tags
3. **Tag-Pane** — Rechts öffnen → alle `#tags` browsebar
4. **Command Palette** — `Ctrl+P` → "Open graph view", "Search", "Tags"
5. **Backlinks** — Rechte Sidebar zeigt wer auf aktuellen File verlinkt

## 👤 User-Kontext

- [[user_full_context]] — Anil: Rolle, Ziele, Arbeitsweise
- [[ceo-approval-matrix]] — Was entscheide ich (CEO) vs. was du (CTO)
- [[session-handoff]] — Was lief in letzter Session

## 🧭 Navigation / Routing

- [[MEMORY]] — Index-File (auto-loaded in JEDER Session)
- [[cortex-index]] — Routing-Tabelle: wo liegt welches Wissen
- [[tags]] — Tag-Glossary (#user, #pattern, #bug, #decision, etc.)

## 📋 Feedback / Präferenzen

Siehe `#feedback` Tag im Tag-Pane. Key-Files:
- [[feedback_work_expectations]] — Disziplin, exakt befolgen
- [[feedback_cto_orchestrator]] — Agents sind Team, ich orchestriere
- [[feedback_polish_functional_pflicht]] — Polish = visual + functional click-through
- [[feedback_scope_all_leagues_launch_ready]] — Alle 7 Ligen gleicher Stand
- [[feedback_imperium_vision]] — CEO-CTO-Modell, globaler Marktplatz
- [[feedback_ferrari_quality]] — 1000× Quality-Standard

## 🔧 Infrastructure / Tools

- [[reference_claude_setup_2026_04_21]] — **Ferrari-Config**: 22 Skills + 28 Hooks + 12 MCPs + 9 Agents
- [[reference_notion_integration]] — Source-of-Truth Split worklog/memory/Notion
- [[reference_cto_tools]] — Sentry + Vercel + GitHub gh + Supabase + Playwright MCP
- [[reference_migration_workflow]] — NIE `supabase db push`, nur `apply_migration`

## 🏗️ Projekt-Status

- [[current-sprint]] — aktueller Sprint
- [[bug-tracker]] — offene Bugs
- [[ar-counter]] — Audit-Request-Counter

## 📚 Wissen / Patterns

- [[patterns]] — 20 etablierte Code-Patterns
- [[errors]] — historische Errors (Duplikat zu common-errors.md)
- [[feature-map]] — Frontend-Inventar (Pages, Components, Hooks)
- [[service-map]] — Backend-Inventar (Services, RPCs)

## 🎯 Entscheidungen

- [[decision_dpc_to_scout_card]] — UI-only Umbenennung DPC→Scout Card
- [[decision_pilot_token_strategy]] — Founding Pass, Legal Phases
- [[business-context]] — Fee-Tiers, Club-Economie, Token-Pricing

## 🔍 Deep-Dives

- [[data-integrity-deep-dive-2026-04-18]] — Data-Quality Root-Cause-Analyse
- [[next-session-briefing-2026-04-21-full]] — Gold-Standard 86.6% Report

## 📂 Archive

- `_archive/` — abgeschlossene Projekte (bescout-liga, ferrari-10x, operation-beta-ready)
- `episodisch/journals/` — 30+ tagesweise Journale (Live-Tracking)

## Obsidian-Tipps

### Graph-View (Ctrl+G)
- Farben sind per Tag gesetzt (siehe [[tags]]):
  - 🔴 #user · 🟠 #feedback · 🟡 #project
  - 🔵 #reference · 🟢 #pattern · 🔴 #bug · 🔵 #decision
- Filter: `tag:#pattern AND tag:#money` zeigt nur Money-Patterns
- Orphan-Nodes (keine Links) werden angezeigt, können ausgeblendet werden

### Tag-Pane (rechte Sidebar)
- Alle Tags mit Count
- Click → zeigt alle Files mit diesem Tag

### Command Palette (Ctrl+P)
- "Open graph view" — Wissensnetz
- "Reveal file in navigation" — Sidebar-Navigation
- "Open backlinks" — wer linkt auf dieses File

### Empfohlene Community-Plugins (optional)
- **Dataview** — SQL-artige Queries auf Frontmatter
- **Templater** — Template-System für neue Notes
- **Excalidraw** — handgezeichnete Diagramme

## Nächste Kuration

Die meisten memory/-Files haben noch keine Tags. Systematisches Tagging ist **Post-085 Backlog**:
- #feedback_* files → `#feedback`
- #project_* files → `#project`
- #decision_* files → `#decision`
- Reference-Files → `#reference`

Bis dahin: Nutze `[[MEMORY]]` und `[[cortex-index]]` als primäre Navigation, der Graph wird mit Zeit schöner.
