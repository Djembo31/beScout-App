# BeScout — Pilot-to-Token Master Strategy

> Holy Grail Document. Jede Zahl geprüft, jede Abhängigkeit validiert, jede Annahme markiert.
> Erstellt: 2026-03-16 | Letzte Revision: 2026-03-16 | Status: APPROVED

---

## 1. Phasen-Architektur

```
PHASE 0 — PRE-PILOT (jetzt → Saisonstart Aug 2026)
  Produkt: SaaS CRM-Tool + Fan-Engagement Plattform
  Währung: "Credits" (PostgreSQL, kein DLT, kein Token-Anschein)
  Rechtlich: Kein Whitepaper, kein CASP, Credits ≠ Crypto-Asset (kein DLT)
  Revenue: Founding Passes (B2C, EUR) + Club-Pakete (B2B, EUR)
  Cash-Out: NEIN | Nachkauf: NEIN | Blockchain: NEIN

PHASE 1 — PILOT LIVE (Saisonstart → ca. Monat 14)
  Volles Feature-Set: Trading, Fantasy, Community
  Scout Rang trackt Aktivität (implizite Airdrop-Basis, nie kommuniziert)
  Founder Pool aktiv (speist sich aus IPO-Sales in Credits)
  Malta Ltd. gründen, CASP vorbereiten

PHASE 2 — PRE-ICO + CASP (Monat 14-20)
  CASP-Lizenz beantragen (Malta)
  Pre-ICO (Seed/Private Round, €0,01/Token)
  $SCOUT Token entwickeln (ERC-20, Polygon)
  Smart Contract Audit

PHASE 3 — TOKEN LAUNCH + MAIN ICO (Monat 20-24)
  CASP genehmigt → Whitepaper veröffentlichen
  Migration: Credits → $SCOUT (+ nicht-kommunizierter Bonus)
  Main ICO (Public Sale, €0,03/Token)
  DEX-Listing (Uniswap auf Polygon)
  Multi-Liga Expansion starten
```

---

## 2. Founding Pass (User, B2C)

### Tier-Struktur

| Tier | Preis | Credits | Fee-Rabatt | Limit | Impliziter Token-Preis* |
|------|-------|---------|------------|-------|------------------------|
| **Fan** | €9,99 | 1.000 | -25 bps | 5.000 | €0,0087 |
| **Scout** | €29,99 | 5.000 | -50 bps | 3.000 | €0,0048 |
| **Pro** | €74,99 | 20.000 | -75 bps | 1.500 | €0,0028 |
| **Founder** | €199,99 | 50.000 | -100 bps | 500 | €0,0031 |

*Impliziter Preis = EUR / (Credits × Migration-Bonus). NUR internes Planungsdokument. NIE kommuniziert.

**Total: 10.000 Passes max | Kill-Switch: €900K Gesamtumsatz**

### Migration-Bonus (INTERN — wird erst bei Token-Launch bekanntgegeben)

| Tier | Bonus | 1.000 Credits → Token |
|------|-------|-----------------------|
| Fan | +15% | 1.150 |
| Scout | +25% | 6.250 |
| Pro | +35% | 27.000 |
| Founder | +50% | 75.000 |

### Öffentliche Kommunikation

**Was draufsteht:**
- Sofortiger Plattform-Zugang
- Startguthaben in Credits
- Permanent niedrigere Trading-Fees
- Founding Member Badge (permanent, sichtbar im Profil)
- Exklusiver Zugang zu Founding-Events
- "Nach der Pilotphase nicht mehr verfügbar"

**Was NICHT draufsteht:**
- Token, $SCOUT, Airdrop, Migration, Konvertierung, Rendite, Investment

### Warteliste / Knappheit

