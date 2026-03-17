# BeScout System-Design v2 — Vollstaendige Architektur

> **Version:** 2.0 | **Datum:** 10.03.2026
> **Autor:** System-Design Session (Anil + Claude)
> **Status:** SPEC — Verbindlich fuer alle Implementierungen
> **Vorgaenger:** Context Pack v8, VISION.md — werden durch dieses Dokument in Bezug auf Waehrung, Rewards und Geldfluss ERSETZT

---

## 1. PHASEN-UEBERSICHT

### Phase PILOT (Saison 26/27) — "Closed Economy"

**Was existiert:**
- bCredits als interne Platform Credits (kein Token, kein Crypto, kein Cash-Out)
- DPC Trading (Orderbook + P2P Offers) mit 6% Fee-Split
- IPO-System (max 4 Tranchen, max 10.000 DPCs/Spieler)
- Fantasy Events (Free Entry, Ticket-basiert)
- Club Events (vereinsspezifisch, Club finanziert Rewards)
- Community: Posts, Research (Paywall 80/20), Bounties, Votes, Polls
- Club-Abos (Bronze/Silber/Gold) mit 5 server-enforced Perks
- Gamification: 3-Dim Elo (Trader/Manager/Analyst), Score Road, Achievements, Missions, Streaks
- Fan-Ranking (pro Club, CSF-Multiplikator)
- Ticket-System (Engagement-Waehrung ohne Cash-Wert)
- Avatar-System (Rahmen, Titel, Profil-Effekte)
- Club Dashboard ("Seller Central") mit 12 Admin-Tabs
- i18n (DE + TR), Mobile-First, 25 Routes

**Was NICHT existiert (und NICHT gebaut werden darf):**
- Kein Cash-Out, keine Fiat-Auszahlung, kein P2P-Transfer von bCredits
- Kein Blockchain, kein Smart Contract, kein Wallet-Connect
- Kein Paid Fantasy (Entry Fees in bCredits)
- Kein Exchange, kein Marktpreis fuer bCredits
- Kein KYC (erst mit Malta Ltd.)
- Kein Geofencing-Enforcement (Flag vorhanden, aber OFF)

### Phase 3 (nach CASP-Lizenz) — "$SCOUT Launch"

**Was sich aendert:**
- bCredits werden zu $SCOUT Token (Polygon, 1:1 Migration aller Balances)
- Cash-Out wird moeglich (Fiat-Auszahlung ueber Exchange)
- User koennen $SCOUT mit Fiat kaufen (In-App oder Exchange)
- Neue Clubs kaufen $SCOUT zum Marktpreis (teurer als Pilot-Early-Adopter)
- EU-weites Passporting durch CASP-Lizenz
- KYC wird Pflicht vor Trading/Cash-Out
- Geofencing wird scharf geschaltet (5 Tiers)
- P2P-Offers bekommen Fee (3-6%, nachruerstbar)

**Was bleibt gleich:**
- Alle Mechaniken (Trading, Fantasy, Community, Gamification)
- Fee-Splits, DPC-System, Club-Pakete
- Ticket-System bleibt separat (kein Cash-Wert, auch nicht in $SCOUT konvertierbar)

### Phase 4 (nach MGA Gaming-Lizenz) — "Paid Fantasy"

**Was dazukommt:**
- Paid Fantasy Events (Buy-In in $SCOUT, Prize Pool)
- Turniere mit echten Preisen
- Fantasy Rake (Platform-Anteil am Prize Pool)
- Erweiterte Geofencing-Regeln (Gaming-Tiers)

---

## 2. WAEHRUNGEN

### 2.1 bCredits (BeScout Credits) — Die Wirtschaftswaehrung

**Definition:** Interne Platform Credits ohne Wertversprechen, nicht handelbar ausserhalb der Plattform, kein Crypto-Token, kein Investment-Produkt. Technische Repraesentierung als BIGINT Cents (1.000.000 Cents = 10.000 bCredits). In der UI wird "bCredits" angezeigt (NICHT "$SCOUT", NICHT "BSD").

#### Quellen (woher kommen bCredits IN das System?)

| Quelle | Mechanismus | Empfaenger | Volumen |
|--------|-------------|-----------|---------|
| **Club-Paket-Kauf** | Club kauft Paket (EUR an BeScout) | Club Treasury | 100K / 500K / 2M je Paket |
| **Club Nachkauf** | Club kauft weitere Credits (EUR an BeScout) | Club Treasury | Variabel |
| **Welcome Bonus** | Einmalig bei Registrierung | User Wallet | 500 bCredits (konfigurierbar) |

**Grundregel:** Es gibt KEIN "Minting" im Pilot. Alle bCredits im System kommen entweder aus Club-Paketen oder dem einmaligen Welcome Bonus. Streak-Rewards, Mission-Rewards und Score-Road-Rewards geben TICKETS und COSMETICS, NICHT bCredits. Das ist der fundamentale Unterschied zum bisherigen System.

#### Senken (wohin fliessen bCredits AUS dem aktiven Umlauf?)

| Senke | Mechanismus | Effekt |
|-------|-------------|--------|
| **Trading Fees** | 6% auf jeden Trade (3.5% Platform + 1.5% PBT + 1% Club) | Platform-Anteil = BURN (deflationary, ADR-026) |
| **IPO Fees** | 10% Platform + 5% PBT bei jedem IPO-Kauf | Platform-Anteil = BURN |
| **Research Unlock** | 20% Platform bei jedem Paywall-Unlock | Platform-Anteil = BURN |
| **Bounty Approval** | 5% Platform bei Bounty-Auszahlung | Platform-Anteil = BURN |
| **Poll Revenue** | 30% Platform bei Poll-Einnahmen | Platform-Anteil = BURN |

Der Platform-Anteil aller Fees wird effektiv verbrannt — die bCredits verlassen den aktiven Kreislauf und machen die verbleibenden bCredits wertvoller. PBT und Club-Anteile bleiben im Kreislauf (PBT wird bei Liquidierung ausgeschuettet, Club-Anteil geht in die Club Treasury).

#### Kreislauf (wohin fliessen bCredits INNERHALB des Systems?)

| Flow | Von | An | Beschreibung |
|------|-----|-----|-------------|
| **DPC-Kauf (Orderbook)** | Kaeufer | Verkaeufer (94%) + Fees | User A kauft DPC von User B |
| **DPC-Kauf (IPO)** | Kaeufer | Club Treasury (85%) + Fees | User kauft DPC bei Neuemission |
| **Club-Abo** | User | Club Treasury (100%) | Bronze 500/Silber 1.500/Gold 3.000 pro Monat |
| **Research Unlock** | Leser | Autor (80%) + Platform (20%) | User liest Paywall-Analyse |
| **Bounty Reward** | Club/User | Erfueller (95%) + Platform (5%) | Scouting-Auftrag wird erfuellt |
| **Community Success Fee** | Club Treasury | DPC-Holder (mit Fan-Rang-Multiplikator) | Spieler wird real transferiert |
| **PBT Auszahlung** | PBT Treasury | DPC-Holder (proportional) | Bei Liquidierung |
| **Club Airdrops** | Club Treasury | Fans (nach Airdrop-Score) | Saisonale Belohnung |
| **P2P Offers** | Kaeufer | Verkaeufer (100%, 0% Fee im Pilot) | Direktangebot |
| **Event Rewards** | Club Treasury | Event-Gewinner | Club Event Praemien |

#### Deflations-Mechanismus (ADR-026)

