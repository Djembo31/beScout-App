# Frontend Journal: J3+J4 CEO-Approvals Schnellbahn

## Gestartet: 2026-04-14 (Schnellbahn post-J4)

### Verstaendnis
- Was: 8 Items aus J3+J4 systematisch: AR-15 (rewardsIntro+introPortfolio), AR-16 (5 Spieler-kaufen Keys), AR-17 (business.md Glossar), AR-32 (Gluecksspiel-Vokabel 12DE+8TR), AR-33 (FantasyDisclaimer + 7 Integrationen), AR-36 (Post-Event CTA), AR-39 (Manager-Rolle), AR-41 (Fantasy-Services Architektur-Doku).
- Betroffene Files: messages/de.json + tr.json, src/components/legal/FantasyDisclaimer.tsx (NEU), FantasyContent, EventDetailModal, EventSummaryModal, JoinConfirmDialog, CreateEventModal, OverviewPanel, LeaderboardPanel, .claude/rules/business.md, .claude/skills/beScout-backend/SKILL.md (falls vorhanden).
- Risiken:
  - TR-Wording eigentlich Anil-Review noetig — ich mache best-effort TR und markiere im Journal
  - Keys NICHT umbenennen, nur Values
  - DE+TR Symmetrie zwingend
  - CreateEventModal hat bereits AR-31 Flag — nur Wording in der Box anfassen
  - EventCardView + MitmachenTab koennten "Prize"-Keys konsumieren → grep vor Rename noetig
  - Tests existieren fuer EventDetailModal, FantasyContent, SpieltagTab — nach Wording-Aendrungen kann tsc brechen

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | FantasyDisclaimer als separate Component in `src/components/legal/FantasyDisclaimer.tsx` | Analog TradingDisclaimer, kein inline — DRY |
| 2 | i18n-Keys `legal.fantasyDisclaimer` + `legal.fantasyDisclaimerShort` | Konsistent mit `tradingDisclaimer`/`tradingDisclaimerShort` Pattern |
| 3 | Keine neuen Keys fuer Wording-Aenderungen — nur Values updaten | Spezifikation ("Keys NICHT umbenennen") |
| 4 | AR-36 Post-Event CTA: "Schließen" nehmen (Link-Entfernung) statt "Zum Kader" | Neutraler, kein Reinvestment-Pitch |
| 5 | Commit-Reihenfolge: Quick-Wins zuerst (AR-39 + AR-16 + AR-15), dann AR-36, AR-32, AR-33 Component, AR-17 + AR-41 Docs | Minimiert Merge-Risiko |

### Fortschritt
- [ ] AR-15 rewardsIntro + introPortfolioDesc (DE+TR)
- [ ] AR-16 + AR-39 Wording (6 Keys DE+TR)
- [ ] AR-32 Gluecksspiel-Vokabel Sweep (12 DE + 8 TR)
- [ ] AR-33 FantasyDisclaimer Component + 7 Integrationen
- [ ] AR-36 Post-Event CTA neutralisieren
- [ ] AR-17 business.md Kapitalmarkt-Glossar
- [ ] AR-41 beScout-backend SKILL Note

### Runden-Log
