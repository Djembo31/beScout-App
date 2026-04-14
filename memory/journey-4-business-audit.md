---
name: Journey 4 — Business/Compliance Audit (Fantasy-Event)
description: Wording + Compliance + Geofencing Audit des Fantasy-Flows (/fantasy -> Event -> Lineup -> Result -> Reward-Claim) fuer Operation Beta Ready Phase 2.
type: project
status: audit-complete
created: 2026-04-14
agent: business
---

# Journey #4 — Business/Compliance Audit (Fantasy-Event-Teilnahme)

## Verdict: FAIL

**21 Findings:** 6 CRITICAL + 7 HIGH + 6 MEDIUM + 2 LOW.

Fantasy-Flow hat grundlegende Compliance-Probleme: Das gesamte Ecosystem framet Phase-1 Free Fantasy als **Gluecksspiel-Produkt** ("gewinne Credits-Preise", "Prämienpool", "Preisgeld", "Gewinner"). Es existiert eine komplette **Paid-Fantasy-Preview-Infrastruktur** (CreateEventModal mit `buyIn`-Feld, `$SCOUT`-Eintritt-Toggle, `scoutEventsEnabled`-Flag, `joinWithScout`, `benefitPremiumFantasy`) = **MASAK-Alarm**-Risiko.

**KEIN Disclaimer** im gesamten Fantasy-Bereich (0 TradingDisclaimer-Treffer in `src/components/fantasy`, `src/features/fantasy`, `src/app/(app)/fantasy`), obwohl jedes gescorede Event echte Platform-Credits via `leaderboard.rewardAmount` auszahlt. Der `$SCOUT`-Ticker wird user-facing gerendert (Kryptowaehrung-Signal). `"Spieler kaufen"` (J3-B3) existiert erneut als Fantasy-Empty-State.

**Was funktioniert:** `GeoGate feature="free_fantasy"` korrekt (TR=true, Phase-1-Semantik). `fantasyContent`-Disclaimer in AGB enthaelt Hinweis *"In der aktuellen Phase (Pilot) sind alle Turniere kostenlos"* — aber versteckt, nicht user-sichtbar. `buyInPilotHint "Pilot: immer 0 Credits (regulatorisch)"` ist Compliance-Gate (disabled Input). TIER_RESTRICTED (TR) darf Free Fantasy, korrekt.

---

## Findings

