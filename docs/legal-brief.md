# BeScout — Legal Brief für Rechtsberatung

> **Zweck:** Dieses Dokument fasst alle rechtlich relevanten Aspekte der BeScout-Plattform zusammen, damit ein Anwalt eine fundierte Einschätzung geben und offene Fragen beantworten kann.
>
> **Stand:** 18. Februar 2026
> **Autor:** Anil Demirci, Gründer & CEO, BeScout
> **Zielgruppe:** Externer Rechtsberater / Kanzlei

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Produkt-Beschreibung](#2-produkt-beschreibung)
3. [Revenue-Modell & Geldflüsse](#3-revenue-modell--geldflüsse)
4. [Fantasy / Glücksspiel-Risiko](#4-fantasy--glücksspiel-risiko)
5. [DPC-Klassifizierung](#5-dpc-klassifizierung)
6. [BSD-Währungs-Klassifizierung](#6-bsd-währungs-klassifizierung)
7. [$SCOUT Token — MiCA & Krypto-Regulierung](#7-scout-token--mica--krypto-regulierung)
8. [Jurisdiktions-Matrix](#8-jurisdiktions-matrix)
9. [Fehlende Legal-Infrastruktur](#9-fehlende-legal-infrastruktur)
10. [Konkrete Fragen an den Anwalt](#10-konkrete-fragen-an-den-anwalt)

---

## 1. Executive Summary

### Was ist BeScout?

BeScout ist eine **B2B2C Fan-Engagement- und Monetarisierungsplattform** für Fußballvereine. Vereine nutzen BeScout als Tool, um ihre Fans aufzubauen, zu binden und zu monetarisieren. Fans kaufen digitale Partizipationslizenzen (DPCs) für Spieler, stellen Fantasy-Lineups auf, stimmen bei Club-Abstimmungen ab, schreiben Analysen und verdienen eine plattforminterne Währung namens BSD (BeScout Dollar).

**Analogie:** BeScout ist "Shopify für Fan-Engagement" — Vereine sind die Shops, Spieler sind die Produkte, Fans sind die Kunden. BeScout stellt die Infrastruktur und verdient eine Plattform-Gebühr.

### Aktueller Stand

- **Pilot-Phase** mit Sakaryaspor (TFF 1. Lig, Türkei)
- 566 Spieler von 20 Clubs, 50 Beta-Tester geplant
- Rein digitale Plattform, Web-App (kein nativer App-Store)
- **Kein Blockchain, keine Kryptowährung, kein Echtgeld involviert** (im Pilot)
- Sitz der Plattform: noch nicht endgültig festgelegt (aktuell privates Projekt)
- Ziel-Jurisdiktionen: Türkei (Primär), Deutschland (Sekundär), Malta/EU (Expansion)

### Warum dieses Legal Brief?

Vor dem Pilot-Launch mit echten Nutzern müssen folgende Fragen geklärt werden:
1. Sind DPCs Wertpapiere oder regulierte Finanzprodukte?
2. Ist BSD als geschlossene Plattform-Währung regulatorisch problematisch?
3. Fallen Fantasy-Turniere unter Glücksspiel-Regulierung?
4. Welche rechtliche Infrastruktur (AGB, Datenschutz, etc.) fehlt?
5. Was ist nötig für den geplanten $SCOUT-Token (Post-Pilot)?

---

## 2. Produkt-Beschreibung

### 2.1 DPCs — Digital Player Cards (Digitale Partizipationslizenzen)

**Was sie sind:**
DPCs sind digitale Einträge in einer zentralen Datenbank (Supabase/PostgreSQL), die der jeweilige Fußballverein für seine Spieler herausgibt. Sie gewähren dem Inhaber bestimmte Nutzungsrechte auf der Plattform.

**Was sie NICHT sind:**
- Keine NFTs (kein Blockchain-Eintrag)
- Keine Wertpapiere (keine Unternehmensanteile, kein Ertrag aus Unternehmenserfolg)
- Keine Kryptowährung
- Keine Sammelkarten im herkömmlichen Sinne (kein physisches Pendant)

**Nutzungsrechte einer DPC:**
1. **Fantasy:** Berechtigt den Inhaber, den Spieler in Fantasy-Lineups einzusetzen
2. **Voting:** DPC-Inhaber können bei spieler- und clubbezogenen Abstimmungen teilnehmen
3. **Content-Zugang:** Exklusive spielerbezogene Inhalte für DPC-Inhaber
4. **PBT-Partizipation:** Anteil am Player Bound Treasury (ein Topf, der sich durch Transaktionsgebühren füllt und bei bestimmten Events an DPC-Inhaber ausgeschüttet wird)
5. **Reputation:** DPC-Besitz fließt in den "Scout Score" (Reputationswert) des Nutzers ein

**Emission und Kontrolle:**
- **Der Verein** erstellt DPCs für seine Spieler über ein Admin-Dashboard
- **Der Verein** setzt den Preis (IPO-Preis), die Menge (max. 300 pro Spieler) und die Laufzeit
- **Der Verein** kann DPCs einfrieren, liquidieren, und Preise anpassen
- BeScout ist lediglich der Infrastruktur-Anbieter, nicht der Emittent
- Alle DPC-Daten sind in einer zentralen Datenbank gespeichert (kein dezentrales System)

**Sekundärmarkt:**
Nutzer können DPCs untereinander tauschen (kaufen/verkaufen) über ein Orderbuch-System. Der Preis ergibt sich aus Angebot und Nachfrage. Bezahlung erfolgt ausschließlich in BSD (nicht in Echtgeld).

**Supply-Limits:**
- Maximale Auflage pro Spieler: 300 DPCs (hart kodiert)
- Keine Rarity-Tiers (alle DPCs eines Spielers sind gleichwertig)

### 2.2 BSD — BeScout Dollar

**Was es ist:**
BSD ist eine geschlossene Plattform-Währung (virtuelle Gutscheine/Credits), die ausschließlich innerhalb der BeScout-Plattform verwendet werden kann.

**Eigenschaften:**
- Reine Datenbankeinträge (BIGINT in Cents, 100 Cents = 1 BSD)
- **Kein Geldwert** — BSD hat keinen Wechselkurs zu Echtgeld
- **Kein Cashout** — Nutzer können BSD nicht in Euro, Lira oder andere Währungen umtauschen
- **Kein Kauf mit Echtgeld** — Im Pilot erhalten Nutzer BSD als Willkommensbonus (10.000 BSD bei Registrierung)
- Verwendung: DPC-Kauf, Club-Abos, Bounty-Belohnungen, Poll-Teilnahme, Trinkgeld

**Vergleich:**
BSD funktioniert ähnlich wie Spielgeld in einer Gaming-App oder Punkte in einem Loyalitätsprogramm. Es hat keine Eigenschaft von E-Geld gemäß ZAG (DE) oder SPK (TR).

### 2.3 $SCOUT Token (geplant, NICHT im Pilot)

**Was geplant ist (ca. Q3/Q4 2026):**
- ERC-20 Token auf der Polygon PoS Blockchain
- Kategorisierung als **Utility Token unter MiCA Title II** (EU Markets in Crypto-Assets Regulation)
- Airdrop: Nutzer erhalten $SCOUT basierend auf ihrem Airdrop Score (Aktivität × Multiplikatoren)
- Handelbar auf Krypto-Börsen nach Listing
- Bridge: $SCOUT ↔ BSD (Ein-/Auszahlung auf der Plattform)

**Was JETZT existiert:**
- Ein "Airdrop Score" der die spätere Token-Berechtigung trackt
- Eine öffentliche Leaderboard-Seite die den Score transparent macht
- Der Score basiert auf: Aktivität, Trading-Volumen, Holdings, Referrals, Level
- Es gibt KEIN Token, KEINE Blockchain-Integration, KEINEN Smart Contract im Pilot

**Regulatorische Implikation:**
- MiCA Title II erfordert: White Paper, Notification an zuständige NCA (National Competent Authority)
- Geschätzte Kosten: €15.000–35.000 für White Paper + rechtliche Begleitung
- Zeitrahmen: 3–5 Monate
- Empfohlene EU-Entity: Irland oder Malta
- CASP-Lizenz (Crypto-Asset Service Provider) nur nötig wenn BeScout selbst als Exchange agiert

---

## 3. Revenue-Modell & Geldflüsse

### Übersicht der Einnahmequellen

| Quelle | Fee-Struktur | Empfänger |
|--------|-------------|-----------|
| DPC-Trading (Sekundärmarkt) | 6% total: 3,5% Plattform + 1,5% PBT + 1% Club | BeScout + Player Treasury + Club |
| DPC-IPO (Erstverkauf) | 85% Club + 10% Plattform + 5% PBT | Club + BeScout + Player Treasury |
| Research-Paywall | 80% Autor + 20% Plattform | Creator + BeScout |
| Bezahlte Polls | 70% Creator + 30% Plattform | Creator + BeScout |
| Bounties (Club-Aufträge) | 95% Fan + 5% Plattform | Fan + BeScout |
| Club-Abos | Bronze 500 / Silber 1.500 / Gold 3.000 BSD/Monat | Hauptsächlich Club |
| Sponsor-Placements | 21 Werbeflächen, DB-gesteuert | BeScout (direkt) |

### Wichtige Klarstellungen

1. **Alle Transaktionen laufen in BSD** — kein Echtgeld ist involviert
2. **Im Pilot gibt es keine Fiat-On-Ramps** — Nutzer können kein Geld einzahlen
3. **BSD wird gratis zugeteilt** — 10.000 BSD Willkommensbonus + Verdienstmöglichkeiten
4. **Clubs verdienen BSD** — die wirtschaftliche Verwertung (ob/wie Clubs BSD in Echtgeld wandeln) ist für Post-Pilot geplant
5. **BeScout selbst verdient im Pilot kein Echtgeld aus der Plattform** — das Modell wird mit BSD als Prestige-Währung validiert

### Fee-Konfiguration (technisch)

Gebühren sind pro Club konfigurierbar über eine `fee_config` Tabelle:
- `trade_fee_bps`: Gesamtgebühr in Basispunkten (Standard: 600 = 6%)
- `trade_platform_bps`: Plattform-Anteil (Standard: 350 = 3,5%)
- `trade_pbt_bps`: Player-Treasury-Anteil (Standard: 150 = 1,5%)
- `trade_club_bps`: Club-Anteil (Standard: 100 = 1%)
- `ipo_club_bps`: Club-Anteil bei IPO (Standard: 8500 = 85%)
- `ipo_platform_bps`: Plattform-Anteil bei IPO (Standard: 1000 = 10%)
- `ipo_pbt_bps`: PBT-Anteil bei IPO (Standard: 500 = 5%)

---

## 4. Fantasy / Glücksspiel-Risiko

### Das Feature

Nutzer stellen Fantasy-Lineups aus DPCs zusammen, die sie besitzen. Basierend auf den realen Leistungen der Spieler (Tore, Assists, Clean Sheets etc.) werden Punkte vergeben. Die besten Lineups erhalten Prämien in BSD.

### Glücksspiel-Definition (Drei-Elemente-Test)

In den meisten Jurisdiktionen gilt:
```
GLÜCKSSPIEL = Einsatz + Zufall + Gewinn
→ Fehlt EINES der drei Elemente = KEIN Glücksspiel
```

### Unsere Maßnahmen: Element "Einsatz" eliminieren

1. **Entry Fee = 0 BSD** für alle Events in regulierten Märkten (TR, DE)
   - Technisch implementiert: Jurisdiktions-Presets im Club-Dashboard
   - Code: `AdminSettingsTab.tsx` — Jurisdiktion TR/DE = automatische Fee-Sperre
   - Events mit Fee > 0 sind nur in unregulierten Märkten (z.B. Malta) möglich

2. **Prämien aus Platform-Budget**, NICHT aus Teilnehmer-Pool
   - Es gibt keinen "Pot" der aus Teilnehmer-Einsätzen gespeist wird
   - Prämien werden vom Club oder der Plattform bereitgestellt

3. **BSD hat keinen Geldwert**
   - Selbst wenn es als "Gewinn" betrachtet würde: BSD ist nicht in Echtgeld umwandelbar
   - Vergleichbar mit Leaderboard-Punkten oder Achievements

### Jurisdiktions-spezifische Risiken

**Türkei:**
- Null-Toleranz-Politik gegen illegales Glücksspiel
- MASAK (Finanz-Aufsicht) und BTK (Telekommunikations-Aufsicht) kooperieren aktiv
- Alles was nicht staatlich kontrolliert ist (İddaa/Spor Toto), wird verfolgt
- **Unser Schutz:** Keine Entry Fees, kein Echtgeld, Framing als "Club-Challenge"

**Deutschland:**
- GGL (Gemeinsame Glücksspielbehörde der Länder) hat DFS (Daily Fantasy Sports) als unerlaubtes Glücksspiel eingestuft
- Keine Lizenzkategorie für DFS existiert
- **Unser Schutz:** Keine Entry Fees, kein Echtgeld, BSD ist Prestige-Währung

### Technische Nachweise

Im Quellcode sind folgende Sicherungen implementiert:
- `AdminSettingsTab.tsx`: Jurisdiktion-Dropdown mit automatischer Fee-Sperre (TR/DE)
- `create_event` RPC: Nimmt Entry-Fee-Parameter entgegen, kann auf 0 gesetzt werden
- `events.entry_fee_cents`: DB-Spalte die pro Event den Fee speichert
- Alle 3 aktiven Events haben `entry_fee_cents = 0`

---

## 5. DPC-Klassifizierung

### Warum DPCs KEINE Wertpapiere sind

| Kriterium (Howey Test / WpPG / SPK) | DPC | Wertpapier |
|------|-----|------------|
| Kapitalanlage mit Geld | Nein — Kauf mit BSD (Prestige-Währung, kein Geldwert) | Ja — Echtgeld |
| Erwartung auf Gewinn | Nein — DPCs gewähren Nutzungsrechte (Fantasy, Voting, Content) | Ja — Dividende/Kurssteigerung |
| Gewinn durch Dritte | Nein — Wert ergibt sich aus Plattform-Nutzung, nicht aus Unternehmenserfolg | Ja — Management-Leistung |
| Fungibel & standardisiert | Nur innerhalb der Plattform handelbar, kein externer Markt | Auf regulierten Börsen handelbar |
| Emittent | Fußballverein (nicht BeScout) | Unternehmen |
| Dezentral handelbar | Nein — zentrales Orderbuch auf BeScout-Servern | Ja — offene Märkte |

### Zusätzliche Argumente

1. **DPCs sind Off-Chain:** Keine Blockchain, keine dezentrale Infrastruktur, kein "Ownership" im kryptographischen Sinne. DPCs sind Datenbankeinträge die BeScout bzw. der Club jederzeit ändern, einfrieren oder löschen kann.

2. **Keine Rendite-Erwartung:** DPCs zahlen keine Dividende. Der PBT (Player Bound Treasury) ist ein gamifizierter Belohnungsmechanismus in BSD, nicht eine Gewinnausschüttung. Die Success Fee ist optional und wird vom Verein gesteuert.

3. **Nutzungsrechte stehen im Vordergrund:** Ohne DPC kann ein Nutzer nicht am Fantasy-Game teilnehmen, nicht an spielerbezogenen Abstimmungen teilnehmen, und hat keinen Zugang zu exklusiven Inhalten. Die primäre Funktion ist Partizipation, nicht Spekulation.

4. **Geschlossenes System:** DPCs existieren nur auf BeScout und können die Plattform nicht verlassen. Es gibt keinen externen Markt, keine API für Dritte, und keinen Weg DPCs außerhalb von BeScout zu handeln.

5. **Club-Kontrolle:** Der Verein hat volle Kontrolle über Supply, Preis, und Lifecycle. DPCs können jederzeit liquidiert werden. Das unterscheidet sie fundamental von Wertpapieren, bei denen der Emittent nach Emission keine Kontrolle mehr hat.

### Potenzielle Gegenargumente

- **Sekundärmarkt-Trading** könnte als Hinweis auf spekulative Nutzung gewertet werden
- **Preisänderungen** durch Angebot/Nachfrage könnten als "Wertsteigerung" interpretiert werden
- **PBT-Ausschüttung** könnte als renditeähnliches Element gesehen werden

→ **Diese Punkte müssen vom Anwalt bewertet werden.**

---

## 6. BSD-Währungs-Klassifizierung

### Warum BSD KEIN E-Geld ist

**E-Geld-Definition (EU-Richtlinie 2009/110/EG, ZAG §1 Abs. 2, SPK):**
E-Geld ist ein monetärer Wert, der elektronisch gespeichert ist, gegen Zahlung eines Geldbetrags ausgegeben wird, und von anderen als dem Emittenten als Zahlungsmittel akzeptiert wird.

| Kriterium | BSD | E-Geld |
|-----------|-----|--------|
| Gegen Geldzahlung ausgegeben | **Nein** — BSD wird gratis zugeteilt (Willkommensbonus) | Ja — 1:1 gegen Geld |
| Externer Akzeptanzkreis | **Nein** — nur auf BeScout verwendbar | Ja — bei Dritten akzeptiert |
| Rücktausch in Geld | **Nein** — kein Cashout möglich | Ja — Rücktauschrecht |
| Wertaufbewahrung | **Nein** — kein innerer Wert, nicht übertragbar | Ja |

### Vergleichbare Modelle

- **Spielgeld in Games** (z.B. FIFA Points, V-Bucks): Kein E-Geld, keine Regulierung
- **Bonuspunkte in Loyalty-Programmen** (z.B. Payback, Miles & More): Kein E-Geld
- **Virtuelle Währungen in Social Games** (z.B. Zynga Chips): Kein E-Geld

### Risiko: Spätere Fiat-Integration

Wenn BeScout in Zukunft erlaubt, BSD gegen Echtgeld zu kaufen oder $SCOUT gegen Fiat zu tauschen, ändert sich die regulatorische Bewertung grundlegend. Dies ist im Pilot **nicht geplant**.

---

## 7. $SCOUT Token — MiCA & Krypto-Regulierung

### Geplantes Token-Modell

| Eigenschaft | Detail |
|-------------|--------|
| Standard | ERC-20 |
| Blockchain | Polygon PoS (Ethereum Layer 2) |
| Kategorie | Utility Token (MiCA Title II) |
| Utility | Plattform-Zugang, Premium-Features, Governance, Bridge zu BSD |
| Distribution | Airdrop basierend auf Pilot-Aktivität (Airdrop Score) |
| Zeitrahmen | Frühestens Q3/Q4 2026 |

### MiCA Title II Anforderungen

1. **Crypto-Asset White Paper**
   - Beschreibung des Tokens und seiner Utility
   - Rechte und Pflichten des Emittenten und Inhabers
   - Risikofaktoren
   - Technische Beschreibung (Smart Contract, Blockchain)
   - Keine Genehmigung nötig, aber Notification an NCA

2. **Notification an National Competent Authority (NCA)**
   - Mindestens 40 Arbeitstage vor Token-Launch
   - White Paper einreichen
   - NCA kann Bedenken äußern, aber kein Genehmigungsverfahren

3. **EU-Entity erforderlich**
   - Der Token-Emittent muss eine EU-juristische Person sein
   - Empfehlung: Irland (DAFM als NCA, tech-freundlich) oder Malta (MFSA, Krypto-Hub)

4. **CASP-Lizenz (Crypto-Asset Service Provider)**
   - Nur nötig wenn BeScout selbst als Exchange/Custody agiert
   - Wenn Listing auf bestehenden Börsen (z.B. Binance, Kraken): deren CASP-Lizenz reicht
   - Wenn BeScout einen eigenen Swap-Service anbietet: eigene CASP-Lizenz nötig

### Airdrop-spezifische Fragen

- **Steuerliche Behandlung des Airdrops** für Nutzer in TR/DE/EU
- **Rückwirkende Leistung** (Nutzer haben im Pilot ohne Token-Versprechen agiert — ändert der Airdrop die rechtliche Bewertung der Pilot-Aktivitäten?)
- **Whitelist/KYC** bei Airdrop-Claim: Ab welchem Wert ist Identitätsverifikation nötig?

---

## 8. Jurisdiktions-Matrix

### Feature-Verfügbarkeit nach Jurisdiktion

| Feature | Türkei (TR) | Deutschland (DE) | Malta (MT) | Rest-EU |
|---------|:-----------:|:-----------------:|:----------:|:-------:|
| DPC-Trading (BSD) | ✅ | ✅ | ✅ | ✅ |
| Fantasy (Entry Fee = 0) | ✅ | ✅ | ✅ | ✅ |
| Fantasy (Entry Fee > 0) | ❌ | ❌ | ✅* | ✅* |
| Club-Abos (BSD) | ✅ | ✅ | ✅ | ✅ |
| Research-Paywall (BSD) | ✅ | ✅ | ✅ | ✅ |
| $SCOUT Token | ❌** | ✅*** | ✅ | ✅ |
| Fiat Ein-/Auszahlung | ❌ | ❌ | Geplant | Geplant |

\* Nur wenn Club lokale Lizenz hat oder Feature nicht als Glücksspiel klassifiziert wird
\** Türkei hat Kryptowährungs-Zahlungen verboten (TCMB Verordnung 2021); Halten und Handeln auf Exchanges weiter erlaubt — rechtliche Lage unklar
\*** Unter MiCA-Regelung, NCA = BaFin

### Technische Umsetzung

Das Club-Dashboard enthält ein Jurisdiktions-Preset (TR/DE/OTHER):
- Bei TR/DE werden Entry Fees automatisch auf 0 gesetzt und sind nicht änderbar
- Bei OTHER können Clubs eigenverantwortlich Entry Fees konfigurieren
- Diese Einstellung ist im Code `AdminSettingsTab.tsx` implementiert und DB-gesichert

---

## 9. Fehlende Legal-Infrastruktur

### Was aktuell NICHT existiert und vor Pilot-Launch benötigt wird

| Dokument | Status | Priorität | Bemerkung |
|----------|--------|-----------|-----------|
| **AGB / Terms of Service** | ❌ Fehlt | KRITISCH | Nutzervertrag, Haftungsbegrenzung, Verein als Emittent (nicht BeScout) |
| **Datenschutzerklärung** | ❌ Fehlt | KRITISCH | DSGVO (DE/EU) + KVKK (TR), Supabase EU-Hosting (Frankfurt), PostHog EU |
| **Impressum** | ❌ Fehlt | KRITISCH | Pflicht in DE (TMG §5), empfohlen in TR |
| **Altersverifikation (18+)** | ❌ Fehlt | HOCH | Checkbox bei Registrierung reicht ggf. nicht; Prüfpflicht klären |
| **Glücksspiel-Disclaimer** | ❌ Fehlt | HOCH | Obwohl wir kein Glücksspiel anbieten, präventiver Disclaimer empfehlenswert |
| **Risk Disclosure für Trading** | ❌ Fehlt | HOCH | "DPC-Preise können schwanken. BSD hat keinen Geldwert." |
| **Club-Compliance-Template** | ❌ Fehlt | MITTEL | Vorlage für Vereine die BeScout nutzen (eigene Pflichten bzgl. lokaler Gesetze) |
| **Cookie-Consent** | ❌ Fehlt | MITTEL | DSGVO-Pflicht für Analytics (PostHog) + Funktions-Cookies (Locale, Auth) |
| **Lösch-Prozess (DSGVO Art. 17)** | ❌ Teilweise | MITTEL | Account-Löschung existiert, aber kein formaler Prozess + Bestätigung |
| **Auftragsverarbeitung (AVV)** | ❌ Fehlt | MITTEL | Mit Supabase, Sentry, PostHog — alle EU-gehostet |

### Datenverarbeitung (Übersicht für Datenschutzerklärung)

| Dienst | Zweck | Hosting | Datenbasis |
|--------|-------|---------|------------|
| Supabase | Datenbank, Auth, Storage | EU (eu-west-1, Irland) | PostgreSQL |
| Sentry | Error Tracking | EU | Error-Logs, Stack Traces |
| PostHog | Analytics | EU (Frankfurt) | Nutzungsverhalten, Feature Flags |
| GitHub | Code-Hosting, CI/CD | USA | Quellcode (keine Nutzerdaten) |
| Vercel | Hosting | Global CDN (EU-First) | Statische Assets, Server-Functions |

### Personenbezogene Daten die erhoben werden

- E-Mail-Adresse (Auth)
- Display-Name und Handle (Profil)
- Avatar-Bild (optional, Supabase Storage)
- Aktivitätsdaten (Trades, Lineups, Posts, Votes)
- BSD-Balance und Transaktionshistorie
- Geräte-/Browser-Infos (PostHog Analytics)
- Push-Subscription-Endpoint (Web Push)

---

## 10. Konkrete Fragen an den Anwalt

### A. DPC-Klassifizierung

**1.** Sind DPCs in ihrer aktuellen Form (Off-Chain, BSD-basiert, Nutzungsrechte, Club als Emittent) in der Türkei und/oder Deutschland als Finanzinstrument, Wertpapier, oder sonstiges reguliertes Produkt einzuordnen? Wenn ja, welche Konsequenzen ergeben sich?

**2.** Ändert der Sekundärmarkt-Handel (Nutzer tauschen DPCs untereinander gegen BSD) die regulatorische Bewertung? Insbesondere: stellt BeScout durch das Betreiben des Orderbuchs einen "organisierten Markt" oder eine "Handelsplattform" dar?

### B. BSD-Klassifizierung

**3.** Ist BSD als geschlossenes Plattform-Guthaben (kein Kauf mit Echtgeld, kein Cashout, kein externer Akzeptanzkreis) unter ZAG (DE), SPK (TR) oder PSD2 (EU) reguliert? Insbesondere: besteht eine E-Geld-Lizenzpflicht?

**4.** Wie ändert sich die Bewertung, wenn in Zukunft BSD gegen Echtgeld gekauft werden kann (Fiat-On-Ramp)?

### C. Fantasy & Glücksspiel

**5.** Sind Fantasy-Turniere OHNE Entry Fee und mit Prämien in BSD (kein Geldwert) in der Türkei und Deutschland als Glücksspiel einzuordnen? Welche zusätzlichen Maßnahmen (Disclaimer, Altersbeschränkung, etc.) werden empfohlen?

**6.** Wie sollte das Feature in der UI geframed werden, um regulatorische Risiken zu minimieren? Reicht "Club-Challenge" als Bezeichnung?

### D. Token & MiCA

**7.** Wenn wir einen $SCOUT Utility Token (ERC-20, Polygon) als Airdrop verteilen: Welche konkrete Schritte sind nötig (Entity-Gründung, White Paper, NCA-Notification)? Was sind realistische Kosten und Zeitrahmen?

**8.** Ändert der geplante $SCOUT-Airdrop die regulatorische Bewertung der AKTUELLEN Pilot-Phase (Stichwort: rückwirkende Werthaltigkeitsvermutung für BSD)?

### E. Rechtliche Infrastruktur

**9.** Welche Dokumente (AGB, Datenschutz, Disclaimer) werden als Minimum vor dem Pilot-Launch benötigt? Können Sie Templates bereitstellen oder müssen diese individuell erstellt werden?

**10.** Wie sollte das Vertragsverhältnis zwischen BeScout und den Vereinen (B2B) gestaltet werden? Insbesondere: Wie wird sichergestellt, dass die regulatorische Verantwortung für lokale Gesetze beim Verein liegt (z.B. Glücksspiel-Compliance in seiner Jurisdiktion)?

---

## Anhang A: Technische Referenzen

Für detaillierte technische Dokumentation stehen folgende Dateien zur Verfügung:

| Datei | Inhalt |
|-------|--------|
| `docs/VISION.md` | Vollständige Produktvision und Fan-Ökonomie |
| `docs/bescout-briefing-claude-code.md` | Regulatorische Leitplanken und Architektur-Entscheidungen |
| `docs/STATUS.md` | Aktueller Entwicklungsstand und Feature-Liste |
| `src/components/admin/AdminSettingsTab.tsx` | Jurisdiktion-Enforcement Code |
| `src/types/index.ts` | Fee-Config und Datenstruktur |
| `CLAUDE.md` | Gesamte Projektdokumentation für Entwicklung |

## Anhang B: UI-Copy Guidelines (regulatorisch bedingt)

Folgende Begriffe werden in der UI **bewusst vermieden**, um keine regulatorischen Implikationen auszulösen:

| Verboten | Stattdessen verwendet |
|----------|----------------------|
| "Investiere" / "Investment" | "Sammle" / "Sichere dir" |
| "Gewinn" / "Profit" | "Prämie" / "Belohnung" |
| "DPC steigt im Wert" | "DPC-Nachfrage" / "Beliebte DPCs" |
| "Rendite" / "Return" | "Partizipation" / "Anteil" |
| "Wette" / "Einsatz" | "Challenge" / "Teilnahme" |
| "Geld verdienen" | "BSD verdienen" / "Score aufbauen" |
| "Krypto" / "Token" (im Pilot) | "BSD-Guthaben" / "Punkte" |
| "Trading" (als Investment) | "Tauschen" / "Handeln" |

## Anhang C: Geldfluss-Diagramm

```
┌─────────────────────────────────────────────────────┐
│                     FAN-AKTIVITÄT                    │
└──────┬────────┬────────┬────────┬────────┬──────────┘
       │        │        │        │        │
       ▼        ▼        ▼        ▼        ▼
   DPC-IPO  Trading  Fantasy  Research  Bounty
       │        │        │        │        │
       ▼        ▼        ▼        ▼        ▼
┌──────────────────────────────────────────────────────┐
│              BSD-VERTEILUNG (in BSD)                  │
│                                                      │
│  IPO:     85% Club │ 10% BeScout │ 5% PBT           │
│  Trade:   3.5% BeScout │ 1.5% PBT │ 1% Club         │
│  Research: 80% Autor │ 20% BeScout                   │
│  Polls:   70% Creator │ 30% BeScout                  │
│  Bounty:  95% Fan │ 5% BeScout                       │
│                                                      │
│  ⚠ Alles in BSD — kein Echtgeld involviert           │
└──────────────────────────────────────────────────────┘
```

---

*Dieses Dokument wurde am 18.02.2026 erstellt und spiegelt den aktuellen Stand der BeScout-Plattform wider. Es dient ausschließlich der Informationsbereitstellung an den Rechtsberater und stellt keine rechtliche Beratung dar.*
