# SKYNET v2 — Cleanup + Jarvis Protocol

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Das bestehende Skynet-System reparieren, Redundanz eliminieren, Memory auffuellen, Hooks fixen, und Agents auf Jarvis-Level bringen. Kein neues Tooling — das Vorhandene zum Laufen bringen.

**Prinzip:** Fix before Feature. Weniger aber funktionierend > viel aber kaputt.

---

## Phase 1: MEMORY REPARIEREN (Kritischste Luecke)

### Task 1: MEMORY.md Index aus User-Memory uebernehmen

Das User-Memory-System hat bereits eine vollstaendige MEMORY.md unter:
`C:\Users\Anil\.claude\projects\C--bescout-app\memory\MEMORY.md`

Das Projekt-Memory unter `C:\bescout-app\memory\` referenziert diese aber Agents finden sie nicht.

**Aktion:**
- Lies die existierende MEMORY.md aus dem User-Memory
- Erstelle einen Symlink oder Kopie in `memory/MEMORY.md` (Projekt-Root)
- Pruefe welche referenzierten Files tatsaechlich existieren
- Entferne tote Links

---

### Task 2: errors.md erstellen (Core Memory — von Agents referenziert)

4 Agent-Definitionen referenzieren `memory/errors.md` die nicht existiert.

**Aktion:**
- Extrahiere die Top 50 Fehler aus:
  - `.claude/rules/common-errors.md` (alle Sections)
  - MEMORY.md Feedback-Entries (feedback_*.md)
  - Session-Retros
- Format: `| ID | Fehler | Root Cause | Fix | Quelle |`
- Erstelle `memory/errors.md`

---

### Task 3: patterns.md erstellen (Core Memory — von Agents referenziert)

**Aktion:**
- Extrahiere die Top 20 etablierten Patterns aus:
  - CLAUDE.md (Code-Konventionen)
  - `.claude/rules/` (alle Domain-Rules)
  - User-Memory `patterns.md` (falls existent)
- Format: Pattern Name → Wann nutzen → Code-Beispiel
- Erstelle `memory/patterns.md`

---

## Phase 2: REDUNDANZ ELIMINIEREN

### Task 4: Single Source of Truth fuer DB Columns + Fee-Split + Wording

**Problem:** DB Column Names 5x kopiert, Fee-Split 5x, Wording 4x.
**Loesung:** Die Rules-Files sind die Quelle. Skills verweisen darauf statt zu kopieren.

**Aktion:**
- `beScout-backend/SKILL.md`: Ersetze kopierte Sections mit Verweis:
  ```
  ## DB Column Names
  → Siehe `.claude/rules/common-errors.md` Section "DB Column Names"
  ```
- `beScout-business/SKILL.md`: Gleich fuer Wording + Fee-Split
- `beScout-frontend/SKILL.md`: Gleich fuer CSS Traps + React Patterns
- `scripts/agent-sdk/config.py`: SHARED_CONTEXT auf 3 Zeilen kuerzen, verweist auf Rules

**Ergebnis:** Eine Aenderung an common-errors.md propagiert automatisch.

---

### Task 5: Agent SDK Config als Thin Wrapper

**Problem:** Agent-Configs in Python duplicieren die .claude/agents/*.md Definitionen.

**Aktion:**
- `config.py` System-Prompts auf 5 Zeilen kuerzen: Rolle + Verweis auf SKILL.md
- Tool-Listen bleiben (die sind SDK-spezifisch)
- Budget/Turns bleiben
- SHARED_CONTEXT wird zu: `"Lies .claude/agents/SHARED-PREFIX.md fuer Kontext"`
- Fuege `setting_sources: ["project"]` hinzu damit SDK-Agents CLAUDE.md + Rules laden

---

## Phase 3: HOOKS REPARIEREN

### Task 6: track-file-changes.sh fixen

**Problem:** `CLAUDE_FILE_PATH` Environment-Variable existiert nicht.

**Aktion:**
- Hook bekommt Input ueber Argument, nicht ENV
- Lese den Tool-Input aus dem Hook-Argument:
  ```bash
  #!/bin/bash
  # PostToolUse Hook — Input kommt als JSON ueber Argument
  INPUT="$1"
  FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+' 2>/dev/null)
  if [ -n "$FILE_PATH" ]; then
    echo "$FILE_PATH" >> "C:/bescout-app/.claude/session-files.txt"
  fi
  exit 0
  ```

---

### Task 7: AutoDream Trigger Windows-kompatibel machen

**Problem:** `date -d` funktioniert nicht auf Windows bash.

**Aktion:**
- Ersetze time-based Trigger mit Counter-only:
  ```bash
  # Nur Counter-basiert, kein date-Parsing
  if [ "$COUNT" -ge 5 ]; then
    echo "AutoDream: Memory Consolidation faellig ($COUNT Sessions)"
  fi
  ```
- AutoDream-Run setzt Counter auf 0

---

### Task 8: quality-gate-v2.sh Counter-Init robust machen

**Aktion:**
- Fuege Fallback hinzu wenn Datei nicht existiert:
  ```bash
  COUNTER_FILE="C:/bescout-app/.claude/session-counter"
  COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
  echo $((COUNT + 1)) > "$COUNTER_FILE"
  ```

---

### Task 9: session-retro.sh Metriken-Output fixen

**Problem:** Metriken nutzen `$SESSION_FILES` die nie befuellt wird (weil track-file-changes.sh kaputt).

**Aktion:** Nachdem Task 6 fixt, verifizieren dass session-retro.sh korrekte JSONL schreibt.

---

## Phase 4: SKILL LEARNINGS ERSTELLEN

### Task 10: Fehlende LEARNINGS.md in Skills erstellen

**Problem:** 3 Skill-Verzeichnisse haben keine LEARNINGS.md.

**Pruefe zuerst:**
```bash
ls .claude/skills/beScout-*/LEARNINGS.md
```

**Aktion:** Falls fehlend, erstelle mit Standard-Template.

---

## Phase 5: JARVIS PROTOCOL — Agent-Prompts auf Elite-Level

### Task 11: SHARED-PREFIX.md zum Jarvis Protocol upgraden

**Problem:** SHARED-PREFIX.md ist 36 Zeilen — zu wenig fuer echtes Denk-Framework.

**Neuer SHARED-PREFIX.md (~120 Zeilen):**

```markdown
# BeScout Agent Protocol

