# GOD MODE Ultra — Orchestrator Architecture

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Claude from a solo developer into an orchestrating Technical Director who delegates research, implementation, and verification to specialized sub-agents while keeping its own context clean for decisions and coordination.

**Architecture:** 4 operating modes (Solo → Assisted → Orchestrated → Full Team) selected automatically based on task complexity. Research Pipeline writes findings to persistent files (.claude/research/). Specs contain TypeScript contracts as machine-readable interfaces between agents. Implementation agents work in isolated worktrees. Verification agents run parallel quality checks.

**Tech Stack:** Claude Code Agent tool (sub-agents + worktrees + resume), existing MCP servers (Supabase, Playwright, Context7, Figma), file-based persistent knowledge (.claude/research/).

---

## Overview of Changes

```
CREATE:
  .claude/research/                    — persistent research output directory
  .claude/research/.gitkeep            — keep dir in git
  .claude/rules/orchestrator.md        — new rule: orchestration modes + agent system
  .claude/research/agent-prompts.md    — standardized prompt templates per agent role

MODIFY:
  .claude/rules/core.md                — slim Feature-Lifecycle, reference orchestrator.md
  CLAUDE.md                            — add Orchestrator reference
  memory/MEMORY.md                     — add GOD MODE section
  memory/decisions.md                  — ADR-038: GOD MODE Ultra
  memory/current-sprint.md             — update status
  .gitignore                           — add .claude/research/*.md (keep templates)
```

---

### Task 1: Create Research Directory

**Files:**
- Create: `.claude/research/.gitkeep`
- Modify: `.gitignore`

**Step 1: Create the research directory**

```bash
mkdir -p .claude/research/archive
touch .claude/research/.gitkeep
```

**Step 2: Update .gitignore**

Add to `.gitignore`:
```
# Research pipeline — agent outputs (temporary, feature-specific)
.claude/research/*-raw.md
.claude/research/*-verified.md
.claude/research/*-plan.md
.claude/research/*-intel.md
.claude/research/archive/
# Keep templates and .gitkeep
!.claude/research/.gitkeep
!.claude/research/agent-prompts.md
```

**Step 3: Verify**

Run: `ls -la .claude/research/`
Expected: `.gitkeep` exists

---

### Task 2: Create Orchestrator Rule File

**Files:**
- Create: `.claude/rules/orchestrator.md`

This is the CORE new file. It defines the 4 operating modes, the Research Pipeline, agent roles, and the decision matrix.

**Step 1: Write `.claude/rules/orchestrator.md`**