- Registrierung = kostenlos → Warteliste
- Founding Pass = sofortiger Zugang
- Club-Mitglied = Priorität auf Warteliste
- Sichtbarer Counter: "X.XXX / 10.000 vergeben"
- Pass-Nummern (#1-#100 = Genesis, #101-#1000 = Early, etc.)

---

## 3. Club-Pakete (B2B)

### Paket-Struktur

| Paket | Setup | Monatlich | Spieler | Credits-Pool | Werbe-Flächen |
|-------|-------|-----------|---------|-------------|---------------|
| **Başlangıç** | €2.500 | €750 | 30 | 100.000 | 2 |
| **Profesyonel** | €5.000 | €1.500 | 50 | 500.000 | 5 |
| **Şampiyon** | €10.000 | €3.000 | Unbegrenzt | 2.000.000 | 10+ |

### Founder Club Premium (einmalig, optional, nur Pilot-Phase)

| Tier | Preis | Founder Pool Shares | Migration-Bonus* |
|------|-------|--------------------|--------------------|
| **Founder Bronze** | €5.000 | 1 Share | +25% |
| **Founder Silber** | €10.000 | 3 Shares | +50% |
| **Founder Gold** | €20.000 | 6 Shares | +75% |

*Migration-Bonus: INTERN. Wird erst bei Token-Launch bekanntgegeben.

### Was BeScout für den Club macht (Pilot: Full-Service)

- Spieler-Kader anlegen und pflegen
- Scout Card IPOs erstellen und steuern
- Fantasy-Events planen und durchführen
- Community moderieren
- Content erstellen (mit Club-Input)
- Reporting und Analytics
- **Club braucht: 0 eigene Mitarbeiter**

### Club P&L (Profesyonel + Founder Silber, 12 Monate)

```
KOSTEN:
  Setup:           €5.000
  Monatlich:      €18.000
  Founder Premium: €10.000
  TOTAL:          €33.000

VERDIENT (Credits, realistisch):
  Paket-Pool:              500.000
  IPO Revenue (80%):       750.000  (Annahme: 71% Sell-Through, Ø 200 Cr/SC)
  Trading Fees (1%):        32.000
  Founder Pool (3/~17 Sh): 116.000
  TOTAL:                 1.398.000 Credits

AUSGABEN (Engagement):
  40% reinvestiert:       -559.000 Credits

SPART (migrierbar):        839.000 Credits
  × Migration-Bonus 1,5: 1.258.500 Token

WERT DER TOKEN:
  Bei Pre-ICO  (€0,01):    €12.585 → 0,4×  CRM-Wert kompensiert
  Bei Main ICO (€0,03):    €37.755 → 1,1×  Break-Even inkl. CRM
  Bei Post-Launch (€0,10): €125.850 → 3,8×
  Bei Wachstum (€0,20):   €251.700 → 7,6×

EHRLICHES BILD:
  Club-Kosten:                         €33.000
  CRM-Gegenwert (12 Mo Full-Service): -€12.000
  Netto Token-Exposure:                €21.000
  Break-Even Token-Preis:              €0,017 (zwischen Pre-ICO und Main ICO)
```

---

## 4. Credit-Wirtschaft

### Parameter

| Parameter | Wert |
|-----------|------|
| Scout Cards pro Spieler | 500 (Änderung von aktuell 300) |
| Welcome Bonus | 1.000 Credits |
| Trading Fee | 6% total |
| IPO Fee-Split (Pilot) | 85% Club / 10% Platform / 5% PBT |
| IPO Fee-Split (Post-Token) | 84% Club / 10% Platform / 5% PBT / 1% Founder Pool |
| Trading Fee-Split | 3,5% Platform / 1,5% PBT / 1% Club |
| Währung (Pilot) | "Credits" |
| Währung (Post-Token) | "$SCOUT" |
| Interner Code-Name | `bsd` (unverändert) |

### Credit-Kreislauf

```
MINTING (Credits entstehen):
├─ Founding Passes → User-Wallets
├─ Welcome Bonus → User-Wallets
├─ Club-Pakete → Club-Pools
├─ Engagement Rewards → User-Wallets (monatliches Budget)
└─ Founder Pool → Club-Wallets

CIRCULATION (Credits bewegen sich):
├─ User kauft SC (IPO) → Club-Wallet (85%) + Fees
├─ User kauft SC (Markt) → Seller-Wallet minus Fees
├─ Club → User (Bounties, Events, Rewards)
├─ User → Club (Subscriptions)
└─ Credits wechseln Wallets, werden NICHT vernichtet

BURNING (Credits werden vernichtet):
└─ 6% Trading Fee → permanent verbrannt (deflationär)

MIGRATION (Credits werden Token):
├─ Alle unverbrauchten Credits in User/Club/Platform-Wallets
├─ Zeitpunkt: Token-Launch (Monat 20-22)
├─ Rate: 1:1 (+ intern geplanter Bonus, nie vorher kommuniziert)
└─ Operational Club-Pool Credits: werden auch migriert wenn unverbraucht
```

### Credit Supply bei Token-Snapshot (Monat 20)

| Quelle | Credits | Anmerkung |
|--------|---------|-----------|
| Founding Passes (6.400 User) | 45.000.000 | Mix aller Tiers über 20 Monate |
| Welcome Bonus (6.400 User) | 6.400.000 | 1.000 pro User |
| Club-Pools (20 Clubs) | 8.000.000 | Avg 400K pro Club |
| Engagement Rewards | 30.000.000 | ~1,5M/Monat × 20 Monate |
| Credits von Clubs an User | 15.000.000 | Bounties, Events, Rewards |
| **Total Minted** | **~104.400.000** | |
| Trading Fee Burn | -3.000.000 | 6% auf geschätztes 50M Volumen |
| **Netto im System** | **~101.000.000** | |

Verteilung bei Snapshot:

| Wallet | Credits | Migriert? |
|--------|---------|-----------|
| User-Wallets | ~72.000.000 | JA |
| Club-Wallets (unspent) | ~14.000.000 | JA |
| BeScout Treasury | ~5.000.000 | JA |
| PBT Treasuries | ~3.000.000 | JA |
| Verbrannt | ~7.000.000 | — |
| **Migrierbar** | **~94.000.000** | |

Mit Migration-Bonus (avg 25%): ~117.500.000 Token = 11,75% von 1 Mrd Supply

---

## 5. Token-Allokation ($SCOUT)

### Total Supply: 1.000.000.000 (fix, kein Minting nach Genesis)

| # | Bucket | % | Token | Raise/Wert | Unlock |
|---|--------|---|-------|-----------|--------|
| 1 | **Migration** | 13% | 130M | — | Sofort bei Launch |
| 2 | **Pre-ICO** | 8% | 80M | €800K (€0,01) | 12M Cliff, 24M Vest |
| 3 | **Main ICO** | 15% | 150M | €4,5M (€0,03) | 25% sofort, 75%/9Mo |
| 4 | **Team & Gründer** | 12% | 120M | — | 12M Cliff, 48M Vest |
| 5 | **Referral & Growth** | 12% | 120M | — | Quarterly Budget |
| 6 | **Liquidity** | 5% | 50M | — | Bei DEX/CEX Listing |
| 7 | **Engagement Rewards** | 18% | 180M | — | Linear 72 Mo |
| 8 | **Legal & Compliance** | 5% | 50M | ~€1,5M | Nach Bedarf, Governance |
| 9 | **Reserve** | 12% | 120M | — | 12M Lock, dann Governance |
| | **TOTAL** | **100%** | **1.000M** | | |

### Bucket-Details

**Migration (13% = 130M):** Alle Pilot-Credits konvertiert zu Token. User (Founding Pass + Earned),
Club (unspent IPO Revenue + Pool), BeScout Treasury, PBT Treasuries. Plus intern geplanter
Migration-Bonus (nie vorher kommuniziert).

**Pre-ICO (8% = 80M):** Seed/Private Runde. 5-10 Investoren, Min €100K Ticket.
€10M FDV = 33× ARR. Defensible für Crypto mit funktionierendem Produkt + CASP.

**Main ICO (15% = 150M):** Public Sale via Launchpad oder Community. €30M FDV.
Braucht bewiesene Multi-Liga Expansion. Raise finanziert EU-Expansion + Team + CEX.

**Team (12% = 120M):** Anil 8% (80M), Core Team 4% (40M). Standard 12/48 Vesting.
Zeigt Investoren langfristiges Commitment.

**Referral & Growth (12% = 120M):** User-wirbt-User, Club-wirbt-Club, Liga-Expansion.
Quarterly Budget, gesteuert vom Growth-Team. Effektivster Wachstumskanal.

**Liquidity (5% = 50M):** DEX-First (Uniswap Polygon, ~$0 Kosten). CEX nach Traction.
30M DEX + 15M CEX + 5M Reserve.

**Engagement Rewards (18% = 180M):** 72-Monats-Runway. 2,5M Token/Monat verteilt auf:
Fantasy Preisgelder (40%), Trading Competitions (20%), Content Rewards (20%),
Achievements/Missions (15%), Staking optional (5%).

**Legal & Compliance (5% = 50M):** Token werden bei Bedarf verkauft für:
CASP laufend, Anwälte, Audits, neue Jurisdiktionen, Compliance Officer.
~€180K/Jahr = 14 Jahre Runway bei Ø €0,05.

**Reserve (12% = 120M):** Strategische Partnerschaften (Liga-Deals), Emergency,
Future Development, DAO Governance. 12 Monate komplett locked,
danach nur mit öffentlichem Proposal.

### Founder Pool — operativ, KEIN Token-Bucket

Der Founder Pool hat KEINE eigene Token-Allokation. Er finanziert sich selbst:
- Pilot: 0% IPO Fee (kein Founder Pool aktiv)
- Post-Token: 1% aus jeder IPO fließt an Founder Clubs
- Je mehr Clubs, desto größer der Pool — organisches Wachstum
- Founder Clubs werden NICHT aus Token-Supply subventioniert

### Buyback & Burn (operativ, kein Bucket)

- 20% der BeScout Platform-Fee-Revenue → $SCOUT Buyback + Burn
- Wird aus laufendem Revenue finanziert, nicht aus Token-Allokation
- Chiliz-Modell: 10% Revenue Buyback. BeScout: 20% der Platform-Fee

### Circulating Supply über Zeit

```
Launch (M22):     218M  (21,8%) — Migration + Liquidity + Main ICO Initial
+6 Monate (M28):  340M  (34%)  — ICO Vesting + Rewards + Referral
+12 Monate (M34): 460M  (46%)  — Pre-ICO Cliff ended + Team starts
+24 Monate (M46): 680M  (68%)  — Team vesting ongoing
+48 Monate (M70): 950M  (95%)  — Near fully diluted
```

---

## 6. Founder Pool — Mechanik

### Quelle

- **Pilot:** KEIN Founder Pool Fee (IPO Split bleibt 85/10/5)
- **Post-Token:** 1% aus jeder Scout Card IPO aller Clubs → Founder Pool

### Ausschüttung

- Monatlich, anteilig nach Shares
- Post-Token: in $SCOUT (aus laufenden 1% IPO-Fees)
- Kein eigener Token-Bucket — Pool wächst organisch mit der Plattform

### Beispiel (8 Founder Clubs, 26 Total Shares, Post-Token)

```
Angenommen: Monatliches IPO-Volumen plattformweit = 5.000.000 $SCOUT
1% Founder Pool Fee = 50.000 $SCOUT/Monat

Club mit 3 Shares: 3/26 × 50.000 = 5.769 $SCOUT/Monat
  Bei €0,03: €173/Monat
  Bei €0,10: €577/Monat

Bei 100 Clubs und 50M IPO-Volumen/Monat:
  1% = 500.000 $SCOUT/Monat
  Club mit 3 Shares: 3/26 × 500.000 = 57.692 $SCOUT/Monat
  Bei €0,10: €5.769/Monat
```

### Strategischer Effekt

- Founder Pool Fee ist nur 1% → andere Clubs fühlen sich NICHT benachteiligt
- Pool wächst organisch: mehr Clubs → mehr IPOs → größerer Pool
- Founder Clubs profitieren von JEDEM neuen Club
- Kein Token-Supply-Druck: finanziert aus laufendem Betrieb, nicht aus Allokation
- "Founder Club" wird wertvoller je größer das Netzwerk — OHNE Token zu verwässern

---

## 7. Scout Rang als Engagement-Engine

### Sichtbar (für User)

```
3 Dimensionen: Trader / Manager / Analyst (Elo, Start 500)
12 Ränge: Bronze I → Legendär
Median = Gesamtrang

Perks pro Rang:
  Bronze:   Basis-Zugang
  Silber:   -50 bps Fees, IPO Early Access
  Gold:     -100 bps, Exklusive Turniere
  Platin:   -150 bps, SC Mastery Boost
  Diamant:  -200 bps, Beta-Features Early
  Legendär: -250 bps, VIP Alles
```

### Fee-Stacking

```
Founding Pass Rabatt:  -25 bis -100 bps
+ Club-Abo Rabatt:     -50 bis -150 bps
+ Rang Rabatt:         0 bis -250 bps
─────────────────────────────────────────
Max Rabatt:            -500 bps (5%)
Base Fee:              600 bps (6%)
Min Fee:               100 bps (1%) ← Founder Pass + Gold Abo + Legendär Rang
```

### Unsichtbar (für Airdrop)

- Scout Rang = Activity-Indikator
- 13 DB-Triggers tracken ALLES
- Bei Token-Launch: Snapshot der Ränge
- Airdrop-Verteilung "basierend auf Beitrag zur Plattform"
- NIE explizit verknüpft, NIE versprochen

### Scout Points Season 1 (Blur-Modell)

```
"Scout Points — Season 1"
Punkte durch: Trading, Fantasy, Content, Referrals, Streaks
Sichtbar: Rangliste + Badges
Zweck (öffentlich): "Rewards und Perks"
Zweck (intern): Airdrop-Gewichtung bei Token-Launch
```

---

## 8. Legal-Konformität

### Warum Credits KEIN Crypto-Asset sind (MiCA)

MiCA definiert Crypto-Asset als: "digitale Darstellung eines Werts oder Rechts, die unter Verwendung von **Distributed-Ledger-Technologie** oder ähnlicher Technologie übertragen und gespeichert werden kann."

BeScout Credits:
- Gespeichert in: PostgreSQL (Supabase)
- Kein DLT, keine Blockchain, kein Wallet
- Nicht übertragbar außerhalb der Plattform
- Kein externer Wert, kein Cash-Out
- → **KEIN Crypto-Asset unter MiCA**

### Geltende Regulierung während Pilot

| Regulierung | Gilt? | Maßnahme |
|-------------|-------|----------|
| MiCA (Crypto) | NEIN (kein DLT) | — |
| CASP-Lizenz | NEIN (kein Crypto-Service) | Erst bei Token-Launch |
| DSGVO | JA | Privacy Policy + Cookie Consent |
| KVKK (Türkei) | JA (türkische User) | In Privacy Policy integriert |
| Verbraucherschutz EU | JA (digitaler Service) | AGB + 14-Tage Widerruf |
| Glücksspiel | NEIN (entry_fee = 0) | Jurisdiktion-Preset |
| Altersprüfung | JA (18+) | Self-Declaration bei Registrierung |

### Pflicht-Dokumente vor Launch

| Dokument | Priorität | Kosten | Timing |
|----------|-----------|--------|--------|
| AGB / Terms of Service | KRITISCH | €1.500 | Monat 1 |
| Datenschutzerklärung | KRITISCH | inkl. | Monat 1 |
| Impressum | KRITISCH | €0 | Monat 1 |
| Cookie-Consent Banner | HOCH | €0 (Open Source) | Monat 1 |
| Community Rewards Policy | MITTEL | €500 | Monat 3 |
| Altersverifikation (18+) | MITTEL | €0 (Self-Decl.) | Monat 1 |

### Wording-Regeln (ABSOLUT)

**NIE (auf Website, in App, in Marketing, in Verträgen):**
- Token, $SCOUT, Crypto, Blockchain, Airdrop
- Investment, Rendite, ROI, Profit, Wertsteigerung
- Konvertierung, Migration, Umwandlung
- "Credits werden zu..."

**IMMER:**
- "Platform Credits für den Zugang zu Funktionen"
- "Im alleinigen Ermessen von BeScout"
- "Kein garantierter externer Wert"
- "Digitaler Service, nicht Finanzprodukt"

---

## 9. Finanzen — Detaillierter Cashflow

### Annahmen (REALISTISCH)

```
Clubs: 12 in Year 1 (konservativ, nicht 14 oder 20)
  Mix: 8 Başlangıç, 3 Profesyonel, 1 Şampiyon
  Founder Clubs: 5 (avg €8K Premium)
  Akquise: 1/Mo M1-3, 2/Mo M4-9, 1/Mo M10-12

Founding Passes: 3.400 in Year 1
  Mix: 60% Fan, 24% Scout, 12% Pro, 6% Founder
  Avg Preis: €33,50
  Akquise: folgt Club-Onboarding (Clubs treiben Fan-Akquise)

CASP: NICHT in Year 1 (Credits ≠ Crypto → kein CASP nötig)
```

### Year 1 — Monat für Monat

| Mo | Clubs | Passes | Club-Revenue | Pass-Revenue | Founder Pr. | **Brutto** | Kosten | **Cash kum.** |
|----|-------|--------|-------------|-------------|-------------|-----------|--------|-------------|
| 1 | 1 | 50 | €4.000 | €1.675 | — | €5.675 | -€1.670 | **€4.005** |
| 2 | 2 | 100 | €3.700 | €3.350 | — | €7.050 | -€170 | **€10.885** |
| 3 | 3 | 100 | €3.700 | €3.350 | €8.000 | €15.050 | -€170 | **€25.765** |
| 4 | 4 | 300 | €5.400 | €10.050 | — | €15.450 | -€4.620 | **€36.595** |
| 5 | 5 | 300 | €4.600 | €10.050 | €8.000 | €22.650 | -€620 | **€58.625** |
| 6 | 7 | 300 | €6.350 | €10.050 | €8.000 | €24.400 | -€620 | **€82.405** |
| 7 | 8 | 500 | €5.550 | €16.750 | €8.000 | €30.300 | -€620 | **€112.085** |
| 8 | 9 | 500 | €5.500 | €16.750 | — | €22.250 | -€620 | **€133.715** |
| 9 | 10 | 500 | €5.500 | €16.750 | €8.000 | €30.250 | -€620 | **€163.345** |
| 10 | 11 | 250 | €5.500 | €8.375 | — | €13.875 | -€620 | **€176.600** |
| 11 | 12 | 250 | €5.500 | €8.375 | — | €13.875 | -€620 | **€189.855** |
| 12 | 12 | 250 | €4.500 | €8.375 | — | €12.875 | -€620 | **€202.110** |

**Anmerkung:** Stripe-Fees (~3%) sind in diesen Zahlen NICHT abgezogen. Nach Stripe:

```
Year 1 Brutto: ~€214.000
Stripe (3%):   -€6.400
Kosten:        -€11.590
NETTO:          €196.010
```

**€196K Baseline, €280K Stretch-Target** (abhängig von Club-Akquise-Tempo).

### Platform-Entwicklungskosten (Gründer-Vergütung)

Die Plattform wurde komplett vom Gründer entwickelt. Fair Market Value: €150K-€250K.
Strukturiert als IP-Transfer + laufendes Gehalt ab Malta Ltd:

| Posten | Betrag | Timing |
|--------|--------|--------|
| IP-Transfer Rate 1 | €25.000 | Monat 4 (Malta Ltd. Gründung) |
| IP-Transfer Rate 2 | €25.000 | Monat 7 |
| Geschäftsführer + CTO Gehalt | €5.000/Mo | Ab Monat 4 |
| **Year 1 Total an Gründer** | **€95.000** | |

Steuerlich: Malta Ltd. bucht IP als immateriellen Vermögenswert (3-5J Abschreibung).
Gehalt ist normales Managing Director Gehalt. Beides steuerlich absetzbar.

### Year 1 Kosten KOMPLETT

```
Infrastruktur:              €2.040
Legal Basics (AGB, Privacy): €1.500
Malta Ltd. Gründung:         €4.000
Legal monthly (9 Mo):        €4.050
IP-Transfer Bonus:          €50.000  (€25K M4 + €25K M7)
Gründer-Gehalt (9 Mo):     €45.000  (€5K/Mo ab M4)
                            ─────────
TOTAL KOSTEN Y1:            €106.590

Revenue Y1 Baseline:        €196.000
Stripe (3%):                 -€6.000
NETTO Y1:                    €83.410
```

### Year 2 (Monat 13-24)

```
REVENUE:
  Laufende Club-Revenue: 12 Clubs × €1.000 avg × 12 = €144.000
  Neue Clubs (8): 8 × €4.000 Setup + 8 × €1.000 × 6 avg = €80.000
  Neue Passes (2.000): 2.000 × €33,50 = €67.000
  Neue Founder Premiums (3): 3 × €8.000 = €24.000
  SUBTOTAL Y2 Operations: €315.000
  Pre-ICO (Monat 16-18): €800.000
  TOTAL Y2 REVENUE: €1.115.000

KOSTEN:
  Gründer-Gehalt (12 Mo × €5.000):  €60.000
  Malta Ltd. laufend:                 €5.400
  VFA Agent:                         €20.000
  CASP Capital:                     €125.000 (gehalten, nicht ausgegeben)
  CASP monthly (4 Mo):                €6.000
  Smart Contract Audit:              €20.000
  Infrastruktur:                      €6.000
  Erste Einstellung (6 Mo):          €36.000
  TOTAL Y2 KOSTEN:                  €278.400

Y2 FREE CASH: €1.115.000 - €278.400 = €836.600
  (davon €125K CASP Reserve = €711.600 frei verfügbar)
```

### Kumulierter Cash über alle Phasen

```
End Y1:                       €83.410   (nach Gründer-Vergütung)
End Y2 (pre Main ICO):       €920.010   (+ Pre-ICO €800K)
After Main ICO (M22):       €5.420.010   (+ Main ICO €4,5M)

Kosten total (M1-M24):       €385.000
CASP Reserve (gehalten):     €125.000
Gründer-Vergütung (24 Mo):   €155.000

FREI VERFÜGBAR nach Main ICO: ~€4.900.000

```

---

## 10. Risiken und Mitigationen

| # | Risiko | Schwere | Wahrscheinlichkeit | Mitigation |
|---|--------|---------|---------------------|------------|
| 1 | Zu wenige Clubs (<8) | HOCH | MITTEL | Sakaryaspor als Case Study, persönliches Netzwerk, Club-Referral |
| 2 | Stripe lehnt ab | MITTEL | NIEDRIG | Alternative: Lemon Squeezy, Paddle. B2B: Banküberweisung |
| 3 | Token-Preis bleibt unter €0,02 | MITTEL | MITTEL | CRM-Tool ist standalone wertvoll. Token = Upside, nicht Dependency |
| 4 | MiCA-Regulator hinterfragt Credits | HOCH | SEHR NIEDRIG | Legal Opinion einholen. Credits = PostgreSQL, kein DLT |
| 5 | User engagen nicht | MITTEL | MITTEL | Gamification, Fantasy, Club-driven Content, Scout Points Season |
| 6 | CASP dauert >6 Monate | MITTEL | MITTEL | Pre-ICO erst nach CASP-Genehmigung. Timeline hat 4 Mo Buffer |
| 7 | Konkurrenz (Chiliz) kopiert B2B | NIEDRIG | NIEDRIG | Chiliz ist B2C. Unterschiedliches Modell. First-Mover in Türkei |

### Worst Case Financial

```
Nur 5 Clubs, 1.500 Passes, kein Founder Premium:
  Revenue Y1: €57K + €50K = €107K
  Kosten Y1 (ohne Gründer-Vergütung): €12K
  Kosten Y1 (mit Gründer-Vergütung): €107K

  → Worst Case: Gründer-Gehalt wird reduziert/gestreckt
  → IP-Bonus verschoben auf Post-Pre-ICO
  → Betrieb ist gedeckt
  → CASP wird aus Pre-ICO finanziert
  → Timeline verschiebt sich 6 Monate
  → Kein Totalverlust, nur Verzögerung
```

---

## 11. Implementierungs-Reihenfolge

### Sofort (Monat 1)

1. ~~DPC → Scout Card Rename~~ ✅ DONE
2. ~~$SCOUT → Credits Rename~~ ✅ DONE (425 Stellen, 85 files)
3. ~~AGB + Datenschutzerklärung~~ ✅ EXISTIERT (Pages + i18n, braucht Anwalts-Review)
4. ~~Impressum-Seite~~ ✅ EXISTIERT
5. ~~Altersverifikation (18+)~~ ✅ DONE (Registration Checkbox)
6. Stripe Integration (Checkout für Founding Pass) — WARTET auf Anil
7. ~~Landing Page~~ ✅ DONE (Founding Pass Section auf /pitch + /founding Page)

### Monat 2-3

8. ~~Welcome Bonus: 10.000 → 1.000~~ ✅ DONE (i18n fix, DB war korrekt)
9. ~~SC pro Spieler: 300 → 500~~ ✅ DONE (DB Migration 633 Spieler)
10. ~~Founder Pool Vorbereitung~~ ✅ DONE (DB Schema + Service + Types)
12. ~~Founding Pass Self-Service~~ ✅ DONE (Mock Checkout auf /founding)
13. ~~Club-branded Landing Pages~~ ✅ EXISTIERT (Club-Seite + Referral-Code CTA)
14. ~~Referral-System~~ ✅ EXISTIERT (Service + UI + Club-Links)

### Monat 4-6

15. ~~Waitlist / Prioritäts-System~~ ✅ DONE (Soft-Gate: Founding Pass Upsell Banner)
16. ~~Scout Points Season 1~~ ✅ DONE (Gold "Season 1" Badge auf ScoreRoad + FanRank)
17. Club Onboarding Flow — OFFEN (braucht echte Club-Gespräche)
18. ~~Founding Pass Nummer-System~~ ✅ DONE (Sequence #1-#10.000, auto-assign)
19. Community Rewards Policy — OFFEN (Legal Doc, braucht Anwalt)

### Monat 7+

20. Malta Ltd. Gründung
21. CASP-Vorbereitung (VFA Agent, Compliance Officer)
22. KYC-Integration (Sumsub) für zukünftige Token-Claims
23. $SCOUT Smart Contract Entwicklung
24. Pre-ICO Vorbereitung

---

## 12. Entscheidungen die JETZT getroffen sind

| # | Entscheidung | Begründung |
|---|-------------|------------|
| 1 | Credits statt $SCOUT während Pilot | MiCA-konform, kein Token-Anschein |
| 2 | CASP erst Year 2 | Credits ≠ Crypto, kein CASP im Pilot nötig. Spart €147K |
| 3 | Migration-Bonus nie kommunizieren | Legal: kein Token-Versprechen. Bonus = Überraschung bei Launch |
| 4 | 500 SC pro Spieler | Balanciert Markttiefe (genug SCs) vs. Knappheit (Wert pro SC) |
| 5 | 1.000 Welcome Bonus | Schnuppern ja, Vollzugang nur mit Founding Pass |
| 6 | IPO Split: Pilot 85/10/5, Post-Token 84/10/5/1 | Founder Pool Fee nur 1%, erst post-Token. Andere Clubs fühlen sich nicht benachteiligt |
| 7 | Founder Pool operativ, KEIN Token-Bucket | Finanziert sich aus 1% IPO-Fee. Keine Token-Verwässerung |
| 8 | Pre-ICO €0,01, Main ICO €0,03 | Defensible FDV (€10M/€30M), nicht überbewertet |
| 9 | DEX-First Token-Launch | Kosteneffizient, beweist Traction vor CEX |
| 10 | No cash-out, no re-purchase (Pilot) | Legal clean, geschlossenes System |
| 11 | Club ist Sales-Kanal (nicht nur Kunde) | Club hat Eigenmotivation, Fans zu rekrutieren |
| 12 | Gründer-Vergütung: €95K Y1, €60K Y2 | IP-Transfer + Gehalt. Fair Market Value für Plattform-Entwicklung |
| 13 | Legal & Compliance als Token-Bucket (5%) | Langfristige Compliance aus Token-Treasury finanziert |

---

## 13. Zusammenfassung

```
BeScout = CRM-Tool (sofortiger Wert)
        + Credit-Wirtschaft (Engagement-Engine)
        + Token-Potential (Upside, nie versprochen)

Pilot finanziert sich selbst (€196K-€280K Year 1, inkl. €95K Gründer-Vergütung)
Pre-ICO finanziert CASP + Team (€800K)
Main ICO finanziert Expansion (€4,5M)

Kein externes Geld nötig für Phase 0-1.
Token kommt erst wenn Legal steht.
Jeder Akteur hat unabhängigen Grund mitzumachen:
  Club: CRM-Tool + Credit-Potential
  User: Plattform-Engagement + Rang-Perks + Credit-Potential
  Investor: Real Revenue + Token Economics + Growing User Base

Kein Versprechen. Keine Token-Referenz. Keine Rendite.
Nur ein funktionierendes Produkt und die kluge Vermutung
aller Beteiligten, dass früh einsteigen sich lohnt.
```
