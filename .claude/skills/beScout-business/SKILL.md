---
name: beScout-business
description: Compliance, wording, legal — forbidden words, licensing phases, geofencing, fee calculations
---

# beScout-business Skill

Business compliance and wording rules for BeScout.

## Pflicht-Lektuere VOR Arbeit
→ `.claude/rules/business.md` (Wording, Licensing, Geofencing, Fee-Split, i18n)
→ `.claude/rules/common-errors.md` (Compliance-relevante Fehler)
→ `LEARNINGS.md` in diesem Ordner

## Business-spezifische Regeln (NUR was nicht in Rules steht)

### Sofort-Blocker (bei Fund → STOP)
- "Investment", "ROI", "Profit", "Rendite" in UI-Text → BLOCKIEREN
- Phase 3/4 Feature-Code (Cash-Out, Paid Fantasy) → BLOCKIEREN
- $SCOUT ohne TradingDisclaimer Component → WARNEN

### Pruef-Routine fuer UI-Text
1. Grep nach verbotenen Woertern (Liste in business.md)
2. Pruefe ob $SCOUT als "Platform Credits" bezeichnet wird
3. Pruefe ob Disclaimer auf jeder Seite mit $SCOUT/DPC
4. Pruefe Geofencing-Tier Kompatibilitaet

### Code-intern
- Variable/DB-Column-Namen mit "dpc" BLEIBEN (nur UI umbenannt)
- Scout Card = "Digitale Spielerkarte" in UI

## Learnings
→ Lies `LEARNINGS.md` VOR Task-Start
→ Schreibe Drafts in `memory/learnings/drafts/`
