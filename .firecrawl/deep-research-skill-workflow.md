# Deep Research: Skill-Creator & God Mode Workflow

> Synthese aus 11 Quellen (Anthropic Official, Medium, Substack, GitHub, Builder.io, Addy Osmani, ProductCompass)
> Erstellt: 2026-03-27

---

## TL;DR — Die 5 Game-Changer

1. **Progressive Disclosure Architektur** — Wissen in 3 Schichten laden, nicht alles auf einmal
2. **Self-Improving Loop** — Agents die nach jeder Iteration besser werden (via Binary Evals + Knowledge Capture)
3. **Hub-and-Spoke Coordination** — EIN Coordinator liest alles, Spezialisten bekommen nur ihren Task-Context
4. **Hypothesis-Driven Knowledge** — Wissen wächst durch getestete Hypothesen, nicht durch Akkumulation
5. **Skill-Creator als Meta-Tool** — Skills bauen die ANDERE Skills verbessern (compound improvement)

---

## TEIL 1: Was die Top 1% anders machen

### 1.1 Progressive Disclosure (Anthropic Official)

```
Layer 1: Description (~50 Wörter) — IMMER im Context
Layer 2: SKILL.md Body (<200 Zeilen) — Geladen wenn Skill triggert
Layer 3: references/ Ordner — On-Demand, nur was gebraucht wird
```

**Unser Status:** SKILL.md auf 155 Zeilen gekürzt, 3 Reference-Files erstellt. ✅
**Gap:** Unsere CLAUDE.md + Rules laden ~2000+ Tokens die nicht immer relevant sind.
**Action:** Rules path-spezifisch halten (haben wir), aber MEMORY.md trimmen.

### 1.2 Vier Memory-Kanäle (nicht nur einer)

| Kanal | Zweck | Unser Äquivalent |
|-------|-------|-----------------|
| **Semantic (AGENTS.md)** | Patterns, Gotchas, Conventions | `memory/*.md` ✅ |
| **Episodic (Git)** | Was wann geändert wurde | `git log/diff` ✅ |
| **Chronological (Progress)** | Timeline der Iterationen | `session-handoff.md` ✅ |
| **Status (Tasks)** | Was offen/erledigt ist | `current-sprint.md` ✅ |

**Unser Status:** Alle 4 Kanäle vorhanden. ✅
**Gap:** Kein automatisches Knowledge Capture nach Agent-Runs.
**Action:** Stop-Hook erweitern: Nach Code-Changes automatisch Learnings in errors.md/patterns.md appendieren.

### 1.3 Hub-and-Spoke statt Flat Swarm

**Pattern:** Main Agent liest Protocol EINMAL, dispatcht Spezialisten MIT komplettem Context im Prompt. Spezialisten lesen KEINE Shared Files.

**Unser Status:** Teilweise. Agents laden sich selbst ein (Phase 0), was gut ist. ABER: Jeder Agent liest dieselben Rules → Context-Bloat.
**Gap:** Agents laden redundant CLAUDE.md + Rules.
**Action:** Agent-Prompts sollten NUR den relevanten Context enthalten, nicht auf Shared Files verweisen die der Agent dann selbst liest.

### 1.4 Binary Evals statt Subjektive Bewertung

**Pattern:** Deterministische Yes/No Checks statt "sieht gut aus":
```python
assert_has_loading_state(component) → True/False
assert_uses_service_layer(component) → True/False
assert_hooks_before_returns(component) → True/False
```

**Unser Status:** Wir haben tsc + vitest + Reviewer Agent. ✅
**Gap:** Kein systematisches Eval-Framework für Skills selbst.
**Action:** Skill-Creator Eval-Loop nutzen um unsere eigenen Skills zu benchmarken.

### 1.5 AutoResearch Loop (Overnight Self-Improvement)

**Pattern:** Agent läuft 30-50 Zyklen autonom:
1. Analysiert Failures
2. Generiert 3 Prompt-Varianten (EINE Änderung pro Variante)
3. Testet alle gegen Test-Cases
4. Bester gewinnt → nächste Runde

**Kosten:** ~$0.05-0.15/Zyklus, $2-5 für Overnight-Run
**Unser Status:** Nicht vorhanden.
**Action:** Für unsere kritischsten Skills (deliver, cto-review) AutoResearch einrichten.

---

## TEIL 2: Self-Improving Agent Patterns

