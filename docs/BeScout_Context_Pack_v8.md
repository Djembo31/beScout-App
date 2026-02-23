# BeScout Context Pack v8.0 — Master Document für Claude

> **Zweck:** Dieses Dokument enthält das vollständige, konsolidierte Wissen über BeScout.
> Claude muss dieses Dokument KOMPLETT lesen bevor Code geschrieben wird.
> Jede Entscheidung — ob UI, Backend, Wording oder Feature — muss mit diesem Dokument übereinstimmen.

---

## 1. WAS IST BESCOUT?

BeScout ist eine Multi-Sided Platform die Fußballvereine, Fans und Spieler über ein gemeinsames Ökosystem verbindet.

**Elevator Pitch:** "Der Amazon-Marketplace für Fußball-Fan-Engagement — Vereine verkaufen digitale Spielerverträge an Fans, Fans werden zu bezahlten Scouts, und das Ganze wird durch Gamification und Fantasy-Turniere zusammengehalten."

**Kernanalogien:**
- Für Clubs: Amazon Seller Central — der Verein ist der "Händler", sein Kader ist das "Produktsortiment"
- Für Fans: Trading-App + Fantasy-Plattform + Scouting-Netzwerk
- Für die Plattform: Marketplace der an jeder Transaktion verdient

---

## 2. DIE 4 SÄULEN

| Säule | Was es macht | Wer profitiert |
|-------|-------------|----------------|
| **Club Liquidity Tool** | Kaderwert → Cash via DPC-IPO (10% verkaufen = 10% Kaderwert) | Clubs |
| **Fan Engagement Monetization** | Votes, Comments, Polls = Revenue (70/30 Split Club/PBT) | Clubs + Fans |
| **External Scout Workforce** | Fans = bezahlte Scouts, BSD = Arbeitskompensation | Fans |
| **Fantasy Tournaments** | PokerStars-Style, Freerolls + Paid, Talent Discovery | Fans + Clubs |

---

## 3. TOKEN-SYSTEM

### BSD (BeScout Dollar)
- Internes Zahlungsmittel der Plattform
- In der Pilotphase: Utility Token / Platform Credits
- Wird für ALLE Aktionen auf der Plattform genutzt (Votes, Polls, Trading, Fantasy)
- Supply: 1 Mrd.
- NIEMALS öffentlich Preis-Phasen kommunizieren

### DPC (Digital Player Contract)
- max. 300 Stück pro Spieler (Scarcity-Modell)
- Verein gibt DPCs in max 4 Tranchen frei (`dpc_total` ≤ 300)
- IPO: Verein bietet Tranche über IPO an (`ipos.total_offered`, z.B. 50 DPCs)
- Preis = aggregiertes Fan-Sentiment (Floor Price = MIN offener Sell Orders)
- Clubs verkaufen DPCs aktiv an ihre Fans (wie ein Händler auf Amazon)
- Fee-Split: 6% total (Platform 3.5% + PBT 1.5% + Club 1%)

### PBT (Player Bound Treasury)
- Spielergebundene Kasse, gespeist aus Fees
- Auszahlung "at BeScout's discretion"

### $SCOUT (UI-Branding seit ADR-021)
- In der UI heißt die Plattform-Währung bereits **$SCOUT** (nicht mehr BSD)
- Rechtlich bleibt es "Platform Credits" bis CASP-Lizenz steht
- Interne Code-Variablen nutzen noch `bsd`-Naming (z.B. `centsToBsd`, `priceBsd`)
- Nach CASP-Lizenzierung: voller Token-Launch mit Cash-Out und EU-Passporting
- Pilot-Clubs die früh Credits erhalten haben, können diese migrieren
- KEINE Garantie, KEINE Wertversprechen — "subject to future platform terms"

---

## 4. DAS MARKETPLACE-MODELL (KRITISCH FÜR DIE ENTWICKLUNG)

### Der Club als "Händler"

Clubs sind NICHT passive Teilnehmer. Sie sind aktive Verkäufer auf der Plattform:

**Club-Dashboard = "Seller Central":**
- Übersicht über Spieler, DPC-Performance, Fan-Engagement, Revenue
- Tools um Verkäufe aktiv zu treiben

**Aktive Verkaufs-Tools für Clubs:**
- **Events starten:** "Wer die meisten DPCs unseres Stürmers hält → Meet & Greet"
- **Votes/Polls:** "Welchen Spieler sollen wir im Winter kaufen?" (jeder Vote kostet BSD)
- **Exklusive Inhalte:** Behind-the-Scenes, nur für DPC-Holder
- **IPO-Timing:** Club entscheidet WANN ein Spieler gelistet wird
- **Fantransfer:** Fans schlagen Transfers vor, Community voted, Club nimmt Top-Vorschläge

**Warum das funktioniert:**
- Der Club bringt seine eigenen Fans mit (organisches Marketing)
- Der Club hat finanziellen Anreiz aktiv zu promoten
- BeScout muss nicht selbst User akquirieren — die Clubs sind der Vertriebskanal

### Das Galatasaray-Beispiel (Skalierungsvision)
- 30 Mio Fans, 1% kommen auf Plattform = 300.000 User
- 30% aktiv = 90.000 aktive User
- Poll "Welche Position stärken?" → 50.000 Votes à 5 BSD = 250.000 BSD Volumen
- Crowdsourced Scouting: Fans liefern lokales Wissen das kein Algorithmus kann
- Fan-Transfer-Vorschläge: Community schlägt Spieler vor, Club nimmt Top 3

---

## 5. GESCHÄFTSMODELL — PILOT

### Paketstruktur (3 Tiers)

**KICKOFF-Paket (Einstieg):**
- Setup-Fee + Monatsgebühr (niedrig)
- Kernplattform: Spielerprofile, DPC-System, Fan-Voting, Polls
- Basis-Dashboard mit Engagement-Metriken
- 2 Werbeflächen auf der Clubseite (Club verkauft diese an seine Sponsoren)
- Moderater BSD-Pool für Fan-Engagement-Campaigns
- Max. 30 Spieler im Kader
- BSD-Migration zu $SCOUT möglich (ohne Garantie)

**PRO-Paket (Empfohlen):**
- Höhere Gebühr, größerer BSD-Pool
- Alles aus Kickoff PLUS:
- Fantasy-Turniere
- Scout Report System
- Erweiterte Analytics mit Fan-Segmentierung
- 5 Werbeflächen
- Event-Tools (Club kann eigene Campaigns starten)
- Max. 50 Spieler
- Dedizierter Onboarding-Support (30 Tage)

**ELITE-Paket (Für Große Clubs):**
- Premium-Gebühr, maximaler BSD-Pool
- Alles aus Pro PLUS:
- Unlimitierter Kader
- White-Label-Option (Club-Branding)
- API-Zugang für Integration in Club-App
- 10+ Werbeflächen inkl. Takeover-Formate
- Exklusive Features: "Fantransfer", "Fan Council"
- Priority Support + Account Manager
- Co-Marketing mit BeScout

### Werbeflächen als Refinanzierungs-Hebel
- Der Club verkauft die Werbeflächen an seine bestehenden Sponsoren
- Sponsor bekommt digitale Reichweite bei hochengagierten Fans
- Club refinanziert BeScout-Kosten durch Sponsoring-Deals
- BeScout ist NICHT der Werbevermarkter — der Club verkauft selbst

### Revenue-Streams für BeScout:
1. Club-Paket-Gebühren (Setup + Monatlich)
2. Trading Fees auf jede DPC-Transaktion
3. Fantasy-Turniere Rake
4. BSD-Verkauf an Fans (unter €1M Exemption)
5. Langfristig: Datenlizenzierung

---

## 6. RECHTLICHE STRUKTUR

### Firmensitz: MALTA

**Warum Malta:**
- Erstes EU-Land mit Krypto-Gesetzgebung (VFA Act 2018)
- CASP-Lizenz gibt EU-weites Passporting (alle 27 Staaten)
- Englischsprachiges Rechtssystem
- Erfahrener Regulator (MFSA)
- Etabliertes Ökosystem an Krypto-Kanzleien

