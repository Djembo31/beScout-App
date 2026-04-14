# Frontend Journal: AR-11+23+31+38, AR-15+16+32+39, AR-33+36+37, AR-17

## Gestartet: 2026-04-14 (Schnellbahn-Modus)

### Verstaendnis
- **Was:** Feature-Flags (BuyOrder/LimitOrder/PaidFantasy aus Beta) + Compliance-Wording (Investment/Gluecksspiel) + FantasyDisclaimer Component + business.md Glossar
- **Betroffene Files:** ~25 Files (Modals entfernen, messages/*.json, neuer FantasyDisclaimer + 7 Integrations, business.md)
- **Risiken:**
  - Breaking wenn Callers von BuyOrder/LimitOrderModal nicht sauber entfernt werden (tsc-Fail)
  - i18n-Keys koennten in anderen File genutzt werden (Grep vor Loeschen, lieber wert umbenennen als Key loeschen)
  - FantasyDisclaimer braucht konsistente UX mit TradingDisclaimer

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | BuyOrder+LimitOrder Option C = komplett aus Beta entfernen | CTO-Empfehlung, Matching-Engine fehlt ohnehin |
| 2 | PAID_FANTASY_ENABLED als Runtime-Check im Code (nicht env) | Code-Path komplett skippen, UI nicht rendern |
| 3 | FantasyDisclaimer parallel zu TradingDisclaimer (in `src/components/legal/`) | Konsistenter Location, einheitliches Pattern |
| 4 | i18n-Keys werden UEBERARBEITET (Value), nicht geloescht — Code liest Keys noch | Safer, kein Runtime-Fehler wenn Caller uebersehen |
| 5 | business.md Kapitalmarkt-Glossar als Section-Erweiterung | Passt zur bereits bestehenden IPO-Regel in business.md |

### Fortschritt
- [ ] Commit 1: AR-11+23 BuyOrder/LimitOrder Feature-Flag + aus Beta
- [ ] Commit 2: AR-31+38 PAID_FANTASY_ENABLED Flag
- [ ] Commit 3: AR-15+32 Wording-Sweep (Investment + Gluecksspiel)
- [ ] Commit 4: AR-16+39 "Spieler kaufen" + "Manager:gewinne"
- [ ] Commit 5: AR-33+36+37 FantasyDisclaimer + 7 Integrationen
- [ ] Commit 6: AR-17 business.md Glossar

### Runden-Log
