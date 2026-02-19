# BeScout — Strategisches & Technisches Briefing für Claude Code

> Stand: 18.02.2026 | Quelle: Strategie-Session mit Claude Opus
> Dieses Dokument ist die verbindliche Referenz für alle weiteren Entwicklungsentscheidungen.

---

## 1. Was BeScout IST (korrigiertes Verständnis)

BeScout ist **KEIN Sorare-Klon**. BeScout ist ein **B2B SaaS / CRM / Fan-Monetarisierungs-Tool für Fußballvereine**.

### Das Modell

```
SORARE (falsch als Vorbild):
├── Sorare kauft Lizenzen von Vereinen
├── Sorare erstellt NFT-Karten
├── Sorare verkauft an Fans
├── Sorare kassiert alles
└── Verein hat: NULL Kontrolle, NULL Daten, NULL direkte Fan-Beziehung

BESCOUT (unser Modell):
├── Verein nutzt BeScout als Tool/Plattform
├── Verein erstellt DPCs für SEINE Spieler
├── Verein verkauft an SEINE Fans
├── Verein setzt Preise, steuert IPOs, gibt Bounties
├── Verein kassiert direkt
├── BeScout bekommt: Platform-Fee (SaaS + Transaktionsanteil)
└── Verein hat: VOLLE Kontrolle, Fan-Daten, direkte Beziehung
```

**Analogie:** BeScout ist Shopify für Fan-Monetarisierung. Vereine = Shops, Spieler = Produkte, Fans = Kunden. BeScout stellt die Infrastruktur.

### DPC = Digitale Partizipationslizenz (NICHT Sammelkarte, NICHT NFT)

DPCs sind **Arbeitslizenzen/Partizipationsrechte** die der Verein für seine Spieler ausgibt:

- **Fantasy:** DPC berechtigt zum Einsetzen in Lineups
- **Voting:** DPC-Holder stimmen über Spieler-bezogene Fragen ab
- **Content:** DPC-Holder bekommen exklusiven Spieler-Content
- **PBT:** DPC-Holder partizipieren am Player Bound Treasury
- **Reputation:** DPC-Holding fließt in Scout Score ein

**DPCs sind und bleiben Off-Chain (Supabase DB-Einträge).** Keine NFTs, keine Blockchain für DPCs.

---

## 2. Architektur-Entscheidungen (verbindlich)

### 2.1 DPCs = Off-Chain (Supabase)

**Entscheidung:** DPCs bleiben Datenbankeinträge. Keine Migration zu NFTs geplant.

**Begründung:**
- Verein braucht volle Kontrolle (Preise ändern, DPCs einfrieren, Scoring anpassen)
- Kein Wallet-Onboarding nötig → keine Conversion-Verluste
- Schnelle Iteration (DB-Migration statt Smart-Contract-Upgrade)
- Kein Audit nötig, kein Smart-Contract-Exploit-Risiko
- Regulatorisch cleaner (keine Crypto-Asset-Diskussion für DPCs)
- Feature-Flags pro Club und Jurisdiktion möglich

**Für spätere NFT-Optionality sicherstellen:**
- Jede DPC hat eine stabile unique ID
- Strukturierte Metadata (Spieler, Club, Rarity, Mint-Event, Besitzer-History)
- Besitzer-History wird vollständig geloggt (nicht nur aktueller Besitzer)

### 2.2 Währungssystem: BSD → $SCOUT

```
PILOT-PHASE (jetzt):
├── BSD = Off-Chain Credits in Supabase
├── Kein Geldwert, kein Cashout
├── Prestige-Währung für Profil-Aufbau
├── Airdrop Score trackt Berechtigung für spätere $SCOUT-Migration
└── Kein regulatorisches Risiko

POST-PILOT ($SCOUT Launch, ~Q3/Q4 2026):
├── $SCOUT = ERC-20 Token auf Polygon PoS
├── MiCA Title II Utility Token → White Paper + NCA-Notification nötig
├── Airdrop: BSD × Multiplier → $SCOUT (basierend auf Scout Score + Aktivität)
├── Handelbar auf Exchanges (Listing über bestehende CASPs)
└── Bridge: $SCOUT ↔ BSD (Ein-/Auszahlung auf Plattform)
```