### Phase 1 — Pilotphase (€1M Exemption)

**MiCA-Ausnahme:** Token-Angebote unter €1 Mio innerhalb von 12 Monaten sind vom Whitepaper-Pflicht befreit. Zusätzlich: Utility Tokens die Zugang zu einem existierenden Service geben, sind von den regulatorischen Anforderungen befreit.

**Was gebraucht wird:**
- Maltesische Ltd. (Gründung ~3.000€)
- Mindestens 1 EU-Resident als Board Member
- Geschäftsadresse in Malta (Virtual Office ~100-200€/Monat)
- AML/KYC Basis-Compliance (auch unter Exemption Pflicht!)
- KYC bei User-Registrierung
- Transaktionsmonitoring
- MLRO (kann extern sein)

**Was NICHT gebraucht wird:**
- Kein CASP-Lizenz
- Kein vollständiges MiCA-Whitepaper
- Kein €125.000 Mindestkapital

**Limitierung:** Max. €1 Mio BSD-Verkauf in 12 Monaten

### Phase 2 — Volle CASP-Lizenz (für $SCOUT)

**Wird finanziert aus Pilot-Revenue + ggf. Angel-Investment**

**Kosten:**
- Mindestkapital: €125.000 (Class 2 — Exchange/Custody)
- VFA Agent: ~15.000-25.000€/Jahr
- Anwalt für Application: 30.000-80.000€
- Laufend (Audit, Reporting, Office): ~50.000-80.000€/Jahr
- Gesamt erstes Jahr: ~200.000-350.000€
- Genehmigungsdauer: 4-6 Monate

### Kritische Wording-Regeln (GILT FÜR JEDE ZEILE CODE!)

**❌ NIEMALS verwenden (in UI, API-Responses, Kommentaren, Marketing):**
- Investment, Invest, Investition
- Rendite, Return, ROI
- Dividende, Dividend
- Gewinn, Profit (im Kontext von Token)
- Anteil am Spieler, Ownership
- "x50 Upside", "x10 Return"
- Garantierte Wertsteigerung
- BSD-Preis-Phasen (0,01€ → 0,50€)

**✅ IMMER verwenden:**
- Utility Token / Platform Credits
- Scout Assessment / Performance Rewards
- "at BeScout's discretion"
- "No guaranteed returns"
- "BSD provides access to platform features"
- Digital Player Contract (nicht "Spieleranteil")

**BSD in der Pilotphase:**
- Bezeichnung: "Platform Credits" oder "Utility Token"
- NICHT: "Kryptowährung", "Coin", "Investment Token"
- Kein Cash-Out in der Pilotphase
- Geschlossener Kreislauf

---

## 7. STAKEHOLDER-BENEFITS (für Pitch-Material & UI-Texte)

### Für Clubs:
- Sofortige Fan-Engagement-Monetarisierung
- CRM mit echten Fan-Daten und Segmentierung
- Externe Scout-Workforce (Fans scouten kostenlos)
- Neues Sponsoring-Inventar (Werbeflächen)
- Crowdsourced Transfer-Intelligence
- Dashboard mit Engagement-Analytics und Revenue

### Für Fans:
- Fußballwissen monetarisieren (Scout Reports → BSD)
- Trading-Erlebnis mit Spielern die sie kennen
- Fantasy-Turniere mit Skill-Element
- Community-Status (Scout Score, Achievements, Levels)
- Mitspracherecht beim Verein (Votes, Fantransfer)
- Emotionale Bindung: "Ich habe den Spieler entdeckt"

### Für Spieler:
- Player Bound Treasury als potenzieller Bonus
- Sichtbarkeit durch aggregierte Scout-Daten
- Unabhängiger Marktwert-Indikator

### Für BeScout:
- Trading Fees, Fantasy Rake, BSD-Spread
- Club-Paket-Gebühren (recurring Revenue)
- Founding Pass Revenue
- Langfristig: Datenlizenzierung

---

## 8. BEKANNTE RISIKEN & WIDERSPRÜCHE