Platform-Fees = impliziter Burn. bCredits die als Platform-Anteil eingehen, verlassen den aktiven Umlauf permanent. Der Welcome Bonus (500 bCredits/User) ist die einzige Quelle "neuer" bCredits im System. Da Trading-Fees bei jedem Trade anfallen und das Trading-Volumen den Welcome Bonus weit uebersteigt, ist der Netto-Effekt **deflationaer**: Je mehr gehandelt wird, desto weniger bCredits existieren im aktiven Umlauf.

### 2.2 Tickets — Die Engagement-Waehrung

**Definition:** Eintrittskarten fuer Events und Boosts. KEIN Cash-Wert, NICHT handelbar, NICHT in bCredits konvertierbar. Rein spielerisches Engagement-Flywheel.

#### Quellen (wie verdient man Tickets?)

| Quelle | Menge | Frequenz |
|--------|-------|----------|
| **Daily Login** | 5 Tickets | Taeglich |
| **Daily Challenge** | 10-25 Tickets | Taeglich (1 Challenge/Tag) |
| **Missions** | 15-100 Tickets | Woechentlich (3-5 Missionen) |
| **Rang-Aufstieg** | 50-500 Tickets | Bei Aufstieg (Elo-basiert) |
| **Score Road Milestones** | 25-200 Tickets | 11 Milestones |
| **Mystery Box** | 5-50 Tickets | Zufaellig (bei bestimmten Aktionen) |
| **Streak-Milestones** | 10-75 Tickets | 3d/7d/14d/30d |
| **Achievement-Unlock** | 20-100 Tickets | Bei Erstfreischaltung |

#### Senken (wofuer gibt man Tickets aus?)

| Senke | Kosten | Beschreibung |
|-------|--------|--------------|
| **BeScout Event-Teilnahme** | 10-50 Tickets | Fantasy Events (global) |
| **Club Event-Teilnahme** | 5-30 Tickets | Vereinsspezifische Events |
| **Lineup-Boost** | 25 Tickets | +10% Score fuer einen Spieler im Lineup |
| **Live-Prediction** | 10 Tickets | Tipp waehrend laufendem Spiel |
| **Premium-Emotes** | 5 Tickets | Spezielle Reaktionen in Community |
| **Re-Entry** | 20 Tickets | Zweite Chance nach Event-Elimination |
| **Captain Switch** | 15 Tickets | Captain nach Deadline aendern (1x/GW) |

#### Design-Prinzip

Tickets sind das **Engagement-Flywheel**: Taeglich einloggen, Tickets verdienen, an Events teilnehmen, Tickets ausgeben, morgen wiederkommen. Sie motivieren die taegliche Rueckkehr OHNE dass bCredits verschenkt werden muessen. bCredits bleiben die "echte" Waehrung mit wirtschaftlichem Wert — Tickets sind das Spielgeld.

### 2.3 Cosmetics — Status-Symbole

**Definition:** Visuelle Elemente die den Status eines Users zeigen. Nicht handelbar, nicht verkaeuflich. Rein dekorativ mit Social-Signaling-Funktion.

| Kategorie | Beispiele | Quellen |
|-----------|-----------|---------|
| **Rahmen** | Bronze-Rahmen, Gold-Rahmen, Legendaer-Rahmen, Saisonaler Rahmen | Score Road, Achievements, Fan-Rang, Saison-Events |
| **Titel** | "Transferfluesterer", "Taktik-Genie", "Club-Legende" | Achievements, Fan-Rang-Stufen, Saisonale Rewards |
| **Profil-Effekte** | Goldener Glow, Animierter Hintergrund, Partikel-Effekt | Score Road (hohe Milestones), Mystery Box (selten) |
| **Badges** | "Early Adopter", "Season 1", "Founding Fan" | Zeitbasiert, Einmalig, Nicht wiederholbar |
| **Emotes** | Premium-Reaktionen in Community | Tickets (temporaer) oder Achievements (permanent) |

---

## 3. CLUB-PERSPEKTIVE (Das Amazon-Modell)

### 3.1 Was kauft der Club?

Der Club kauft EINMALIG ein Paket zum Pilotstart. Das Paket enthaelt einen bCredits-Pool der in die Club Treasury fliesst.

| Paket | Name (TR) | bCredits | Kader | Werbeflaechen | Features |
|-------|-----------|----------|-------|--------------|----------|
| **Baslangic** | Einstieg | 100.000 | 30 Spieler | 2 | Basis: Trading, Voting, Polls |
| **Profesyonel** | Empfohlen | 500.000 | 50 Spieler | 5 | + Fantasy, Scouting, Analytics, Events |
| **Sampiyon** | Premium | 2.000.000 | Unbegrenzt | 10+ | + White-Label, API, Fantransfer, Account Manager |

**Nachkauf:** Clubs koennen jederzeit weitere bCredits nachkaufen (EUR an BeScout, zum festen Pilot-Kurs). Der Pilot-Kurs ist guenstiger als der spaetere $SCOUT-Marktpreis — das ist der Early-Adopter-Vorteil.

### 3.2 Was kann der Club damit tun?

Die bCredits fliessen in die **Club Treasury** — ein vom Club verwaltetes Konto auf der Plattform (bereits implementiert als Club-Wallet).

**Aktive Werkzeuge (Club als "Haendler"):**

**1. IPOs starten** — Spieler als DPCs listen, Fans kaufen mit bCredits
- 85% des IPO-Erloes zurueck in Club Treasury
- Club bestimmt: welcher Spieler, wann, wie viele DPCs (min 500/Tranche), welcher Preis
- Max 4 Tranchen pro Spieler, max 10.000 DPCs total
- Success Fee Cap muss VOR dem ersten IPO gesetzt werden (einmalig, danach unveraenderbar)

**2. Club Events erstellen** — Vereinsspezifische Fantasy-Events
- Rewards aus Club Treasury finanziert
- Beispiel: "Wer die beste Aufstellung gegen Galatasaray hat bekommt 500 bCredits"
- Fans zahlen Tickets fuer Teilnahme (NICHT bCredits)

**3. Votes/Polls starten** — Fan-Mitbestimmung
- "Welchen Spieler sollen wir verpflichten?" — Fans stimmen ab
- Fans zahlen Tickets zum Abstimmen
- Ergebnisse = echte Fan-Daten fuer Vereinsentscheidungen

**4. Bounties ausschreiben** — Scouting-Auftraege an Fans
- "Analysiere den Gegner naechste Woche" — Reward aus Club Treasury
- Fan liefert Report, Club approved, Fan bekommt bCredits (95%) + Reputation
- Optionaler min_tier Gate (nur Bronze+/Silber+ Subscriber duerfen einreichen)

**5. Airdrops verteilen** — Saisonale Belohnungen an Top-Fans
- Basierend auf Fan-Rang und Airdrop-Score
- Aus Club Treasury finanziert
- Bereits implementiert: Airdrop-Score-Berechnung + Distribution-RPC

**6. Community Success Fee auszahlen** — Der Kern-Anreiz
- Bei realem Spielertransfer zahlt Club CSF an DPC-Holder
- Aus Club Treasury, mit Fan-Rang-Multiplikator
- Formel: (verkaufte DPCs / 10.000 x 10%) x min(Transfererloes, Cap)

### 3.3 Wie belohnt der Club seine Fans?

Der Club hat 4 Belohnungs-Kanaele, alle in bCredits aus der Club Treasury:

| Kanal | Trigger | Typisches Volumen |
|-------|---------|-------------------|
| **Event Rewards** | Event-Gewinn (Top 3) | 100-5.000 bCredits |
| **Bounty Rewards** | Scouting-Auftrag erfuellt und approved | 50-2.000 bCredits |
| **Airdrops** | Saisonale Verteilung an Top-Fans | 5.000-50.000 bCredits (gesamt) |
| **Community Success Fee** | Realer Spielertransfer | Abhaengig von Transfererloes x Cap |

