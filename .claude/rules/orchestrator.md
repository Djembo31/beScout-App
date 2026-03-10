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

## SELF-OVERRIDE VERBOT (KRITISCH — Mode 2-3)

Wenn Agents dispatched sind, gelten diese HARTEN Regeln:

1. **NIEMALS die Arbeit eines Agents selbst uebernehmen** — auch wenn es laenger dauert
2. **NIEMALS Source-Files lesen** waehrend Agents arbeiten (ausser fuer Spec/Rules)
3. **NIEMALS Code schreiben** solange ein Agent fuer diesen Task zustaendig ist
4. **Wenn ein Agent zu langsam scheint:** RESUME mit fokussierterem Prompt, NICHT selbst machen
5. **Wenn ein Agent fehlschlaegt:** Neuen Agent dispatchen mit Fehler-Kontext, NICHT selbst fixen

### Self-Check (vor jeder Aktion in Mode 2-3)
Bevor ich Read/Edit/Write/Grep/Glob auf Source-Code aufrufe, frage ich mich:
- "Ist ein Agent fuer diesen Task zustaendig?" → Ja = STOP, Agent arbeiten lassen
- "Koennte ein Agent das besser/parallel machen?" → Ja = Agent dispatchen
- Erlaubt: Rules lesen, Spec lesen/schreiben, Memory updaten, mit Anil kommunizieren

## Foreground vs Background Strategie (VERBINDLICH)

### FOREGROUND (default) — ICH warte auf Ergebnis
Nutzen wenn: Ergebnis wird fuer naechsten Schritt gebraucht.
- Research Agents (Scout, Docs, Verify, Plan) → immer Foreground
- Welle 1 (DB Agent) → immer Foreground (Welle 2 haengt davon ab)
- Einzelner Implementation Agent → Foreground

### BACKGROUND — ICH mache parallel was anderes
Nutzen NUR wenn: Aufgaben sind WIRKLICH unabhaengig voneinander.
- Welle 2 Agents (Service + UI + Test) → Background, ALLE gleichzeitig
- Verification Agents (Build + Review + QA) → Background, ALLE gleichzeitig

### KRITISCH: Was "parallel was anderes" bedeutet
Waehrend Background-Agents laufen, darf ich NUR:
- Anil Status-Updates geben ("3 Agents arbeiten: Service, UI, Tests...")
- Naechste Welle vorbereiten (Prompts formulieren)
- Spec/Memory updaten
- Auf Anil-Fragen antworten
- **NIEMALS:** Selbst coden, Source lesen, oder Agent-Arbeit duplizieren

### Warte-Protokoll (wenn ALLE Agents im Background)
1. Sage Anil: "X Agents arbeiten parallel an [Tasks]. Ich warte auf Ergebnisse."
2. Wenn Anil etwas fragt → antworten (aber nicht an Agent-Tasks arbeiten)
3. Wenn Agent fertig → Ergebnis pruefen, naechsten Schritt planen
4. Wenn ALLE Agents fertig → Ergebnisse zusammenfassen, naechste Welle oder Merge

## Research Pipeline (1-3 Passes)

DEFAULT: 1 Pass. Mehr nur wenn:
- 2 Passes: DB-Aenderung ODER >5 Files ODER Security/Performance-relevant
- 3 Passes: Anil sagt "deep dive" ODER neue Domain/Library

| Pass | Agent | Input | Output | Execution | Ziel |
|------|-------|-------|--------|-----------|------|
| 1 EXPLORE | Scout + Docs (parallel) | Frage/Feature | `{name}-intel.md` | **Foreground** | Breite Exploration |
| 2 VERIFY | Verify Agent | intel.md | `{name}-verified.md` | **Foreground** | Fakten pruefen |
| 3 DISTILL | Plan Agent | verified.md | `{name}-plan.md` | **Foreground** | Bauplan mit Zeilen |

Output immer nach `.claude/research/`. Archivieren wenn Feature done.

## Implementation Agents (Mode 2-3)

Spec = Contract. ALLE Agents bekommen dieselbe Spec mit TypeScript Interfaces.