| # | Severity | File:Line | Issue | Fix | Business-Begruendung |
|---|----------|-----------|-------|-----|----------------------|
| **B1** | CRITICAL | `messages/de.json:4524-4525` `fantasyTitle/fantasyDesc` + `tr.json:4524-4525` | "Credits-Preise gewinnen" in Onboarding-Intro. "gewinne + Preise" = deutscher + tuerkischer Gluecksspiel-Duden. TR `"Credits ödüllerini kazan"` triggert MASAK §4 Abs.1 e. | DE: *"Stelle dein Lineup auf, tritt gegen andere Scouts an und sammle Credits-Belohnungen nach Platzierung."* TR analog. "gewinne"→"sammle", "Preise"→"Belohnungen" systemweit. | Phase 4 "Paid Fantasy Entry, Turniere mit Preisen — NICHT BAUEN". |
| **B2** | CRITICAL | `messages/de.json:190` `featureFantasyText` + `tr.json:190` | "Die besten gewinnen Credits" auf /welcome — erstes Signal vor jedem Disclaimer. TR *"En iyiler Credits kazanır"*. | DE: *"Top-Platzierungen erhalten Credits-Belohnungen."* TR: *"Üst sıralar Credits ödülleri alır."* | Welcome-Page = oeffentliche Werbung = MASAK/SPK fahndungsfreundlich. |
| **B3** | CRITICAL | 12 Keys: `prize`, `prizePool`, `totalPrizes`, `prizeLabel`, `tablePrize`, `rewardLabel`, `thReward`, `prizePoolLabel`, `prizeMoneyLabel`, `prizePreview`, `winners24h`, `noWinnersToday` | "Prämie/Preisgeld/Preispool/Prize" massenhaft. "Preisgeld" = StGB §284 Gluecksspiel-Auszahlung. EventCard rendert `prizeLabel:"Prize"` (englisch!) + jeder Pool als "Preisgeld". | "Prämie"/"Preisgeld"/"Preispool"/"Prize" → *"Belohnung"/"Rewards"/"Rewards-Pool"/"Credits-Pool"*. 12 Keys systematisch. | Sprache = juristisch relevant. Phase 1 = Free Fantasy = "Rewards", nicht "Prizes". |
| **B4** | CRITICAL | `JoinConfirmDialog.tsx:42-43` ($SCOUT-Branch) + `messages/de.json:870,881-884,4016` (joinWithScout, scoutEventsTitle/Description) + 11 Files mit `scoutEventsEnabled` | **Paid-Fantasy-Preview-Infrastruktur mit `$SCOUT`-Ticker LIVE.** Code-Path existiert: (a) JoinConfirmDialog `$SCOUT`-Eintritt, (b) Admin-Toggle `scoutEventsEnabled`, (c) `$SCOUT`-Ticker user-facing, (d) String *"$SCOUT als Waehrung fuer Fantasy Events aktivieren"*. | Sofort: (1) JoinConfirmDialog `$SCOUT`-Branch entfernen. (2) Alle `scoutEventsXxx`-Keys feature-flaggen `PAID_FANTASY_ENABLED=false`. (3) `$SCOUT`-Ticker ersetzen durch "Platform Credits". (4) `event.currency === 'scout'` Code-Path gated. | Phase 4 "NICHT BAUEN" heisst auch NICHT VORBEREITEN. `$SCOUT`-Ticker = Kryptowaehrung. |
| **B5** | CRITICAL | `src/components/fantasy/**` + `src/features/fantasy/**` + `src/app/(app)/fantasy/**` (0 TradingDisclaimer-Treffer) | **KEIN Disclaimer im gesamten Fantasy-Bereich.** Rendert echte Credits-Auszahlungen (rewardAmount, userReward, totalRewardBsd, myReward) ohne Risikohinweis. business.md: "Jede Seite mit $SCOUT/DPC MUSS TradingDisclaimer enthalten." | Neuer `FantasyDisclaimer`-Component auf: (1) FantasyContent variant=card, (2) EventDetailModal variant=inline, (3) EventSummaryModal nach Reward-Block, (4) JoinConfirmDialog vor Confirm, (5) CreateEventModal Footer, (6) OverviewPanel Reward-Block, (7) LeaderboardPanel wenn rewardAmount>0. Text: *"Fantasy-Turniere sind Unterhaltungsangebote. In der Pilot-Phase kostenlos. Credits-Rewards werden nach Platzierung verteilt — nach alleinigem Ermessen, kein Anspruch, keine Garantie. Keine Gluecksspiel-Regulierung."* | **Beta-Gate-Blocker.** Disclaimer-Pflicht = UI-Sichtbarkeit, nicht AGB-Hinterlegung. |
| **B6** | CRITICAL | `messages/de.json:4549,3524,3578,3525` (benefitPremiumFantasy, paid_fantasy, prize_league, region_feat_prizeLeague) + TR | Paid-Fantasy-Preview-Strings in User-Onboarding/Benefits. "Premium Fantasy Events" als Benefit (Phase 4). "Prize League"/"Prämien-Liga" direkt Gluecksspiel-Jargon. | (1) `benefitPremiumFantasy` entfernen bis Phase 4. (2) `paid_fantasy` Label user-facing verstecken. (3) `prize_league`/`region_feat_prizeLeague` → *"Champions League"* oder *"Premium-Liga (Rewards)"*. | Benefit-Text = Produkt-Commitment. Phase 3/4 sofort blockieren. |
| **B7** | HIGH | `messages/de.json:4531` `introDimensionsDesc` + `tr.json` | "Manager: Gewinne Fantasy-Events" als Rolle-Definition. J3-B13 "Trader" Erweitert. | DE: *"Manager: Stelle Lineups auf und platziere dich in Fantasy-Events."* TR analog. | Rollen-Framing als Gewinn-Maximierer = problematisch. |
| **B8** | HIGH | `messages/de.json:2798,324-325,2970` `rewardTemplate_winner`, `winners24h`, `noWinnersToday`, `event_winnerDesc` + TR | "Winner/Gewinner/Kazanan" als Label. Home-Widget + Achievement = Gluecksspiel-Vokabel. | DE: "Top-Platzierung"/"Tagessieger"→"Heutige Top-Platzierungen". TR: "Kazanan"→"En İyi". Achievement-Desc *"Platz 1 erreicht"*. | "Gewinner" = Substantivform von "gewinnen" = gleiche Kategorie. |
| **B9** | HIGH | `src/components/fantasy/CreateEventModal.tsx:55-56, 137-150, 190-195` + `messages/de.json:643-644,creatorFee` | User-facing Paid-Event-Erstellungs-UI mit disabled-State. `prizePool = buyIn * maxParticipants - creatorFee` Preview. *"Deine Fee (5%)"* = Creator-Economy-Paid-Fee Phase 4. | (1) `buyIn`-Feld + Preview-Block KOMPLETT VERSTECKEN (nicht disabled). (2) `creatorFee`-Berechnung entfernen. (3) Nur `maxParticipants` + `isPrivate` als Phase-1-Felder. (4) `buyInPilotHint` auf *"Aktuell nur kostenlose Events verfuegbar"*. | Phase 4 "NICHT BAUEN". Disabled UI = Product Review = red flag. |
| **B10** | HIGH | `messages/de.json:735` `buyPlayer` + TR — Fantasy PlayerPicker Empty-State | "Spieler kaufen" im Fantasy-Context. J3-B3 Systemfehler bestaetigt. | DE: *"Scout Card holen"* / *"Zur Marktplatz"*. TR: *"Scout Card al"*. | Ownership-ueber-Menschen-Suggestion. J3-Glossary-Entry. |
| **B11** | HIGH | `src/components/fantasy/EventSummaryModal.tsx:90-94` + `messages/de.json:790-791,4264` (strengthenPortfolio, portfolioHint, fantasyCTASubtitle) | **Post-Event Upsell direkt in Trading-Flow.** "Aufstocken"-CTA → `/market?tab=kaufen` direkt nach Gewinn-Erlebnis = **Gluecksspiel-Reinvestment-Zyklus**. *"Bessere Spieler = hoehere Scores"* = Reinvestment-Pitch. | (1) `summary.buyCta` neutral *"Schließen"* oder *"Zum Kader"*. (2) `strengthenPortfolio`/`portfolioHint` → *"Lineup-Optimierung?"* / *"Mehr Scout Cards = mehr Flexibilitaet"*. (3) Falls CTA bleibt: `TradingDisclaimer` ZWISCHEN Reward und CTA. | Post-Event-CTA zum Trading = SPK-typisches Anti-Pattern. |
| **B12** | HIGH | `src/components/fantasy/event-tabs/OverviewPanel.tsx:77,176-194` + `EventCardView.tsx:121` | **Pari-mutuel-Darstellung** ohne Phase-1-Disclaimer. "Platz 1 = 50% von 5.000 CR" = EU-Gaming-Definition. Bei Free = Creator-Economy, bei Paid = Gluecksspiel. Ohne Disclaimer lesen User+Regulator identisch. | (1) OverviewPanel `prizePool` → "{amount} CR Community Rewards". (2) Reward-Struktur-Header *"Community-Rewards-Verteilung"* + **inline Phase-1-Disclaimer**: *"In der Pilot-Phase ausschließlich kostenlose Teilnahme. Credits-Verteilung nach Platzierung ist Community-Reward, kein Gewinn aus Einsatz."* | Pari-mutuel = EU-Gaming-Terminologie. Free Fantasy + Disclaimer = MGA/SPK akzeptiert. |
| **B13** | HIGH | `messages/de.json:4549,4447-4477` + Profile-Earnings (totalRewards, totalPrizes) | Historische Rendite-Anzeige. `totalPrizes:"Total Prämien"` + `earningFantasy` als persistente "Ertrags"-Kategorie. | (1) `totalPrizes`→*"Gesamte Rewards"*, `totalRewards`→*"Gesamte Credits-Rewards"*. (2) Optional: *"Historische Rewards sind kein Indikator fuer zukuenftige Platzierungen."* | "guaranteed returns"-Signal via Historie. |
| **B14** | MEDIUM | `messages/de.json:4525,1882` notifCat_fantasy_desc + TR | Notification-Category-Label OK ("Belohnungen"), aber Gesamt-Set mischt Rewards + Gewinne inkonsistent. | Audit-Pattern: `grep "gewonnen\|gewinn\|preis\|Prämie" messages/de.json`. | Wiederholungs-Patterns schlimmer als Einzel-Treffer. |
| **B15** | MEDIUM | `messages/de.json:525,652,2012` `wonScout`, `totalEarned` + TR | "Gewonnene Credits" Dashboard-Metrik. "Gewonnen" = Lotterie-Vokabel. | DE: *"Erhaltene Credits"*. TR: *"Alınan Credits"*. | Partizip "gewonnen" = gleiche Kategorie. |
| **B16** | MEDIUM | 15+ render-paths: `OverviewPanel:77,189`, `CreateEventModal:186,190,194`, `LeaderboardPanel:92,272`, `EventSummaryModal:62`, `EventCardView:120-123` | `CR`-Suffix ueberall ohne Erklaerung. J2-M6 + J3-B9 bestaetigt, systematisch. | Global `CR` → *"Credits"* ausschreiben. Oder EINMAL pro Modal/Page Header-Hint. | Mehrdeutiges Kuerzel = Krypto-Trading-Ambience. |
| **B17** | MEDIUM | `messages/de.json:4524` Intro-Keys | "Gewinne + Preise" als Mission-Framing wiederholt. B1-Duplicate via Intro-Modal. | Siehe B1. | Sekundaerer Render-Path, MEDIUM wegen Intro-Modal-Kontext. |
| **B18** | MEDIUM | `src/components/fantasy/CreateEventModal.tsx:55-56` | Creator-Fee-Formel (5%) hardcoded OHNE business.md-Eintrag. Fuer Fantasy-Creator-Events KEIN Fee-Split in Tabelle. | (1) Fee-Preview entfernen (B9). (2) Falls bleibt: business.md + src/lib/fees.ts um Fantasy-Creator-Kategorie erweitern. | Hardcoded ohne SSOT = Compliance-Drift. Aehnlich J3-AR-17. |
| **B19** | LOW | `messages/de.json:3473-3474` `fantasyContent` in AGB | Text IST compliant — aber isoliert in AGB-Page versteckt, nicht UI-sichtbar. | Text als Basis fuer FantasyDisclaimer verwenden (B5). | Disclaimer-Pflicht = UI-Sichtbarkeit, nicht AGB. |
| **B20** | LOW | `EventDetailModal.tsx:207-218`, `OverviewPanel:229-242` Leaderboard-Framing | "Leaderboard/Rangliste" Standard-UX neutral, aber in Kombi mit B3/B12 = "Gewinner-Liste". | Kontext: wenn B8 gefixt, Leaderboard OK allein. | Kontext-Abhaengigkeit: Term neutral, Stack Gluecksspiel. |
| **B21** | LOW | `messages/tr.json:3658` `predictionCta:"Sonuçları tahmin et ve puan kazan"` | TR "puan kazan" (Punkte gewinnen) — Systemik B1-B8: `kazan` weit verwendet. | TR: *"Puan topla"* (sammeln). TR-weit `kazan` sparingly. | TR `kazan` MASAK-context-first lesbar. |