### Kaltstartproblem
- Ohne Clubs → keine DPCs, ohne Fans → kein Volumen
- LÖSUNG: Club bringt eigene Fans mit. 1 Club = 1.000-4.000 aktive User reichen für lebendiges Orderbook

### Datenquelle
- Gesamtes Scoring/Trading/Fantasy hängt an Spieler-Performance-Daten
- Opta = teuer (sechsstellig), Sofascore/FotMob = restriktive APIs
- MUSS vor Launch geklärt sein

### Utility vs. Investment
- Produkterlebnis schreit "Investment" (DPC kaufen → Preis steigt)
- Rechtlich geframed als "Utility Token"
- Wording-Regeln sind KRITISCH — jede UI-Zeile muss compliant sein

### Scout-Report-Qualität
- Fans als Scouts → Spam-Risiko
- Reputation-System (Scout Score) hilft langfristig
- Am Anfang: manuelle Moderation oder Community-Voting

### Club-Hype-Risiko
- Clubs wollen DPC-Preise pushen → späte Käufer verlieren
- BRAUCHT: Max. Preisschwankungen/Tag, transparente Float-Regeln, Market-Maker-Mechanismus

### PBT-Auszahlung
- "at BeScout's discretion" = Red Flag für Spieler-Agenten
- Muss transparent kommuniziert werden

---

## 9. TIMELINE & ROADMAP

### Phase 0: Firmengründung (März 2026)
- [ ] Maltesische Ltd. gründen
- [ ] Virtual Office in Malta einrichten
- [ ] Geschäftskonto eröffnen
- [ ] AML/KYC Basis-Setup (Sumsub oder Veriff)

### Phase 1: Club-Onboarding (April–Juli 2026)
- [ ] Ziel: Gesamte 1. TFF (18 Clubs), Fokus Istanbul-Raum
- [ ] April-Mai: Erste 3-5 Clubs gewinnen (persönlicher Pitch)
- [ ] Juni-Juli: Restliche Clubs über FOMO ("5 eurer Konkurrenten sind schon drauf")
- [ ] Clubs kaufen Pakete (Kickoff/Pro/Elite)
- [ ] Clubs erhalten BSD-Pools je nach Paket
- [ ] Clubs können Club-Abos an Fans verkaufen
- [ ] Clubs werben aktiv für Saisonstart

### Phase 2: Saisonstart 26/27 (August 2026)
- [ ] Alle 18 Clubs live → Fantasy kann komplette Liga abbilden
- [ ] Clubs nutzen Plattform als CRM/SaaS
- [ ] BSD-Verkauf an Fans (unter €1M Exemption)
- [ ] Fans nutzen Platform Credits für Votes, Trading, Fantasy
- [ ] KEIN Cash-Out, KEIN Fiat-Auszahlung
- [ ] Metriken sammeln: DAU, Retention, Trading Volume, Scout Reports

### Phase 3: Skalierung (Q4 2026 – Q1 2027)
- [ ] Mit Pilot-Revenue CASP-Lizenz finanzieren
- [ ] Oder Angel-Investor mit bewiesenen Metriken
- [ ] CASP-Application bei MFSA einreichen
- [ ] Genehmigung: 4-6 Monate

### Phase 4: $SCOUT Launch (nach CASP-Lizenz)
- [ ] BSD → $SCOUT Migration
- [ ] Pilot-Clubs migrieren ihren BSD-Bestand (Gamechanger!)
- [ ] Voller Exchange, Cash-Out, Fiat-Onramp
- [ ] EU-weit legal durch Passporting
- [ ] Süper Lig und internationale Expansion

---

## 10. TECH-KONTEXT

### Stack
- **Frontend:** Next.js 14 + TypeScript strict + TanStack Query v5 + Zustand
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Hosting:** Vercel (pilot.bescout.net)
- **Monitoring:** PostHog EU + Sentry
- **Zahlungen:** Stripe (für Club-Pakete, SaaS-Gebühren)

