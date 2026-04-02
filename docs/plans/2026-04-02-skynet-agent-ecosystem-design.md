# SKYNET — Selbstlernendes Agent-Oekosystem

> Design Doc | 2026-04-02 | Ansatz C: Voll-autonomes Multi-Agent-Team
> Ziel: Agents die lernen, mitdenken, agieren, Ideen liefern, zuverlaessig und gewissenhaft arbeiten, hinterfragen, kollektiv arbeiten. Bei JEDER Verwendung wird das System besser.

---

## Architektur-Ueberblick

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SKYNET LAYER                                  │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ LEARNING    │  │ COLLECTIVE   │  │ PROACTIVE    │               │
│  │ ENGINE      │  │ INTELLIGENCE │  │ DEFENSE      │               │
│  │             │  │              │  │              │               │
│  │ Learnings/  │  │ Agent Teams  │  │ Trigger-     │               │
│  │ Skill       │  │ Review-Chain │  │ Rules        │               │
│  │ Fehler→     │  │ Competing    │  │ Pattern-     │               │
│  │ Regel       │  │ Hypotheses   │  │ Scan         │               │
│  │ Metriken    │  │ Shared Tasks │  │ Improvement  │               │
│  │ Korrektur-  │  │ File Locking │  │ Proposals    │               │
│  │ Capture     │  │              │  │              │               │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘               │
│         │                │                  │                        │
│         ▼                ▼                  ▼                        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    EXECUTION LAYER                              │ │
│  │                                                                 │ │
│  │  MCP Stack ──── Skills ──── Hooks ──── Agents ──── Memory      │ │
│  │  (6 Server)     (12+)      (14+)      (8 Rollen)  (Structured) │ │
│  └────────────────────────────────────────────────────────────────┘ │
│         │                │                  │                        │
│         ▼                ▼                  ▼                        │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    FEEDBACK LAYER                               │ │
│  │                                                                 │ │
│  │  Session-Retro ── Metriken ── Post-Mortem ── Eval-Loop          │ │
│  │  (AI-basiert)     (JSONL)     (automatisch)   (Skill-Testing)  │ │
│  │                        │                                        │ │
│  │                    AutoDream (Memory Consolidation)             │ │
│  │                    Forked Subagent, 4 Phasen, max 3 Min        │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. MCP STACK (6 Server, konsolidiert in .mcp.json)

Aktuell: Nur Playwright in `.mcp.json`. Rest ueber Plugin-Configs verstreut.
Ziel: ALLES in `.mcp.json` — eine Source of Truth.

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["./node_modules/@playwright/mcp/cli.js"],
      "purpose": "Browser Automation, Visual QA, E2E Testing"
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/supabase-mcp"],
      "purpose": "DB Operations, Migrations, SQL, RLS Policies"
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/context7-mcp"],
      "purpose": "Library Docs on-demand (React, Next.js, Tailwind, etc.)"
    },
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/figma-mcp"],
      "purpose": "Design-to-Code, Screenshots, Component Mapping"
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/memory-mcp"],
      "purpose": "Structured Knowledge Graph fuer Agent-Wissen"
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/sequential-thinking-mcp"],
      "purpose": "Design-Entscheidungen, Architektur, komplexe Analyse"
    }
  }
}
```

**Prinzip:** Kein MCP-Server den wir nicht aktiv nutzen. 6 ist der Sweet Spot.

---

## 2. SKILLS (3 Tiers: Domain / Workflow / Meta)

### Tier 1: Domain-Skills (BeScout-spezifisch)

| Skill | File | Zweck | Laedt |
|-------|------|-------|-------|
| `beScout-backend` | `.claude/skills/beScout-backend/SKILL.md` | DB, RPCs, Services, Supabase | Column-Names, CHECK Constraints, RPC Patterns, Fee-Split |
| `beScout-frontend` | `.claude/skills/beScout-frontend/SKILL.md` | Components, Pages, Hooks | Design Tokens, Component Registry, CSS Traps, i18n |
| `beScout-business` | `.claude/skills/beScout-business/SKILL.md` | Compliance, Wording, Legal | Wording-Compliance, Licensing-Phasen, Geofencing |

Jeder Domain-Skill hat:
- `SKILL.md` — Statisches Domain-Wissen (aus Rules extrahiert)
- `LEARNINGS.md` — Dynamisch, waechst mit jeder Nutzung

### Tier 2: Workflow-Skills (Prozess)

| Skill | Zweck | Trigger |
|-------|-------|---------|
| `/deliver` | 4-Gate Implementation Loop | Feature-Arbeit |
| `/cto-review` | Deep Code Review gegen Projekt-Wissen | Nach Implementation |
| `/impact` | Cross-cutting Impact Analysis | VOR DB/RPC/Service-Aenderungen |
| `/reflect` | Review Learnings-Queue, promote zu Regeln | Manuell oder alle 10 Sessions |
| `/post-mortem` | Root Cause Analysis nach Bug-Fix | Nach P1/P2 Bugs |
| `/metrics` | Auswertung Session-Metriken | Bei Bedarf |

Jeder Workflow-Skill hat eine `LEARNINGS.md`.

### Tier 3: Meta-Skills (System-Verbesserung)

| Skill | Zweck | Trigger |
|-------|-------|---------|
| `/improve` | Analysiert letzte N Retros, schlaegt Workflow-Verbesserungen vor | Alle 10 Sessions |
| `/promote-rule` | Reviewed pending Fehler-zu-Regel Vorschlaege | Bei Bedarf |
| `/eval-skill [name]` | Testet Skill gegen bekannte Cases, verbessert Prompt | Periodisch |

### Learnings.md Format (einheitlich fuer ALLE Skills)

```markdown
# Learnings — [Skill Name]