```markdown
---
description: Orchestrator-Modus — Agent-Delegation, Research Pipeline, Modes
globs: "**/*"
---

## Operating Modes (ICH waehle automatisch, Anil kann ueberschreiben)

| Mode | Trigger | Agents | Wann |
|------|---------|--------|------|
| **0 SOLO** | Bugfix, <10 Zeilen | 0 | Ich kenne den Code, schneller allein |
| **1 ASSISTED** | Kleine Aenderung, 1-3 Files | 1 Research | Brauche Kontext, implementiere selbst |
| **2 ORCHESTRATED** | Feature, 3-10 Files | 3-5 | Standard fuer mittlere Features |
| **3 FULL TEAM** | Architektur, 10+ Files | 5-7 | Nur bei "deep dive" oder neuer Domain |

Anil-Overrides: "fix das kurz" → 0 | "mach das" → 1-2 | "orchestriere" → 2-3 | "full team" → 3

## Meine Rolle als Orchestrator (Mode 2-3)

ICH lese KEINE Source-Files direkt. ICH schreibe KEINEN Code direkt.
ICH schreibe die Spec (Contract), dispatche Agents, lese Summaries, entscheide.

Mein Context enthaelt NUR:
- Projekt-DNA (CLAUDE.md, MEMORY.md, Rules) ~30K
- Gespraech mit Anil
- Feature-Spec (Contract) ~5K
- Agent-Results (Summaries) ~15K
- Entscheidungen + Dispatch-Log ~10K
- REST FREI fuer Iteration (~130K)

## Research Pipeline (1-3 Passes)

DEFAULT: 1 Pass. Mehr nur wenn:
- 2 Passes: DB-Aenderung ODER >5 Files ODER Security/Performance-relevant
- 3 Passes: Anil sagt "deep dive" ODER neue Domain/Library

| Pass | Agent | Input | Output | Ziel |
|------|-------|-------|--------|------|
| 1 EXPLORE | Scout + Docs (parallel) | Frage/Feature | `{name}-intel.md` | Breite Exploration |
| 2 VERIFY | Verify Agent | intel.md | `{name}-verified.md` | Fakten pruefen |
| 3 DISTILL | Plan Agent | verified.md | `{name}-plan.md` | Bauplan mit Zeilen |

Output immer nach `.claude/research/`. Archivieren wenn Feature done.

## Implementation Agents (Mode 2-3)

Spec = Contract. ALLE Agents bekommen dieselbe Spec mit TypeScript Interfaces.

**Welle 1** (sequentiell, Basis muss stehen):
- DB Agent (worktree): Migration, RPC, RLS → Return: Summary + File-Liste

**Welle 2** (parallel, nach Welle 1):
- Service Agent (worktree): Service-Funktionen, Hooks → bekommt DB Agent Summary
- UI Agent (worktree): Components, Mobile+Desktop → bekommt Service Signatures aus Spec
- Test Agent (worktree): Unit + E2E Tests → bekommt nur Spec

**Iteration:** Wenn Review-Agent Fehler findet → Resume verantwortlichen Agent mit Feedback.

## Verification Agents (Mode 2-3, parallel)

- Build Agent: `npx next build` → pass/fail + errors
- Review Agent: Code vs Spec vs Rules vs common-errors.md → Findings
- QA Agent: Playwright Screenshots → visuelle Kontrolle (wenn UI)

## Spec als Contract (PFLICHT fuer Mode 2-3)

Spec MUSS enthalten (zusaetzlich zum bestehenden Template):

```typescript
// === CONTRACTS (alle Agents implementieren gegen diese) ===

// DB Contract
CREATE TABLE/ALTER TABLE ...

// Type Contract
interface FeatureEntity { ... }

// Service Contract
export function featureAction(input: Type): Promise<ReturnType>

// Hook Contract
export function useFeature(id: string): { data: Type; isLoading: boolean }

// Component Contract
<FeatureComponent prop={Type} />
```

## Agent-Prompts → `.claude/research/agent-prompts.md`

Standardisierte Prompts fuer jeden Agent-Typ. Siehe Datei.
```

**Step 2: Verify file created**

Run: `wc -l .claude/rules/orchestrator.md`
Expected: ~80 lines (within rule file limit)

---

### Task 3: Create Agent Prompt Templates

**Files:**
- Create: `.claude/research/agent-prompts.md`

**Step 1: Write standardized prompts**

```markdown
# Agent Prompt Templates

> Standardisierte Prompts fuer den Orchestrator. Copy-Paste in Agent-Tool prompt.

## Research Agents

### Scout Agent (Codebase Exploration)
```
Recherchiere im BeScout-Projekt fuer Feature: {FEATURE_NAME}

Aufgabe:
1. Lies CLAUDE.md und relevante .claude/rules/ Files fuer Projekt-Kontext
2. Finde bestehende Services/Components/Types die wiederverwendet werden koennen
3. Pruefe DB-Schema (via Supabase MCP oder types/index.ts) fuer relevante Tables
4. Identifiziere Patterns die in aehnlichen Features verwendet werden

Schreib deine Findings nach: .claude/research/{name}-intel.md
Format:
- Bestehende Code-Stellen: Pfad:Zeile + was sie tun
- Wiederverwendbare Components/Services
- Relevante DB Tables + Columns
- Empfohlene Patterns (mit Verweis auf bestehende Nutzung)
- Offene Fragen / Unklarheiten

WICHTIG: Nur Fakten, kein Raten. Wenn unsicher → als Frage markieren.
```

### Docs Agent (External Documentation)
```
Recherchiere externe Dokumentation fuer: {TOPIC}

Aufgabe:
1. Nutze Context7 MCP fuer Library-Docs ({LIBRARY_NAME})
2. Finde: API-Referenz, Best Practices, bekannte Limitationen
3. Destilliere auf das was fuer BeScout relevant ist