### 2.3 Plattform-Architektur

```
BESCOUT PLATTFORM (SaaS)
│
├── Für Vereine (B2B): Club Dashboard
│   ├── Spieler-Management (DPCs erstellen, IPOs launchen, Content)
│   ├── Fan-Engagement (Bounties, Votes, Fantasy Events, Push)
│   ├── Monetarisierung (Revenue Dashboard, Abo-Management)
│   ├── Fan-CRM (Scout Score Rankings, Segmentierung, Top-Fans)
│   └── Analytics (DAU, MAU, Retention, BSD-Volumen, Revenue)
│
├── Für Fans (B2C): Fan-App
│   ├── DPC-Trading (Off-Chain, BSD)
│   ├── Fantasy (konfigurierbar pro Club/Jurisdiktion)
│   ├── Community (Posts, Analysen, Polls, Bounties)
│   ├── Reputation (Scout Score, 32 Achievements, Level, CV)
│   └── Wallet ($SCOUT, nur Post-Pilot)
│
├── Währung:
│   ├── BSD = Off-Chain Credit (Pilot + intern immer)
│   ├── $SCOUT = On-Chain ERC-20 auf Polygon (Post-Pilot)
│   └── Bridge: $SCOUT ↔ BSD
│
└── Revenue für BeScout:
    ├── Trading-Fee: 3.5% (von 6% total)
    ├── IPO-Fee: 10%
    ├── Bounty Platform-Fee: 5%
    ├── Research-Paywall: 20% Cut
    ├── Bezahlte Polls: 30% Cut
    ├── Club-Onboarding Fee (geplant)
    ├── Premium Club-Features SaaS-Abo (geplant)
    └── Sponsoren-Placements (21 Flächen, DB-backed)
```

---

## 3. Regulatorische Leitplanken (MUST-FOLLOW)

### 3.1 Gaming/Gambling — Kritisch

**Problem:** Fantasy Turniere mit Entry Fees können als Glücksspiel klassifiziert werden.

**Deutschland:** GGL hat DFS als unerlaubtes Glücksspiel eingestuft. Nicht erlaubnisfähig — keine Lizenzkategorie existiert.

**Türkei:** Null-Toleranz-Politik gegen illegales Glücksspiel. Alles was nicht staatlich kontrolliert ist, wird verfolgt. MASAK, BTK kooperieren aktiv.

**Lösung: Konfigurierbare Fantasy-Engine pro Jurisdiktion**

```
GLÜCKSSPIEL = Einsatz + Zufall + Gewinn
→ Fehlt EINES der drei Elemente = KEIN Glücksspiel

Unser Ansatz: EINSATZ eliminieren
├── Fantasy: KEINE Entry Fees im Pilot
├── Prämien aus Platform/Club-Budget, NICHT aus Teilnehmer-Pool
├── BSD hat keinen Geldwert = kein "Gewinn" im rechtlichen Sinne
└── Framing: "Club-Challenge" statt "Turnier mit Einsatz"
```

**Club Dashboard muss enthalten:**

```
Fantasy Settings (pro Club konfigurierbar):
├── Entry Fee: [0 BSD] / [Custom] / [Deaktiviert]
├── Prämien-Quelle: [Club-Budget] / [Entry-Pool] / [Platform-Sponsored]
├── Jurisdiktion-Preset:
│   ├── TR → Entry Fee = 0, automatisch
│   ├── DE → Entry Fee = 0, automatisch
│   └── MT/andere → Entry Fee erlaubt (wenn Club Lizenz hat)
└── Compliance-Mode: [Strict] / [Standard]
```