## Active Rules (aus Erfahrung gelernt)
- [2026-04-02] Bei Trading RPCs: IMMER Liquidation-Check VOR Order-Insert
- [2026-04-01] PlayerPhoto: Props heissen `first`/`last`, NICHT `firstName`

## Pending (noch nicht verifiziert)
- [2026-04-02] Modal Performance: lazy-import wenn >500 Zeilen?

## Rejected (bewusst verworfen)
- [2026-03-30] useReducer statt useState: Nicht immer besser, nur bei >5 States
```

### SKILL.md Skeleton (alle 3 Domain-Skills)

```markdown
---
name: beScout-[domain]
description: [one line]
---

## Domain-Wissen
[Extrahiert aus Rules + common-errors.md]

## Patterns
[Top 10 Patterns fuer diese Domain]

## Anti-Patterns
[Top 5 Fehler die in dieser Domain passieren]

## Checkliste
[Domain-spezifische Pruefpunkte]

## Learnings
→ Lies LEARNINGS.md VOR Task-Start
→ Schreibe neue Erkenntnisse NACH Task-Ende
```

---

## 3. HOOKS (14 Hooks — upgraded)

### Bestehende Hooks (behalten, teilweise upgraden)

| # | Event | Typ | Was | Upgrade? |
|---|-------|-----|-----|----------|
| 1 | PostToolUse | command | auto-lint.sh | Behalten |
| 2 | PostToolUse | command | file-size-warning.sh | Behalten |
| 3 | PreToolUse | command | safety-guard.sh | Erweitern |
| 4 | PreCompact | command | pre-compact-backup.sh | Behalten |
| 5 | Stop | command | session-handoff-auto.sh | Behalten |
| 6 | Stop | **agent** | quality-gate → **UPGRADE** | Von command zu agent |
| 7 | SessionEnd | command | session-retro.sh | Erweitern um Metriken |
| 8 | SessionStart | command | inject-learnings.sh | Behalten |
| 9 | StopFailure | command | crash-recovery.sh | Behalten |
| 10 | Notification | command | PowerShell Alert | Behalten |

### Neue Hooks

| # | Event | Typ | Was | Zweck |
|---|-------|-----|-----|-------|
| 11 | **Stop** | **agent** | `quality-gate-agent` | AI-basierte Verifikation: liest Files, prueft tsc, versteht Kontext |
| 12 | **PreCompact** | command | `inject-context-on-compact.sh` | Re-injiziert current-sprint + aktiven Task nach Compaction |
| 13 | **UserPromptSubmit** | command | `capture-correction.sh` | Erkennt Korrekturen ("nein", "nicht so") → Queue |
| 14 | **PostToolUse** | command | `track-file-changes.sh` | Trackt geaenderte Files fuer Metriken |

### Quality-Gate Agent-Hook (das Herzstuck)

```yaml
# .claude/settings.json — hooks.Stop
{
  "matcher": "",
  "type": "agent",
  "prompt": |
    Du bist der Quality Gate Agent. Pruefe BEVOR die Session endet:
    1. `tsc --noEmit` — 0 neue Errors?
    2. Alle geaenderten Files: Imports korrekt? Keine broken Exports?
    3. i18n: Neue Keys in DE + TR vorhanden?
    4. Keine leeren .catch(() => {})
    5. Service Layer eingehalten? (kein Supabase direkt in Components)
    6. common-errors.md Patterns nicht verletzt?

    Bei Problemen: Beschreibe was falsch ist → Session arbeitet weiter.
    Bei OK: Gib gruenes Licht.
  "timeout": 120000
}
```

### Correction-Capture Hook

```bash
#!/bin/bash
# capture-correction.sh — UserPromptSubmit Hook
# Erkennt Korrekturen und queued sie fuer /reflect

