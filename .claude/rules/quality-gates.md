---
description: Quality Gates — Ultra Instinct. Verhindert Bugs VOR der Entstehung.
globs: "**/*"
---

## Ultra Instinct — Quality Gates (PFLICHT ab jetzt)

### Prinzip
Bugs verhindern, nicht finden. Jede Aenderung durchlaeuft 4 Gates BEVOR sie committed wird.
Kein Gate darf uebersprungen werden. Kein "ich fix das spaeter."

---

## Gate 1: IMPACT CHECK (vor dem ersten Buchstaben Code)

BEVOR Code geschrieben wird:
1. **Welche Funktionen rufen diese Funktion auf?** (grep nach Callsites)
2. **Welche Funktionen ruft diese Funktion auf?** (grep nach Dependencies)
3. **Wer bekommt Seiteneffekte?** (Notifications, Missions, Cache, Wallet)
4. **Gibt es parallele Code-Pfade?** (4 Trade-Pfade, 2 Order-Typen, etc.)

Output: Impact Manifest mit ALLEN betroffenen Stellen.
Wenn Impact > 3 Files: `/impact` Skill PFLICHT.

### Warum
Problem "Fixes erzeugen neue Bugs" passiert weil der Fixer nur das Problem sieht,
nicht die 5 anderen Stellen die von seiner Aenderung betroffen sind.
Push Auth Fix (M1) haette nie passiert wenn der Agent gewusst haette
dass `firePush` fuer CROSS-USER Notifications genutzt wird.

---

## Gate 2: FLOW TEST (nach Implementation, vor Commit)

NACH dem Code-Schreiben, BEVOR committed wird:
1. **Schreibe den User-Flow als Kommentar** (3-5 Schritte, wer macht was)
2. **Trace den Flow durch den Code** (mentaler Walkthrough, File fuer File)
3. **Frage: Was passiert wenn...?**
   - ...zwei User gleichzeitig handeln? (Race Condition)
   - ...die DB null zurueckgibt? (Null Guard)
   - ...der User die Seite mittendrin refreshed? (State Recovery)
   - ...das Feature auf Tuerkisch angezeigt wird? (i18n)
   - ...ein Screen Reader das vorliest? (A11y)
   - ...1000 User das gleichzeitig machen? (Performance)

### Warum
Problem "Review zu breit, zu flach" passiert weil Reviewer einzelne Files lesen
statt den FLOW zu verfolgen. Der Expire-Race wurde erst gefunden als jemand
den SZENARIO "User cancelt waehrend Cron laeuft" durchdachte.

---

## Gate 3: VERHALTENSTEST (nach Commit, vor Merge)

NACH dem Commit:
1. **Unit Test fuer neue Logik** (nicht optional, PFLICHT)
   - Service-Funktion geaendert → Test fuer die Aenderung
   - Neues Component → Test fuer kritische States
2. **E2E Test fuer neue User-Flows** (wenn UI betroffen)
   - Neuer Button → E2E Test der den Button klickt
3. **Playwright Screenshot** (wenn UI betroffen)
   - Mobile 360px + Desktop 1280px

### Warum
Problem "Kein Verhaltenstest" — `tsc` prueft Syntax, `next build` prueft Imports.
Aber ob der BuyOrderModal den richtigen Preis anzeigt (C2 Bug: 100x falsch)
faellt erst auf wenn jemand den Modal OEFFNET und den Preis LIEST.

---

## Gate 4: SCOPE LIMIT (vor Session-Start)

PRO SESSION maximal:
- **5 Features** ODER **10 Fixes** ODER **1 Architektur-Change**
- Nicht: 35 Tasks in einer Marathon-Session
- JEDE Aenderung wird SOFORT committed + reviewed (nicht am Ende)
- Wenn ein Fix einen neuen Bug erzeugt: STOP, Impact Check, dann weiter

### Warum
Problem "Zu viel auf einmal" — 35 Tasks in einer Session bedeutet dass
niemand den Ueberblick hat. Reviewer finden Bugs in Batch 1 die durch
Batch 3 Fixes schon irrelevant sind. Fixes in Batch 2 brechen Batch 4.

---

## Checkliste (JEDE Aenderung, JEDES Mal)

```
[ ] Gate 1: Impact Check — alle Callsites + Seiteneffekte identifiziert
[ ] Gate 2: Flow Test — User-Szenario mental durchgespielt
[ ] Gate 3: Verhaltenstest — mindestens 1 Test fuer die Aenderung
[ ] Gate 4: Scope — nicht mehr als 5 Features pro Session
```

## Anti-Patterns (VERBOTEN)

1. **"Das fix ich spaeter"** — NEIN. Jetzt oder gar nicht.
2. **"Build ist gruen, also passt's"** — Build prueft SYNTAX, nicht LOGIK.
3. **"4 Agents parallel reviewen"** — Breite ≠ Tiefe. 1 tiefer Review > 4 flache.
4. **"Der Agent wird schon wissen was er tut"** — Agent kennt NUR seinen Prompt.
5. **"Wir fixen das im naechsten Review-Durchgang"** — Review-Ping-Pong ist Zeitverschwendung.

## Wann welchen Review-Typ

| Aenderung | Review-Typ |
|-----------|-----------|
| < 3 Files, kein DB, kein Geld | Gate 1-3 selbst, kein Agent |
| 3-10 Files, Service-Layer | 1 Reviewer-Agent (tief, nicht breit) |
| DB Migration, RPC, Geld-Flow | 1 Reviewer + 1 Szenario-Walkthrough |
| > 10 Files, Architektur | STOP. Aufteilen in kleinere Changes. |