---

## Wording-Check Summary

| Kategorie | Status |
|-----------|--------|
| forbidden-words hard (Investment/ROI/Profit/Rendite) | OK 0 direct hits |
| **Gluecksspiel-Vokabel (win/prize/jackpot/bet/gamble/payout)** | **FAIL** 9 DE Keys + 8 TR Keys (B1, B2, B3, B8, B15, B17) |
| Paid-Fantasy-Preview (MASAK-Alarm) | **FAIL** 6 UI-Touchpoints (B4, B6, B9, B18) |
| `$SCOUT`-Ticker user-facing | **FAIL** JoinConfirmDialog + 5 Keys (B4) |
| "Spieler kaufen" (J3-B3 Systemfehler) | **FAIL** Fantasy-Picker Empty-State (B10) |
| Reinvestment-Signal Post-Event | **FAIL** EventSummaryModal→market (B11) |
| Disclaimer-Coverage | **FAIL** 0 TradingDisclaimer im gesamten Fantasy (B5) |
| `CR`-Kuerzel ohne Erklaerung | **FAIL** 15+ render-paths (B16) |
| "Portfolio/Trader/Manager" als Rolle | **FAIL** Manager = "Gewinne Events" (B7) |
| Historische Rendite-Anzeige | **FAIL** totalPrizes/wonScout/earningFantasy (B13) |
| Geofencing `free_fantasy` | OK Phase-1 korrekt |
| Phase-1-Disclaimer in AGB | OK aber isoliert (B19) |