### 2.1 Compound Learning Loop

```
Task empfangen
  → Agent implementiert
  → Tests laufen
  → PASS? → Commit + Log Learning + Nächster Task
  → FAIL? → Fix versuchen (max 5x) → Learning loggen → Weiter
```

**Schlüssel:** Jedes Learning wird PERSISTENT gespeichert:
- **Pattern entdeckt** → patterns.md
- **Fehler gemacht** → errors.md
- **2x gleicher Fehler** → common-errors.md (Rule Promotion)

**Unser Status:** Knowledge Capture Workflow existiert in workflow.md. ✅
**Gap:** Passiert nicht automatisch. Agents loggen keine Learnings selbst.
**Action:** Agent-Definitionen erweitern: "Nach Task-Completion: 1 Satz Learning in journal appendieren."

### 2.2 Hypothesis Tracking

```markdown
# hypotheses.md

## Aktiv (Testing)
- Tab-gated Queries reduzieren Ladezeit um >50% (Messen: vor/nach)
- Service Layer Hooks reduzieren Component LOC um >40%

## Bestätigt ✓
- staleTime 30s+ verhindert unnecessary refetches (gemessen P2)
- React.memo auf Listen-Items spart >20% re-renders (gemessen P4)

## Widerlegt ✗
- Worktree Agents für gekoppelte Tasks (scheitert an shared types)
- Mehr Agents = schneller (>3 parallel = diminishing returns)
```

**Unser Status:** Haben `decisions.md` aber kein Hypothesis-Tracking.
**Action:** `memory/hypotheses.md` erstellen, bei jedem Performance/Architecture-Change tracken.

### 2.3 False Beliefs Registry

**Pattern:** Konventionelle Weisheit vs. unsere Daten:
```markdown
## Klingt schlecht, funktioniert gut
- Große PRs statt viele kleine (bei Refactoring — bestätigt Session 259)
- Agent nicht für alles (gekoppelte Tasks selbst machen — bestätigt Session 259)

## Klingt gut, funktioniert schlecht
- Mehr Agents = schneller (>3 parallel = Context-Switching-Overhead)
- Worktree-Isolation für alles (shared types werden dupliziert)
```

**Unser Status:** Teilweise in Feedback-Memories erfasst.
**Action:** In hypotheses.md integrieren als "Confirmed" / "Disproven" Sektionen.

---

## TEIL 3: Context-Optimierung

### 3.1 Context Budget Management

| Was | Tokens (geschätzt) | Optimierung |
|-----|-------|-------------|
| System Prompt | ~18K | Nicht änderbar |
| CLAUDE.md + Rules | ~4K | Path-spezifisch laden ✅ |
| MEMORY.md | ~3K | Trimmen auf <1.5K |
| Skill Descriptions | ~2K | Nur relevante laden ✅ |
| MCP Tool Descriptions | ~3K | Supabase + Memory MCP entfernt ✅ |
| **Frei für Arbeit** | **~170K** | |

**Quick Wins bereits umgesetzt:**
- Supabase MCP entfernt → CLI stattdessen
- Memory MCP entfernt → File-based
- SKILL.md auf 155 Zeilen gekürzt

**Noch zu tun:**
- MEMORY.md trimmen (aktuell ~200 Zeilen, viel redundant mit CLAUDE.md)
- Alte Feature-Memories archivieren

### 3.2 Lazy-Loading Pattern

**Pattern:** Skills/References nur laden wenn gebraucht:
```markdown
# In SKILL.md (kurz):
Für Details zu Eval-Workflow → lies references/eval-workflow.md
Für Description-Optimierung → lies references/description-optimization.md
```

**Unser Status:** Gerade implementiert für skill-creator. ✅
**Action:** Gleiche Struktur auf unsere großen Skills anwenden (deliver, cto-review).

### 3.3 Agent Context Injection

**Statt:** Agent liest CLAUDE.md + alle Rules + alle Memory-Files (bloated)
**Besser:** Coordinator extrahiert NUR relevanten Context, injiziert in Agent-Prompt

```
Implementer Agent für PlayerDetail:
- Relevante Types: PlayerWithDetails, Holding
- Relevante Services: playerService, holdingService
- Relevante Patterns: Service Layer, Tab-gated Queries
- NICHT: Trading Rules, Fantasy Rules, Admin Rules
```

