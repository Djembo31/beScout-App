# Knowledge Wiki — Karpathy LLM Wiki Integration

> Spec: Konsolidierung von Rules + Memory + Learnings zu einem LLM-gepflegten Wiki
> Inspiriert von: Karpathy "LLM Wiki" (April 2026)
> Datum: 2026-04-07

---

## 1. Current State

### 1.1 Feature Inventory

| # | Feature | Location | Lines | Status |
|---|---------|----------|-------|--------|
| 1 | Quick Reference (Stack, Tokens, Components, Conventions) | `CLAUDE.md` | 83 | Manuell gepflegt, 85% Redundanz mit Rules |
| 2 | Error Prevention (DB Columns, React, CSS, RPC, RLS) | `.claude/rules/common-errors.md` | 84 | 90% Duplikat von database.md + memory/errors.md |
| 3 | DB Schema Reference (Columns, RLS, RPCs) | `.claude/rules/database.md` | 65 | Source of Truth fuer DB |
| 4 | Business Compliance (Wording, Fees, Licensing, Geo) | `.claude/rules/business.md` | 55 | Source of Truth fuer Compliance |
| 5 | Domain Rules (Trading, Fantasy, Profile, Community, Gamification, Club-Admin) | `.claude/rules/[domain].md` | 450 | 6 Dateien, gut isoliert |
| 6 | UI Component Rules | `.claude/rules/ui-components.md` | 78 | 60% Duplikat von CLAUDE.md Component Registry |
| 7 | Workflow Definition | `.claude/rules/workflow.md` | 53 | 70% Duplikat von SHARED-PREFIX.md |
| 8 | Workflow Reference (Agents, Skills, MCP, Hooks) | `.claude/rules/workflow-reference.md` | 133 | Einzige Datei mit komplettem Agent-Team |
| 9 | Performance Rules | `.claude/rules/performance.md` | 28 | Minimal, Placeholder-Qualitaet |
| 10 | Testing Rules | `.claude/rules/testing.md` | 32 | Minimal |
| 11 | Cortex Routing Table | `memory/cortex-index.md` | 30 | Manuell gepflegt, verwaiste Eintraege |
| 12 | Sprint Status | `memory/semantisch/sprint/current.md` | 42 | Manuell, nicht automatisch aktualisiert |
| 13 | Session Handoff | `memory/session-handoff.md` | 58 | Funktioniert, ueberschreibt History |
| 14 | Morning Briefing (auto) | `memory/senses/morning-briefing.md` | 53 | SessionStart Hook, funktioniert |
| 15 | Working Memory (auto) | `memory/working-memory.md` | 27 | PreCompact Hook, funktioniert |
| 16 | Code Patterns | `memory/patterns.md` | 231 | Duplikat in semantisch/projekt/ |
| 17 | Error Patterns | `memory/errors.md` | 97 | Duplikat in episodisch/fehler/ |
| 18 | Cross-Domain Map | `memory/deps/cross-domain-map.md` | 53 | Duplikat in semantisch/projekt/ |
| 19 | Feature Specs (8 Dateien) | `memory/features/` | 1323 | Gut, kein Handlungsbedarf |
| 20 | Session Journals (8 Dateien) | `memory/episodisch/journals/` | 412 | Duplikat in memory/journals/ |
| 21 | Session Retros (5 Dateien) | `memory/episodisch/sessions/archive/` | 251 | Alle vom 02.04., seitdem keine neuen |
| 22 | Agent Research | `memory/research-agent-systems-best-practices.md` | 371 | Duplikat in semantisch/projekt/ |
| 23 | Revenue Streams | `memory/project_missing_revenue_streams.md` | 52 | Duplikat in semantisch/projekt/ |
| 24 | Learnings (6 Skill-Stubs + 2 Drafts) | `memory/learnings/` | 42 | **ALLE LEER** — Pipeline kaputt |
| 25 | Agent Protocol | `.claude/agents/SHARED-PREFIX.md` | 107 | Source of Truth fuer Agents |
| 26 | Agent Personas (9 Agents) | `.claude/agents/[name].md` | 1164 | Gut definiert |
| 27 | Domain Skills (3) + Power Skills (12) | `.claude/skills/` | 1496 | Gut, aber LEARNINGS.md alle leer |
| 28 | AutoDream Agent | `.claude/agents/autodream.md` | 84 | Definiert, aber unklar ob je gelaufen |
| 29 | Hooks (8 aktiv in settings.json) | `.claude/hooks/` | 641 | 5 aktiv, 10 weitere existieren aber nicht verdrahtet |
| 30 | Learnings Queue | `.claude/learnings-queue.jsonl` | 0 | **LEER** — capture-correction.sh liefert nichts |