INPUT="$1"
QUEUE=".claude/learnings-queue.jsonl"

# Regex fuer Korrektur-Patterns
if echo "$INPUT" | grep -iE "(nein|nicht so|falsch|stattdessen|eigentlich|stop|hoer auf|das war)" > /dev/null; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "{\"timestamp\":\"$TIMESTAMP\",\"type\":\"correction\",\"input\":$(echo "$INPUT" | jq -Rs .)}" >> "$QUEUE"
fi
```

---

## 4. AGENT-DEFINITIONEN (8 Rollen + Teams)

### Agent-Rollen (ueberarbeitet)

| Agent | Model | Tools | Isolation | Spezialitaet |
|-------|-------|-------|-----------|-------------|
| **backend** | Sonnet 4.6 | R,W,E,Gr,Gl,B | worktree | DB, RPCs, Services. Laedt beScout-backend Skill |
| **frontend** | Sonnet 4.6 | R,W,E,Gr,Gl,B | worktree | UI, Components, i18n. Laedt beScout-frontend Skill |
| **reviewer** | Opus 4.6 | R,Gr,Gl | read-only | Code Review. Laedt cto-review Skill. Schreibt Learnings |
| **business** | Sonnet 4.6 | R,Gr,Gl | read-only | Compliance. Laedt beScout-business Skill |
| **healer** | Sonnet 4.6 | R,W,E,Gr,Gl,B | main | Fix Build/Test Errors. Self-Healing Loop |
| **test-writer** | Sonnet 4.6 | R,W,E,Gr,Gl,B | worktree | Tests from Spec. Sieht NIE Implementation |
| **impact-analyst** | Opus 4.6 | R,Gr,Gl,B | read-only | Cross-cutting Analysis. Findet ALLE betroffenen Pfade |
| **qa-visual** | Sonnet 4.6 | R,Gr,Gl,B + Playwright MCP | read-only | Visual QA mit Screenshots |

### Jeder Agent bekommt (NEU)

```markdown
## Phase 0: WISSEN LADEN (VOR jeder Arbeit)
1. Lies `common-errors.md`
2. Lies dein Domain-Skill (`beScout-[domain]/SKILL.md`)
3. Lies dein `LEARNINGS.md`
4. Lies den Task/Issue vollstaendig

## Phase 4: LERNEN (NACH jeder Arbeit) — NEU
1. Was habe ich gelernt?
2. Welcher Fehler waere vermeidbar gewesen?
3. Schreibe 1-3 Zeilen in LEARNINGS.md
4. War ein Pattern ueberraschend? → Flag fuer /reflect
```

### Agent Teams Konfiguration

```
Team: BeScout Dev Team
Lead: Jarvis (CTO)
Teammates:
  - frontend (Sonnet 4.6, worktree, acceptEdits)
  - backend (Sonnet 4.6, worktree, acceptEdits)
  - reviewer (Opus 4.6, read-only, plan mode)
  - qa-visual (Sonnet 4.6, read-only)

Workflow:
  1. Lead definiert Tasks mit Dependencies
  2. Implementer arbeiten parallel in Worktrees
  3. TaskCompleted → Quality Gate Hook verifiziert
  4. Reviewer reviewed automatisch nach Implementation
  5. Bei Rejection → Task zurueck mit Feedback
  6. Lead merged nach Approval
```

### Competing Hypotheses (fuer schwierige Bugs)

```
Trigger: 3x gescheiterter Fix (Circuit Breaker)
Statt Eskalation:
  1. Spawne 3 Agents mit je 1 Hypothese
  2. Jeder versucht die anderen zu widerlegen
  3. Lead synthetisiert → bester Ansatz gewinnt
  4. Wenn alle scheitern → DANN eskalieren