### 3.4 Warum wird das ein Muss fuer jeden Verein?

**Das FOMO-Flywheel:**

1. **Erste Clubs starten** (Pilot: gesamte TFF 1. Lig, 18-20 Clubs). Fans engagieren sich, kaufen DPCs, spielen Events.
2. **Fan-Daten fliessen** — Club weiss zum ersten Mal WER seine aktivsten Fans sind: Wer kauft DPCs, wer spielt Events, wer schreibt Analysen. Das ist echtes CRM, nicht Social-Media-Likes.
3. **Engagement-Metriken steigen** — Club kann Sponsoren echte Zahlen zeigen (aktive User, Trading-Volumen, Event-Teilnahmen).
4. **Werbeflaechen auf der Club-Page** — Club refinanziert Paketkosten durch Sponsoring-Deals (bereits implementiert: 21 Sponsor-Placements mit Impression/Click-Tracking).
5. **Nachbar-Club sieht den Erfolg** — "Deren Fans sind auf BeScout, unsere nicht". Bei einer kompletten Liga auf der Plattform ist der Druck maximal.
6. **FOMO kickt ein** — Verein der nicht mitmacht, verliert Fan-Engagement an Clubs die auf der Plattform sind.
7. **Netzwerkeffekt** — Mehr Clubs = bessere Fantasy (mehr Spieler zur Auswahl) = mehr User = mehr Wert fuer alle Clubs.

**Die Amazon-Analogie:** Seller sehen, dass Konkurrenten auf Amazon verkaufen und Umsatz machen. Wer nicht dabei ist, verliert Marktanteile. Bei BeScout verliert der Verein Fan-Engagement an Clubs die auf der Plattform aktiv sind. Der Club der als letzter beitritt, hat die schlechteste Position.

### 3.5 Club Treasury Management

**Einnahmen-Quellen:**
- IPO-Erloese (85% des Verkaufspreises)
- Trading-Fee-Anteil (1% jedes Trades mit Club-DPCs)
- Club-Abo-Einnahmen (100% an Club, ADR-027)
- Nachkauf (EUR an BeScout, neue bCredits in Treasury)

**Ausgaben-Kanaele:**
- Event-Rewards
- Bounty-Rewards
- Airdrops
- Community Success Fee

**Dashboard:** Revenue-Uebersicht, Fan-Engagement-Analytics, Treasury-Balance, Ausgaben-History (bereits implementiert: 12 Admin-Tabs inkl. Revenue, Analytics, Fans).

**Withdrawal:** Club kann bCredits im Pilot NICHT in EUR auszahlen. Post-Legal-Go: $SCOUT an Exchange, Cash-Out moeglich.

### 3.6 Early Adopter Bonus

Clubs die in der Pilotphase einsteigen profitieren dreifach:

1. **Guenstigerer Kurs:** bCredits zum Pilot-Kurs (fester EUR-Kurs, deutlich unter spaeteren Marktpreis)
2. **1:1 Migration:** Alle bCredits-Balances migrieren 1:1 zu $SCOUT Token
3. **Marktpreis-Delta:** $SCOUT hat nach Launch einen Marktpreis. Pilot-bCredits wurden guenstiger eingekauft als der Marktpreis — der Club hat mehr Handlungsspielraum als spaetere Teilnehmer.

**Fazit fuer den Pitch:** "Frueh einsteigen = guenstigere Credits = mehr Handlungsspielraum = bessere Position wenn $SCOUT live geht."

---

## 4. USER-PERSPEKTIVE

### 4.1 Onboarding — Der erste Tag

1. **Registrierung** — User erstellt Account (Email oder Social Login)
2. **Welcome Bonus** — 500 bCredits geschenkt (einmalig, aus Platform-Reserve)
3. **Club auswaehlen** — User folgt seinem Lieblingsverein (kann mehrere folgen)
4. **Erste DPCs kaufen** — Mit Welcome Bonus 1-2 guenstige DPCs eines Spielers kaufen (typischer IPO-Preis: 100-500 bCredits/DPC)
5. **Erstes Event** — An einem Free Fantasy Event teilnehmen (kostet 5-10 Tickets, erste Tickets aus Daily Login)
6. **Erster Post** — In der Community einen Take schreiben (Analyst-Score startet)
7. **Daily Login** — Am naechsten Tag zurueckkommen, Streak startet, Tickets fliessen

### 4.2 Woher bCredits? (JEDE Quelle)

| Quelle | Mechanismus | Typisches Volumen | Frequenz |
|--------|-------------|-------------------|----------|
| **Welcome Bonus** | Einmalig bei Registrierung | 500 bCredits | Einmalig |
| **DPC Trading-Gewinne** | Guenstig kaufen, teurer verkaufen | Variabel (marktabhaengig) | Pro Trade |
| **Community Success Fee** | DPC halten, Spieler wird transferiert | Abhaengig von Anteil x Transfer x Fan-Rang | Selten (reale Transfers) |
| **PBT Auszahlung** | DPC halten, bei Liquidierung | Proportional zu DPC-Besitz | Bei Liquidierung |
| **Club Airdrops** | Fan-Rang + Airdrop-Score | Club-abhaengig | Saisonal |
| **Event Rewards** | Club Events gewinnen (Top 3) | 100-5.000 bCredits | Pro Event |
| **Bounty Rewards** | Scouting-Auftrag erfuellen + Approval | 50-2.000 bCredits | Pro Bounty |
| **Research Paywall** | Analyse schreiben, andere kaufen | 80% vom Preis x Anzahl Kaeufer | Pro Unlock |
| **Poll Revenue** | Poll erstellen, Fans stimmen ab | 70% der Einnahmen | Pro Poll |

**Grundregel:** bCredits werden VERDIENT, nicht geschenkt. Der einzige "Gratis"-Einstieg ist der Welcome Bonus. Alles andere erfordert Aktivitaet, Wissen oder Engagement. Engagement-Rewards (Missions, Streaks, Score Road, Achievements) geben TICKETS und COSMETICS — KEINE bCredits.

### 4.3 Wofuer bCredits ausgeben? (JEDE Senke)

| Senke | Kosten | Beschreibung |
|-------|--------|--------------|
| **DPC kaufen (Orderbook)** | Marktpreis (floor_price) + 6% Fee | Spieler-Kontrakte auf dem Sekundaermarkt erwerben |
| **DPC kaufen (IPO)** | IPO-Preis + 15% Fee (10% Platform + 5% PBT) | Bei Neuemission des Clubs |
| **Club-Abo** | 500/1.500/3.000 pro Monat | Bronze/Silber/Gold (5 server-enforced Perks) |
| **Research freischalten** | Autor-Preis (min 50 bCredits) | Analyse hinter Paywall lesen |
| **Bounty erstellen** | Reward-Betrag (Escrow) + 5% Fee | Scouting-Auftrag ausschreiben |
| **Poll erstellen** | Kosten pro Stimme x erwartete Teilnehmer | Community-Abstimmung starten |

### 4.4 Ticket-Kreislauf (verdienen, ausgeben, verdienen)

**Beispiel einer typischen Woche:**