---

## Fee-Split Check

| Kontext | Soll | Status |
|---------|------|--------|
| Free Fantasy Entry | 0% (Phase 1) | OK `buyInPilotHint` disabled |
| Free Fantasy Reward-Distribution | Kein Eintrag in business.md (ADR-026 Treasury) | OK Community-Reward-Pattern |
| Fantasy Creator Fee 5% hardcoded | **KEIN Eintrag business.md** | **FAIL B18** |
| Fantasy Paid Entry `$SCOUT`-currency | **Phase 4 — NICHT BAUEN** | **FAIL B4** |

---

## Licensing Phase Check

Phase 1 only? **NEIN** — mehrere Phase-4-Previews LIVE:
- CreateEventModal `buyIn`-Feld + Fee-Preview (B9, B18)
- JoinConfirmDialog `$SCOUT`-currency-branch (B4)
- scoutEventsXxx Admin-Toggle (B4)
- benefitPremiumFantasy-String (B6)
- paid_fantasy Label (B6)
- prize_league/region_feat_prizeLeague (B6)

**Empfehlung:** `PAID_FANTASY_ENABLED=false` Feature-Flag in ALLEN Paths.

---

## Geofencing Check

| Tier | Land | `free_fantasy` | Fantasy |
|------|------|----------------|---------|
| FULL | Rest EU | TRUE | OK |
| CASP | EU streng | TRUE | OK |
| FREE | DE/FR/AT/UK | TRUE | OK |
| RESTRICTED | **TR** | TRUE | OK TR darf Free Fantasy (business.md TIER_RESTRICTED) |
| BLOCKED | USA/CN/OFAC | FALSE | OK geblockt |

