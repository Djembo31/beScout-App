---
description: Kern-Workflow und Knowledge Capture Protocol
---

## Workflow
- Features/groessere Aenderungen (>10 Zeilen): Research → Plan → Anil OK → Code → Build → Verify
- Kleine Bugfixes (<10 Zeilen): Direkt fixen, kurz erklaeren
- Rollback-Regel: Nicht flicken. Git zuruecksetzen, Plan anpassen, sauber neu

## Knowledge Capture Protocol
Wenn waehrend der Arbeit neues Wissen entsteht — sofort festhalten:
- Neues Requirement → `memory/features/*.md` updaten
- Neue Erkenntnis/Pattern → passende `rules/*.md` oder `memory/patterns.md` updaten
- Neue Entscheidung → `memory/features/*.md` oder `memory/decisions.md` updaten
- Neues Feature gestartet → File in `memory/features/` erstellen + `current-sprint.md` Router updaten
- Feature fertig → nach `memory/features/archive/` verschieben + Router updaten
- Kurzes Feedback geben: "requirement aktualisiert: X" oder "pattern notiert: Y"

## Session-Hygiene
- /compact bei Themenwechsel (ich manage das)
- Bestehende Components/Services IMMER pruefen bevor neu gebaut wird
- Session-Ende: `current-sprint.md` updaten (Router + letzter Stand)

## Code-Konventionen
- `'use client'` auf allen Pages (Client Components)
- Types zentral in `src/types/index.ts`
- Shared UI in `src/components/ui/index.tsx`
- `cn()` fuer classNames, `fmtScout()` fuer Zahlen (deutsch: 1.000)
- Cache-Invalidation nach Writes via `invalidateTradeData()` / `invalidate(prefix)`
- Deutsche UI-Labels, englische Code-Variablen/Kommentare