```
Montag:    Login (+5) + Daily Challenge (+15) = 20 Tickets
           Ausgabe: -0

Dienstag:  Login (+5) + Mission "Kaufe 1 DPC" abgeschlossen (+30) = 55 Tickets
           Ausgabe: -0

Mittwoch:  Login (+5) + Daily Challenge (+10) = 70 Tickets
           Ausgabe: Streak 3d Milestone (+10) = 80 Tickets

Donnerstag: Login (+5) + Daily Challenge (+20) = 105 Tickets
            Ausgabe: -0

Freitag:   Login (+5) + Mission "2 Posts schreiben" (+25) = 135 Tickets
           Ausgabe: -0

Samstag:   Login (+5) + SPIELTAG = 140 Tickets
           Ausgabe: Fantasy Event (-15) + Lineup-Boost (-25) + Live-Prediction (-10) = 90 Tickets

Sonntag:   Login (+5) + Streak 7d Milestone (+20) + Achievement "5 Events" (+30) = 145 Tickets
           Ausgabe: Club Event (-10) = 135 Tickets
```

**Der Kreislauf:** Tickets motivieren taegliches Engagement. Engagement verbessert den Rang. Rang gibt mehr Tickets (Rang-Aufstieg Bonus). Mehr Tickets ermoeglichen mehr Events. Mehr Events verbessern den Manager-Rang. Der Kreis schliesst sich.

### 4.5 Progression — Was motiviert wann?

| Zeitrahmen | Motivation | Mechanismus |
|------------|-----------|-------------|
| **Taeglich** | Streak nicht verlieren, Daily Challenge | Streak-Counter + Daily Tickets + Verlustaversion |
| **Woechentlich** | Missions abschliessen, Fantasy Events gewinnen | 3-5 Missions + GW Events |
| **Monatlich** | Rang aufsteigen, Score Road Milestone erreichen | Elo-System + 11 Milestones |
| **Saisonal** | Fan-Rang verbessern, Airdrop-Score maximieren | CSF-Multiplikator + Saisonaler Airdrop |
| **Langfristig** | Achievements sammeln, Avatar aufbauen, Track Record | 33 Achievements + Cosmetic Collection + Reputation |

---

## 5. GAMIFICATION (verheiratet mit dem Wirtschaftssystem)

### 5.1 Manager-Rang (Fantasy-Dimension)

**Was ist es?** Elo-Score basierend auf Fantasy-Event-Performance. Start: 500. Kann steigen UND fallen.

**Wie steigt/faellt er?**
Percentile-basiert nach jedem Gameweek-Scoring:
- Top 1% = +50, Top 5% = +40, Top 10% = +30, Top 25% = +20, Top 50% = +10
- Top 75% = plus/minus 0, Top 90% = -10, >90% = -25
- Nicht teilgenommen = -15 (ABSENT_PENALTY)
- Captain hat den besten Spieler des GW = +15 (CAPTAINS_CALL_BONUS)

**Was bringt er KONKRET?**
- Hoeherer Manager-Rang = bessere Position auf dem Fantasy-Leaderboard
- Fliesst in den Gesamt-Rang ein (Median der 3 Dimensionen)
- Gesamt-Rang bestimmt Score Road Progress, der Tickets + Cosmetics bringt
- Rang-Aufstieg gibt 50-500 Tickets (je nach Stufensprung)
- Social Proof: "Gold III Manager" Badge sichtbar ueberall in der App

### 5.2 Fan-Rang (Club-spezifisch) — NEUES SYSTEM

**Was ist es?** Pro-Club-Ranking das den Grad der Fan-Bindung misst. Bestimmt den CSF-Multiplikator.

**6 Stufen:**

| Stufe | Name | CSF-Multiplikator | Kern-Voraussetzungen |
|-------|------|-------------------|----------------------|
| 1 | **Zuschauer** | 1.0x | Basis (jeder Fan) |
| 2 | **Stammgast** | 1.1x | 5+ Club Events + Bronze-Abo |
| 3 | **Ultra** | 1.2x | 15+ Events + 3+ Club-DPCs + Silber-Abo |
| 4 | **Legende** | 1.3x | 30+ Events + 10+ Club-DPCs + Gold-Abo + 5 Bounties |
| 5 | **Ehrenmitglied** | 1.4x | 50+ Events + 25+ Club-DPCs + Gold-Abo + 10 Bounties + 6 Monate Streak |
| 6 | **Vereinsikone** | 1.5x | Top 10 des Clubs (kumulativ, saisonal rotierend) |

**Was bringt er KONKRET?**
- **CSF-Multiplikator** (der Kern): Vereinsikone bekommt 50% mehr CSF als Zuschauer bei gleichem DPC-Besitz
- **Airdrop-Prioritaet:** Hoeherer Fan-Rang = groesserer Anteil bei Club-Airdrops
- **Exklusive Cosmetics:** Fan-Rang-Rahmen + Fan-Rang-Titel (z.B. "Sakaryaspor Legende")
- **Club-Sichtbarkeit:** Top-Fans werden auf der Club-Page prominent angezeigt

### 5.3 Airdrop-Score

**Was ist es?** Kumulativer Score der die Gesamtaktivitaet eines Users plattformweit misst.

**Zusammensetzung:**
- Trading-Volumen (20%)
- Event-Teilnahmen (20%)
- Community-Aktivitaet: Posts, Votes, Research (20%)
- DPC-Halte-Dauer in Tagen (20%)
- Login-Streak-Laenge (10%)
- Referrals (10%)

**Was bringt er KONKRET?**
- Bestimmt den Anteil bei Platform-weiten Airdrops (saisonal, aus akkumulierten Platform-Fees finanzierbar)
- Bestimmt den Anteil bei Club-Airdrops (zusaetzlich zu Fan-Rang)
- Sichtbar im Profil als Leaderboard-Position
- Bereits implementiert: `refresh_my_airdrop_score()` RPC + Airdrop-Score-Anzeige

### 5.4 Score Road (11 Milestones) — NUR TICKETS + COSMETICS

Basiert auf dem Gesamt-Rang-Score (Median der 3 Elo-Dimensionen).

| Milestone | Score | Rewards |
|-----------|-------|---------|
| 1 | 350 | 25 Tickets + "Newcomer" Titel |
| 2 | 700 | 50 Tickets + Bronze-Rahmen |
| 3 | 1.000 | 75 Tickets + "Aufsteiger" Titel |
| 4 | 1.400 | 100 Tickets + Silber-Rahmen |
| 5 | 1.800 | 125 Tickets + "Kenner" Titel |
| 6 | 2.200 | 150 Tickets + Gold-Rahmen |
| 7 | 2.800 | 175 Tickets + Profil-Effekt (Glow) |
| 8 | 3.400 | 200 Tickets + "Experte" Titel |
| 9 | 4.000 | 150 Tickets + Diamant-Rahmen |
| 10 | 5.000 | 175 Tickets + Animierter Hintergrund |
| 11 | 7.000 | 200 Tickets + "Legende" Titel + Partikel-Effekt |

**WICHTIG:** Score Road gibt NUR Tickets + Cosmetics. KEINE bCredits. Das bisherige System (BSD-Rewards auf Score Road) wird umgestellt. Die Score-Road-Milestones in der DB (`claim_score_road` RPC) muessen auf Ticket-Rewards migriert werden.

### 5.5 Achievements (33 Total) — NUR COSMETICS + TICKETS

3 Kategorien: Trading (sky), Manager (purple), Analyst (emerald).
- 15 sichtbare Achievements (immer im Profil angezeigt)
- 18 hidden Achievements (erst bei Unlock sichtbar = Ueberraschungseffekt)
- Unlock = Notification + Confetti-Animation + Tickets (20-100)