`paid_fantasy`: `{ full: true, casp: false, free: false, restricted: false, blocked: false }` korrekt, **ABER** Paid-Fantasy-UI-Paths (B4) haengen unter `free_fantasy`-Gate → defense-in-depth fehlt.

---

## Disclaimer-Coverage Matrix (Fantasy)

| Modal/Page | Status |
|-----------|--------|
| FantasyContent | **FAIL FEHLT** — variant=card unter Header |
| EventDetailModal | **FAIL FEHLT** — variant=inline vor Footer |
| EventSummaryModal | **FAIL FEHLT** — variant=inline nach Reward |
| JoinConfirmDialog | **FAIL FEHLT** — variant=inline vor Confirm |
| CreateEventModal | **FAIL FEHLT** — variant=inline Footer |
| OverviewPanel Reward-Block | **FAIL FEHLT** — inline unter Reward-Verteilung |
| LeaderboardPanel | **FAIL FEHLT** — inline wenn rewardAmount>0 |
| MitmachenTab | **FAIL FEHLT** — page-level reicht |
| ErgebnisseTab | **FAIL FEHLT** — page-level reicht |
| AGB `fantasyContent` | OK isoliert (B19) |

---

## LEARNINGS (Drafts)

1. **"Gewinnen + Preise"-Systemfehler**: 9 DE-Keys + 8 TR-Keys = Produkt-DNA. Analog J3 "Spieler kaufen"-Systemfehler. business.md-Regel erweitern: *Fantasy-Gluecksspiel-Vokabel-Regel*. Pre-Commit: `grep -iE "gewinn|prämie|preis[eg]|\\bwin\\b|\\bprize\\b" messages/*.json` filter fantasy.*-Keys.
2. **Paid-Fantasy-Preview-Infrastruktur = Compliance-Alarm**: 6 UI-Touchpoints preview Phase-4. "NICHT BAUEN" heisst auch "NICHT VORBEREITEN". Feature-Flag `PAID_FANTASY_ENABLED=false` + alle Paths gated.
3. **Disclaimer-Systemfehler in Fantasy**: 0 TradingDisclaimer-Treffer. Eigenen `FantasyDisclaimer`-Component basierend auf `fantasyContent` AGB-Text.
4. **`$SCOUT`-Ticker User-Face Systemfehler** (J3-B8 + J4-B4): Audit-Pattern `grep -rn "\\$SCOUT" src/ messages/`.
5. **Post-Event-Reinvestment-CTA**: Gewinn-Erlebnis + Trading-CTA = SPK Anti-Pattern. business.md-Regel erweitern: *Post-Reward-CTAs nicht direkt in Trading-Flow*.
6. **"CR"-Kuerzel-Systemik** (J2-M6 + J3-B9 + J4-B16): 15+ render-paths. "Credits" ausschreiben oder Header-Hint zentral.
7. **Kapitalmarkt-Glossar-Erweiterung business.md** (J3-LEARNING 6 + J4):
   - "Manager" + "Gewinne Events" → "Lineup-Stratege" + "Platziere dich" (NEU)
   - "Prize/Prämie/Preisgeld/Preispool" → "Rewards/Belohnungen" (NEU)
   - "gewinnen/Gewinner/gewonnen" → "sammeln/erhalten/Platz erreichen" (NEU)
   - "kazan" (TR) in Fantasy → "topla"/"al" (NEU)
   - "Preisgeld" = **StGB §284** absolut verboten (NEU)