```

---

## 5. MEMORY & LEARNING SYSTEM

### Struktur (erweitert)

```
memory/
  MEMORY.md                     ← Index (auto-loaded)
  current-sprint.md             ← Aktueller Stand
  session-handoff.md            ← Handoff-Notes

  learnings/                    ← NEU: Skill-spezifische Learnings (HUMAN-APPROVED)
    deliver.md
    cto-review.md
    impact.md
    beScout-backend.md
    beScout-frontend.md
    beScout-business.md
    drafts/                     ← NEU: Agent-generierte Drafts (NICHT in Context geladen)
      *.md                      ← Jarvis reviewed → promote oder delete

  metrics/                      ← NEU: Session-Metriken
    sessions.jsonl              ← 1 Zeile pro Session
    weekly-report.md            ← Generiert von /metrics

  post-mortems/                 ← NEU: Bug Post-Mortems
    2026-04-02-bes-107.md

  improvement-proposals/        ← NEU: System-Verbesserungsvorschlaege
    2026-04-02-proposal.md

  rules-pending/                ← NEU: Fehler-zu-Regel Queue
    common-errors-pending.md
```

### Fehler-zu-Regel Pipeline

```
Fehler tritt auf
  → Agent dokumentiert in errors.md
  → Hook prueft: Gleicher Fehler-Typ 2x?
    → JA: Generiere Regel-Vorschlag in rules-pending/common-errors-pending.md
    → /promote-rule reviewed und synced zu common-errors.md
    → ODER: Anil approved bei naechster Session
```

### Session-Metriken (JSONL Format)

```json
{
  "session_id": "abc123",
  "date": "2026-04-02",
  "duration_min": 45,
  "task_tier": 2,
  "files_changed": 8,
  "tsc_errors_before": 3,
  "tsc_errors_after": 0,
  "tests_before": 194,
  "tests_after": 197,
  "rework_count": 1,
  "skills_used": ["deliver", "impact"],
  "agents_spawned": 2,
  "corrections_received": 0,
  "learnings_written": 2
}
```

### Automatische Improvement Proposals (alle 10 Sessions)

```
SessionStart Hook zaehlt Sessions (.claude/session-counter)
Bei Counter % 10 == 0:
  → Agent analysiert letzte 10 Metriken-Eintraege
  → Identifiziert: Wiederholungen, Zeitfresser, haeufige Fehler
  → Schreibt Vorschlag in improvement-proposals/
  → Jarvis presented bei naechster Session: "Es gibt einen Verbesserungsvorschlag..."
```

### AutoDream — Memory Consolidation

**Was es ist:** Ein Forked Subagent der das Memory-System gesund haelt.
Ohne AutoDream wuerde Skynet das Memory mit Learnings, Metriken, Post-Mortems
und Retros aufblaehn bis MEMORY.md unlesbar wird.

**Trigger-Bedingungen (ODER):**
- 24+ Stunden seit letzter Consolidation
- 5+ Sessions seit letzter Consolidation

**Check:** SessionStart Hook prueft `.claude/autodream-last-run` Timestamp.
Bei Trigger → Forked Subagent (laeuft im Hintergrund, blockiert nicht).

**4 Phasen:**

```
Phase 1: ORIENT
  - Lies MEMORY.md + alle memory/ Files
  - Zaehle Zeilen, identifiziere Bloat
  - Erstelle Inventar: was ist neu, was ist stale

Phase 2: GATHER SIGNAL
  - Lies letzte 5 Session-Retros
  - Lies neue LEARNINGS.md Eintraege
  - Lies rules-pending/ Queue
  - Lies metrics/sessions.jsonl (letzte Eintraege)
  - Identifiziere: Patterns, Wiederholungen, veraltete Infos

Phase 3: CONSOLIDATE
  - Merge doppelte Learnings
  - Konvertiere relative Daten → absolute ("gestern" → "2026-04-01")
  - Promote verifizierte Learnings → MEMORY.md Index
  - Fasse aehnliche Feedback-Memories zusammen
  - Archive stale Memories (>30 Tage ohne Referenz)