**Totals: 124 Dateien, ~7200 Zeilen, ~85% Redundanz in Kern-Referenzen**

### 1.2 File Inventory (alle Knowledge-Dateien)

```
CLAUDE.md                                    83 lines
.claude/rules/                          14 files, 978 lines
.claude/agents/                         10 files, 1271 lines
.claude/skills/                         21 files, 1496 lines
.claude/hooks/                          15 files, 641 lines
memory/                                 56 files, ~3800 lines
─────────────────────────────────────────────────────────
TOTAL                                  ~124 files, ~8269 lines
```

### 1.3 Data Flow (Wer liest/schreibt was)

```
SessionStart Hook
  └─ morning-briefing.sh → SCHREIBT memory/senses/morning-briefing.md
                         → LIEST: git, tsc, sprint/current.md, learnings/drafts/

PostToolUse Hook (Edit/Write)
  ├─ track-file-changes.sh → SCHREIBT .claude/session-files.txt
  ├─ auto-lint.sh → nur stdout
  └─ file-size-warning.sh → nur stdout

UserPromptSubmit Hook (NICHT in settings.json verdrahtet!)
  └─ capture-correction.sh → WUERDE .claude/learnings-queue.jsonl schreiben

PreCompact Hook
  ├─ pre-compact-backup.sh → SCHREIBT .claude/backups/
  └─ inject-context-on-compact.sh → SCHREIBT memory/working-memory.md
                                   → LIEST: sprint, handoff, session-files, git

Stop Hook
  └─ session-handoff-auto.sh → NUR WARNUNG (schreibt NICHTS)

NICHT verdrahtet aber existiert:
  - session-retro.sh (WUERDE retros + sessions.jsonl schreiben)
  - quality-gate-v2.sh (WUERDE session-counter inkrementieren)
  - inject-learnings.sh (WUERDE learnings in context injizieren)
  - capture-correction.sh (WUERDE corrections loggen)

AutoDream Agent (MANUELL, kein Hook-Trigger)
  LIEST: cortex-index, sessions, errors, learnings/drafts, sessions.jsonl
  SCHREIBT: semantisch/projekt/, archive/, cortex-index.md
```

### 1.4 Kaputte Pipelines

| Pipeline | Soll | Ist | Ursache |
|----------|------|-----|---------|
| Corrections → Learnings | User-Korrekturen capturen → Queue → /reflect → Drafts → Promote | **Queue leer, Pipeline tot** | capture-correction.sh NICHT in settings.json (UserPromptSubmit fehlt) |
| Session Retros → Consolidation | Session endet → Retro schreiben → AutoDream verdichtet | **Keine neuen Retros seit 02.04.** | session-retro.sh NICHT verdrahtet, quality-gate-v2.sh auch nicht |
| AutoDream Trigger | Session-Counter >= 5 → AutoDream laeuft | **Counter = 4, wird nie inkrementiert** | quality-gate-v2.sh NICHT verdrahtet |
| Learnings Promotion | Drafts → /reflect → Anil reviewed → LEARNINGS.md | **Alle LEARNINGS.md leer** | Kein Draft wird erzeugt weil Retros fehlen |
| Morning Briefing → Learnings | Briefing zeigt pending Drafts | **Zeigt 2 leere Stubs** | Drafts sind leer weil Pipeline #1 tot |