### Aktueller Stand (Feb 2026)
- **207 SQL-Migrationen** + 1 Edge Function (send-push v2) + 2 pg_cron Jobs + 13 Gamification-Triggers
- 20 Pilot-Clubs mit 566 Spielern (TFF 1. Lig 2025/26)
- 22 Routes, 30+ Services, ~41 React Query Hooks
- 195 Unit Tests (Vitest) + 55 E2E Tests (Playwright)
- Trading Engine mit atomaren RPCs (4 Trading-RPCs, Escrow, Liquidation-Guards)
- IPO-Mechanik mit 4-Tranchen-Modell
- Fantasy mit Scoring + Leaderboard + Predictions + FPL-Style Points
- Community-Layer: Scouting Zone mit 7 Content-Filtern, Bounties, Votes, Polls
- Reputation-Engine: 3-Dim Elo (Trader/Manager/Analyst), 12 Ränge, 25 Achievements, Missions, Streak
- 13 Gamification-Trigger (DB-seitig, SECURITY DEFINER)
- 6 gefährliche RPCs REVOKED (award_*, update_mission_progress)
- auth.uid() Guards auf 40 RPCs (Identity-Verifikation)
- Club Multi-Admin (Owner/Admin/Editor), 11 Admin-Tabs
- 21 Sponsor-Placements mit echten Fußball-Marken
- Push Notifications (Realtime via Supabase WebSocket), Referral, Airdrop
- i18n DE+TR vollständig (next-intl, ~1000+ Keys)
- Mobile-First Redesign (BottomSheet Modals, 44px Touch Targets)
- Crowd Scouting Modul mit Reputation-Flywheel
- Notification Preferences (6 togglebare Kategorien)
- Club-Abo (Bronze/Silber/Gold) mit 5 server-enforced Perks

### Kritische Tech-Anforderungen für Launch
- [x] ~~i18n / Türkische Übersetzung~~ ✅ DE+TR vollständig
- [x] ~~Mobile-Responsive auf allen Screens~~ ✅ Mobile-First Redesign (Session 103)
- [x] ~~Club-Dashboard ("Seller Central")~~ ✅ 11 Admin-Tabs + Multi-Admin
- [x] ~~Werbeflächen-System~~ ✅ 21 Placements, DB-backed, Admin CRUD
- [ ] Supabase Pro Upgrade (kein Free Tier!)
- [ ] KYC-Integration (Sumsub/Veriff) — braucht Malta Ltd
- [ ] Geofencing (Region-Tiers + Feature Flags) — braucht Malta Ltd
- [ ] $SCOUT-Kauf-Flow (Fan Pass / In-App Purchase) — braucht Native App
- [ ] Wording-Compliance-Scan der gesamten Codebase
- [ ] Disclaimer-Texte auf Trading/DPC-Seiten
- [ ] VAPID Key in Vercel Environment Variables
- [ ] API-Football Account + Mapping (~30 Min)

### Design System
```
Farben:
  Primary: #0a0a0a (Black), #FFD700 (Gold), #FFA500 (Gold-Dark)
  Text: #FFFFFF, rgba(255,255,255,0.9/0.7/0.5/0.3)
  Accents: #22C55E (Green), #EF4444 (Red)
  Borders: rgba(255,255,255,0.1), rgba(255,255,255,0.2)

Fonts:
  Headlines: 'Outfit', sans-serif (700-900)
  Body: 'Outfit', sans-serif (400-500)
  Numbers: 'Space Mono', monospace

Cards: bg white/[0.02], border white/10, radius 2xl, hover border-gold/30
Buttons Primary: gradient gold→orange, text black, glow
Buttons Secondary: bg white/5, border white/10, text white
```

---

## 11. BSD-VERKAUF IN DER PILOTPHASE — IMPLEMENTIERUNG

### Erlaubte Modelle (ohne CASP-Lizenz):

**Modell A: Fan Pass (In-App Purchase)**
- Fan kauft "BeScout Fan Pass" — 4,99€/Monat
- Enthält: 500 Credits (BSD), Premium-Polls, exklusive Stats
- Credits heißen intern BSD, aber Fan kauft ein ABO
- Läuft über App Stores (Apple/Google übernehmen Zahlungsabwicklung)
- Kein Cash-Out, kein Transfer zwischen Usern