**Beispiele:**
| Achievement | Kategorie | Reward |
|-------------|-----------|--------|
| "Erster Trade" | Trading | 20 Tickets + "Haendler" Titel |
| "10 Fantasy Events" | Manager | 50 Tickets + Manager-Rahmen |
| "5 Research Posts" | Analyst | 30 Tickets + "Analyst" Badge |
| "1.000 Follower" | Analyst | 100 Tickets + "Influencer" Titel + Spezialrahmen |
| "100 Trades" | Trading | 75 Tickets + "Market Maker" Badge |
| "Smart Money" (5 profitable Trades in Folge) | Trading | 100 Tickets + Gold-Partikel |

### 5.6 Missions (Woechentlich) — NUR TICKETS + COSMETICS

3-5 Missionen pro Woche, automatisch zugewiesen via `assign_user_missions` RPC.

| Mission-Typ | Beispiel | Reward |
|-------------|----------|--------|
| Trading | "Kaufe 3 DPCs diese Woche" | 30 Tickets |
| Fantasy | "Nimm an 2 Events teil" | 25 Tickets |
| Community | "Schreibe 1 Post + 3 Kommentare" | 20 Tickets |
| Social | "Folge 5 neuen Usern" | 15 Tickets |
| Mixed | "Erreiche 500 Punkte in einem Event" | 50 Tickets + temporaeres Cosmetic |

Status-Flow: active, completed, claimed, expired. Tracking via `track_my_mission_progress(mission_key, increment)` RPC.

### 5.7 Daily Challenge + Mystery Box — NUR TICKETS + COSMETICS

**Daily Challenge:** 1 taegliche Aufgabe (rotierend).
- "Mache einen Trade" = 15 Tickets
- "Stimme bei einem Vote ab" = 10 Tickets
- "Schau dir 3 Spielerprofile an" = 10 Tickets
- Bonus bei 7 aufeinanderfolgenden Challenges: Mystery Box

**Mystery Box:** Zufaellige Belohnung aus Pool.
- 60% Chance: 5-20 Tickets
- 25% Chance: 20-50 Tickets
- 10% Chance: Cosmetic (Rahmen oder Titel)
- 5% Chance: Seltenes Cosmetic (Profil-Effekt)

**Kein Lootbox-Problem:** Mystery Box enthaelt NUR Tickets + Cosmetics (kein Cash-Wert). User muss kein Echtgeld ausgeben um eine Mystery Box zu oeffnen. Ergibt sich aus Engagement-Aktionen. Damit keine Gluecksspiel-Regulierung anwendbar.

### 5.8 DPC Score Multiplier — Verbindung Trading und Fantasy

**Konzept:** DPC-Besitz verstaerkt Fantasy-Performance. Wer DPCs eines Spielers haelt, bekommt einen Score-Bonus wenn dieser Spieler in seinem Lineup steht.

- 1 DPC = +2% Score-Bonus fuer diesen Spieler
- Max Bonus: +10% (bei 5+ DPCs desselben Spielers)
- DPC Mastery Level erhoeht den Bonus (Level 5 = +3% statt +2%)

**DPC Mastery (bereits implementiert):**
- Level 1-5 pro DPC-Holding
- XP-Quellen: Hold +1/Tag, Fantasy-Einsatz +10, Content ueber den Spieler +15
- Hoeheres Mastery-Level = hoeherer Score-Bonus + Cosmetic (Mastery-Rahmen)

**Warum das wichtig ist:** DPC-Kauf (bCredits-Senke) wird belohnt durch bessere Fantasy-Performance (Rang steigt, Tickets fliessen). Das verbindet den wirtschaftlichen Kreislauf (bCredits) mit dem Engagement-Kreislauf (Tickets).

### 5.9 Live-Gamification (Spieltag) — NEUES SYSTEM

**Waehrend eines laufenden Spiels (Supabase Realtime):**

| Feature | Kosten | Reward | Beschreibung |
|---------|--------|--------|-------------|
| **Live-Predictions** | 10 Tickets | Correct: +50 Tickets | "Naechstes Tor von wem?" waehrend des Spiels |
| **Captain-Switch** | 15 Tickets | Besserer Captain-Score | Captain nach Deadline aendern (1x/GW) |
| **Lineup-Boost** | 25 Tickets | +10% Score fuer 1 Spieler | Einen Spieler boosten |
| **Live-Emotes** | 5 Tickets | Social Interaction | Premium-Reaktionen im Match-Thread |
| **Live-Score-Updates** | Kostenlos | Engagement | Punkte ticken in Echtzeit hoch |

---

## 6. FAN-RANKING x CSF (Der Kern-Anreiz)

### 6.1 Berechnung im Detail

**Fan-Rang-Score** (pro Club, pro User):

```
Fan-Rang-Score =
    Club-Event-Teilnahmen x 3          (30% Gewicht)
  + DPC-Besitz des Clubs x 5           (25% Gewicht)
  + Club-Abo-Tier-Faktor               (20% Gewicht)
  + Community-Aktivitaet im Club x 2   (15% Gewicht)
  + Login-Streak x 0.5                 (10% Gewicht)
```

**Club-Abo-Tier-Faktor:**
| Tier | Faktor |
|------|--------|
| Kein Abo | 0 |
| Bronze | 100 |
| Silber | 300 |
| Gold | 600 |

**Community-Aktivitaet im Club** = Posts ueber Club-Spieler + Bounty-Submissions + Votes bei Club-Polls + Research ueber Club-Spieler.

**Stufen-Schwellen:**

| Stufe | Min Score | Name |
|-------|-----------|------|
| 1 | 0 | Zuschauer |
| 2 | 150 | Stammgast |
| 3 | 500 | Ultra |
| 4 | 1.200 | Legende |
| 5 | 3.000 | Ehrenmitglied |
| 6 | Top 10 absolut | Vereinsikone |

"Vereinsikone" ist keine Score-Schwelle — es sind die Top 10 Fans eines Clubs nach kumulativem Score. Saisonal rotierend: am Saisonende wird zurueckgesetzt, aber mit Hysterese (letzte Saison zaehlt 30% in die neue).

### 6.2 CSF-Multiplikator-Tabelle

| Fan-Rang | Multiplikator | Effekt bei 1.000 bCredits Basis-CSF |
|----------|---------------|--------------------------------------|
| Zuschauer | 1.0x | 1.000 bCredits |
| Stammgast | 1.1x | 1.100 bCredits |
| Ultra | 1.2x | 1.200 bCredits |
| Legende | 1.3x | 1.300 bCredits |
| Ehrenmitglied | 1.4x | 1.400 bCredits |
| Vereinsikone | 1.5x | 1.500 bCredits |

### 6.3 CSF-Auszahlungs-Formel

Bei einem realen Spielertransfer:

```
CSF_Pool = (verkaufte_DPCs / 10.000) x 10% x min(Transfererloes_EUR, Cap_EUR) x EUR_zu_bCredits_Kurs

CSF_pro_User = (User_DPC_Anteil / Total_DPCs_im_Umlauf) x CSF_Pool x Fan_Rang_Multiplikator
```

**Rechenbeispiel:**
- Spieler hat 5.000 DPCs im Umlauf (von 10.000 max)
- Transfererloes: 2.000.000 EUR, Cap: 1.500.000 EUR
- CSF_Pool = (5.000 / 10.000) x 10% x 1.500.000 = 75.000 EUR (umgerechnet in bCredits)
- User haelt 50 DPCs (= 1% der umlaufenden DPCs)
- User ist "Ultra" (1.2x Multiplikator)
- CSF_pro_User = (50 / 5.000) x 75.000 EUR x 1.2 = 900 EUR (in bCredits)

