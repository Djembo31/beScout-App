# beScout Product Map

> WAS ist beScout? Fuer wen? Was kann man tun? Wie verdient es Geld?

## In einem Satz

B2B2C Fan-Engagement-Plattform die Fussballfans mit Wissen verdienen laesst und Clubs eine neue Revenue-Quelle gibt.

## Zielgruppe

### Fans (B2C)
- Fussball-besessene Fans die taeglich ueber Spieler/Taktik diskutieren
- Fantasy-Gamer, Content-Ersteller, Prediction-Enthusiasten
- Hook: "Verdiene mit deinem Fussball-Wissen" — nicht Club-Loyalitaet

### Clubs (B2B)
- Professionelle Fussballvereine die Fan-Engagement monetarisieren wollen
- All-in-One: CRM + Revenue Tool + Fan-Economy
- Club-Workload: ~0 Mitarbeiter (beScout uebernimmt alles im Pilot)

## Die 3 Produkt-Saeulen

### 1. Scout Cards (Trading)
- Digitale Spielerkarten (je 500 Stueck pro Spieler)
- **IPO:** Club listet neue Karten zum Festpreis (85% Club, 10% Platform, 5% PBT)
- **Sekundaermarkt:** Fans handeln untereinander (6% Fee: 3.5% Platform + 1.5% PBT + 1% Club)
- **P2P Offers:** Direkte Angebote (3% Fee: 2% Platform + 0.5% PBT + 0.5% Club)
- Karten entsperren Fantasy-Lineups (min_sc_per_slot Anforderung)
- Liquidation wenn Spielervertrag endet

### 2. Fantasy Events
- Wettbewerbe mit 7 oder 11 Spieler-Lineups
- Entry Fee in Tickets oder $SCOUT Credits
- Chips: Triple Captain (3x), Synergy Surge (2x Synergie), Second Chance
- Equipment: Stat-Booster aus Mystery Boxes (R1-R4, 1.05-1.25x Multiplikator)
- Scoring basiert auf echten Spieltags-Daten (API-Football)
- Leaderboard + Prize Distribution (DENSE_RANK)
- Liga-System: Saison August-Mai, monatliche Gewinner

### 3. Community & Content
- **Posts:** General, Player Take, Transfer Rumor, Club News
- **Research:** Paywall-Analysen (80% Autor / 20% Platform)
- **Bounties:** Clubs zahlen Fans fuer Scouting-Reports (95% Creator / 5% Platform)
- **Votes/Polls:** Fan-Abstimmungen (70% Creator / 30% Platform)
- **Following Feed:** Social Feed von gefolgten Usern

## Gamification Layer

| Feature | Beschreibung |
|---------|-------------|
| Scout Rank | 3D Elo-System (Trader + Manager + Analyst), 12 Stufen Bronze I bis Legendaer |
| Missionen | Taegliche/woechentliche Aufgaben, $SCOUT Belohnungen |
| Achievements | 33 Kategorien (15 sichtbar + 18 hidden), Badge-System |
| Streaks | Login-Streaks mit Meilensteinen (3d=5, 7d=15, 14d=50, 30d=150 $SCOUT) |
| Mystery Box | Cosmetics + Equipment Drops (kalibrierte Drop-Raten) |
| Equipment | 5 Typen x 4 Raenge, Scoring-Multiplikatoren |
| Score Road | 11 Meilensteine mit Belohnungen (BSD + Cosmetics) |

## Revenue-Modell (7 Streams)

### Live & Aktiv
1. **Scout Card Trading** — 6% Fee pro Trade
2. **IPO Revenue** — 85% an Club bei Erstverkauf
3. **Fantasy Entry Fees** — Clubs erstellen Events, Fans zahlen Entry

### Designed, noch nicht gebaut
4. **Sponsor Flat Fee** — EUR 500-5.000/Event fuer Logo-Platzierung (B2B, pure Margin)
5. **Event Boost** — Club zahlt extra fuer Homepage-Featured + Push-Notifications
6. **Chip Economy** — Triple Captain, Bench Boost kaufbar fuer Tickets/$SCOUT
7. **B2B Overage** — Events ueber Paket-Limit hinaus (Baslangic=4/Monat, Profesyonel=12, Sampiyon=unbegrenzt)

### Langfristig
- Event Analytics / Data Licensing
- Post-Game Insights Paywall
- Club-Bounties im grossen Stil

## Club-Pakete (B2B Subscriptions)

| Paket | Setup | Monatlich | Kader | Credits | Werbeflaechen |
|-------|-------|-----------|-------|---------|---------------|
| Baslangic | EUR 2.500 | EUR 750 | 30 | 100K | 2 |
| Profesyonel | EUR 5.000 | EUR 1.500 | 50 | 500K | 5 |
| Sampiyon | EUR 10.000 | EUR 3.000 | Unbegrenzt | 2M | 10+ |

## Founding Pass (Pilot-Revenue, B2C)

| Tier | Preis | Credits | Fee-Discount | Max Supply |
|------|-------|---------|-------------|------------|
| Fan | EUR 9.99 | 1.000 | -25 bps | 5.000 |
| Scout | EUR 29.99 | 5.000 | -50 bps | 3.000 |
| Pro | EUR 74.99 | 20.000 | -75 bps | 1.500 |
| Founder | EUR 199.99 | 50.000 | -100 bps | 500 |

Max 10.000 Passes. Kill-Switch bei EUR 900K. Nummeriert (#1-#100 = Genesis).

## Community Success Fee (Einzigartiges Feature)

Wenn ein realer Transfer stattfindet, zahlt der Club an SC-Halter:

| Marktwert | Reward pro SC |
|-----------|---------------|
| < 100K EUR | 50 $SCOUT |
| 1M-2M EUR | 1.500 $SCOUT |
| 5M-10M EUR | 7.500 $SCOUT |
| > 50M EUR | 75.000 $SCOUT |

Club setzt einmal einen `success_fee_cap` — irreversibel. Grosszuegiger Cap = attraktiver fuer Fans.

## Waehrung

- **Phase 1 (jetzt):** Credits (PostgreSQL, kein Blockchain, kein Crypto)
- 1 Credit = intern EUR 0.10 (fest waehrend Pilot)
- Closed-Loop: Kein Cash-Out, kein P2P Transfer, kein Exchange
- Welcome Bonus: 1.000 Credits pro User
- Geld in DB: BIGINT cents (1.000.000 = 10.000 $SCOUT)

## Status (2026-04-12)

- **Live:** Trading, Fantasy, Community, Gamification, Equipment, Liga, Manager Team Center
- **Pilot:** Sakaryaspor (TFF 1. Lig), 25 Spieler, ~50 Beta-Tester
- **Polish Sweep:** Home fertig, Market in Arbeit, 27 weitere Pages queued
- **Naechster Meilenstein:** Polish Sweep abschliessen → Beta-Tester-Gruppe → Pilot-Launch