**Diagnose:** Die GESAMTE Feedback-Loop ist tot. Root Cause: 4 Hooks existieren aber sind NICHT in settings.json verdrahtet.

### 1.5 Redundanz-Karte

| Information | Dateien wo es steht | Soll (Single Source) |
|-------------|---------------------|----------------------|
| DB Column Names (11 Eintraege) | database.md, common-errors.md, memory/errors.md, CLAUDE.md | `database.md` |
| CHECK Constraints (5 Eintraege) | database.md, common-errors.md, memory/errors.md | `database.md` |
| Fee-Splits (7 Kategorien) | business.md, trading.md, CLAUDE.md | `business.md` |
| Compliance Wording ($SCOUT) | business.md, trading.md, CLAUDE.md, SHARED-PREFIX.md | `business.md` |
| Component Registry (7 Components) | CLAUDE.md, ui-components.md | `CLAUDE.md` |
| React/TS Patterns (6 Patterns) | CLAUDE.md, common-errors.md, SHARED-PREFIX.md | `common-errors.md` |
| CSS/Tailwind Patterns (5 Patterns) | CLAUDE.md, common-errors.md, ui-components.md | `common-errors.md` |
| Workflow/Agent Definition | workflow.md, workflow-reference.md, SHARED-PREFIX.md | `SHARED-PREFIX.md` + `workflow-reference.md` |
| Code Patterns (Top 20) | memory/patterns.md, memory/semantisch/projekt/patterns.md | `memory/patterns.md` |
| Cross-Domain Map | memory/deps/, memory/semantisch/projekt/ | `memory/deps/` |
| Error Patterns | memory/errors.md, memory/episodisch/fehler/errors.md | `memory/errors.md` |
| Journals | memory/journals/, memory/episodisch/journals/ | `memory/episodisch/journals/` |

---

## 2. Goals + Non-Goals + Anti-Requirements

### Goals
1. **Redundanz eliminieren** — Jede Information genau 1x, mit Pointer statt Kopie
2. **Feedback-Loop reparieren** — Corrections → Drafts → Promotion funktioniert automatisch
3. **LLM pflegt, Mensch kuratiert** — AutoDream wird Wiki-Compiler (Karpathy Pattern)
4. **Suchindex statt Grep** — Auto-generierter Index ueber alle Knowledge-Dateien
5. **Ranking** — Rules/Patterns nach Impact sortiert (Frontmatter: hit_count, last_used)

### Non-Goals
- Obsidian oder externes Tooling einbauen
- Neuen Code fuer die App schreiben (das ist Infrastructure-only)
- Agent-Personas aendern (bleiben wie sie sind)
- Feature-Specs migrieren (memory/features/ bleibt)
- MCP-Server-Konfiguration aendern

### Anti-Requirements
- KEIN neues Directory-Schema erfinden — bestehende Struktur verbessern
- KEINE Dateien loeschen die <7 Tage alt sind
- NICHT CLAUDE.md grundlegend aendern (bleibt Quick Reference)
- NICHT .claude/rules/ Konvention brechen (Claude Code laedt die automatisch)
- NICHT die 3 Gesetze aus SHARED-PREFIX aendern

---

## 3. Feature Migration Map

