---
description: Ultra Instinct — Jarvis implementiert selbst, Agents nur fuer Research + Review
globs: "**/*"
---

## Ultra Instinct v2 — Qualitaetssicherung

### Kern-Erkenntnis (Session 233)

Sub-Agents die Code schreiben erzeugen Bugs weil sie den Kontext nicht haben.
23 Bugs in 35 Agent-implementierten Changes = 66% Fehlerquote.
Jarvis (Orchestrator) hat den vollen Kontext und macht weniger Fehler.

### Hybride Arbeitsteilung (Context-Optimiert)

| Aufgabe | Wer | Warum |
|---------|-----|-------|
| **Bestehenden Code editieren** | ICH (Jarvis) | Kontext-Entscheidungen, keine Agent-Bugs |
| **Neue Files erstellen** (0 Dependencies) | Agent (Worktree) | Kein Kontext noetig, spart Orchestrator-Noise |
| **Files lesen + recherchieren** | Agent (Explore/Research) | 1 Summary statt 50 File-Reads in meinem Context |
| **Impact Check ausfuehren** | Agent (Explore) | Callsite-Liste liefern, ICH entscheide |
| **Edits schreiben** | ICH (praezise, 3-10 Zeilen) | Kontextbewusst, keine Seiteneffekt-Blindheit |
| **Review** | Agent (1 tiefer, Szenarien) | Prueft MEINE Arbeit in eigenem Context |
| **Tests schreiben** | Agent (context:fork) fuer neue Tests, ICH fuer Erweiterungen | Trennung: Test-Noise aus meinem Context |

### VERBOTEN fuer Agents (Code-Edits)
- Bestehende Service-Funktionen aendern
- RPC-Parameter aendern oder Guards hinzufuegen
- Props an bestehende Components aendern
- Mutations oder Query-Hooks modifizieren
- Alles was Geld/Wallet/Trading beruehrt
- Alles wo der Fix davon abhaengt WIE die Funktion genutzt wird

### Context-Management
- `/compact` nach jedem 3er-Batch (nicht erst wenn Context voll)
- Agents fuer NOISE (lesen, suchen, pruefen)
- ICH fuer SIGNAL (entscheiden, editieren, committen)
- Research-Ergebnisse als Summary zurueck, nicht als Raw-Files

---

## 4 Quality Gates (PFLICHT, keine Ausnahme)

### Gate 1: IMPACT (vor Code)

Fuer JEDE Aenderung, bevor ich einen Buchstaben schreibe:

```
1. WER ruft diese Funktion auf?
   → grep -rn "functionName" src/ --include="*.ts" --include="*.tsx"

2. WAS ruft diese Funktion auf?
   → Lese die Funktion, notiere alle Calls

3. WELCHE Seiteneffekte hat das?
   → Notifications? Wallet? Cache? Missions? Achievements?

4. GIBT ES parallele Pfade?
   → 4 Trade-Pfade? 2 Order-Typen? Client + Server?

5. KANN DAS gleichzeitig passieren?
   → 2 User? Cron + User? Tab-Wechsel?
```

**STOP:** Wenn ich nicht alle Callsites kenne → KEIN Code.

### Gate 2: FLOW TEST (nach Code)

6 Fragen — JEDE muss beantwortet werden:

| Frage | Prueft |
|-------|--------|
| Was wenn 2 User gleichzeitig? | Race Conditions |
| Was wenn DB null liefert? | Null Guards |
| Was wenn User Seite refreshed? | State Recovery |
| Was sieht ein tuerkischer User? | i18n |
| Was hoert ein Screen Reader? | A11y |
| Was bei 1000 gleichzeitigen Usern? | Performance |

### Gate 3: VERHALTENSTEST (vor Commit)

KEIN Commit ohne:
- Mindestens 1 Test der die Aenderung prueft (Unit oder E2E)
- `npx tsc --noEmit` PASS
- `npx next build` PASS
- Bei UI: Screenshot (360px)

### Gate 4: SCOPE

- Max 3 Aenderungen pro Batch
- Nach jeder Aenderung: Gates 1-3 durchlaufen
- DANN naechste Aenderung
- NICHT: 10 Aenderungen sammeln und am Ende pruefen

---

## TDD-First (neu)

Ab jetzt gilt:
1. **Test schreiben** der das gewuenschte Verhalten beschreibt
2. **Test laufen lassen** — muss FEHLSCHLAGEN
3. **Implementation schreiben** bis Test GRUEN
4. **Gates 1-3** durchlaufen
5. **Commit**

Warum: Wenn der Test VOR dem Code existiert, ist der Code testbar.
Wenn der Code VOR dem Test existiert, wird der Test oft vergessen.

---

## Review: 1 tiefer statt 4 flache

NACH dem Commit: 1 Review-Agent der:
- Den GANZEN diff liest (nicht einzelne Files)
- 3 User-Szenarien durchspielt
- NUR "PASS" oder "REWORK" sagt
- Bei REWORK: exakte File:Line + Was + Warum

Kein "CONCERNS" — das fuehrt zu "wir schauen spaeter."

---

## Selbst-Check vor jeder Antwort an Anil

Bevor ich sage "fertig" oder "geliefert":
1. Habe ich JEDEN geaenderten File nochmal gelesen?
2. Habe ich die 6 Flow-Test Fragen beantwortet?
3. Gibt es mindestens 1 Test?
4. Wuerde ich meinen eigenen Code in Production deployen?

Wenn NEIN auf irgendwas: NICHT als fertig melden.