Phase 4: PRUNE & INDEX
  - MEMORY.md: Max 25KB, ~150 chars pro Index-Zeile
  - Entferne Duplikate aus Index
  - Sortiere semantisch (nicht chronologisch)
  - Loesche leere/verwaiste Memory-Files
  - Schreibe `.claude/autodream-last-run` Timestamp
  - Log: "AutoDream consolidated X files, pruned Y, archived Z"
```

**Regeln:**
- NIEMALS Memory-Content loeschen der <7 Tage alt ist
- NIEMALS aktive Feature-Specs oder current-sprint.md aendern
- Immer `session-handoff.md` und `current-sprint.md` UNANGETASTET lassen
- Bei Unsicherheit: archivieren statt loeschen
- Max 3 Minuten Laufzeit (Timeout)

**Integration mit Skynet:**
```
Skynet produziert Memory:          AutoDream konsolidiert:
  Learnings.md (pro Skill)    →     Merge Duplikate, promote Beste
  metrics/sessions.jsonl       →     Aggregate zu weekly-report.md
  post-mortems/                →     Archive nach 30 Tagen
  rules-pending/               →     Flag unreviewed >7 Tage
  improvement-proposals/       →     Archive umgesetzte Proposals
  session-retros/              →     Loesche >10 Retros (behalte Summary)
```

---

## 6. TRIGGER-RULES (Proaktive Erkennung)

Werden in CLAUDE.md / Agent-Prompts eingebettet. Agents handeln proaktiv WAEHREND der Arbeit.

```markdown
## Proaktive Regeln (IMMER aktiv waehrend Arbeit)

### Code-Qualitaet
- Datei >500 Zeilen → Vorschlag: "Soll ich diese Datei aufteilen?"
- >5 useState in einem Component → Vorschlag: "useReducer wuerde hier helfen"
- Gleicher Code-Block 3x copy-pasted → Vorschlag: "Shared Helper extrahieren?"
- Import aus gelöschter Datei → SOFORT fixen, nicht ignorieren

### Performance
- Supabase Query ohne .limit() → WARNUNG: "Unbounded Query gefunden"
- staleTime: 0 → WARNUNG: "Nutze invalidateQueries statt staleTime: 0"
- Component ohne React.memo bei >100 Zeilen → VORSCHLAG

### Security
- .env File in git add → BLOCKIEREN
- console.log mit user/token/key → WARNUNG
- RLS-lose Tabelle → WARNUNG: "RLS Policies fehlen"

### Business
- "Investment" oder "ROI" in UI-Text → BLOCKIEREN (Compliance)
- $SCOUT ohne Disclaimer → WARNUNG
- Phase 3/4 Feature-Code → BLOCKIEREN
```

---

## 7. SELF-IMPROVEMENT LOOP

Das Kernprinzip: **Jede Verwendung macht das System besser.**

```
SESSION START
  │
  ├─ inject-learnings.sh (bestehende Learnings laden)
  ├─ Session-Counter inkrementieren
  └─ Improvement-Proposals checken (alle 10 Sessions)
  │
WAEHREND SESSION
  │
  ├─ Trigger-Rules feuern proaktiv
  ├─ Agents laden LEARNINGS.md VOR Arbeit
  ├─ Correction-Capture Hook queued User-Korrekturen
  └─ track-file-changes.sh trackt Metriken
  │
SESSION ENDE
  │
  ├─ Quality-Gate Agent verifiziert
  ├─ Agents schreiben LEARNINGS.md NACH Arbeit
  ├─ session-retro.sh schreibt Metriken (JSONL)
  ├─ Fehler-zu-Regel Pipeline prueft auf Wiederholungen
  └─ session-handoff.sh schreibt Handoff
  │
NAECHSTE SESSION START
  │
  └─ AutoDream Check: 24h oder 5 Sessions seit letztem Run?
       → JA: Forked Subagent konsolidiert Memory (3 Min, non-blocking)
       → Merge Learnings, archive Stale, prune Index, absolute Daten
  │
PERIODISCH
  │
  ├─ /reflect reviewed Korrektur-Queue
  ├─ /metrics aggregiert Metriken
  ├─ /improve analysiert Retros → Vorschlaege
  └─ /eval-skill testet und verbessert Skill-Prompts
```

---

## 8. SKILL EVAL-LOOP (Skills testen sich selbst)

### Konzept

Jeder Skill bekommt 5-10 Test-Cases:
```markdown
# Eval Cases — /deliver

