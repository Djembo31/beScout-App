---
description: Business-Regeln, Compliance und Geofencing
---

## Licensing-Phasen (ADR-028)
- Phase 1 (jetzt): Scout Card Trading ($SCOUT-Credits), Free Fantasy, Votes, Events, Scout Reports
- Phase 3 (nach CASP): $SCOUT Token, Cash-Out, Exchange — NICHT BAUEN
- Phase 4 (nach MGA): Paid Fantasy Entry, Turniere mit Preisen — NICHT BAUEN
- Kill-Switch: BSD-Sales bei EUR 900K stoppen — IMPLEMENTIERT in `src/app/(app)/bescout-admin/AdminFoundingPassesTab.tsx` (`KILL_SWITCH_LIMIT_EUR = 900_000`, Progress Bar + `fpKillSwitchError` Toast)

## Wording-Compliance (KRITISCH)
- NIEMALS: Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership, "guaranteed returns"
- IMMER: Utility Token, Platform Credits, Scout Assessment, "at BeScout's discretion"
- $SCOUT = "Platform Credits" (nicht Kryptowaehrung)
- Scout Card = "Digitale Spielerkarte" (nicht Spieleranteil, kein Eigentum)
- Code-intern bleiben Variable/DB-Column-Namen mit "dpc" (nur UI umbenannt)
- Disclaimers auf JEDER Seite mit $SCOUT/DPC (TradingDisclaimer Component)
- Fantasy-Bereich: FantasyDisclaimer Component auf jeder Seite/Modal mit Rewards
- **IPO-Begriffsregel (AR-7, Journey #2):** Kuerzel "IPO" (Initial Public Offering) ist
  Securities-Terminologie und triggert potenziell SPK/MASAK-Signale.
  - User-facing Strings: IMMER "Erstverkauf" (DE) / "Kulüp Satışı" (TR)
  - Admin-facing Strings (Club-Admin-Panel, Analytics): "IPO" darf bleiben
  - Code-intern (Variablen, DB-Columns, i18n-Keys): "ipo" darf bleiben (nur Values uebersetzt)
  - Glossar user-facing: title = "Erstverkauf" / "Kulüp Satışı"

## Kapitalmarkt-Glossar (AR-17, Journey #3 + AR-32+39 Journey #4)

Systematische Umbenennung von Securities- und Gluecksspiel-Terminologie in user-facing Strings.
Code-intern (Variablen, DB-Columns, i18n-Keys) bleiben Namen — nur Values ueberuebersetzt.

### Securities-Terminologie (SPK/MiCA Red-Flag)
| Verboten (user-facing) | Stattdessen DE | Stattdessen TR | Begruendung |
|------------------------|----------------|----------------|-------------|
| IPO (Kuerzel) | Erstverkauf | Kulüp Satışı | SPK/MASAK Signal |
| Orderbuch | Angebots-Tiefe | Teklif Derinliği | Boersenterminologie |
| Trader (als Rolle) | Sammler, Scout | Koleksiyoncu, Scout | Securities-Identitaet |
| Portfolio (Invest-Objekt) | Sammlung, Kader | Koleksiyon, Kadro | Invest-Framing |
| Handle clever | — streichen oder "Sammle gezielt" | — streichen oder "Akıllıca topla" | Spekulationsstrategie |
| am Erfolg beteiligen | optionale Community Success Fee | isteğe bağlı Topluluk Başarı Ücreti | Gewinnbeteiligung = Finanzinstrument |
| Marktwert steigt → Fee steigt | Die Hoehe... haengt von Markt-Bewertung ab | Miktar piyasa değerlemesine bağlıdır | Rendite-Kausalitaet |

### Gluecksspiel-Vokabel (StGB §284, MASAK-Risiko)
| Verboten (user-facing) | Stattdessen DE | Stattdessen TR | Begruendung |
|------------------------|----------------|----------------|-------------|
| Prize, Prämie | Reward, Belohnung | Ödül (neutral) | Prize = Gluecksspiel |
| Preisgeld, Preispool | Rewards-Pool | Ödül Havuzu | StGB §284 Auszahlung |
| gewinnen (Verb) | sammeln, erhalten | topla, al | Gluecksspiel-Duden |
| Gewinner | Top-Platzierung | Üst Sıralama | Substantivform von gewinnen |
| gewonnen (Partizip) | erhalten, erreicht | alınan, ulaşıldı | Partizip ebenso betroffen |
| kazan* (TR Fantasy) | topla, al, elde et | — | MASAK §4 Abs.1 e |
| Manager: Gewinne Events | Manager: Stelle Lineups auf und platziere dich | Manager: Lineup'unu kur ve sıralamaya gir | Gewinn-Maximierer-Rolle |

### Reinvestment-Anti-Pattern
- NIEMALS Post-Event Reward-Modals mit Trading-CTA (z.B. "Aufstocken", "Güçlendir")
- Neutrale CTAs: "Schließen", "Zum Kader", "Kapat", "Kadroya Git"
- Begruendung: SPK-Anti-Pattern — Gluecksspiel-Reinvestment-Zyklus (Reward → Reinvest → Reward...)

### CI-Guard (empfohlen — Pre-Commit Hook post-Beta)
```bash
grep -iE "gewinn|prämie|preis[eg]|\\bwin\\b|\\bprize\\b" messages/*.json | grep -iE "fantasy\\.|home\\.|welcome\\.|intro" | grep -v "gewinnLabel"
grep -iE "Marktwert steigt|piyasa değeri artınca|başarıya ortak|am Erfolg beteilig|Handle clever|akıllıca işlem" messages/*.json
```
Treffer → prüfen: Ist es in User-Kontext? → Neutralisieren nach Tabelle oben.

## Geofencing-Tiers
| Tier | Laender | Zugang |
|------|---------|--------|
| TIER_FULL | Rest EU | Alles |
| TIER_CASP | EU ohne Gaming | Trading ja, Paid Fantasy nein |
| TIER_FREE | DE/FR/AT/UK | Free only, kein Paid Fantasy |
| TIER_RESTRICTED | TR | Content + Free Fantasy only |
| TIER_BLOCKED | USA/China/OFAC | Kein Zugang |

## Sales-Pakete (B2B, fuer Club-Onboarding)
| Paket | Kader | Werbeflaechen | BSD-Pool |
|-------|-------|--------------|----------|
| Baslangic | 30 | 2 | 100K |
| Profesyonel | 50 | 5 | 500K |
| Sampiyon | unbegrenzt | 10+ | 2M |
- Implementierung ERST wenn erster Club-Deal real wird

## Fee-Split Uebersicht
| Quelle | Platform | PBT | Club | Creator |
|--------|----------|-----|------|---------|
| Trading | 3.5% | 1.5% | 1% | — |
| IPO | 10% | 5% | 85% | — |
| Research | 20% | — | — | 80% |
| Bounty | 5% | — | — | 95% |
| Polls | 30% | — | — | 70% |
| P2P Offers | 2% | 0.5% | 0.5% | — |
| Club Abos | 0% | 0% | 100% | — |

## Platform Treasury (ADR-026)
- Fees = impliziter Burn (deflationary)
- Rewards = kontrolliertes Minting (Welcome Bonus, Missions, Achievements)
- Airdrops = Treasury-Redistribution (post-Pilot)

## i18n
- next-intl, `t()` nutzen, Cookie `bescout-locale`
- Messages in `messages/{locale}.json`
- Aktuell: DE + TR