Schreib Ergebnisse in: .claude/research/{name}-intel.md (append zu Scout-Findings)
Format:
- Relevante API: Function Signatures + Beschreibung
- Empfohlener Approach fuer unseren Use Case
- Bekannte Pitfalls / Limitationen
- Code-Beispiele (nur wenn direkt nutzbar)

Max 50 Zeilen. Kein Copy-Paste aus Docs — nur destilliertes Wissen.
```

### Verify Agent (Fact-Checking)
```
Verifiziere Research-Findings fuer: {FEATURE_NAME}

Input: Lies .claude/research/{name}-intel.md

Aufgabe:
1. Pruefe JEDE genannte Function/Table/Component: existiert sie wirklich?
2. Pruefe Pfad:Zeile Angaben — stimmen sie?
3. Pruefe empfohlene Patterns — werden sie tatsaechlich so verwendet?
4. Korrigiere Fehler, markiere Unverifizierbares

Schreib nach: .claude/research/{name}-verified.md
Format:
- ✅ Verifiziert: [was stimmt]
- ❌ Korrigiert: [was falsch war → was richtig ist]
- ⚠️ Nicht verifizierbar: [was geprueft werden muss]

NUR verifizierte Fakten weitergeben. Lieber weniger als falsch.
```

### Plan Agent (Implementation Blueprint)
```
Erstelle Implementation-Bauplan fuer: {FEATURE_NAME}

Input: Lies .claude/research/{name}-verified.md + Feature-Spec in memory/features/{name}.md

Aufgabe:
1. Exakte Migration SQL (wenn DB-Aenderung)
2. Exakte Function Signatures fuer Services
3. Exakte File-Pfade + Zeilennummern wo Aenderungen noetig
4. Welche bestehenden Patterns als Vorlage kopieren (mit Pfad:Zeile)
5. Reihenfolge der Implementation (was haengt von was ab)

Schreib nach: .claude/research/{name}-plan.md
Format: Nummerierte Schritte, jeder Schritt mit exaktem File-Pfad, exakter Aenderung.
Kein Prosa — nur Bauplan.
```

## Implementation Agents

### DB Agent
```
Implementiere DB-Layer fuer Feature: {FEATURE_NAME}

Spec: Lies memory/features/{name}.md — Sektion "Contracts" ist dein Interface.
Context: Lies CLAUDE.md fuer Projekt-Konventionen.
Plan: Lies .claude/research/{name}-plan.md fuer Implementation-Details.

Aufgabe:
1. Erstelle Supabase Migration (via Supabase MCP apply_migration)
2. Erstelle RPC Functions (SQL)
3. Erstelle RLS Policies
4. REVOKE Pattern beachten: FROM PUBLIC, authenticated, anon

Return: Liste der erstellten Migrations/RPCs + exakte Signaturen.
```

### Service Agent
```
Implementiere Service-Layer fuer Feature: {FEATURE_NAME}

Spec: Lies memory/features/{name}.md — Sektion "Contracts".
DB-Info: {DB_AGENT_SUMMARY}
Context: Lies CLAUDE.md + .claude/rules/core.md fuer Konventionen.

Aufgabe:
1. Service-Funktionen in lib/services/{service}.ts
2. React Query Hooks (keepPreviousData, staleTime min 30s)
3. Types in types/index.ts (wenn neue Interfaces noetig)
4. Bestehende Patterns folgen (Service Layer Pattern, Null-Safe Closures)

Return: Erstellte/geaenderte Files + exportierte Function Signatures.
```

### UI Agent
```
Implementiere UI-Components fuer Feature: {FEATURE_NAME}

Spec: Lies memory/features/{name}.md — Sektion "Contracts" + "UI States".
Design System: Lies CLAUDE.md Sektion "Design System".
Components: Lies .claude/rules/ui-components.md.
Service Signatures: {SERVICE_SIGNATURES_FROM_SPEC}

Aufgabe:
1. Components erstellen (Mobile-First, 360px min)
2. ALLE States: Loading, Empty, Error, Success, Disabled
3. Bestehende UI wiederverwenden: Card, Button, Modal, TabBar, PlayerDisplay
4. cn() fuer classNames, Design System Farben/Borders/Fonts
5. Deutsche Labels, englische Variablen

