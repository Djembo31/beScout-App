---
name: promote-rule
description: Review pending rule proposals — approved rules get synced to common-errors.md
---

# /promote-rule — Rule Promotion Gate

Reviews `memory/rules-pending/common-errors-pending.md` und promoted approved Regeln.

## Trigger
- Manuell: `/promote-rule`
- Empfohlen: wenn pending Regeln >3 oder >7 Tage alt

## Prozess

1. **Lies** `memory/rules-pending/common-errors-pending.md`
2. **Fuer jeden Vorschlag:**
   - Zeige den Vorschlag an Jarvis/Anil
   - Frage: Approve / Reject / Edit?
3. **Bei Approve:**
   - Fuege Regel in `.claude/rules/common-errors.md` ein (richtige Section)
   - Entferne aus pending
   - Achte auf Duplikate (Meta-Regel: erst pruefen ob schon vorhanden)
4. **Bei Reject:**
   - Entferne aus pending
   - Optional: Notiere Grund (fuer zukuenftige Vermeidung)
5. **Bei Edit:**
   - Jarvis/Anil formuliert die Regel um
   - Dann Approve-Flow

## Regeln
- JEDE Regel muss von einem Menschen approved werden (Gesetz 3)
- Nie automatisch in common-errors.md schreiben
- Format konsistent: `- backtick-code` fuer technische Terms
- Richtige Section waehlen (DB Columns, React/TypeScript, CSS, etc.)
