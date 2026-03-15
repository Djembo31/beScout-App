---
description: Ultra Instinct v3 — Briefing Files + Filesystem als Shared Brain
globs: "**/*"
---

## Ultra Instinct v3

### Kern-Erkenntnis

Das Problem war nie "Agents vs. Jarvis." Das Problem war:
**Agents bekommen einen Prompt, aber keinen KONTEXT.**

Loesung: Das Filesystem als shared Brain zwischen Orchestrator und Agents.

```
.claude/briefings/{task-id}.md   ← Kontext VOR Agent-Start (ephemeral)
.claude/agent-memory/{name}/     ← Learnings NACH Agent-Ende (persistent)
.claude/rules/                   ← Immer-geladenes Wissen (permanent)
memory/                          ← Projekt-Level Wissen (semi-permanent)
```

---

## Der Briefing-File Workflow

### BEVOR ein Agent dispatched wird:

1. **Explore-Agent sammelt Kontext** (read-only, in eigenem Context):
   - Liest alle Files die der Implementer braucht
   - Grepped alle Callsites
   - Sammelt relevante Eintraege aus common-errors.md
   - Output: Summary (NICHT raw Files)

2. **ICH (Jarvis) schreibe die Briefing-Datei** `.claude/briefings/{task}.md`:

```markdown
# Briefing: [Task-Name]

## Auftrag
[Was genau gebaut/gefixt werden soll]

## Betroffene Files
[Vollstaendiger Source jeder Datei die geaendert wird]

## Callsites (WER ruft das auf?)
[Grep-Ergebnisse: jede Stelle die die geaenderte Funktion aufruft]

## Side-Effects (WAS wird ausgeloest?)
[Notifications, Missions, Wallet, Cache — was muss konsistent bleiben]

## Bekannte Fehler in diesem Bereich
[Relevante Eintraege aus common-errors.md und errors.md]

## Parallele Code-Pfade
[Andere Funktionen die dasselbe tun und konsistent bleiben muessen]

## Acceptance Criteria
[Exakte Befehle die PASS ergeben muessen bevor der Agent fertig ist]
- npx tsc --noEmit
- npx vitest run [betroffene tests]
- [Spezifische Pruefung]

## Anti-Patterns (NICHT machen)
[Konkrete Fehler die in diesem Bereich schon gemacht wurden]
```

3. **Agent bekommt im Prompt:** "Lies ZUERST .claude/briefings/{task}.md"

4. **Agent schreibt am Ende:** LEARNINGS Sektion → wird in `.claude/agent-memory/` persistiert

5. **Briefing-Datei wird nach Merge geloescht** (ephemeral)

---

## Wann WER was macht

| Aufgabe | Wer | Context-Impact |
|---------|-----|----------------|
| Briefing-Kontext sammeln | Explore-Agent | 0 (eigener Context) |
| Briefing-Datei schreiben | ICH | Minimal (1 Write) |
| Implementation | Agent ODER ICH | Agent: 0 auf mich. ICH: proportional |
| Edits an bestehendem Code | ICH (bevorzugt) | Proportional, aber korrekt |
| Neue Files (0 Dependencies) | Agent mit Briefing | 0 auf mich |
| Review | Review-Agent | 0 (eigener Context) |

### Entscheidungslogik: Agent oder ICH?

```
Aendert bestehende Funktion die Geld/Wallet/Trading beruehrt?
  → ICH (zu riskant fuer Agent)

Aendert bestehende Funktion mit >3 Callsites?
  → ICH (Kontext-Entscheidungen noetig)

Neues Component/File ohne Dependencies auf bestehenden Code?
  → Agent MIT Briefing-File

Neue Funktion die in bestehenden Code integriert werden muss?
  → Agent schreibt die Funktion, ICH schreibe die Integration
```

---

## 4 Quality Gates (unveraendert, PFLICHT)

### Gate 1: IMPACT (vor Code)
Explore-Agent sammelt Callsites + Side-Effects → geht in Briefing-File.

### Gate 2: FLOW TEST (nach Code)
6 Fragen:
1. Was wenn 2 User gleichzeitig? (Race)
2. Was wenn DB null liefert? (Null Guard)
3. Was wenn User refreshed? (State Recovery)
4. Was sieht ein tuerkischer User? (i18n)
5. Was hoert ein Screen Reader? (A11y)
6. Was bei 1000 gleichzeitigen Usern? (Performance)

### Gate 3: VERHALTENSTEST (vor Commit)
- Mindestens 1 Test pro Aenderung
- `tsc` + `build` + `vitest`

### Gate 4: SCOPE
- Max 3 Aenderungen pro Batch
- `/compact` nach jedem Batch

---

## TDD-First (PFLICHT bei Service/RPC Aenderungen)

1. Test schreiben (beschreibt gewuenschtes Verhalten)
2. Test laufen lassen → FAIL
3. Code schreiben → Test PASS
4. Gates durchlaufen
5. Commit

---

## Review: 1 tiefer, Szenario-basiert

1 Review-Agent der:
- Den diff + das Briefing-File liest
- 3 User-Szenarien durchspielt
- NUR "PASS" oder "REWORK" sagt

---

## Persistent Agent Memory

Jeder Agent-Typ hat eigenes Memory in `.claude/agent-memory/{name}/`:

```
.claude/agent-memory/
  implementer/MEMORY.md    ← "wallets PK ist user_id nicht id"
  reviewer/MEMORY.md       ← "4 Trade-Pfade muessen parity haben"
  test-writer/MEMORY.md    ← "Supabase Mocks in setup.ts"
```

Wird automatisch geladen bei Agent-Start (`memory: project` in Frontmatter).
Agent schreibt LEARNINGS am Ende jeder Aufgabe rein.

---

## Selbst-Check vor "fertig"

Bevor ich Anil sage "geliefert":
1. Habe ich das Briefing-File geschrieben? (bei Agent-Dispatch)
2. Habe ich die 6 Flow-Fragen beantwortet?
3. Gibt es mindestens 1 Verhaltenstest?
4. Hat der Review-Agent PASS gesagt?
5. Wuerde ich diesen Code selber deployen?

Wenn NEIN: nicht als fertig melden.