Return: Erstellte Files + Component-Props + Screenshot-Beschreibung.
```

### Test Agent
```
Schreibe Tests fuer Feature: {FEATURE_NAME}

Spec: Lies memory/features/{name}.md — Sektion "Tests" + "Verhalten".

Aufgabe:
1. Unit Tests (Vitest): Service-Funktionen, Edge Cases, Error States
2. E2E Tests (Playwright): Happy Path User-Flows
3. Test-Patterns aus bestehenden Tests uebernehmen

Pfade: __tests__/ fuer Unit, e2e/ fuer E2E.
Return: Erstellte Test-Files + was jeder Test abdeckt.
```

## Verification Agents

### Build Agent
```
Fuehre Build-Verification aus.

Run: npx next build
Return: "✅ 0 errors" oder "❌ N errors" mit exakten Fehlermeldungen.
```

### Review Agent
```
Review den Code fuer Feature: {FEATURE_NAME}

Spec: Lies memory/features/{name}.md
Rules: Lies .claude/rules/core.md + .claude/rules/common-errors.md + {DOMAIN_RULES}

Pruefe:
1. Code matched Spec-Contracts (Types, Signatures, Verhalten)
2. Design System eingehalten (CLAUDE.md)
3. Common Errors vermieden (common-errors.md)
4. Patterns korrekt angewendet
5. Keine Security-Issues (OWASP Top 10)

Return: "✅ Approved" oder Liste von Issues mit Pfad:Zeile + was falsch ist.
```
```

**Step 2: Verify**

Run: `wc -l .claude/research/agent-prompts.md`
Expected: File exists, ~180 lines

---

### Task 4: Update Core Rules — Slim Down + Reference Orchestrator

**Files:**
- Modify: `.claude/rules/core.md`

The goal: Keep core.md focused on session protocol + knowledge management. Move orchestration to orchestrator.md. Update Feature-Lifecycle to reference both modes (solo + orchestrated). Add Contract section to Spec Template.

**Step 1: Update Workflow section in core.md**

Replace the current `## Workflow` section (lines 12-17) with:

```markdown
## Workflow
- **Mode 0-1** (Bugfix/Klein): Direkt fixen oder 1 Research-Agent → selbst implementieren
- **Mode 2-3** (Feature/Architektur): Orchestrator-Modus → siehe `orchestrator.md`
- Mode-Auswahl: ICH entscheide automatisch. Anil kann ueberschreiben.
- Rollback-Regel: Nicht flicken. Git zuruecksetzen, Plan anpassen, sauber neu
- DB-first: Migration → Service → Query Hook → UI → Build
- Test-first: Tests aus Spec → Implementation bis Tests gruen
```

**Step 2: Update Feature-Lifecycle Phase 1 (Spec)**

Replace lines 40-46 with:

```markdown
### 1. Spec (ICH schreibe, Anil reviewed)
1. Anil beschreibt Feature (1-3 Saetze reichen)
2. **Research Pipeline** starten (1-3 Passes je nach Komplexitaet) → `.claude/research/`
3. Ich schreibe Spec basierend auf VERIFIZIERTEM Research → `memory/features/[name].md`
4. Spec enthaelt TypeScript Contracts (Interfaces, Signatures) → Agent-Koordination
5. `current-sprint.md` → Aktive Features updaten
6. **STOP — Anil muss "passt" sagen bevor Code geschrieben wird**
7. Status: **Spec Review**
```

**Step 3: Update Feature-Lifecycle Phase 3 (Implementation)**

Replace lines 53-58 with:

```markdown
### 3. Implementation
10. **Mode 2-3:** Agents implementieren in Worktrees. ICH orchestriere + merge.
11. **Mode 0-1:** ICH implementiere direkt. Spec bleibt Single Source of Truth.
12. Feature-File laufend updaten: Requirements abhaken, Entscheidungen, Files
13. Bei Unterbrechung: Feature-File + `current-sprint.md` updaten
14. Status: **In Progress**
```

**Step 4: Add Contracts section to Spec Template**

After the `## Betroffene Services/Components` section in the template (after line 93), add:

```markdown
## Contracts (PFLICHT fuer Mode 2-3 — Agents implementieren gegen diese)
```typescript
// DB Contract
-- Migration SQL hier