## Case 1: Missing i18n Key
Input: "Add a new button to PlayerRow with text 'Zum Kader'"
Expected: Agent erstellt DE + TR i18n Key VOR dem Component-Code
Pass Criteria: grep -r "Zum Kader" messages/de.json → match

## Case 2: Broken Import After Delete
Input: "Remove PlayerKPIs from player/index.tsx"
Expected: Agent updated ALLE Consumer-Imports
Pass Criteria: tsc --noEmit → 0 errors
```

### Eval-Prozess
```
/eval-skill deliver
  → Laedt Test-Cases
  → Fuehrt jeden Case in isolierter Session aus
  → Vergleicht Output mit Expected
  → Berechnet Score (Pass-Rate)
  → Bei <80%: Analysiert Misses, schlaegt Prompt-Aenderung vor
  → Bei >90%: Skill ist gut, keine Aenderung
```

---

## IMPLEMENTIERUNGS-WAVES

### Wave 1: Foundation (Session 1-2)
- [ ] 3 Domain SKILL.md Files erstellen (beScout-backend/frontend/business)
- [ ] 6 LEARNINGS.md Files anlegen (leer, mit Format-Template)
- [ ] .mcp.json konsolidieren (6 Server)
- [ ] Quality-Gate von command zu agent-hook upgraden
- [ ] PostCompact Hook implementieren
- [ ] Trigger-Rules in CLAUDE.md einbetten
- [ ] Meta-Rules fuer Regel-Qualitaet

### Wave 2: Collective Intelligence (Session 3-4)
- [ ] Agent Teams Konfiguration
- [ ] Review-Chain Setup (Implementer → Reviewer → Feedback)
- [ ] TaskCompleted Quality Gate Hook
- [ ] Correction-Capture Hook (UserPromptSubmit)
- [ ] Agent Phase 4 (LERNEN) in alle Agent-Definitionen

### Wave 3: Feedback Automation + AutoDream (Session 5-6)
- [ ] Session-Metriken System (JSONL + /metrics Skill)
- [ ] Fehler-zu-Regel Pipeline
- [ ] /reflect Skill
- [ ] /post-mortem Skill
- [ ] track-file-changes.sh Hook
- [ ] AutoDream Subagent (4-Phasen Memory Consolidation)
- [ ] SessionStart Trigger-Check (.claude/autodream-last-run)
- [ ] AutoDream Regeln: max 3 Min, nichts <7 Tage loeschen, current-sprint unangetastet

### Wave 4: Self-Improvement (Session 7-8)
- [ ] /improve Skill (Workflow-Improvement Proposals)
- [ ] Session-Counter + Threshold-Check
- [ ] Competing Hypotheses Pattern (Prompt-Template)
- [ ] Skill Eval-Loop (/eval-skill)
- [ ] Eval-Cases fuer /deliver und /cto-review

### Wave 5: Polish & Cleanup (Session 9-10)
- [ ] Alte/redundante Skills entfernen (bencium-*, implementer)
- [ ] Plugin-Duplikate konsolidieren
- [ ] Performance/Security/Testing Rules erstellen
- [ ] Dokumentation: AGENTS-README.md
- [ ] Full System Smoke Test

---

## ERFOLGS-METRIKEN

| Metrik | Baseline (jetzt) | Ziel (nach Skynet) |
|--------|-------------------|---------------------|
| Agent First-Time-Right Rate | ~60% | >85% |
| Corrections pro Session | ~3 | <1 |
| Rework-Rate (gleiche Datei 2x) | ~25% | <10% |
| tsc Errors nach Session | gelegentlich >0 | immer 0 |
| Learnings pro Woche | 0 (manuell) | >10 (automatisch) |
| Neue Regeln pro Monat | 2-3 (manuell) | 5-8 (semi-automatisch) |
| System-Verbesserungen/Monat | 0 | 2-4 |

---

## 9. DREI HARTE GESETZE (Cache, Tools, Curation)

### Gesetz 1: Cache-Prefix Sharing maximieren

Forked Subagents teilen Cache-Prefixes. 5 parallele Agents kosten Token-maessig
so viel wie 1 Agent. Das macht Agent Teams quasi gratis fuer parallele Arbeit.

**Konsequenz fuer Skynet:**
- ALLE Agents im Team teilen den gleichen System-Prompt-PREFIX
- Beescout-Context (Rules, Domain-Wissen) = gemeinsamer Prefix
- Rollen-spezifischer Teil kommt NACH dem Prefix
- Reihenfolge: Tools → System (shared) → System (role) → Messages

```
SHARED PREFIX (gecached, alle Agents):
  [BeScout Project Context]
  [common-errors.md]
  [Design Tokens]
  [Import Map]
  [Top 10 DONT]