**Die CSF wird aus der Club Treasury in bCredits ausgezahlt.** Der Club muss sicherstellen, dass genuegend bCredits in der Treasury sind. Bei Bedarf kauft der Club nach (EUR an BeScout).

### 6.4 Club-Abo Integration

Das Club-Abo ist DREIFACH relevant:

1. **Fan-Rang-Score (20% Gewicht):** Gold-Abo = +600 Score = schnellerer Aufstieg
2. **Server-enforced Perks:** Bronze(2x Vote), Silber(+IPO Early Access), Gold(+Score Boost +20%)
3. **Wirtschaftlicher Kreislauf:** Abo-Einnahmen = 100% Club Treasury = Club kann mehr Events/Airdrops finanzieren

| Tier | Monatlich | Fan-Rang-Boost | Trading-Discount | Besondere Perks |
|------|-----------|----------------|------------------|-----------------|
| Bronze | 500 bCredits | +100 Score | 50 bps (0.5%) | 2x Vote-Gewicht |
| Silber | 1.500 bCredits | +300 Score | 100 bps (1%) | + IPO Early Access (3 Tage) + Exklusive Bounties |
| Gold | 3.000 bCredits | +600 Score | 150 bps (1.5%) | + Score Boost +20% + Premium Fantasy Events |

### 6.5 Warum Fan-Rang x CSF ALLES zusammenhaelt

Dies ist der zentrale Mechanismus der das gesamte System antreibt:

1. User will mehr CSF bei einem Transfer -> muss Fan-Rang erhoehen
2. Fan-Rang erhoehen erfordert: Club Events spielen + DPCs kaufen + Abo abschliessen + Community beitragen
3. Jede dieser Aktionen generiert direkte Einnahmen fuer den Club (IPO-Erloese, Trading-Fees, Abo-Zahlungen)
4. Club hat mehr Einnahmen in der Treasury -> kann groessere CSF-Pools, mehr Events und Airdrops finanzieren
5. Groessere Rewards -> mehr User engagieren sich -> Flywheel dreht sich schneller

**Das ist der Grund warum Engagement-Rewards NICHT in bCredits sind:** Wenn Missions/Streaks bCredits geben wuerden, muesste dieses Geld irgendwo herkommen. Es wuerde die Deflation brechen und den CSF-Pool verwassern. Tickets als separate Waehrung halten das Wirtschaftssystem sauber und geben trotzdem taegliche Motivation.

---

## 7. AVATAR & STATUS

### 7.1 Was kann man sammeln?

| Element | Typ | Seltenheits-Stufen | Quelle |
|---------|-----|-------------------|--------|
| **Rahmen** | Profilbild-Umrandung | Common, Rare, Epic, Legendary | Score Road, Achievements, Fan-Rang, Saison-Events |
| **Titel** | Text unter dem Username | Common bis Legendary | Achievements, Fan-Rang-Stufen, Saisonale Rewards |
| **Profil-Effekt** | Animierter Hintergrund/Glow/Partikel | Rare bis Legendary | Score Road (Milestone 7+), Mystery Box (5% Chance) |
| **Badges** | Kleine Icons neben dem Namen | Common bis Epic | "Early Adopter", "Season 1", "Founding Fan" |
| **Emotes** | Spezielle Reaktionen | Common (temporaer oder permanent) | Tickets (temporaer) oder Achievements (permanent) |

**Seltenheits-System:**
- **Common:** Leicht erreichbar (erste Milestones, einfache Achievements)
- **Rare:** Mittlere Herausforderung (Score Road 5-7, spezifische Achievements)
- **Epic:** Schwer (Score Road 8-10, seltene Achievements, Top Fan-Raenge)
- **Legendary:** Extrem selten (Score Road 11, Vereinsikone, Season-exclusive)

### 7.2 Wo ist es sichtbar?

Cosmetics sind UEBERALL in der App sichtbar — das macht sie zur Social Currency:

- **Leaderboard:** Rahmen + Titel + Rang-Badge neben jedem Eintrag
- **Community Posts:** Autor-Avatar mit Rahmen + Titel in jedem Post/Kommentar
- **Trading Orderbook:** Kaeufer/Verkaeufer mit Badges (Vertrauenssignal)
- **Club-Page:** Top-Fans mit vollem Avatar-Setup prominient angezeigt
- **Profil (eigen + oeffentlich):** Alle Elemente + Profil-Effekt + Achievement-Vitrine
- **Fantasy Events:** Teilnehmer-Liste mit Rahmen + Rang-Badge
- **Live-Match-Thread:** Emotes + Badges im Chat
- **Notifications:** Avatar mit Rahmen bei Social-Notifications (Follow, Like)

### 7.3 Warum ist es Social Currency?

1. **Allgegenwaertige Sichtbarkeit:** Jeder sieht deinen Avatar ueberall in der App
2. **Signaling:** "Legendaer-Rahmen" = dieser User ist seit Season 1 dabei, hat Score 7000+, ist engagiert
3. **Exklusivitaet:** Saisonale Cosmetics sind zeitlich begrenzt — nach der Saison nicht mehr erhaeltlich
4. **Progression:** Score Road + Achievements = sichtbarer Fortschritt, der sich im Avatar manifestiert
5. **Identitaet:** Einzigartiges Avatar-Setup = wiedererkennbare "Marke" des Users in der Community
6. **Wettbewerb:** "Ich will den gleichen Rahmen wie der #1 im Leaderboard" — motiviert Engagement

---

## 8. COMMUNITY-INTEGRATION

### 8.1 Content-Typen und ihre Verbindungen

| Typ | Beschreibung | bCredits-Relevanz | Score-Impact |
|-----|-------------|-------------------|-------------|
| **Post** (general) | Freitext, Meinungen, Diskussionen | Keine | Analyst +3 |
| **Player Take** | Bullish/Bearish/Neutral Bewertung | Track Record beeinflusst Reputation | Analyst +5 |
| **Transfer Rumor** | Geruechte mit Quellen-Angabe | Verifizierung wenn Transfer real | Analyst +3 |
| **Club News** | Vereins-Neuigkeiten | Keine | Analyst +3 |
| **Research** (Paywall) | Tiefgehende Analyse hinter Paywall | 80% bCredits an Autor bei Unlock | Analyst +8 |
| **Bounty Submission** | Antwort auf Scouting-Auftrag | 95% bCredits bei Approval | Analyst +10 |

### 8.2 Wie verbindet sich Community mit Fan-Rang und Analyst-Score?

```
Community-Aktivitaet
    |
    +-- Posts/Takes/Rumors ----> Analyst-Score (Elo) steigt
    |                           |
    +-- Research verkaufen ----> bCredits verdient + Analyst-Score steigt
    |                           |
    +-- Bounties erfuellen ----> bCredits verdient + Analyst-Score steigt + Fan-Rang steigt (Club-spezifisch)
    |                           |
    +-- Votes teilnehmen -----> Fan-Rang steigt (Club-spezifisch)
    |                           |
    +-- Track Record aufbauen -> Reputation -> mehr Follower -> mehr Research-Kaeufer -> mehr bCredits
```

**Analyst-Rang:** Die dritte Elo-Dimension. Steigt durch Community-Aktivitaet, Research-Qualitaet (Star-Ratings von Lesern), Track Record (Hit-Rate bei Bullish/Bearish Calls). Kann auch FALLEN: niedrige Ratings auf Research = Score sinkt. "Verified" Pill bei >=5 aufgeloeste Predictions mit >=60% Hit-Rate.