| # | Feature | Current | Target | Action |
|---|---------|---------|--------|--------|
| 1 | CLAUDE.md Quick Reference | Root | Root | **SLIM** — Duplikate entfernen, Links zu Sources |
| 2 | common-errors.md | .claude/rules/ | .claude/rules/ | **SLIM** — DB-Duplikate raus, Link zu database.md |
| 3 | database.md | .claude/rules/ | .claude/rules/ | **STAYS** — wird Single Source fuer DB |
| 4 | business.md | .claude/rules/ | .claude/rules/ | **STAYS** — wird Single Source fuer Compliance + Fees |
| 5 | workflow.md | .claude/rules/ | — | **MERGE** into workflow-reference.md, dann DELETE |
| 6 | workflow-reference.md | .claude/rules/ | .claude/rules/ | **ENHANCE** — nimmt workflow.md Content auf |
| 7 | ui-components.md | .claude/rules/ | .claude/rules/ | **SLIM** — Duplikate mit CLAUDE.md entfernen |
| 8 | Domain Rules (6) | .claude/rules/ | .claude/rules/ | **STAYS** |
| 9 | performance.md | .claude/rules/ | .claude/rules/ | **STAYS** (duenn aber OK) |
| 10 | testing.md | .claude/rules/ | .claude/rules/ | **STAYS** |
| 11 | cortex-index.md | memory/ | memory/ | **ENHANCE** — wird auto-generiert + Frontmatter |
| 12 | memory/patterns.md | memory/ | memory/ | **STAYS** — Duplikat in semantisch/ entfernen |
| 13 | memory/errors.md | memory/ | memory/ | **STAYS** — Duplikat in episodisch/fehler/ entfernen |
| 14 | memory/deps/cross-domain-map.md | memory/deps/ | memory/deps/ | **STAYS** — Duplikat in semantisch/projekt/ entfernen |
| 15 | memory/semantisch/projekt/patterns.md | semantisch/ | — | **DELETE** (Duplikat von memory/patterns.md) |
| 16 | memory/semantisch/projekt/cross-domain-map.md | semantisch/ | — | **DELETE** (Duplikat von deps/) |
| 17 | memory/semantisch/projekt/revenue-streams.md | semantisch/ | — | **DELETE** (Duplikat von Root) |
| 18 | memory/episodisch/fehler/errors.md | episodisch/ | — | **DELETE** (Duplikat von memory/errors.md) |
| 19 | memory/journals/ (8 files) | memory/ | — | **DELETE** (Duplikat von episodisch/journals/) |
| 20 | Learnings Stubs (6) | memory/learnings/ | memory/learnings/ | **REPURPOSE** — werden echte Learnings |
| 21 | SHARED-PREFIX.md | .claude/agents/ | .claude/agents/ | **SLIM** — workflow-Duplikate raus |
| 22 | AutoDream Agent | .claude/agents/ | .claude/agents/ | **ENHANCE** — wird Wiki-Compiler |
| 23 | Hooks (settings.json) | .claude/ | .claude/ | **ENHANCE** — 4 fehlende Hooks verdrahten |
| 24 | Wiki Index (NEU) | — | memory/wiki-index.md | **CREATE** — Auto-generierter Suchindex |
| 25 | Wiki Log (NEU) | — | memory/wiki-log.md | **CREATE** — Append-only Aenderungslog |

---

## 4. Blast Radius Map

### Wave 1: Redundanz eliminieren
| Aenderung | Betroffene Consumers |
|-----------|---------------------|
| CLAUDE.md slimmen (DB-Duplikate entfernen) | Jede Session (auto-loaded), kein Funktionsverlust — Info bleibt in database.md |
| common-errors.md slimmen | Jede Session (auto-loaded), SHARED-PREFIX referenziert es |
| workflow.md → workflow-reference.md merge | SHARED-PREFIX referenziert workflow.md → muss auf workflow-reference.md zeigen |
| Duplikat-Dateien in memory/ loeschen | cortex-index.md referenziert einige → Index anpassen |
| memory/journals/ loeschen | Nichts referenziert diese Kopien direkt |

### Wave 2: Hooks verdrahten
| Aenderung | Betroffene Consumers |
|-----------|---------------------|
| capture-correction.sh verdrahten | Neuer UserPromptSubmit Hook → schreibt learnings-queue.jsonl |
| session-retro.sh verdrahten | Neuer Stop Hook → schreibt retros + sessions.jsonl |
| quality-gate-v2.sh verdrahten | Neuer Stop Hook → inkrementiert session-counter |
| inject-learnings.sh verdrahten | Neuer SessionStart Hook → injiziert Learnings |

