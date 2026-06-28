---
name: improve
description: Analysiert letzte 10 Sessions — identifiziert Muster, Zeitfresser, wiederkehrende Fehler. Schreibt Verbesserungsvorschlag.
---

# /improve — Workflow Improvement Proposals

Analysiert Session-History und schlaegt System-Verbesserungen vor.

## Trigger
- Manuell: `/improve`
- Automatisch vorgeschlagen: alle 10 Sessions (inject-learnings.sh Check)

## Prozess

1. **Sammle Daten:**
   - Lies `memory/episodisch/metriken/sessions.jsonl` (letzte 10 Eintraege)
   - Lies `memory/episodisch/sessions/retro-*.md` (letzte 5 Retros)
   - Lies `.claude/learnings-queue.jsonl` (offene Korrekturen)
   - Lies `memory/learnings/drafts/` (unreviewed Drafts)

2. **Analysiere:**
   - Wiederholte Fehler-Patterns (gleicher Fehler in >2 Sessions)
   - Steigende Corrections → welches Thema?
   - Files die in >3 Sessions geaendert wurden → Refactoring-Kandidat?
   - Unreviewed Drafts >5 Stueck → `/reflect` ueberfaellig

3. **Schreibe Proposal:**
   - Output: `memory/improvement-proposals/YYYY-MM-DD-proposal.md`
   - Format:
     ```
     # Improvement Proposal [Datum]

     ## Beobachtungen
     - [Was faellt auf]

     ## Vorschlaege
     1. [Konkreter Vorschlag + warum]
     2. [...]

     ## Prioritaet
     - Must: [...]
     - Nice: [...]
     ```

4. **Praesentiere** Zusammenfassung an Anil

## Regeln
- Nur Vorschlaege — NICHTS automatisch umsetzen (Gesetz 3)
- Fokus auf Prozess-Verbesserung, nicht Code-Verbesserung
- Max 5 Vorschlaege pro Run (nicht ueberwaeltigen)