// Type Contract
interface FeatureEntity { }

// Service Contract
export function featureAction(input: T): Promise<R>

// Hook Contract
export function useFeature(id: string): { data: T; isLoading: boolean }

// Component Contract
<FeatureComponent prop={Type} />
`` `
```

**Step 5: Update Skills section**

Replace the current Skills section (lines 19-36) with:

```markdown
## Skills (gezielt einsetzen)
### Feature-Arbeit (Mode 2-3: Agents machen das)
1. Research Pipeline → `.claude/research/` (Agents explorieren, ICH bleibe sauber)
2. Spec schreiben → `memory/features/[name].md` mit Contracts (ICH schreibe)
3. Anil sagt "passt" → Implementation-Agents dispatchen (Worktrees)
4. Verification-Agents: Build + Review + QA (parallel)
5. Quality Pipeline: `/baseline-ui` → `/fixing-accessibility` → `/simplify`

### Feature-Arbeit (Mode 0-1: ICH mache das)
1. Spec schreiben (kurz) → Code → Build → Verify
2. Quality Pipeline wenn UI geaendert

### Bug-Fixing
1. `/systematic-debugging` → Root Cause finden, nicht raten
2. Fix → Build → Verify

### MCP Server nutzen
- **context7:** Library-Docs nachschlagen
- **supabase:** SQL, Migrations, Schema-Abfragen
- **playwright:** Screenshots nach UI-Aenderungen
- **greptile:** Semantische Code-Suche wenn Text-Grep nicht reicht
```

**Step 6: Verify core.md is within limits**

Run: `wc -l .claude/rules/core.md`
Expected: ≤195 lines (should be similar or slightly less due to slimming)

---

### Task 5: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

Minimal changes — CLAUDE.md is at 106 lines (limit ~100). Replace the Spec-Driven Workflow section to reference orchestrator mode.

**Step 1: Replace Spec-Driven Workflow section (lines 47-53)**

```markdown
## Orchestrator Workflow (PFLICHT fuer Features >10 Zeilen)
1. Anil beschreibt Feature (1-3 Saetze)
2. **Research Pipeline** → Agents recherchieren, Output in `.claude/research/`
3. **ICH schreibe Spec** mit TypeScript Contracts → `memory/features/[name].md`
4. **Anil reviewed** → "passt" oder Korrekturen
5. **Agents implementieren** in Worktrees → ICH orchestriere, merge, reviewe
6. **Verification Agents** → Build + Tests + Code Review (parallel)
7. Modes + Details → siehe `orchestrator.md`
```

**Step 2: Add to Regeln section (line 37-40)**

Update rules count and add orchestrator.md:

```markdown
## Regeln → .claude/rules/ (12 Files)
Domaenen-spezifische Regeln laden automatisch per Glob-Pattern.
**Immer geladen:** core.md, business.md, common-errors.md, orchestrator.md
**Path-spezifisch:** ui-components.md, database.md, trading.md, fantasy.md, gamification.md, community.md, club-admin.md, profile.md
```

**Step 3: Verify**

Run: `wc -l CLAUDE.md`
Expected: ~106 lines (same ballpark)

---

### Task 6: Update MEMORY.md

**Files:**
- Modify: `memory/MEMORY.md`

Add GOD MODE section. MEMORY.md is at 114 lines, limit 150.

**Step 1: Add after "Anil — Arbeitsweise" section (after line 93), before Playwright MCP**

```markdown
## GOD MODE Ultra (Orchestrator Architecture)
- 4 Modes: Solo(0) → Assisted(1) → Orchestrated(2) → Full Team(3)
- Mode 2-3: ICH orchestriere, Agents arbeiten (Research → Implement → Verify)
- Research Pipeline: 1-3 Passes → Output in `.claude/research/`
- Spec = Contract: TypeScript Interfaces sind die Schnittstelle zwischen Agents
- Implementation: Agents in Worktrees, ICH merge + reviewe
- Iteration: Resume-Pattern bei Fehlern (Agent behaelt Context)
- Prompt-Templates: `.claude/research/agent-prompts.md`
- Rule-Details: `.claude/rules/orchestrator.md`
```

**Step 2: Update Deep-Dive Topic Files table (line 104+)**