### Wave 3: AutoDream → Wiki-Compiler
| Aenderung | Betroffene Consumers |
|-----------|---------------------|
| AutoDream v3 rewrite | SHARED-PREFIX referenziert AutoDream → keine Code-Aenderung noetig |
| Wiki-Index generieren | cortex-index.md kann darauf verweisen |
| Wiki-Log anlegen | Morning-Briefing kann letzte Eintraege zeigen |

### Wave 4: Ranking + Index
| Aenderung | Betroffene Consumers |
|-----------|---------------------|
| Frontmatter zu Rules/Patterns hinzufuegen | .claude/rules/*.md — Claude Code ignoriert Frontmatter, kein Breaking Change |
| Morning-Briefing erweitern | morning-briefing.sh → zeigt Top-5 Rules by Impact |
| cortex-index.md auto-generieren | AutoDream generiert → manuelles Pflegen entfaellt |

---

## 5. Pre-Mortem

| # | Szenario | Mitigation |
|---|---------|------------|
| 1 | **CLAUDE.md wird zu duenn** — Agents finden kritische Info nicht mehr | CLAUDE.md behaelt ALLE Tokens + Component Registry + Top 10 DONT. Nur DB-Column-Duplikate und Fee-Tabelle werden Links |
| 2 | **Hooks crashen auf Windows** — grep -oP Bug | Alle Hooks nutzen `sed` statt `grep -oP` (bereits dokumentiert in common-errors.md). Jeder Hook endet mit `exit 0` |
| 3 | **AutoDream generiert Unsinn** — LLM-geschriebener Content divergiert von Realitaet | Gesetz 3 bleibt: "Nur bestehenden Content organisieren, keine neuen Fakten". Wiki-Log traced jede Aenderung |
| 4 | **Feedback-Loop flutet Memory** — Zu viele Corrections/Retros | Queue hat Max 50 Eintraege (FIFO). Retros nur letzte 5 behalten. AutoDream archiviert >30 Tage |
| 5 | **Migration bricht bestehende Sessions** — Agent laedt geloeschte Datei | Wave 1 aktualisiert ALLE Referenzen (cortex-index, SHARED-PREFIX) in derselben Wave wie Loeschungen |

---

## 6. Invarianten + Constraints

### Invarianten (DUERFEN sich NICHT aendern)
- CLAUDE.md Component Registry bleibt komplett
- CLAUDE.md Design Tokens bleiben komplett
- CLAUDE.md Top 10 DONT bleiben komplett
- .claude/rules/ Dateien werden weiter auto-loaded (Claude Code Konvention)
- SHARED-PREFIX Phase 0 Cortex-Loading funktioniert identisch
- Feature-Specs in memory/features/ werden NICHT angefasst
- 3 Gesetze aus SHARED-PREFIX bleiben identisch
- Session-Handoff Mechanismus bleibt identisch

### Constraints
- Max 10 Files pro Wave
- Kein Content loeschen der <7 Tage alt ist
- Jede geloeschte Datei: vorher Grep nach Referenzen
- Hooks muessen auf Windows Git Bash laufen (kein grep -oP)
- Keine neuen Dependencies (kein Obsidian, kein qmd, kein npm install)
- AutoDream darf NUR bestehenden Content organisieren (Gesetz 3 gilt)

---

## 7. Akzeptanzkriterien

### AK-1: Redundanz
```
GIVEN: Alle Knowledge-Dateien
WHEN: Grep nach DB Column Names (first_name, side, top_role etc.)
THEN: Jede Info steht in GENAU 1 Datei (database.md)
  AND: CLAUDE.md sagt "→ siehe database.md" fuer Details
  AND NOT: Duplikate in common-errors.md oder memory/errors.md
```

### AK-2: Feedback-Loop
```
GIVEN: User korrigiert Claude ("nein, nicht so")
WHEN: Session laeuft
THEN: Correction landet in .claude/learnings-queue.jsonl
  AND: Am Session-Ende wird Retro geschrieben
  AND: Session-Counter wird inkrementiert
  AND: Bei Counter >= 5 wird AutoDream-Trigger angezeigt
```

### AK-3: Wiki-Index
```
GIVEN: AutoDream laeuft
WHEN: Phase 4 (Index pflegen)
THEN: memory/wiki-index.md enthaelt alle Knowledge-Dateien
  AND: Jeder Eintrag hat: Pfad, Typ, 1-Line Summary, last_updated
  AND: Verwaiste Eintraege sind entfernt
  AND: Neue Dateien sind hinzugefuegt
```

### AK-4: Ranking
```
GIVEN: Rules mit Frontmatter (hit_count, last_used)
WHEN: Morning-Briefing generiert wird
THEN: Top-5 Rules by hit_count werden angezeigt
  AND: Rules die >30 Tage nicht genutzt wurden werden markiert
```

### AK-5: Keine Regression
```
GIVEN: Alle Waves deployed
WHEN: Neue Session startet
THEN: Morning-Briefing funktioniert identisch
  AND: SHARED-PREFIX Phase 0 laedt alle Files
  AND: cortex-index.md hat keine verwaisten Links
  AND: tsc --noEmit: 0 Errors (kein Code betroffen)
  AND: Kein Agent-Persona geaendert
```

---

## SPEC GATE

- [x] Current State komplett (30 Features nummeriert)
- [x] Migration Map fuer JEDES Feature ausgefuellt
- [x] Blast Radius fuer jede Aenderung
- [x] Pre-Mortem mit 5 Szenarien
- [x] Invarianten + Constraints definiert
- [x] Akzeptanzkriterien fuer jede Aenderung
- [ ] **Anil hat die Spec reviewed und abgenommen**

---

## PHASE 2: PLAN

### Wave 1: Redundanz eliminieren (Infra)
**Ziel:** Single Source of Truth fuer alle Kern-Referenzen

| Task | Files | Action |
|------|-------|--------|
| 1.1 | `CLAUDE.md` | DB-Column-Duplikate → 1-Zeiler "→ database.md". Fee-Details → "→ business.md" |
| 1.2 | `.claude/rules/common-errors.md` | DB-Column-Sektion → Link zu database.md. React/CSS Patterns bleiben (sind der Error-Kontext) |
| 1.3 | `.claude/rules/workflow.md` + `workflow-reference.md` | Merge: Unique Content aus workflow.md in workflow-reference.md. Dann workflow.md loeschen |
| 1.4 | `.claude/rules/ui-components.md` | Entferne Duplikate mit CLAUDE.md, behalte nur ERWEITERTE Regeln |
| 1.5 | `SHARED-PREFIX.md` | Referenz `workflow.md` → `workflow-reference.md` |
| 1.6 | Duplikat-Dateien in memory/ loeschen | semantisch/projekt/patterns.md, semantisch/projekt/cross-domain-map.md, semantisch/projekt/revenue-streams.md, episodisch/fehler/errors.md, memory/journals/ (8 files) |
| 1.7 | `memory/cortex-index.md` | Referenzen auf geloeschte Duplikate aktualisieren |

**DONE means:**
- [ ] Grep nach DB-Columns findet Treffer NUR in database.md
- [ ] workflow.md existiert nicht mehr
- [ ] Keine Duplikat-Dateien in memory/semantisch/projekt/
- [ ] cortex-index.md hat keine verwaisten Links
- [ ] Alle Agent-Referenzen zeigen auf existierende Files

### Wave 2: Hooks verdrahten (Pipeline reparieren)
**Ziel:** Feedback-Loop funktioniert End-to-End

| Task | Files | Action |
|------|-------|--------|
| 2.1 | `.claude/settings.json` | UserPromptSubmit Hook hinzufuegen → capture-correction.sh |
| 2.2 | `.claude/settings.json` | Stop Hook erweitern → session-retro.sh + quality-gate-v2.sh |
| 2.3 | `.claude/settings.json` | SessionStart erweitern → inject-learnings.sh |
| 2.4 | `.claude/hooks/session-retro.sh` | Windows-Kompatibilitaet pruefen (grep -oP → sed) |
| 2.5 | `.claude/hooks/quality-gate-v2.sh` | Windows-Kompatibilitaet pruefen |
| 2.6 | `.claude/hooks/inject-learnings.sh` | Windows-Kompatibilitaet pruefen |
| 2.7 | `.claude/hooks/capture-correction.sh` | Bereits Windows-kompatibel (geprueft) |

**DONE means:**
- [ ] settings.json hat UserPromptSubmit, erweiterten Stop, erweiterten SessionStart
- [ ] Alle Hooks enden mit `exit 0`
- [ ] Kein `grep -oP` in irgendeinem Hook
- [ ] Test: "nein, nicht so" in Prompt → Eintrag in learnings-queue.jsonl

### Wave 3: AutoDream v3 — Wiki-Compiler
**Ziel:** AutoDream wird zum Karpathy-style Wiki-Compiler

| Task | Files | Action |
|------|-------|--------|
| 3.1 | `.claude/agents/autodream.md` | Rewrite: 5 Phasen (ORIENT → VERDICHTEN → INDEX → LOG → CLEANUP) |
| 3.2 | `memory/wiki-index.md` | NEU: Auto-generierter Index aller Knowledge-Dateien |
| 3.3 | `memory/wiki-log.md` | NEU: Append-only Aenderungslog (Karpathy log.md Pattern) |
| 3.4 | AutoDream Phase: INDEX | Generiert wiki-index.md aus Glob + Frontmatter |
| 3.5 | AutoDream Phase: LOG | Appended Aenderungen zu wiki-log.md |

**DONE means:**
- [ ] AutoDream v3 hat 5 klar definierte Phasen
- [ ] wiki-index.md existiert mit allen Knowledge-Dateien
- [ ] wiki-log.md existiert mit initialem "Migration" Eintrag
- [ ] Gesetz 3 ist weiterhin respektiert (kein neuer Content generieren)

### Wave 4: Ranking + Enhanced Briefing
**Ziel:** Rules nach Impact sortiert, Morning-Briefing zeigt Top-Rules

| Task | Files | Action |
|------|-------|--------|
| 4.1 | `.claude/rules/*.md` (alle 13) | Frontmatter hinzufuegen: `type`, `domain`, `created`, `hit_count: 0` |
| 4.2 | `memory/patterns.md` | Frontmatter hinzufuegen |
| 4.3 | `memory/errors.md` | Frontmatter hinzufuegen |
| 4.4 | `.claude/hooks/morning-briefing.sh` | Erweitern: Wiki-Index Summary + letzte wiki-log Eintraege |
| 4.5 | `memory/cortex-index.md` | Erweitern: Pointer auf wiki-index.md fuer On-Demand Suche |

**DONE means:**
- [ ] Alle Rules haben YAML Frontmatter
- [ ] Morning-Briefing zeigt Wiki-Status
- [ ] cortex-index.md verweist auf wiki-index.md

### Wave 5: Cleanup + Verify
**Ziel:** Aufraeuemen, Gesamttest

| Task | Files | Action |
|------|-------|--------|
| 5.1 | memory/learnings/*.md Stubs | Inhalt durch echte Pointer ersetzen oder leere Dateien loeschen |
| 5.2 | Leere Directories | post-mortems/, improvement-proposals/, agent-memory/ — loeschen wenn leer |
| 5.3 | Gesamttest | Morning-Briefing, Compaction-Shield, Cortex-Index — alles verifizieren |
| 5.4 | Session-Handoff aktualisieren | Dokumentieren was gemacht wurde |

**DONE means:**
- [ ] Keine leeren Stub-Dateien
- [ ] Keine leeren Directories
- [ ] Morning-Briefing: verifiziert
- [ ] Compaction-Shield: verifiziert
- [ ] AK-1 bis AK-5 alle erfuellt

---

## PLAN GATE

- [ ] Jede Wave eigenstaendig shippbar
- [ ] Max 10 Files pro Wave
- [ ] Move und Change in getrennten Waves
- [ ] Jeder Task hat "DONE means" Checkliste
- [ ] **Anil hat den Plan reviewed**