**Action:** Pre-Dispatch Checkliste erweitern: Context-Scope definieren VOR Agent-Spawn.

---

## TEIL 4: Skill-Creator Workflow für BeScout

### 4.1 Welche Skills sollten wir bauen/verbessern?

| Skill | Status | Verbesserung |
|-------|--------|-------------|
| **deliver** | Existiert | AutoResearch Loop: 20 Test-Prompts, Binary Evals |
| **cto-review** | Existiert | Eval-Loop: Was catcht er, was nicht? |
| **impact** | Existiert | Baseline-Test: Findet er wirklich ALLE Codepaths? |
| **brainstorming** | Existiert | Trigger-Optimierung (undertriggers oft) |
| **beScout-refactoring** | NEU | Hook-Extraction Pattern als Skill kodifizieren |
| **beScout-db-migration** | NEU | Migration + RLS + Smoke-Test als Skill |
| **beScout-feature-pipeline** | NEU | Spec→Plan→Implement→Verify als Skill |

### 4.2 Skill-Creator Workflow (Empfohlen)

```
1. Intent definieren (was soll der Skill können)
2. SKILL.md Draft schreiben
3. 3 Test-Prompts erstellen (realistische User-Requests)
4. Parallel spawnen: with-skill + baseline (ohne Skill)
5. Eval-Viewer starten → User reviewed qualitativ
6. Binary Assertions → quantitativ messen
7. Skill verbessern basierend auf Feedback
8. Repeat 3-5x
9. Description optimieren (Trigger-Accuracy)
10. Package + Deploy
```

### 4.3 Prioritäts-Reihenfolge

**Phase 1 (diese Woche):**
- MEMORY.md trimmen
- hypotheses.md erstellen
- Agent Context-Injection Pattern dokumentieren

**Phase 2 (nächste Woche):**
- `beScout-refactoring` Skill mit Skill-Creator bauen
- `deliver` Skill durch Eval-Loop verbessern
- `cto-review` Skill benchmarken

**Phase 3 (Sprint danach):**
- `beScout-db-migration` Skill bauen
- AutoResearch Loop für Top-Skills einrichten
- Agent-Definitionen mit Knowledge-Capture erweitern

---

## TEIL 5: Workflow-Änderungen (Konkret)

### 5.1 Was wir ÄNDERN

| Vorher | Nachher | Warum |
|--------|---------|-------|
| Agents laden sich selbst ein | Coordinator injiziert relevanten Context | Weniger Bloat |
| Knowledge Capture manuell | Auto-Capture nach jedem Agent-Run | Compound Learning |
| Skills "funktionieren halt" | Skills durch Eval-Loop validiert | Messbare Qualität |
| Memory wächst unkontrolliert | Hypothesis-Tracking + Archivierung | Fokussiertes Wissen |
| Supabase via MCP | Supabase via CLI | Context-Tokens sparen |

### 5.2 Was wir BEHALTEN

- 4-Tier Task System ✅
- Parallel Verification (tsc + vitest + Reviewer + a11y) ✅
- Service Layer Pattern ✅
- Session-Handoff + Current-Sprint ✅
- Path-spezifische Rules ✅
- Hook-System (auto-lint, safety-guard, quality-gate) ✅

### 5.3 Was wir NEU einführen

1. **hypotheses.md** — Evidenz-basiertes Wissen-Wachstum
2. **Skill Eval-Loop** — Skills messbar verbessern mit Skill-Creator
3. **Agent Context-Scoping** — Nur relevanter Context pro Agent
4. **Auto Knowledge-Capture** — Agents loggen Learnings nach jedem Run
5. **Domain-Skills** — Projekt-spezifische Skills (Refactoring, Migration, Feature-Pipeline)

---

## Quellen

1. Anthropic Official: Skill Authoring Best Practices
2. Medium: "How to build Claude Skills 2.0 Better than 99%"
3. GitHub Gist: Complete Guide to Building Skills
4. ProductCompass: Self-Improving Agentic System
5. Addy Osmani: Self-Improving Coding Agents
6. Medium: "How I Made Claude Code Agents Coordinate 100%"
7. Medium: "8 Advanced Techniques the Top 1% Use"
8. Builder.io: How I Use Claude Code
9. Substack: 32 Claude Code Tips
10. Medium: Mastering Claude Code Advanced Workflows
11. MindStudio: AutoResearch Self-Improving Skills
