---
name: post-mortem
description: Root cause analysis nach Bug-Fixes — warum entstand der Bug, warum nicht frueher gefunden, welche Regel haette verhindert
---

# /post-mortem — Bug Root Cause Analysis

Analysiert nach einem Bug-Fix die tiefere Ursache und leitet Praevention ab.

## Trigger
- Manuell: `/post-mortem` (nach P1/P2 Bug-Fix)
- Automatisch: bei revert-Commits

## Argumente
- Optional: Commit-Range oder Bug-ID: `/post-mortem abc123..def456`
- Ohne Argument: analysiert letzten Bug-Fix Commit

## Prozess

1. **Identifiziere den Bug:**
   - Welcher Commit hat den Fix?
   - Was war das Symptom?
   - Welche Files waren betroffen?

2. **Root Cause Analysis:**
   - **Warum** entstand der Bug? (Direkte Ursache)
   - **Warum** wurde er nicht frueher gefunden? (Detection Gap)
   - War es ein bekanntes Pattern aus `common-errors.md`?

3. **Prevention:**
   - Welche Regel in `common-errors.md` haette den Bug verhindert?
   - Existiert diese Regel bereits? Wenn ja → warum hat sie nicht gegriffen?
   - Wenn nein → Schreibe Regel-Vorschlag in `memory/rules-pending/common-errors-pending.md`

4. **Output:**
   - Schreibe Post-Mortem in `memory/post-mortems/YYYY-MM-DD-[topic].md`
   - Format:
     ```
     # Post-Mortem: [Bug Title]
     **Datum:** YYYY-MM-DD
     **Fix Commit:** [hash]
     **Symptom:** [was war kaputt]
     **Root Cause:** [warum]
     **Detection Gap:** [warum nicht frueher gefunden]
     **Prevention:** [welche Regel]
     **Action:** [was wurde geaendert/vorgeschlagen]
     ```

## Regeln
- Kein Blame — fokussiere auf System-Verbesserung
- IMMER eine konkrete Action ableiten (Regel, Hook, oder Skill-Verbesserung)
- Post-Mortem MUSS innerhalb 1 Session nach Fix geschrieben werden
