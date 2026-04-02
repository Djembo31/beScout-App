---
name: eval-skill
description: Testet Skills gegen bekannte Cases — misst Pass-Rate, schlaegt Prompt-Verbesserungen vor
---

# /eval-skill — Skill Evaluation Loop

Testet einen Skill gegen vordefinierte Test-Cases und misst die Pass-Rate.

## Trigger
- Manuell: `/eval-skill [skill-name]`
- Empfohlen: nach Skill-Aenderungen, periodisch

## Prozess

1. **Lade Test-Cases:** `.claude/skills/eval-skill/cases/[skill-name].md`
2. **Fuer jeden Case:**
   - Lies Input + Expected Output
   - Simuliere den Skill-Aufruf (oder fuehre ihn in Sandbox aus)
   - Vergleiche Ergebnis mit Expected
   - PASS / FAIL
3. **Berechne Score:**
   - Pass-Rate = PASS / Total
   - Bei <80%: Analysiere Misses
4. **Output:**
   ```
   ## Eval: [Skill Name]
   Pass-Rate: X/Y (Z%)

   PASS: Case 1, Case 3, Case 5
   FAIL: Case 2 (Expected: X, Got: Y), Case 4 (Missing: Z)

   Vorschlag: [Prompt-Aenderung die Misses adressiert]
   ```

## Test-Case Format (in cases/*.md)

```markdown
## Case N: [Name]
**Input:** [Prompt/Task fuer den Skill]
**Expected:** [Was der Skill tun/finden/melden sollte]
**Pass Criteria:** [Konkrete Pruefung: grep, tsc, File existiert, etc.]
```

## Regeln
- Eval-Cases sind HUMAN-CURATED (Gesetz 3)
- Prompt-Aenderungen sind VORSCHLAEGE — Jarvis/Anil entscheiden
- Min 5 Cases pro Skill fuer aussagekraeftigen Score
- Eval darf keine permanenten Aenderungen machen
