---
name: Sentry-MCP + Memory-MCP Aktivierung (Slice 085 Post-Work)
description: Sentry + Memory MCPs aktiviert 2026-04-21. Sentry-Org/Project-Config, Memory-Graph-Bootstrap (15 Entities + 26 Relations), Workflow-Patterns.
type: reference
tags: [reference, infrastructure, workflow]
---

# Sentry + Memory MCP — Aktivierung 2026-04-21

Beide waren im Audit (Slice 085 Retro) als "konfiguriert aber ungenutzt" gelistet. Jetzt aktiv + bootstrapped.

## Sentry MCP

### Session-Config
- **Org:** `bescout`
- **Project:** `javascript-nextjs`
- **Region:** `https://de.sentry.io`
- **Auth:** kx.demirtas@gmail.com (User-ID 4248060)

### Workflow-Integration

| Trigger | Nutze |
|---------|-------|
| Bug-Report vom User | `mcp__sentry__search_issues` mit natural-language-Query |
| Production-Error untersuchen | `mcp__sentry__search_issue_events` fuer specific issue |
| AI-Analyse eines Issues | `mcp__sentry__analyze_issue_with_seer` |
| Deep-Dive Event | `mcp__sentry__get_sentry_resource` mit issue-URL |
| Release-Tracking | `mcp__sentry__find_releases` |
| Dashboard: aktuelle Errors | `search_issues` als Teil des Morning-Briefings |

### Status-Check 2026-04-21
- Production clean: **0 unresolved Issues** letzte 7 Tage
- Keine Events affecting users

### Post-085 Backlog

1. **Sentry → common-errors.md Knowledge-Flywheel:** Bei JEDEM Production-Error den Pattern in common-errors.md eintragen (wie Bug-Fix-Patterns).
2. **Hook: Morning-Sentry-Check** — optional, bei SessionStart `search_issues` ausfuehren und in Briefing anzeigen wenn > 0 Issues.
3. **Release-Tagging** — Commits mit Sentry-Releases verknuepfen fuer Issue-to-Commit-Navigation.

---

## Memory MCP

### Graph-State 2026-04-21

- **15 Entities** gebootstrapped:
  - People: Anil Demirtas
  - Agents: Claude (CTO)
  - Projects: BeScout
  - Workflows: SHIP-Loop
  - Patterns: Parallel-Dispatch, Knowledge-Flywheel
  - Slices: 085, 086
  - External: Notion Kanban, Notion Slice-DB, Obsidian Vault
  - Constraints: Phase 1 Licensing, Money-Invariant, Compliance-Wording-Verbot
  - Tools: silent-fail-audit Script

- **26 Relations** across all:
  - Anil owns BeScout
  - Claude orchestrates BeScout, reports_to Anil
  - BeScout bound_by Money-Invariant, Compliance-Wording-Verbot
  - BeScout uses_workflow SHIP-Loop
  - SHIP-Loop enables Parallel-Dispatch, feeds Knowledge-Flywheel
  - Slice 085 introduced Parallel-Dispatch, silent-fail-audit, Notion Slice-DB, Obsidian Vault
  - Slice 086 follows Slice 085, demonstrates Parallel-Dispatch
  - ... etc

### Wie Memory-MCP den Workflow staerkt

**Unterschied zu Files:**
- Files (memory/) = Human-readable, persistent, git-tracked
- Memory-MCP = Graph-queryable, entity-extracted, struktur-semantic

**Beide parallel pflegen:**
- Neuer Slice → Entity in Memory-MCP + Eintrag in worklog/log.md
- Neuer Pattern → Observations im Entity + Regel in common-errors.md
- Neue Constraint → Entity + Relation in Graph + Doku in rules/

### Workflow-Integration

| Aktion | Memory-MCP Nutzung |
|--------|--------------------|
| Session-Start | `read_graph` fuer schnellen Ueberblick |
| "Was war Slice 086 nochmal?" | `search_nodes("Slice 086")` |
| "Zeig alle Money-relevanten Constraints" | `search_nodes("Money")` |
| Bug entdeckt | Neuer Entity `Bug-NNN` + Relations zu Slices |
| Neuer Agent-Dispatch | Observation "used agent X" in Slice-Entity |
| Neue Feature-Decision | `create_entities` + Relations zu Constraints |

### Graph-Query-Pattern (Beispiele)

```
# "Welche Slices haben Parallel-Dispatch genutzt?"
search_nodes("Parallel-Dispatch")

# "Was weisst du ueber Anil?"
search_nodes("Anil")

# "Alle Knowledge-Flywheel Abhaengigkeiten"
search_nodes("Knowledge-Flywheel")
```

### Post-085 Backlog

1. **Entity-Sync mit worklog/log.md:** Jeder neue Slice = Entity. Jede Slice-PR = Observation.
2. **Pattern-Migration aus common-errors.md:** Top-Patterns auch als Memory-Entities fuer Graph-Navigation.
3. **Bug-Entity-Lifecycle:** Bug-entdeckt → Entity → Slice-Fix → Observation "fixed in Slice NNN"
4. **Agent-Dispatches als Events:** Entity mit observations "Slice 086 dispatched backend-agent at 23:30"

---

## Wenn beide MCPs aktiv sind (kombinierter Wert)

**Incident-Workflow:**
1. Sentry meldet neuen Error
2. `mcp__sentry__analyze_issue_with_seer` gibt AI-Analyse
3. Memory-MCP: Entity fuer Bug anlegen, Relation zu Slice/File
4. common-errors.md: Pattern dokumentieren
5. Neuer Slice fuer Fix
6. Nach Fix: Observation am Bug-Entity "fixed in Slice NNN, commit X"

**Periodic Knowledge-Review:**
1. Monatlich: `read_graph` → Welche Muster tauchen auf?
2. Neue High-Impact-Entities identifizieren
3. Entities ohne Relations archivieren oder connecten
4. Stale Observations pruefen + updaten

## Quellen

- Sentry Docs: https://docs.sentry.io/
- Memory MCP: https://github.com/modelcontextprotocol/servers/tree/main/src/memory
- Karpathy LLM-Wiki-Pattern: https://x.com/karpathy
