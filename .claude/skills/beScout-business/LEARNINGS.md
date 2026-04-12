# Learnings — beScout-business

> Kompiliert aus 91 Sessions. Jeder Eintrag ist ein echtes Compliance-Risiko.

## CRITICAL — Verbotene Woerter

### Absolut verboten in UI-Text
Diese Woerter loesen regulatorische Probleme aus — SOFORT blockieren:
- Investment, ROI, Profit, Rendite, Dividende, Gewinn
- Ownership, "guaranteed returns", Anlage
- Kryptowaehrung (fuer $SCOUT)
- Spieleranteil, Eigentum (fuer Scout Card)

### Richtige Bezeichnungen
| Falsch | Richtig |
|--------|---------|
| $SCOUT Token | $SCOUT Platform Credits |
| Scout Card kaufen = investieren | Scout Card erwerben = sammeln |
| Gewinn machen | Credits verdienen |
| Kurs steigt | Bewertung aendert sich |
| Dein Spieler | Deine Scout Card |

### Code-intern: "dpc" BLEIBT
Variable, DB-Columns, RPC-Namen mit "dpc" sind NICHT umzubenennen. Nur UI-sichtbare Texte nutzen "Scout Card".

## HIGH — Licensing-Phasen

### Was JETZT erlaubt ist (Phase 1)
- Scout Card Trading ($SCOUT Credits)
- Free Fantasy (Events, Liga)
- Votes, Polls, Research, Bounties
- Missionen, Mystery Box, Equipment, Achievements
- Club-Abos (Tier-System)

### Was NICHT gebaut werden darf
- Phase 3 (nach CASP): $SCOUT Token, Cash-Out, Exchange
- Phase 4 (nach MGA): Paid Fantasy Entry, Turniere mit Preisen
- Code fuer Phase 3/4 → SOFORT BLOCKIEREN, auch wenn "nur vorbereiten"

### Kill-Switch BSD-Sales
EUR 900K Limit implementiert in `AdminFoundingPassesTab.tsx`. Progress Bar + Toast bei Limit.

## MEDIUM — Fee-Split Verifizierung

### 7 Fee-Kategorien (Quelle: business.md)
| Quelle | Platform | PBT | Club | Creator |
|--------|----------|-----|------|---------|
| Trading | 3.5% | 1.5% | 1% | — |
| IPO | 10% | 5% | 85% | — |
| Research | 20% | — | — | 80% |
| Bounty | 5% | — | — | 95% |
| Polls | 30% | — | — | 70% |
| P2P Offers | 2% | 0.5% | 0.5% | — |
| Club Abos | 0% | 0% | 100% | — |

**Check:** Wenn UI Fees anzeigt → gegen diese Tabelle verifizieren. KEIN Hardcoding anderer Werte.

### TradingDisclaimer Pflicht
Jede Seite die $SCOUT oder DPC erwaehnt MUSS den TradingDisclaimer Component enthalten.

## Geofencing

### 5 Tiers
| Tier | Zugang |
|------|--------|
| TIER_FULL | Alles |
| TIER_CASP | Trading ja, Paid Fantasy nein |
| TIER_FREE (DE/FR/AT/UK) | Free only |
| TIER_RESTRICTED (TR) | Content + Free Fantasy |
| TIER_BLOCKED (USA/China/OFAC) | Kein Zugang |

### Tuerkei = TIER_RESTRICTED
Pilot ist Sakaryaspor (tuerkischer Club), aber TR-User sind RESTRICTED.
Duerfen: Content lesen, Free Fantasy spielen.
Duerfen NICHT: Handeln, $SCOUT kaufen/verkaufen.

## i18n Compliance

### Disclaimer-Texte NIE uebersetzen ohne Pruefung
Rechtliche Texte (Disclaimer, AGB-Verweise, Risikohinweise) duerfen NICHT einfach uebersetzt werden.
Immer: Original beibehalten oder von Anil/Legal freigeben lassen.

### Geld-Formate
DE: `10.000,00 $SCOUT` (Punkt als Tausender, Komma als Dezimal)
TR: `10.000,00 $SCOUT` (gleich wie DE)
EN: `10,000.00 $SCOUT` (falls spaeter noetig)
