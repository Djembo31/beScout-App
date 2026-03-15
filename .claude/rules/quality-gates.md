---
description: Ultra Instinct v4 — Jarvis = Wissens-Kurator, Agents = Spezialisten mit 1M Context
globs: "**/*"
---

## Ultra Instinct v4

### Philosophie

Jarvis ist NICHT der Coder. Jarvis ist der **Wissens-Kurator und Koordinator.**
Agents sind keine Juniors — sie sind **Spezialisten mit 1M Context** die
zusaetzlich zum Briefing eigenes Wissen aufbauen.

Meine Aufgabe: Dem Agent EXAKT das Wissen geben das er fuer SEINE Aufgabe braucht.
Agent's Aufgabe: Mit meinem Wissen + eigenem Deep-Dive die Aufgabe PERFEKT loesen.
Danach: Learnings zurueckschreiben → System wird schlauer.

---

## Context-Architektur

```
┌─ JARVIS (Orchestrator) ─────────────────────────────┐
│ Auto-loaded: ~15K (CLAUDE.md + Rules + MEMORY.md)    │
│ Chat-History: ~500K (Anils Entscheidungen, Kontext)  │
│ Frei: ~485K                                          │
│                                                      │
│ AUFGABE: Kuratiere 20-30K fuer DIESEN Task           │
│ → Schreibe Briefing-File auf Disk                    │
└──────────────────────────────────────────────────────┘
            ↓ (Filesystem)
┌─ .claude/briefings/{task}.md ────────────────────────┐
│ Kuratiertes Wissen: 20-30K Tokens                    │
│ - Relevante Source Files (vollstaendig)               │
│ - Callsites + Side-Effects                           │
│ - Bekannte Fehler fuer diesen Bereich                │
│ - Anils Entscheidungen die diesen Task betreffen     │
│ - Parallele Code-Pfade                               │
│ - Acceptance Criteria (ausfuehrbar)                  │
└──────────────────────────────────────────────────────┘
            ↓ (Agent liest File)
┌─ AGENT (Spezialist, 1M Context) ────────────────────┐
│ Briefing gelesen: 20-30K                             │
│ Eigener Deep-Dive: +100-200K (liest weitere Files)   │
│ Agent Memory: +5-10K (Learnings aus vorherigen Tasks) │
│ FREI: ~760K fuer Denken + Implementieren + Testen    │
│                                                      │
│ AUFGABE: Aufgabe PERFEKT loesen                      │
│ → Code schreiben                                     │
│ → Selbst testen (tsc, build, vitest)                 │
│ → Learnings in LEARNINGS Sektion schreiben           │
└──────────────────────────────────────────────────────┘
            ↓ (Filesystem)
┌─ Learnings zurueck ─────────────────────────────────┐
│ → .claude/agent-memory/{name}/MEMORY.md (persistent) │
│ → errors.md (wenn neuer Fehler)                      │
│ → patterns.md (wenn neues Pattern)                   │
│ → decisions.md (wenn Entscheidung getroffen)         │
│                                                      │
│ ERGEBNIS: System ist nach jedem Task SCHLAUER        │
└──────────────────────────────────────────────────────┘
```

---

## Das Briefing-File (Kern des Systems)

### Was reingehoert (PFLICHT)