**WICHTIG für alle Entwicklung:**
- Fantasy Entry Fees sind im Pilot = 0. Immer.
- Kein Feature darf so aussehen, als ob Fans "Geld einsetzen um Geld zu gewinnen"
- BSD ist eine Prestige-Währung, kein Zahlungsmittel
- Trading ist "Karten tauschen", nicht "Investieren" oder "Spekulieren"

### 3.2 DPC-Framing — Keine Investments

**NIEMALS in UI, Copy oder Marketing:**
- "Investiere in Spieler"
- "DPCs steigen im Wert"
- "Rendite" oder "Return"
- "Verdiene Geld mit DPCs"

**STATTDESSEN:**
- "Sammle Partizipationsrechte deiner Lieblingsspieler"
- "Unterstütze deinen Verein"
- "Baue dein Fußball-Portfolio auf" (Portfolio = CV, nicht Investment)
- "Tausche DPCs mit anderen Fans"

### 3.3 $SCOUT Token — MiCA Title II

**Wann:** Post-Pilot, ~Q3/Q4 2026
**Was nötig:** EU-Entity (empfohlen: Irland), MiCA White Paper, NCA-Notification
**Timeline:** ~3-5 Monate, €15-35k
**Jetzt nicht relevant für Code**, aber Airdrop Score Mechanik muss im Pilot stehen.

### 3.4 BeScout als Plattform-Dienstleister

**Wer gibt DPCs heraus?** Der Verein. Nicht BeScout.
**Wer veranstaltet Fantasy?** Der Verein. Nicht BeScout.
**BeScout's Rolle:** Infrastruktur-Provider, wie Shopify.

**AGB müssen enthalten:**
- Vereine sind verantwortlich für Einhaltung lokaler Gesetze
- BeScout stellt Tools bereit, trifft keine inhaltlichen Entscheidungen
- Geo-Fencing-Optionen pro Feature und Jurisdiktion

---

## 4. Pilot-Prioritäten (geordnet)

### BLOCKER — Vor Go-Live erledigen

1. **i18n / Türkisch**
   - Ohne Türkisch kein Pilot mit Sakaryaspor-Fans
   - next-intl in Next.js 14 integrieren
   - Alle UI-Strings externalisieren
   - Mindestens TR + DE als Sprachen
   - Geschätzter Aufwand: 2-3 Tage

2. **Fantasy Entry Fees auf 0 setzen**
   - Alle Fantasy Events: Entry Fee = 0 BSD
   - Prämien kommen aus Platform-Pool, nicht aus Teilnehmer-Einsätzen
   - UI anpassen: Kein "Entry Fee" Label wenn 0
   - Framing: "Club Challenge" statt "Turnier"

3. **Airdrop Score prominent machen**
   - Sichtbar auf Profil, Leaderboard, Home
   - "Dein Airdrop Score: X" mit Erklärung
   - Formel transparent kommunizieren (was erhöht den Score)
   - Score basiert auf: Scout Score + Level + Aktivität + Holding Duration + Referrals

### HOCH — Erste 2 Wochen

4. **"Founding Scout" Programm**
   - Permanentes Achievement/Badge für erste 50 User
   - Airdrop-Multiplikator für Founding Scouts
   - Exklusives Profil-Badge (nicht nachträglich erhältlich)
   - Landing Page / Invite-Flow

5. **PWA-Basics**
   - Service Worker + Web App Manifest
   - Install Prompt (A2HS)
   - Offline-Grundfunktionen (Profil, Portfolio ansehen)
   - Geschätzter Aufwand: 2 Tage

6. **Supabase auf Pro upgraden**
   - €25/Monat
   - Point-in-Time Recovery, bessere Performance
   - Leaked Password Protection (bisher als Gap gelistet)

### MITTEL — Vor/während Pilot

7. **Club Dashboard erweitern**
   - Fantasy Settings pro Club konfigurierbar
   - Jurisdiktion-Presets (TR/DE = Entry Fee 0)
   - Revenue Dashboard (Echtzeit-Übersicht Einnahmen)
   - Fan-CRM Grundfunktionen (Top-Fans, Aktivste, Scout Score Ranking)