**Verbindung zum Fan-Rang:** Community-Aktivitaet ueber Club-Spieler zaehlt 15% zum Fan-Rang-Score. Wer regelmaessig Posts ueber seinen Verein schreibt und Bounties erfuellt, steigt im Fan-Rang auf und bekommt mehr CSF.

### 8.3 P2P-Angebote fuer DPCs

- User kann einem anderen User ein Direktangebot fuer seine DPCs machen
- Preis frei verhandelbar
- Escrow-Pattern: bCredits des Kaeufers werden gelockt bis der Verkaeufer akzeptiert oder ablehnt
- Pilot: 0% Fee (ADR-025) — foerdert P2P-Interaktion und Engagement
- Post-Pilot: 3-6% Fee nachruerstbar (RPC-Parameter `fee_bps` vorbereitet)
- Risiko: User koennten Orderbook umgehen (kein Fee). Akzeptiertes Risiko im Pilot.

---

## 9. LEGAL COMPLIANCE

### 9.1 Was darf man in der Pilotphase?

| Aktivitaet | Erlaubt? | Begruendung |
|-----------|----------|------------|
| DPC Trading mit bCredits | JA | Interner Kreislauf, kein Cash-Out |
| Free Fantasy Events (Ticket-Entry) | JA | Kein Echtgeld-Einsatz, Tickets haben keinen Cash-Wert |
| Votes/Polls (Ticket-basiert) | JA | Tickets haben keinen Cash-Wert |
| Club-Abos (bCredits) | JA | B2B/B2C-Service, interner Kreislauf |
| Research Paywall (bCredits) | JA | Content-Monetarisierung intern |
| Bounties (bCredits) | JA | Interner Kreislauf, Arbeitsleistung fuer Credits |
| bCredits als Airdrop verschenken | JA | Kein Cash-Out moeglich |
| Mystery Box (Tickets + Cosmetics) | JA | Kein Cash-Wert, keine Echtgeld-Ausgabe |

### 9.2 Was darf man NICHT?

| Aktivitaet | Verboten | Begruendung |
|-----------|----------|------------|
| Cash-Out (bCredits in EUR) | JA | Braucht CASP-Lizenz |
| P2P-Transfer von bCredits (Wallet zu Wallet) | JA | Geldtransfer-Regulierung |
| Paid Fantasy (Buy-In in bCredits) | JA | Braucht MGA Gaming-Lizenz |
| bCredits direkt gegen EUR an User verkaufen | JA | Braucht MiCA Whitepaper ueber 1M EUR |
| bCredits als "Investment" bewerben | JA | MiCA/CASP Verstoss |
| Preis-Prognosen fuer bCredits | JA | Impliziert Investment-Charakter |
| $SCOUT nennen/verwenden | JA | Erst nach CASP, heisst im Pilot "bCredits" |
| Wertversprechen machen | JA | "No guaranteed returns" ist Pflicht |

### 9.3 Wording-Regeln (KRITISCH — gilt fuer jede Zeile Code)

**NIEMALS verwenden (in UI, API-Responses, Kommentaren, Marketing):**
- Investment, Invest, Investition
- Rendite, Return, ROI, Profit (im Token/Credit-Kontext)
- Dividende, Gewinn, Ownership, Anteil
- "Garantierte Wertsteigerung", "x10 Return", "x50 Upside"
- "Kryptowaehrung", "Coin", "Token" (fuer bCredits)
- Preis-Phasen oder Preis-Prognosen
- $SCOUT (erst nach CASP-Lizenz)

**IMMER verwenden:**
- "Platform Credits" oder "bCredits" (fuer die Waehrung)
- "Digital Player Contract" (fuer DPC, NICHT "Spieleranteil")
- "Engagement Credits" (als Erklaerung)
- "at BeScout's discretion"
- "No guaranteed returns"
- "bCredits provide access to platform features"
- TradingDisclaimer Component auf JEDER Seite die mit bCredits oder DPCs zu tun hat

### 9.4 Mystery Box: Cosmetics-only = kein Lootbox-Problem

**Argumentation:**
1. Mystery Box enthaelt NUR Tickets + Cosmetics
2. Tickets haben KEINEN Cash-Wert und sind NICHT handelbar
3. Cosmetics haben KEINEN Cash-Wert und sind NICHT handelbar
4. User muss KEIN Echtgeld ausgeben um eine Mystery Box zu oeffnen (verdient durch Engagement)
5. Es gibt keine "Pay-to-Open" Mechanik

**Ergebnis:** Keine Lootbox-Regulierung anwendbar, da:
- Kein Gluecksspiel-Element mit monetaerem Wert
- Keine Echtgeld-Transaktion zum Oeffnen
- Kein Sekundaermarkt fuer Inhalte
- Rein kosmetische Belohnungen ohne wirtschaftlichen Nutzen

---

## 10. GELDFLUSS-DIAGRAMM

### 10.1 Pilot (Closed Economy)

```
                         EUR (Echtgeld)
                              |
                              v
                   +---------------------+
                   |  CLUB KAUFT PAKET   |
                   | (100K/500K/2M bCr)  |
                   +----------+----------+
                              |
                              v
                   +---------------------+        IPO-Erloese (85%)
                   |                     |<------ Trading-Fee-Anteil (1%)
                   |   CLUB TREASURY     |<------ Club-Abo-Einnahmen (100%)
                   |   (bCredits-Pool)   |<------ Nachkauf (EUR -> bCr)
                   |                     |
                   +--+------+------+----+
                      |      |      |
            +---------+   +--+--+   +----------+
            v             v     v              v
     +-----------+  +---------+ +----------+ +-------+
     |  Events   |  |Airdrops | |   CSF    | |Bounty |
     | (Rewards) |  |(Saison) | |(Transfer)| |Rewards|
     +-----------+  +---------+ +----------+ +-------+
            |             |           |           |
            +------+------+-----------+-----------+
                   |
                   v
            +----------------+        Welcome Bonus (500, einmalig)
            |                |<------ Trading-Gewinne (Spread)
            |  USER WALLET   |<------ Research Revenue (80%)
            |  (bCredits)    |<------ Bounty Revenue (95%)
            |                |<------ Poll Revenue (70%)
            |                |<------ PBT Auszahlung (Liquidierung)
            +---+----+---+--+
                |    |   |
                v    v   v
        +-------+ +---+ +--------+
        |DPC-   | |Abo| |Research|
        |Kauf   | |   | |Unlock  |
        +---+---+ +-+-+ +---+----+
            |        |      |
            v        v      v
     +----------------------------------+
     |         FEES (BURN)              |
     | Trading 3.5% + IPO 10% +        |
     | Research 20% + Bounty 5% +      |
     | Poll 30%                         |
     | = Platform Revenue (deflationaer)|
     +----------------------------------+
```

**Zusammenfassung Pilot-Geldfluss:**

1. **Einziger EUR-Einstieg:** Club kauft Paket (EUR an BeScout, dafuer bCredits in Club Treasury)
2. **Interner Kreislauf:** Club -> User (Rewards/CSF/Airdrops) -> User -> Club (DPC-Kauf/Abo) -> Club -> User... Der Kreislauf ist geschlossen.
3. **Deflation:** Platform-Fees = Burn. Jeder Trade entzieht dem System 3.5% bCredits permanent. Je mehr gehandelt wird, desto weniger bCredits im Umlauf, desto wertvoller die verbleibenden.
4. **Kein Ausgang:** Keine Moeglichkeit, bCredits in EUR umzuwandeln. Kein Withdrawal, kein Cash-Out, kein P2P-Transfer.
5. **Welcome Bonus ist die einzige "Inflation":** 500 bCredits pro neuem User. Bei 1.000 Usern = 500.000 bCredits. Das ist weniger als ein einzelnes Sampiyon-Paket und wird durch Trading-Fees schnell absorbiert.