> Geladen von ALLEN Agents als gemeinsamer Prefix.

## Projekt
BeScout: B2B2C Fan-Engagement-Plattform. Next.js 14, TypeScript strict,
Tailwind (Dark Only), Supabase. Pilot: Sakaryaspor.

## Jarvis Protocol — Wie du DENKST (nicht nur ausfuehrst)

### VOR der Arbeit (30 Sekunden investieren)
1. **Verstehe den Task vollstaendig.** Lies ALLES bevor du anfaengst.
2. **Pruefe Scope:** Was genau soll sich aendern? Was NICHT?
3. **Impact-Check:** Welche anderen Files/Services sind betroffen?
   - Bei DB/RPC/Service-Aenderung: Finde ALLE Consumers (Grep)
   - Bei UI-Aenderung: Welche Pages nutzen diesen Component?
4. **Hypothese verifizieren:** Wird meine Aenderung den gewuenschten Effekt haben?
   - Bei Performance: MESSEN vor und nach
   - Bei "unused": GREP bevor loeschen
5. **Tools waehlen:**
   - Library-Frage? → Context7 MCP nutzen (nicht raten)
   - Design-Entscheidung? → Sequential-Thinking MCP
   - Viele Files betroffen? → Sub-Agent spawnen

### WAEHREND der Arbeit
6. **NUR was im Task steht.** Kein Scope-Creep. Neues Problem? Notieren, nicht fixen.
7. **Code LESEN vor Aendern.** Nicht raten. File oeffnen, Pattern verstehen.
8. **Proaktiv warnen:**
   - Datei >500 Zeilen → "Aufteilung pruefen?"
   - Supabase ohne .limit() → "Unbounded Query"
   - Leere .catch(() => {}) → mindestens console.error
   - "Investment"/"ROI" in UI → BLOCKIEREN (Compliance)
