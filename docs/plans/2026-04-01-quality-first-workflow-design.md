# Quality-First Workflow — Design

**Datum:** 2026-04-01
**Status:** Approved
**Ausloeser:** Anil's Feedback — zu viele Fehler, zu viel manuelles Nachkontrollieren, kein Vertrauen in den Output

## Problem

Wir haben 6+ Feedback-Memories die alle dasselbe sagen: "pruef besser, denk mit, sag nicht fertig ohne Beweis". Trotzdem passiert es immer wieder:
- i18n Keys vergessen
- Column-Names falsch
- Agent-Output blind gemerged
- Consumers einer Aenderung uebersehen
- "sieht gut aus" gesagt ohne wirklich hinzuschauen
- Ohne Spec losgebaut und nachgebessert

**Ziel:** Anil muss den Output nicht mehr kontrollieren. Das System liefert zuverlaessig.

## Design-Entscheidung

**Ansatz C: Ein Standard fuer alles.** Kein Tier-System fuer Quality. Jeder Task durchlaeuft dieselben Phasen. Der Umfang skaliert mit der Aufgabe, aber die Schritte selbst sind nie optional.

**Speed-Override:** Nur wenn Anil explizit "schnell" sagt. Jarvis nimmt es nie selbst an.

---

## Phase 1: BEFORE (VOR dem ersten Buchstaben Code)

| Schritt | Was | Ergebnis |
|---------|-----|----------|
| **DEFINE** | Was genau aendern? | 1 Satz (Hotfix) bis 1 Seite (Feature) |
| **SCOPE** | Alle betroffenen Files + Consumers auflisten | Explizite File-Liste |
| **CRITERIA** | Woran messe ich "fertig"? | Binaere Ja/Nein Kriterien |

Kein Code ohne alle 3.

## Phase 2: DURING (Waehrend der Implementation)

- NUR was im DEFINE steht umsetzen. Nichts extra.
- Neues Problem entdeckt → notieren, separater Task. NICHT sofort fixen.
- Bei Unsicherheit: Code lesen, nicht raten.

## Phase 3: AFTER (NACH dem letzten Buchstaben Code)

| Schritt | Was | Beweis |
|---------|-----|--------|
| **SELF-REVIEW** | JEDE geaenderte Datei nochmal komplett lesen | — |
| **CHECKLIST** | 8-Punkt Checkliste abarbeiten | Jeder Punkt explizit geprueft |
| **VERIFY** | tsc + betroffene Tests ausfuehren | Output zeigen |
| **EVIDENCE** | Bei UI: Screenshot. Bei DB: SELECT Query. | Artefakt ablegen |

Kein "done" ohne AFTER komplett durchlaufen.

---

## Self-Review Checkliste (8 Punkte)

| # | Check | Wie pruefen |
|---|-------|------------|
| 1 | **Types propagiert?** | Type geaendert → Service, Hook, Component, Props alle aktualisiert? |
| 2 | **i18n komplett?** | Neuer/geaenderter Text → DE + TR vorhanden? `node -e "require('./messages/de.json')"` |
| 3 | **Column-Names korrekt?** | Gegen `common-errors.md` pruefen |
| 4 | **Alle Consumers aktualisiert?** | Grep nach geaendertem Identifier. JEDER Treffer geprueft? |
| 5 | **UI-Text passt zum Kontext?** | $SCOUT nur bei Trading. Tickets nur bei Events. Jede Stelle einzeln lesen. |
| 6 | **Keine Duplikate?** | Gleiche Funktion/Type/Key doppelt? Grep nach Funktionsname. |
| 7 | **Service Layer eingehalten?** | Kein Supabase direkt. Hooks vor returns. `qk.*` statt raw keys. |
| 8 | **Edge Cases bedacht?** | Null-Guards? Loading/Empty/Error States? 0 Items? 1000 Items? |

Wenn auch nur 1 Punkt unklar → nochmal hinschauen.

---

## Agent-Output-Regeln

Agent-Output ist ein ENTWURF, kein fertiges Ergebnis.

### Vor Integration:
1. **Diff lesen** — JEDE Zeile die der Agent geaendert hat
2. **Scope-Check** — Hat der Agent NUR gemacht was im Issue stand? Beyond-Scope → revert
3. **8-Punkt Checkliste** — Genau wie bei eigener Arbeit. Kein Vertrauensbonus.
4. **Kontext-Check** — Passt Agent-Code zum bestehenden File? Doppelte Imports? Widerspruechliche Logik?

### Paperclip Agents zusaetzlich:
5. **Git Diff** vor Commit — wirklich JEDE Aenderung anschauen
6. **Zusammenspiel** — Mehrere Agents parallel? Machen Aenderungen ZUSAMMEN Sinn?

**Konsequenz:** Review laenger als selber machen → selber machen.

---

## Beweis-Pflicht

| Aenderungstyp | Pflicht-Beweis |
|---------------|---------------|
| Jede Aenderung | `tsc --noEmit` Output (0 Errors) |
| Logik/Service | Test Output (betroffene Tests gruen) |
| UI-Aenderung | Screenshot (Vercel Preview oder Playwright) |
| DB/RPC | `SELECT` Query mit echten Daten |
| i18n | Beide Sprachen verifiziert (DE + TR) |
| Trading/Wallet | DB-Query VOR und NACH der Aktion |

### Was NICHT als Beweis zaehlt:
- "tsc clean" — beweist nur Syntax
- "Tests gruen" — beweist nur getestete Pfade
- "Screenshot sieht ok aus" — jeden Wert einzeln pruefen
- "Agent sagt fertig" — Agent-Aussage ist kein Beweis
- "Sollte passen" — Vermutung ist kein Beweis

---

## Leitplanken

1. **Neues Problem entdeckt → separater Task.** Scope nicht aufblaehen.
2. **Kein Raten — Lesen.** Column-Name unklar → `common-errors.md`. Consumer unklar → Grep. Service-Signatur unklar → File oeffnen.
3. **Speed-Override:** Nur wenn Anil "schnell" sagt. Dann: Fix → tsc → done. Aber explizit: "Speed-Mode, ohne volle Verification."
4. **Wissen waechst mit Code.** Verhalten geaendert → Spec/Memory im SELBEN Commit updaten.
5. **2x gescheitert → STOP.** Expert-Agent oder Anil fragen. Nicht 5x iterieren.
