---
name: competing-hypotheses
description: 3x gescheiterter Fix → spawne 3 Agents mit je 1 Hypothese, gegenseitig widerlegen, besten Ansatz synthetisieren
---

# /competing-hypotheses — Parallel Bug Investigation

Wenn ein Bug nach 3 Versuchen nicht gefixt ist, spawne 3 Agents mit unterschiedlichen Hypothesen.

## Trigger
- Manuell: `/competing-hypotheses [Bug-Beschreibung]`
- Circuit Breaker: 3x gleicher Fix gescheitert

## Prozess

1. **Formuliere 3 Hypothesen:**
   - Hypothese A: [Naheliegendste Ursache]
   - Hypothese B: [Alternative Ursache]
   - Hypothese C: [Unerwartete Ursache]

2. **Spawne 3 Agents** (parallel, read-only):
   Jeder Agent bekommt:
   ```
   Du untersuchst einen Bug. Deine Hypothese: [X].

   1. Finde Beweise FUER deine Hypothese
   2. Finde Beweise GEGEN die anderen Hypothesen
   3. Wenn deine Hypothese falsch ist, sag das ehrlich
   4. Schlage einen Fix vor wenn du die Ursache findest
   ```

3. **Synthetisiere:**
   - Sammle Ergebnisse aller 3 Agents
   - Welche Hypothese hat die staerksten Beweise?
   - Gibt es eine 4. Moeglichkeit die keiner bedacht hat?

4. **Fix:**
   - Implementiere den Fix basierend auf der besten Hypothese
   - Wenn alle 3 scheitern → Eskalation an Anil

## Regeln
- Agents sind read-only (Grep, Glob, Read, Bash fuer nicht-destruktive Commands)
- Max 5 Minuten pro Agent
- Ehrlichkeit > Bestätigung der eigenen Hypothese
- Ergebnis dokumentieren in `memory/learnings/drafts/` als Draft