8. **Creator-Economy-Fee ohne SSOT** (B18): 5% hardcoded ohne business.md-Eintrag. Code entfernen ODER business.md erweitern. Aehnlich J3-AR-17.
9. **Pari-mutuel-Darstellung** (B12): "Platz 1 = 50%" = EU-Gaming-Terminologie. Disclaimer-Pflicht zur Abgrenzung hart-legal.
10. **"Premium/Paid/Prize-League" Phase-4-Labels**: 4 Strings suggerieren Produkt-Roadmap. Feature-flaggen oder umbenennen.
11. **TR-`kazan`-Systematik**: MASAK context-first. `grep "kazan" messages/tr.json` → *"al"/"topla"/"elde et"* bevorzugen.
12. **Achievement `event_winnerDesc` mit "gewonnen"**: Achievement-Texte streng pruefen, Pre-Commit Hook.

---

## Severity-Summary

- **6 CRITICAL** (B1-B6): Gluecksspiel-Vokabel Onboarding + Paid-Fantasy-Preview + kompletter Disclaimer-Gap. **Beta-Blocker**, B4 besonders = MASAK-Alarm-Level.
- **7 HIGH** (B7-B13): Manager-Rolle, Winner-Labels, Paid-Preview, Spieler-kaufen, Reinvest-CTA, Pari-mutuel, Historische-Rendite. Hot-Fix vor 50-Mann-Onboarding.
- **6 MEDIUM** (B14-B19): Notif-Inkonsistenz, Gewonnene-Credits, CR-Kuerzel, Intro-Repeat, Creator-Fee-hardcoded, AGB-isoliert.
- **2 LOW** (B20-B21): Leaderboard-Kontext, TR-`puan kazan`.

---

## Cross-Domain Impact

**In-Scope fixable ohne andere Journeys:** B1, B2, B3, B8, B15, B17 (i18n Wording-Sweep). B5 (FantasyDisclaimer-Component). B12 (OverviewPanel). B16 (CR systemisch).

**Cross-Cutting:** B4 (Paid-Fantasy-Flag betrifft AdminEventsManagementTab + EventFormModal — J12). B7 (Manager-Rolle J6). B9, B18 (Creator-Economy). B10 (J3-Duplicate). B13 (Profile-Earnings J6).

**Beta-Gate-Blocker (J4):** B1, B2, B3, B4, B5, B6 — MUESSEN vor Beta, sonst SPK/MASAK/BaFin-Risk.