ROLE SUFFIX (pro Agent, nach Prefix):
  [Agent-spezifische Anweisungen]
  [Domain-Skill Zusammenfassung]
```

### Gesetz 2: NIEMALS leere Tool-Arrays

`tools: []` killt 95%+ Cache Hit Rate. Jeder Agent MUSS eine explizite Tool-Liste haben.

**HARD RULE in jeder Agent-Definition:**
- Read-only Agents: `tools: ["Read", "Glob", "Grep"]` (NICHT `tools: []`)
- Implementer: `tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"]`
- NIEMALS einen Agent ohne Tools spawnen
- NIEMALS `disallowed_tools` als Workaround fuer "kein Bash" — statt dessen explizit die ERLAUBTEN Tools listen

### Gesetz 3: Human-Curated Context ONLY — Machine-Generated Context VERBOTEN

Studie belegt: Human-curated CLAUDE.md verbessert Ergebnisse um ~4%.
LLM-generierte Context-Files VERSCHLECHTERN um ~3% und kosten 20% mehr Tokens.

**KONSEQUENZ — Fundamentale Design-Aenderung:**

Das System CAPTURED Signale und SCHLAEGT VOR, aber KEIN einziges Byte
machine-generated Context fliesst automatisch in Agent-Prompts.

| Komponente | VORHER (geplant) | JETZT (korrigiert) |
|------------|------------------|---------------------|
| LEARNINGS.md | Auto-append nach Task | Agent schreibt DRAFT → `learnings/drafts/`. Jarvis/Anil promoted zu LEARNINGS.md |
| Fehler-zu-Regel | Auto-generate Rule | Pipeline schreibt VORSCHLAG → `rules-pending/`. Mensch approved |
| AutoDream | Generiert Summaries | PRUNED und INDEXIERT nur. Generiert KEINEN neuen Content |
| Trigger-Rules | Auto-erweitert | HANDGESCHRIEBEN. Punkt. Kein Agent aendert Trigger-Rules |
| /improve Proposals | Schreibt Vorschlag | OK — bleibt Vorschlag. Kein Auto-Merge |
| Agent System-Prompts | Koennte auto-optimiert werden | NIEMALS. Prompts sind human-curated |
| common-errors.md | Koennte auto-updated werden | NUR durch Jarvis/Anil nach /promote-rule Review |

**Draft → Review → Promote Pattern:**
```
Agent arbeitet → schreibt Draft Learning
  → drafts/2026-04-02-backend-rpc-guard.md
  → Naechste Session: Jarvis reviewed Drafts
  → Gut? → Promote zu LEARNINGS.md (1 Zeile, human-edited)
  → Schlecht? → Delete
  → Unklar? → Frage Anil
```

**Was IN den Agent-Context darf (auto-loaded):**
- CLAUDE.md (human-curated)
- Rules/*.md (human-curated)
- SKILL.md (human-curated)
- LEARNINGS.md (human-APPROVED, nicht human-written — aber jede Zeile reviewed)
- common-errors.md (human-curated)

**Was NIEMALS in den Agent-Context darf (auto-loaded):**
- Rohe Agent-Outputs
- Unreviewed Drafts
- Auto-generierte Summaries
- Machine-geschriebene Rules

---

## RISIKEN

| Risiko | Mitigation |
|--------|-----------|
| Over-Engineering fuer Pilot | Waves sind unabhaengig — Wave 1-2 liefern schon 80% des Werts |
| Hook-Overhead verlangsamt Session | Timeouts, Agent-Hooks nur auf Stop (nicht auf jedem Tool-Call) |
| Learnings.md wird Muell-Halde | Draft→Review→Promote Gate, AutoDream pruned |
| Agent Teams instabil | Feature ist Beta — Fallback auf direkte Sub-Agents |
| Metriken-Inflation | JSONL ist append-only, /metrics aggregiert — kein Bloat im Context |
| Machine-generated Context Drift | Gesetz 3: NICHTS auto-generated in Agent-Prompts. Human Gate IMMER |
| Cache-Invalidation bei Tool-Changes | Gesetz 2: Explizite Tool-Listen, nie leere Arrays |