8. **Prestige-Loop optimieren**
   - Achievement-Notifications verbessern
   - Level-Up Animationen/Feedback
   - Leaderboard Position-Changes hervorheben
   - Gamification ist DAS Produkt in Phase 1

9. **Referral-System testen**
   - 500 BSD Belohnung → prüfen ob ausreichend
   - Founding Scout Referral: Höhere Belohnung?
   - Viraler Loop: Referral → Airdrop Score Bonus

---

## 5. Technischer Stand (Referenz)

### Was existiert und funktioniert

- **Stack:** Next.js 14 / TypeScript strict / Tailwind / Supabase
- **DB:** 147 SQL-Migrationen + 1 Edge Function (Push)
- **Frontend:** 20 Routes, ~46 React Query Hooks, 30+ Services
- **State:** TanStack React Query v5 + Zustand v5
- **Monitoring:** Sentry (Errors) + PostHog EU (Analytics, DSGVO-konform)
- **CI/CD:** GitHub Actions, Private Repo

### Features LIVE

- DPC-Trading (Buy/Sell/Orders/Offers) mit atomaren RPCs
- IPO System (Club verkauft DPCs)
- Fantasy (Events, Lineups, Scoring, Leaderboard, Prämien, Pitch-Visualisierung)
- Community (Posts, Votes, Research/Paywall, Bezahlte Polls, Bounties, Leaderboard)
- Reputation (Scout Score, 32 Achievements, Level-System, Missionen, Login-Streaks)
- Multi-Club Architektur (20 Clubs, Club Discovery, Club-Seiten, Admin-Dashboard)
- Club-Abos (Bronze/Silber/Gold)
- Web Push Notifications
- Airdrop Score + Referral System
- Match-Data Integration (API-Football Bridge oder Simulation)
- Creator Monetarisierung (Research-Paywall, Bounties, Bezahlte Polls, Tips)
- Spielplan-Tab auf Club-Seiten (38 GW, Saison-Bilanz)
- Sponsor-Placements (21 Flächen, DB-backed)

### Content (seeded)

- 566 Spieler (20 Clubs, TFF 1. Lig 2025/26)
- 505 Player Images (89% Coverage)
- 100 IPOs aktiv
- 380 Fixtures (38 Spieltage × 10 Spiele)
- 3 Fantasy Events (GW 1)
- 15 Bounties, 10 Club-Votes, 8 Sponsoren

### Bekannte Gaps

- Scout Subscriptions UI (Service vorhanden, kein Frontend)
- Fantasy Live-Score Indicator
- Echte Zahlungen (Pilot = BSD-only, kein Fiat → BY DESIGN)
- Native App (Post-Pilot, PWA als Zwischenschritt)
- i18n / Türkisch ← **BLOCKER #1**
- Leaked Password Protection (gelöst durch Supabase Pro)

---

## 6. Go-to-Market Kontext

### Pilot: Sakaryaspor (TFF 1. Lig)

- **Ziel:** 50 Beta-Tester, Engagement-Daten, Case Study
- **Nächster Schritt:** Echte User einladen
- **Pitch an Verein:** "Kostet euch nichts. Wir bringen euren Fans eine Plattform die euch Einnahmen bringt. Kein Geld involviert im Pilot, nur Fan-Engagement messen."

### Phased Rollout

```
Phase 1: Sakaryaspor → 50-200 User, Proof of Concept
Phase 2: 3-5 weitere 1. Lig Clubs → 500-2.000 User
Phase 3: EIN Süper Lig Club (nicht Galatasaray) → 5.000-20.000 User
Phase 4: Galatasaray → 100.000+ User
```

### Token-Roadmap

```
Pilot: BSD (Prestige, Off-Chain)
Post-Pilot: BSD → $SCOUT Airdrop (ERC-20, Polygon PoS)
$SCOUT: Utility Token, MiCA-konform, handelbar auf Exchanges
DPCs: Bleiben Off-Chain, immer
```

---

## 7. Geldfluss-Architektur