9. **Bei Unsicherheit: FRAGEN.** Nicht raten und hoffen.

### NACH der Arbeit (VOR "fertig" sagen)
10. **Self-Review:** JEDE geaenderte Datei nochmal lesen. Komplett.
11. **Checkliste:**
    - Types propagiert? (Type → Service → Hook → Component)
    - i18n komplett? (DE + TR)
    - Column-Names korrekt? (Gegen common-errors.md pruefen)
    - Alle Consumers aktualisiert? (Grep nach Identifier)
    - Service Layer eingehalten? (Kein Supabase direkt)
    - Edge Cases? (null, 0, leerer String, 1000 Items)
12. **Learning Draft:** Was habe ich gelernt?
    → Schreibe in `memory/learnings/drafts/YYYY-MM-DD-[agent]-[topic].md`

### ESKALATION
- 2x gescheitert → anderen Ansatz probieren
- 3x gescheitert → Melde: "Ich bin stuck. Hypothesen: A, B, C. Brauche Input."
- NIEMALS: 5x das Gleiche probieren und hoffen

## Harte Regeln
- Service Layer: Component → Service → Supabase (NIE direkt)
- Hooks VOR early returns
- Array.from(new Set()) statt [...new Set()]
- qk.* Factory fuer Query Keys
- floor_price ?? 0 — Null-Guard
- $SCOUT = Platform Credits (NIEMALS: Investment, ROI, Profit)
- Code-intern: "dpc" bleibt in Variablen/DB-Columns
- Leere .catch(() => {}) verboten

## 3 Gesetze
1. Cache-Prefix Sharing: Dieser Block ist der gemeinsame Prefix
2. Nie leere Tool-Arrays: NIEMALS tools: []
3. Human-Curated Context Only: Drafts → Review → Promote

## Tool-Verwendung
- Library-API unklar? → Context7 MCP (aktuelle Docs, nicht raten)
- Architektur-Entscheidung? → Sequential-Thinking MCP
- VOR DB/RPC/Service-Aenderung → /impact (alle Pfade finden)
- Viele Files betroffen? → Sub-Agent spawnen
```

---

### Task 12: Context7 MCP Duplikat entfernen

**Problem:** Context7 als Plugin UND als MCP Server — redundant.

**Aktion:** Entferne `context7` Eintrag aus `.mcp.json` (Plugin-Version ist besser integriert).

---

### Task 13: Agent SDK `setting_sources` hinzufuegen

**Problem:** Agent SDK Agents laden CLAUDE.md + Rules NICHT.

**Aktion:** In `scripts/agent-sdk/run_agent.py`, fuege `setting_sources=["project"]` zu ClaudeAgentOptions hinzu. Damit laden SDK-Agents automatisch CLAUDE.md, Rules und Skills.

---

### Task 14: Finaler Integrations-Test

**Aktion:**
1. Spawne backend Agent → laedt SHARED-PREFIX? laedt SKILL.md? laedt LEARNINGS.md?
2. Mache eine Aenderung → track-file-changes.sh trackt?
3. Beende Session → session-retro.sh schreibt JSONL?
4. Pruefe session-counter inkrementiert?
5. Pruefe learnings-queue.jsonl funktioniert?

---

## Abhaengigkeiten

```
Phase 1 (Memory) → unabhaengig, SOFORT starten
Phase 2 (Redundanz) → nach Phase 1 (braucht Memory als Referenz)
Phase 3 (Hooks) → unabhaengig, parallel zu Phase 1
Phase 4 (Learnings) → nach Phase 1
Phase 5 (Jarvis Protocol) → nach Phase 2+3 (braucht bereinigte Skills + funktionierende Hooks)
```

## Zeitplan

| Phase | Tasks | Aufwand |
|-------|-------|---------|
| Phase 1: Memory | 1-3 | 2h |
| Phase 2: Redundanz | 4-5 | 1h |
| Phase 3: Hooks | 6-9 | 1h |
| Phase 4: Learnings | 10 | 15min |
| Phase 5: Jarvis Protocol | 11-14 | 2h |
| **Total** | **14 Tasks** | **~6h** |