```markdown
# Briefing: [Task-Name]
## Generiert: [Datum] von Jarvis fuer [Agent-Type]

## 1. AUFTRAG
[Praezise Beschreibung: Was soll gebaut/gefixt werden]
[Kontext: Warum machen wir das, was hat Anil gesagt]

## 2. BETROFFENE FILES (vollstaendiger Source)
[Jede Datei die der Agent anfassen wird — KOMPLETT, nicht Auszuege]
[Agent soll NICHT selbst suchen muessen]

## 3. CALLSITES (wer ruft das auf?)
[Grep-Ergebnisse fuer jede Funktion die geaendert wird]
[Agent muss wissen WER seine Aenderung konsumiert]

## 4. SIDE-EFFECTS
[Was wird durch die Aenderung ausgeloest?]
[Notifications? Wallet? Cache? Missions? Achievements?]
[Welche muessen konsistent bleiben?]

## 5. PARALLELE PFADE
[Andere Funktionen die dasselbe tun]
[z.B. 4 Trade-Pfade die Fee-Parity haben muessen]

## 6. BEKANNTE FEHLER
[Relevante Eintraege aus common-errors.md]
[Spezifische Bugs die in diesem Bereich schon passiert sind]
[z.B. "centsToBsd NICHT auf player.prices.floor — ist schon BSD"]

## 7. ANILS ENTSCHEIDUNGEN
[Relevante Entscheidungen aus dem Chat die diesen Task betreffen]
[z.B. "kein Konfetti, Trading-Grade Aesthetik"]

## 8. ACCEPTANCE CRITERIA
[Exakte Befehle die PASS ergeben muessen]
npx tsc --noEmit
npx next build
npx vitest run [betroffene tests]
[Feature-spezifische Pruefung]

## 9. ANTI-PATTERNS
[Was der Agent NICHT tun darf]
[Konkrete Beispiele aus der Projekt-Historie]
```

### Was NICHT reingehoert
- Komplette errors.md (zu gross, nur relevante Eintraege)
- Komplette patterns.md (zu gross, nur relevante)
- Files die nicht geaendert werden
- Allgemeines Projekt-Wissen (das steht in den Rules)

---

## Wissens-Flow (dynamisch, wird immer besser)

### Bei jedem Task:
```
1. VORHER: Explore-Agent sammelt Kontext → Jarvis kuratiert Briefing
2. WAEHREND: Agent arbeitet mit Briefing + eigenem Deep-Dive
3. NACHHER: Agent schreibt Learnings → Persistent Memory
4. INTEGRATION: Jarvis prueft Learnings:
   - Neuer Fehler? → errors.md + common-errors.md (wenn 2x)
   - Neues Pattern? → patterns.md + Rule (wenn 3x)
   - Entscheidung? → decisions.md
   - Agent-spezifisch? → agent-memory/{name}/MEMORY.md
```

### Ueber Zeit:
- Agent Memory waechst → Agents werden kompetenter
- errors.md waechst → Briefings werden praeziser
- patterns.md waechst → Weniger Erklaerung noetig
- Briefing-Qualitaet steigt → Bug-Rate sinkt

---

## Quality Gates (4 Stufen)

### Gate 1: BRIEFING (vor Agent-Dispatch)
- Explore-Agent sammelt Kontext
- Jarvis kuratiert Briefing-File
- STOP wenn Briefing nicht alle 9 Sektionen hat

### Gate 2: FLOW TEST (Agent macht das selbst)
Agent beantwortet im Briefing-Kontext:
1. Race Condition moeglich?
2. Null Guards vorhanden?
3. i18n korrekt (DE + TR)?
4. A11y (aria-labels, focus, touch 44px)?
5. Performance (Limits, Lazy Loading)?
6. State Recovery bei Refresh?

### Gate 3: VERHALTENSTEST (Agent macht das selbst)
- tsc + build + vitest MUESSEN PASS sein
- Agent committed NICHT wenn Tests fehlen
- Acceptance Criteria aus Briefing ausfuehren

### Gate 4: SCOPE
- Max 3 Tasks pro Dispatch-Batch
- /compact nach jedem Batch
- Briefing-Files nach Merge loeschen

---

## Review: 1 tiefer Szenario-Review

NACH Agent-Delivery:
- 1 Review-Agent liest diff + Briefing
- Spielt 3 User-Szenarien durch
- Sagt PASS oder REWORK
- Bei REWORK: Agent bekommt Feedback + Briefing → fixt in seinem Context

KEIN zweiter Review-Durchgang. Wenn REWORK:
- Agent fixt → Reviewer prueft NUR den Fix → PASS oder Eskalation

Max 2 Runden. Danach: Eskalation an Anil.