**Welle 1** (FOREGROUND, sequentiell — Basis muss stehen):
- DB Agent (worktree): Migration, RPC, RLS → Return: Summary + File-Liste
- ICH: Warte, pruefe Summary, dann Welle 2

**Welle 2** (BACKGROUND, parallel — nach Welle 1):
- Service Agent (worktree): Service-Funktionen, Hooks → bekommt DB Agent Summary
- UI Agent (worktree): Components, Mobile+Desktop → bekommt Service Signatures aus Spec
- Test Agent (worktree): Unit + E2E Tests → bekommt nur Spec
- ICH: Gebe Anil Status-Update, warte auf ALLE drei

**Welle 3** (BACKGROUND, parallel — nach Welle 2 gemerged):
- Build Agent: `npx next build` → pass/fail + errors
- Review Agent: Code vs Spec vs Rules → Findings
- QA Agent: Playwright Screenshots → visuelle Kontrolle (wenn UI)
- ICH: Warte auf ALLE drei, fasse zusammen

**Iteration:** Wenn Review-Agent Fehler findet → Resume verantwortlichen Agent mit Feedback.
NIEMALS selbst fixen — Agent hat den Context, ich nicht.

## Agent-Dispatch Checkliste (vor JEDEM Agent-Start — MANDATORY)

### Prozess-Checkliste (Dispatch-Ablauf)
1. [ ] Mode geprueft (bin ich in Mode 2-3?)
2. [ ] Spec existiert mit Contracts
3. [ ] **Gemini `get_agent_context(task)` aufgerufen** → Briefing erhalten
4. [ ] Foreground oder Background entschieden (siehe Strategie oben)
5. [ ] Bei Background: Anil informiert was laeuft

### Prompt-Checkliste (Inhalt pruefen → Detail in agent-prompts.md)
6. [ ] Gemini-Briefing im Prompt unter `=== PROJEKT-WISSEN (Gemini) ===`
7. [ ] Konversation-Kontext + Anils Entscheidungen unter `=== KONTEXT ===`
8. [ ] Spec inline unter `=== SPEC ===`
9. [ ] Code-Beispiele + Constraints + Acceptance Criteria befuellt

**Wenn Gemini ausfaellt:** Ich kuratiere Kontext manuell (query_knowledge fuer Einzelfragen, oder relevante Topic-Files greppen). NIEMALS Agent ohne Projekt-Kontext dispatchen.

## Status-Kommunikation an Anil (PFLICHT in Mode 2-3)

| Zeitpunkt | Was sagen |
|-----------|-----------|
| Agent-Start | "Starte [N] Agents: [Liste]. [Foreground/Background]." |
| Agent-Ergebnis | "[Agent] fertig: [1-Satz Summary]. [Naechster Schritt]." |
| Alle Agents fertig | "Alle [N] Agents fertig. Ergebnisse: [Summary]. Naechste Welle: [was]." |
| Fehler | "[Agent] hat Fehler: [was]. Dispatche neuen Agent mit Fix-Kontext." |
| Warte-Phase | "Warte auf [N] Background-Agents. [Geschaetzte Komplexitaet]." |

## Timeout + Fallback (wenn Agent haengt)

- Agent dauert ungewoehnlich lang → NICHT selbst uebernehmen
- Stattdessen: Agent resume mit fokussierterem Prompt
- Wenn Resume auch fehlschlaegt: Neuen Agent mit kleinerem Scope dispatchen
- Letzter Ausweg (NUR mit Anil-OK): Mode auf 1 downgraden und selbst machen
- **Anil entscheidet** ob Mode gewechselt wird, nicht ich

## Spec Contract Template (PFLICHT fuer Mode 2-3)

Spec MUSS enthalten (zusaetzlich zum bestehenden Template in core.md):

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

## Gemini Knowledge Layer (Token-Optimierung)

ICH (Orchestrator) nutze `gemini-knowledge` MCP fuer Kontext-Lookups.
Agents bekommen Kontext von MIR im Prompt — NICHT per File-Read.