**Modell B: Club verteilt BSD**
- Club bekommt BSD-Pool über sein Paket
- Club verteilt BSD an Fans als Belohnung/Event-Preis
- BeScout verkauft NIE direkt an Fans
- B2B-Transaktion (BeScout → Club), Club→Fan ist Club-Verantwortung

**Modell C: Freemium + Earned BSD**
- Fans verdienen BSD durch Engagement (Votes, Reports, Fantasy)
- Kein Echtgeld-Kauf nötig
- Rechtlich am saubersten

**Empfehlung: Kombination A + B + C**

### Verboten in der Pilotphase:
- Direkter BSD-gegen-Euro-Tausch ohne Fan-Pass-Wrapper
- Cash-Out / Auszahlung in Fiat
- BSD-Transfer zwischen Usern (Peer-to-Peer)
- BSD als "Kryptowährung" oder "Investment Token" bezeichnen

---

## 12. REGELN FÜR CLAUDE

### Beim Programmieren IMMER beachten:

1. **Wording-Compliance:** Jeder String in der UI, jeder API-Response-Text, jeder Tooltip muss gegen die Wording-Regeln (Abschnitt 6) geprüft werden. Keine Ausnahmen.

2. **Club-zentrisch denken:** Der Club ist der "Händler". Jedes Feature muss die Frage beantworten: "Wie hilft das dem Club, mehr DPCs zu verkaufen und Fans zu engagen?"

3. **Geschlossener Kreislauf:** BSD verlässt NICHT die Plattform. Kein Cash-Out-Button, kein Withdrawal-Feature, kein Fiat-Auszahlungs-Flow. Nicht implementieren, auch nicht versteckt.

4. **Türkisch-First:** Alle neuen UI-Texte müssen i18n-ready sein. Hardcoded Strings sind verboten. Türkisch ist die primäre Sprache, Englisch sekundär, Deutsch tertiär.

5. **Mobile-First:** 85%+ der türkischen Zielgruppe nutzt Mobile. Jeder Screen muss zuerst mobil funktionieren.

6. **Disclaimer überall:** Auf jeder Seite die mit $SCOUT oder DPCs zu tun hat: "$SCOUT is a utility credit providing access to platform features. No guaranteed returns. Not an investment product."

7. **KYC-Gate:** User müssen KYC durchlaufen BEVOR sie BSD kaufen oder DPCs traden können. Kein Trading ohne verifiziertes Konto.

8. **Club-Dashboard Priorität:** Das Club-Dashboard ("Seller Central") ist genauso wichtig wie die Fan-App. Clubs müssen Events erstellen, Polls starten, BSD verteilen, Analytics sehen, Werbeflächen managen können.

9. **Kein Blockchain-Code:** In der Pilotphase gibt es KEINE Blockchain. Alles läuft über Supabase. Keine Smart Contracts, keine Wallet-Connects, keine Web3-Libraries.

10. **Daten-Transparenz:** Fan-Engagement-Daten müssen für Clubs im Dashboard sichtbar sein. Das ist der Kern des CRM-Werts.

---

## 13. ZUSAMMENFASSUNG IN EINEM SATZ

BeScout ist ein Marketplace auf dem Fußballvereine wie Händler agieren — sie verkaufen digitale Spielerverträge an Fans, treiben Engagement durch Events/Votes/Fantasy, und bekommen dafür ein CRM mit echten Fan-Daten und Revenue — alles zusammengehalten durch BSD als interne Plattform-Währung, die nach erfolgreicher Pilotphase und CASP-Lizenzierung in Malta zu $SCOUT migriert wird.

---

*Version 8.2 | Aktualisiert: 23. Februar 2026 | Tech-Stand: 207 Migrations, 195 Unit Tests, 55 E2E Tests, $SCOUT Branding (ADR-021), DPC Supply 300*
*Nächstes Update nach: Maltesischer Firmengründung, erstem Club-Deal, oder signifikanter Konzeptänderung*
