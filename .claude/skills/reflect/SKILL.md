---
name: reflect
description: Review learnings queue — corrections captured by hooks get reviewed, good ones promoted to drafts
---

# /reflect — Learnings Review

Reviews `.claude/learnings-queue.jsonl` and promotes valuable corrections to draft learnings.

## Trigger
- Manuell: `/reflect`
- Empfohlen: alle 5 Sessions oder wenn Queue >10 Eintraege

## Prozess

1. **Lies die Queue:** `.claude/learnings-queue.jsonl`
2. **Fuer jeden Eintrag:**
   - Ist das eine echte Korrektur oder nur Konversation?
   - Wenn echte Korrektur: Was ist die Regel dahinter?
   - Welchem Skill gehoert diese Erkenntnis? (backend/frontend/business/deliver/etc.)
3. **Erstelle Draft** fuer jede wertvolle Korrektur:
   - Schreibe in `memory/learnings/drafts/YYYY-MM-DD-[skill]-[topic].md`
   - Format: `**[Datum] — [Kontext]** / Regel / Confidence (high/medium/low)`
4. **Leere die Queue** nach Review (truncate, nicht loeschen)
5. **Report:** Wie viele Eintraege reviewed? Wie viele Drafts erstellt?

## Regeln
- NIEMALS direkt in LEARNINGS.md schreiben — NUR Drafts
- Drafts muessen von Jarvis/Anil promoted werden
- Bei Unsicherheit: Draft mit Confidence "low" statt verwerfen
- Duplikate erkennen: Wenn Draft aehnlich wie bestehende Rule → vermerken