| Tool | Wann | Wer |
|------|------|-----|
| `query_knowledge` | Schnelle Fakten-Frage (Column-Name, Business-Rule, Pattern) | ICH |
| `get_agent_context` | Vor Agent-Dispatch: komplettes Kontext-Paket generieren | ICH |
| `refresh_cache` | Nach Updates an memory/*.md oder .claude/rules/*.md | ICH |
| `check_staleness` | Monatliche Hygiene: veraltete Knowledge-Files finden (>N Tage) | ICH |

### Workflow mit Gemini
1. Anil beschreibt Task
2. ICH: `get_agent_context(task)` → kuratiertes Briefing
3. ICH: **Spot-Check** — verifiziere 1 konkreten Fakt aus dem Briefing:
   - Wenn DB Column genannt → `query_knowledge("exact column name?", exact: true)`
   - Wenn Component genannt → Glob/Grep ob sie existiert
   - Wenn Pattern genannt → stimmt die Beschreibung?
   - Dauer: 30 Sekunden, 1 Tool-Call. Wenn falsch → Briefing verwerfen, manuell kuratieren
4. ICH: dispatche Agent MIT verifiziertem Briefing im Prompt
5. Agent liest NUR Source Code, Wissen hat er von mir
6. Ergebnis: ~40-50% weniger Token-Verbrauch auf Knowledge-Reads

## Decision Capture (SOFORT — nicht erst bei Session-Ende)

Wenn Anil eine Entscheidung trifft, SOFORT festhalten:

| Was | Wohin | Wann |
|-----|-------|------|
| Feature-Entscheidung ("so will ich es") | Feature-File → Verhalten/Aktueller Stand | Sofort nach Anils Aussage |
| Architektur-Entscheidung ("nutze X statt Y") | `decisions.md` + Feature-File | Sofort |
| Design-Praeferenz ("soll aussehen wie...") | Feature-File → UI States | Sofort |
| Business-Rule ("das darf nicht...") | `decisions.md`, ggf. business.md Rule | Sofort |
| Workflow-Aenderung ("mach es kuenftig so") | Relevante Rule-File + MEMORY.md wenn global | Sofort |

**Warum sofort?**
- Agents in spaeterer Welle brauchen die Entscheidung
- Chat kann komprimiert werden → Entscheidung verloren
- Gemini re-indexed automatisch → naechster Agent hat die Info

**Format in Feature-File:**
```markdown
## Entscheidungen (chronologisch)
- [Datum] [Entscheidung] — Grund: [warum]
```

## Knowledge Growth Loop (nach JEDER Welle)

### Post-Wave Learning (PFLICHT nach jeder Welle)
1. Lies LEARNINGS-Sektion jedes Agent-Ergebnisses
2. Fuer JEDEN gemeldeten Bug/Pattern/Fehler:
   - Bug → `errors.md` (mit Agent-Name als Quelle)
   - Pattern → `patterns.md`
   - Falsche Doku → sofort korrigieren
3. Zusaetzlich eigene Erkenntnisse:
   - Neuer Fehler → `errors.md` (2x gleicher → Rule Promotion)
   - Neues Pattern → `patterns.md` (3+ Files → Rule Promotion)
   - Neue Entscheidung → `decisions.md`
   - Feature-Erkenntnis → Feature-File
4. **Gemini `refresh_cache()`** aufrufen WENN irgendein Topic-File geschrieben wurde
5. **Anil informieren:** "Agent [X] hat entdeckt: [Y]. Dokumentiert in [Z]."

### Promotion-Regeln → siehe core.md Knowledge Capture (Trigger-Tabelle)

### Gemini Sync-Punkte (WANN refresh_cache aufrufen)
- Nach JEDEM Write auf memory/*.md oder .claude/rules/*.md
- Vor Welle 2 (falls Welle 1 neue Erkenntnisse brachte)
- Bei Session-Start (falls Docs seit letzter Session geaendert wurden)
- NICHT nach jedem einzelnen Edit — batch am Ende einer Lernphase

## Agent-Prompts

Standardisierte Prompts → `.claude/research/agent-prompts.md`