### 10.2 Post-Legal-Go ($SCOUT Phase)

```
              EUR / Fiat
              +---+---+
              |       |
              v       v
     +--------+  +--------+
     | CLUB   |  | USER   |
     | kauft  |  | kauft  |
     | $SCOUT |  | $SCOUT |
     | (Markt-|  | (Exch/ |
     | preis) |  | In-App)|
     +---+----+  +---+----+
         |            |
         v            v
     +---------------------------+
     |  GLEICHER KREISLAUF       |
     |  wie Pilot, aber $SCOUT   |
     |  statt bCredits (1:1)     |
     +-------------+-------------+
                   |
                   v
     +---------------------------+
     |    CASH-OUT MOEGLICH      |
     | User kann $SCOUT -> EUR   |
     | ueber Exchange auszahlen  |
     | (KYC Pflicht)             |
     +---------------------------+
```

**Was sich aendert:**
- bCredits -> $SCOUT (Polygon Token, 1:1 Migration aller Balances, Wallets, Treasuries)
- $SCOUT hat einen Marktpreis (Supply/Demand auf Exchange)
- Neue Clubs kaufen $SCOUT zum Marktpreis (teurer als Pilot-Kurs = Early Adopter Nachteil fuer Spaeteinsteiger)
- User koennen $SCOUT mit Fiat kaufen (Fiat-Onramp via Exchange oder In-App)
- Cash-Out wird moeglich ($SCOUT -> EUR, KYC erforderlich)
- Pilot-Clubs im Vorteil: ihre bCredits wurden zum guenstigen Pilot-Kurs gekauft, migrieren 1:1 zu $SCOUT

**Was gleich bleibt:**
- Alle Fee-Splits (Trading 6%, IPO 85/10/5, Research 80/20)
- Ticket-System (weiterhin KEIN Cash-Wert, auch nicht in $SCOUT konvertierbar)
- Gamification (weiterhin Tickets + Cosmetics als Engagement-Rewards)
- DPC-System (max 10.000, max 4 Tranchen, CSF-Formel)
- Fan-Rang x CSF-Mechanik
- Avatar/Cosmetics System

---

## APPENDIX A: Geofencing-Tiers (Phase 3+)

| Tier | Laender | Zugang |
|------|---------|--------|
| TIER_FULL | Rest EU | Alles (Trading, Paid Fantasy, Cash-Out) |
| TIER_CASP | EU ohne Gaming | Trading ja, Paid Fantasy nein |
| TIER_FREE | DE/FR/AT/UK | Free only, kein Paid Fantasy |
| TIER_RESTRICTED | TR | Content + Free Fantasy only |
| TIER_BLOCKED | USA/China/OFAC | Kein Zugang |

Bereits implementiert: Geofencing-Infrastruktur in der DB (Migration #201), Feature-Flag OFF.

## APPENDIX B: Vergleich Alt vs. Neu

| Aspekt | Altes System (Context Pack v8) | Neues System (v2) |
|--------|-------------------------------|-------------------|
| Waehrung | BSD / $SCOUT (unklar) | bCredits (Pilot) -> $SCOUT (nach Legal Go) |
| Engagement-Rewards | BSD verschenken (Streaks, Missions, Score Road) | Tickets + Cosmetics (KEINE bCredits) |
| Streak-Milestones | 3d=5, 7d=15, 14d=50, 30d=150 $SCOUT | 3d=10, 7d=20, 14d=40, 30d=75 Tickets |
| Score Road | BSD cents als Wallet-Reward | NUR Tickets + Cosmetics |
| Event Entry | Free oder BSD | Ticket-basiert (5-50 Tickets) |
| Mystery Box | Nicht definiert | Tickets + Cosmetics only |
| Fan-Rang | Nicht definiert | 6 Stufen mit CSF-Multiplikator (1.0x - 1.5x) |
| Club-Perspektive | Passiv (Context Pack) / Aktiv (Vision) | Amazon-Modell mit klarer Treasury-Mechanik |
| Geldfluss | Unklar, Inflation durch Rewards | Klar deflationaer: Fees = Burn, kein bCredits-Minting |
| Wording | $SCOUT / BSD | bCredits (Pilot) / $SCOUT (Post-CASP) |

## APPENDIX C: Migration — Was muss im Code geaendert werden

| Bereich | Aktueller Stand | Aenderung | Prioritaet |
|---------|----------------|-----------|------------|
| Streak Rewards | BSD cents in Wallet (3d=5, 7d=15...) | Tickets statt bCredits | HOCH |
| Score Road | BSD cents als Reward | Tickets + Cosmetics | HOCH |
| Mission Rewards | BSD cents | Tickets + Cosmetics | HOCH |
| UI Wording | $SCOUT ueberall | bCredits (Pilot) | HOCH |
| Event Entry | Free / BSD entry_fee | Ticket-basiert | MITTEL |
| Ticket-System | Nicht implementiert | Neues System bauen | HOCH |
| Fan-Rang | Nicht implementiert | Neues System bauen | HOCH |
| Cosmetics/Avatar | Nicht implementiert | Neues System bauen | MITTEL |
| Mystery Box | Nicht implementiert | Neues System bauen | NIEDRIG |
| Live-Gamification | Teilweise (Predictions) | Erweitern (Boosts, Captain Switch, Emotes) | NIEDRIG |
| Daily Challenge | Nicht implementiert | Neues System bauen | MITTEL |

## APPENDIX D: Offene Punkte (vor Implementierung klaeren)

1. **Welcome Bonus Hoehe:** 500 bCredits als Default — finale Bestaetigung
2. **Ticket-Mengen:** Exakte Zahlen fuer jede Quelle/Senke — Balancing nach Pilot-Daten
3. **Fan-Rang-Schwellen:** Exakte Score-Werte pro Stufe — Balancing nach Pilot-Daten
4. **CSF-Pool-Berechnung:** (verkaufte_DPCs / 10.000) x 10% x min(Transfer, Cap) — EUR-zu-bCredits Kurs?
5. **Nachkauf-Kurs:** Welcher EUR/bCredits-Kurs beim Club-Nachkauf?
6. **Mystery Box Drop-Raten:** Exakte Prozente — Balancing nach Pilot-Daten
7. **Ticket-Inflation:** Wie verhindern wir dass Tickets wertlos werden? (Ticket-Sinks ausreichend?)
8. **DPC Score Multiplier:** Exakte %-Werte und Mastery-Level-Boni — Balancing
9. **Live-Prediction Scoring:** Exakte Punktzahlen fuer korrekte/falsche Predictions
10. **Score Road Rewards:** Finale Ticket-Mengen und Cosmetic-Zuweisung pro Milestone
11. **Cosmetics-Inventar:** Vollstaendige Liste aller Rahmen, Titel, Effekte, Badges
12. **Ticket-Persistenz:** DB-Tabelle fuer Ticket-Balance oder Wallet-Erweiterung?
13. **Fan-Rang Reset:** Komplett-Reset oder Teilreset (30% Carry-Over) am Saisonende?

---

*Dieses Dokument ist die Single Source of Truth fuer das BeScout-Systemdesign ab Version 2.0. Alle Implementierungen, UI-Texte, Backend-Logik und Business-Entscheidungen muessen mit diesem Dokument konsistent sein. Bei Widerspruechen zu aelteren Dokumenten (Context Pack v8, VISION.md) gilt dieses Dokument.*