Add row:
```markdown
| orchestrator.md (rule) | Agent-Modes, Research Pipeline, Contracts, Agent-Rollen |
```

**Step 3: Verify**

Run: `wc -l memory/MEMORY.md`
Expected: ≤135 lines (under 150 limit)

---

### Task 7: Add ADR to decisions.md

**Files:**
- Modify: `memory/decisions.md`

**Step 1: Append ADR-038**

```markdown
## ADR-038: GOD MODE Ultra — Orchestrator Architecture (2026-03-09)
**Kontext:** Context-Window (200K) wird bei Features schnell voll. Research + Implementation + Review in einem Window = Compaction-Risiko, Detail-Verlust.
**Entscheidung:** Claude wechselt von Solo-Entwickler zu Orchestrator. 4 Modes (0-3). Mode 2-3: Agents recherchieren, implementieren, verifizieren in eigenen Context-Windows. Claude orchestriert via Spec-Contracts. Research persistent in .claude/research/.
**Konsequenz:** 3-10x mehr Code gelesen pro Feature. Context bleibt sauber (130K+ frei). Specs werden praeziser (TypeScript Contracts). Kosten: 5-8x mehr Tokens pro Feature. Trade-off: Qualitaet + Iteration-Kapazitaet vs. Token-Kosten.
**Status:** Aktiv ab Session #211.
```

**Step 2: Verify**

Run: `grep "ADR-038" memory/decisions.md`
Expected: Match found

---

### Task 8: Update current-sprint.md

**Files:**
- Modify: `memory/current-sprint.md`

**Step 1: Add GOD MODE to active features**

Add to active features table:
```markdown
| GOD MODE Ultra | docs/plans/2026-03-09-god-mode-ultra.md | In Progress |
```

**Step 2: Update session info**

```markdown
- **Session:** #211 (09.03.2026)
- **Thema:** GOD MODE Ultra — Orchestrator Architecture Design + Implementation
```

**Step 3: Verify**

Run: `grep "GOD MODE" memory/current-sprint.md`
Expected: Match found

---

### Task 9: Verify Complete System

**Step 1: Check all new/modified files exist**

```bash
echo "=== New Files ===" &&
ls -la .claude/research/.gitkeep &&
ls -la .claude/research/agent-prompts.md &&
ls -la .claude/rules/orchestrator.md &&
echo "=== Modified Files ===" &&
wc -l .claude/rules/core.md &&
wc -l .claude/rules/orchestrator.md &&
wc -l CLAUDE.md &&
wc -l memory/MEMORY.md
```

Expected:
- All files exist
- core.md ≤ 200 lines
- orchestrator.md ≤ 85 lines
- CLAUDE.md ≤ 110 lines
- MEMORY.md ≤ 140 lines

**Step 2: Check rules are loadable**

```bash
ls .claude/rules/*.md | wc -l
```

Expected: 12 (was 11, +1 orchestrator.md)

**Step 3: Check .gitignore**

```bash
grep "research" .gitignore
```

Expected: Research patterns listed

**Step 4: Dry-run — simulate Mode 1 dispatch**

Manually verify by reading orchestrator.md that the mode selection logic, agent prompts, and research pipeline flow are clear and consistent.

---

### Task 10: Commit

**Step 1: Stage all changes**

```bash
git add .claude/research/.gitkeep
git add .claude/research/agent-prompts.md
git add .claude/rules/orchestrator.md
git add .claude/rules/core.md
git add CLAUDE.md
git add memory/MEMORY.md
git add memory/decisions.md
git add memory/current-sprint.md
git add .gitignore
git add docs/plans/2026-03-09-god-mode-ultra.md
```

**Step 2: Commit**

```bash
git commit -m "feat: GOD MODE Ultra — Orchestrator Architecture

4 operating modes (Solo→Assisted→Orchestrated→Full Team).
Research Pipeline with 1-3 pass knowledge distillation.
TypeScript Contracts in specs for agent coordination.
Standardized agent prompt templates.
Persistent research output in .claude/research/.

ADR-038: Context optimization via agent delegation.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

**Step 3: Verify**

```bash
git log --oneline -1
git status
```

Expected: Clean working tree (for tracked files), commit visible.
