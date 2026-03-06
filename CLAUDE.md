# BeScout — Projekt-Kontext

B2B2C Fan-Engagement-Plattform fuer Fussballvereine. Clubs verkaufen DPCs,
starten Events/Votes, verteilen $SCOUT-Credits. Pilot: Sakaryaspor (TFF 1. Lig).

## Stack
Next.js 14 (App Router) | TypeScript strict | Tailwind (Dark Mode only) |
Supabase (PostgreSQL + Auth + Realtime) | TanStack React Query v5 | Zustand v5 |
next-intl (Cookie bescout-locale) | lucide-react

## Regeln → .claude/rules/
Domaenen-spezifische Regeln laden automatisch per Glob-Pattern.
core.md + business.md + common-errors.md = immer geladen.
ui-components.md, database.md, trading.md, fantasy.md = path-spezifisch.

## Memory → memory/
- current-sprint.md: Aktueller Stand + Feature-Router (bei Session-Start lesen)
- features/*.md: Aktive Feature-Kontexte (max 5, on-demand)
- features/archive/: Abgeschlossene Features (nie automatisch laden)
- Andere Topic-Files: on-demand wenn relevant

## Workflow
1. current-sprint.md lesen → wissen wo wir stehen
2. Anil sagt was ansteht → Feature-File laden wenn vorhanden
3. Plan → Anil gibt OK → Code → npx next build → Verify
4. Bei Fehler: Rollback (git zurueck, sauber neu) — NICHT flicken
5. Session-Ende: current-sprint.md + Feature-Files sind bereits aktuell (Knowledge Capture Protocol)

## VOR jeder UI-Aenderung (PFLICHT)
1. .claude/rules/ui-components.md LESEN und aktiv befolgen
2. Bestehende Components pruefen BEVOR neue gebaut werden:
   - Spieler: PlayerDisplay (compact/card) aus PlayerRow.tsx — NIEMALS eigene Spielerzeilen
   - UI-Primitives: EmptyState, Modal, etc. aus components/ui/
3. Alle States implementieren: Hover, Active, Focus, Disabled, Loading, Empty, Error
4. Mobile-First: Layout auf 360px testen (kein Umbruch, keine abgeschnittenen Infos)

## Kern-Business
- DPC = Digital Player Contract. Marktwert steigt → Community Success Fee
- $SCOUT = Platform Credits (NIEMALS: Investment, ROI, Profit, Ownership)
- Geld IMMER als BIGINT cents (1,000,000 = 10,000 $SCOUT)
- Closed Economy Phase 1: KEIN Cash-Out, KEIN P2P, KEIN Exchange

## Quality Pipeline (nach UI-Aenderungen)
1. /baseline-ui [datei]
2. /fixing-accessibility [datei]
3. /fixing-motion-performance [datei]

## Referenzen
- docs/VISION.md — Produktvision
- docs/STATUS.md — Detaillierter Fortschritt
- docs/BeScout_Context_Pack_v8.md — Business Master-Dokument
- docs/SCALE.md — Skalierungsarchitektur und DB-Schema