```
Fan-Aktivität → Revenue-Verteilung:

DPC-IPO (Club verkauft):
├── 90% → Verein
└── 10% → BeScout (Platform-Fee)

DPC-Trading (Fan ↔ Fan):
├── 3.5% → BeScout
├── 1.5% → PBT (Player Bound Treasury)
└── 1.0% → Verein

Fantasy (aktuell Free-to-Play):
├── Prämien aus: Club-Budget oder Platform-Pool
└── Keine Fan-Entry-Fees im Pilot

Club-Abos:
├── Bronze: 500 BSD/Mo
├── Silber: 1.500 BSD/Mo
├── Gold: 3.000 BSD/Mo
└── Verteilung: Hauptsächlich Verein, Anteil BeScout

Research-Paywall:
├── 80% → Autor
└── 20% → BeScout

Bezahlte Polls:
├── 70% → Creator
└── 30% → BeScout

Bounties:
├── 95% → Fan (Auftragnehmer)
└── 5% → BeScout
```

---

## 8. UI/Copy Guidelines (regulatorisch bedingt)

### VERBOTEN in jeglicher UI-Copy:

| Nicht verwenden | Stattdessen |
|---|---|
| "Investiere" / "Investment" | "Sammle" / "Sichere dir" |
| "Gewinn" / "Profit" | "Prämie" / "Belohnung" |
| "DPC steigt im Wert" | "DPC-Nachfrage" / "Beliebte DPCs" |
| "Rendite" / "Return" | "Partizipation" / "Anteil" |
| "Wette" / "Einsatz" | "Challenge" / "Teilnahme" |
| "Geld verdienen" | "BSD verdienen" / "Score aufbauen" |
| "Krypto" / "Token" (im Pilot) | "BSD-Guthaben" / "Punkte" |
| "Trading" (als Investment) | "Tauschen" / "Handeln" |

### EMPFOHLEN:

- "Baue dein Fußball-CV auf"
- "Zeige dein Wissen"
- "Unterstütze deinen Verein"
- "Werde zum Scout"
- "Sammle Partizipationsrechte"
- "Tausche DPCs mit anderen Fans"
- "Club Challenge" (statt "Turnier")

---

## 9. Zusammenfassung: Was jetzt zu tun ist

### Sofort (diese Woche):

1. ✅ i18n Setup (next-intl, TR + DE)
2. ✅ Fantasy Entry Fees → 0 für alle Events
3. ✅ Airdrop Score auf Profil + Leaderboard prominent anzeigen
4. ✅ Founding Scout Badge/Achievement anlegen (max. 50 Plätze)

### Nächste 2 Wochen:

5. ✅ PWA Setup (Service Worker, Manifest, Install Prompt)
6. ✅ Club Dashboard: Fantasy Settings konfigurierbar machen
7. ✅ Prestige-Loop: Achievement-Notifications, Level-Up Feedback
8. ✅ UI-Copy Audit gegen verbotene Begriffe (siehe Abschnitt 8)

### Vor Pilot-Launch:

9. ✅ Supabase Pro Upgrade
10. ✅ Referral-Flow testen und optimieren
11. ✅ Landing Page für "Founding Scout" Early Access
12. ✅ TOS/AGB: Vereine verantwortlich für lokale Gesetze (Template)

---

## 10. Woran NICHT arbeiten (Pilot-Phase)

- ❌ NFT/Blockchain für DPCs
- ❌ $SCOUT Smart Contract (kommt Post-Pilot)
- ❌ Fiat-Zahlungen / Payment-Integration
- ❌ Native App (PWA reicht für Pilot)
- ❌ CASP-Lizenz
- ❌ Neue Revenue-Streams (was da ist reicht)
- ❌ Multi-Liga (Pilot = nur TFF 1. Lig)

---

*Dieses Briefing ist die Single Source of Truth für alle Entwicklungsentscheidungen bis zum Ende der Pilot-Phase. Bei Widersprüchen zu älteren Dokumenten gilt dieses Briefing. alte relevante informationen sollen als wissenserweitung genutzt werden
