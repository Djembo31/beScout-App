---
title: BeScout Legal-Klassifizierung — Securities/E-Geld/Glücksspiel-Einordnung, CSF-Vertrag & Anwalts-Fragen
created: 2026-02-18
updated: 2026-06-29
status: active
tags: [legal, compliance, securities, e-geld, gluecksspiel, mica, casp, scout-card, csf, anwalt, jurisdiktion]
consult_when: Legal-Klassifizierung, Securities/Wertpapier (Howey/WpPG/SPK), E-Geld (ZAG/PSD2/SPK), Glücksspiel-Risiko (MASAK/BTK/GGL/DFS), MiCA/CASP/$SCOUT-Token, Anwalts-Fragen, CSF-Rechtsvertrag (Community Success Fee), success_fee_platform_bps, Jurisdiktions-Matrix, fehlende Legal-Infrastruktur (AGB/Impressum/DSGVO/KVKK/AVV), Datenverarbeitung/Hosting
---

> **Kanonische Legal-Klassifizierungs-Heimat** (konsolidiert 2026-06-29 aus den früheren `docs/legal-brief.md` (2026-02-18) + `docs/CONCEPT-DPC-ECONOMY.md` [Legal-/Vertrags-Teil] + `docs/BeScout_Licensing_Roadmap_v1.docx` [Lizenz-Matrix → §6.1] → git-History, Slice 447 K2.3-C).
> **Internes Register** (Asset-/Invest-/Anteils-Sprache ist hier strategisch/juristisch erlaubt, weil sie die Produkt-Wahrheit für die rechtliche Einordnung benennt). User-facing gilt NUR Utility-Wording → `.claude/rules/business.md`.
> **Geld-/Fee-Kontext (kanonisch)** → [domain/treasury.md](../domain/treasury.md). **Markt/GTM** → [research/gtm-strategy.md](../research/gtm-strategy.md). **Compliance-Wording-Regeln** → `.claude/rules/business.md`.
> **Disclaimer:** Dieses Dokument bündelt den rechtlich relevanten Stand zur Vorlage bei einem Rechtsberater. Es ist **keine Rechtsberatung** — die Einordnungen unten sind die *Argumentations-Position* von BeScout (mit ehrlichen Gegenargumenten), die ein Anwalt prüfen muss.

# BeScout — Legal-Klassifizierung

## Terminologie (für diese Seite)

| Produkt-Name (user-facing) | Code-/rechtlich-intern | Bedeutung |
|---|---|---|
| **Scout Card** (digitale Sammelkarte mit Utility) | `dpc` / „DPC" = Digital Player Card | Digitaler Eintrag, vom Club je Spieler herausgegeben, gewährt Nutzungsrechte |
| **Credits** (Platform-Credits, Spielgeld) | `cents` (BIGINT), Legacy „BSD" | Geschlossene Plattform-Einheit, 1 Credit = 100 cents |
| **Erstverkauf** (user-facing) | `ipo` / „IPO" | Erstausgabe von Scout Cards eines Spielers |
| **$SCOUT-Coin** | — | Zukünftiger ICO-Coin (Phase 2), NICHT die heutige Credits-Einheit |

Dieses Doc nutzt „Scout Card" / „Credits"; „DPC" / „IPO" erscheinen nur, wo die Code-/Vertrags-Ebene gemeint ist. **User-facing-Wording-Regeln (Verbots-/Ersatz-Listen) sind kanonisch in `.claude/rules/business.md` — hier NICHT dupliziert.**

## Phasen-Modell (rechtlicher Rahmen, ADR-028 / D99)

| Phase | Auslöser | Scope | Geld |
|---|---|---|---|
| **Phase 1 (jetzt)** | — | Scout-Card-Trading, Free Fantasy, Votes, Events, Scout Reports | **Credits = wertloses Spielgeld** (kein €-Wert, nicht kaufbar/auszahlbar) |
| **Phase 2** | nach gültiger Token-Lizenz (CASP vs. MiCA Title II — **Anwalt vor ICO**) | $SCOUT-Coin (ICO), Cash-Out, Exchange | echtes € möglich |
| **Phase 3** | nach MGA | Paid Fantasy Entry, Turniere mit Preisen | Einsatz/Preise |

Die rechtliche Bewertung unten gilt **Phase 1** (geschlossene Credits-Welt, kein Echtgeld). Jeder Schritt Richtung Fiat-On-/Off-Ramp ändert die Einordnung grundlegend (siehe §$SCOUT + Fragen 4/8).

---

## 1. Was wird eingeordnet?

- **Scout Card (DPC):** Off-Chain-Datenbankeintrag (Supabase/PostgreSQL), vom **Club** (nicht BeScout) je Spieler herausgegeben. Gewährt Nutzungsrechte: Fantasy-Einsatz · Voting · Content-Zugang · PBT-Partizipation · Scout-Score-Reputation. **Kein** NFT/Blockchain, **kein** Unternehmensanteil, **keine** Krypto. Sekundärmarkt: User tauschen Cards über ein internes Orderbuch, Bezahlung **nur in Credits**. Club kontrolliert Supply, Preis, Lifecycle (einfrieren/liquidieren).
- **Credits:** Geschlossene Plattform-Einheit (BIGINT cents). Kein Geldwert, kein Cashout, kein Kauf mit Echtgeld in Phase 1. Zuteilung gratis (Welcome-Bonus + Verdienst durch Aktivität).
- **$SCOUT-Coin:** geplanter ERC-20-Utility-Token (Phase 2), separat behandelt unten.

**Analogie für den Pitch:** „Shopify für Fan-Engagement" — Clubs = Shops, Spieler = Produkte, Fans = Kunden, BeScout = Infrastruktur + Plattform-Gebühr.

---

## 2. Scout-Card-Klassifizierung — KEIN Wertpapier (Argumentation)

Test gegen Howey (US) / WpPG (DE) / SPK (TR):

| Kriterium | Scout Card (DPC) | Wertpapier |
|---|---|---|
| Kapitalanlage mit Geld | **Nein** — Kauf mit Credits (Spielgeld, kein Geldwert) | Ja — Echtgeld |
| Erwartung auf Gewinn | **Nein** — Card gewährt Nutzungsrechte (Fantasy, Voting, Content) | Ja — Dividende/Kurssteigerung |
| Gewinn durch Leistung Dritter | **Nein** — Wert aus Plattform-Nutzung, nicht aus Unternehmenserfolg | Ja — Management-Leistung |
| Fungibel & standardisiert | nur plattform-intern handelbar, kein externer Markt | auf regulierten Börsen handelbar |
| Emittent | **Fußballverein** (nicht BeScout) | Unternehmen |
| Dezentral handelbar | **Nein** — zentrales Orderbuch auf BeScout-Servern | Ja — offene Märkte |

**Fünf verstärkende Argumente:**
1. **Off-Chain:** keine Blockchain, kein „Ownership" im kryptographischen Sinn — Datenbankeinträge, die Club/BeScout jederzeit ändern/einfrieren/löschen können.
2. **Keine Rendite-Erwartung:** Cards zahlen keine Dividende. PBT ist ein gamifizierter Reward-Mechanismus in Credits, keine Gewinnausschüttung. Die Community Success Fee ist optional und club-gesteuert.
3. **Nutzungsrechte im Vordergrund:** ohne Card kein Fantasy, kein spielerbezogenes Voting, kein Exklusiv-Content. Primärfunktion = Partizipation, nicht Spekulation.
4. **Geschlossenes System:** Cards existieren nur auf BeScout, kein externer Markt, keine Dritt-API, kein Weg sie außerhalb zu handeln.
5. **Club-Kontrolle:** Verein steuert Supply/Preis/Lifecycle, kann jederzeit liquidieren — fundamentaler Unterschied zum Wertpapier (Emittent verliert nach Emission die Kontrolle).

**Drei ehrliche Gegenargumente (vom Anwalt zu bewerten):**
- **Sekundärmarkt-Trading** könnte als Hinweis auf spekulative Nutzung gewertet werden.
- **Preisänderungen** durch Angebot/Nachfrage könnten als „Wertsteigerung" interpretiert werden.
- **PBT-Ausschüttung** (und CSF) könnte als renditeähnliches Element gesehen werden.

> Supply pro Spieler ist begrenzt: der Verein erstellt **max 10.000 Scout Cards = 10 % des Spielerwerts** (Modell: 100.000 SC = 100 %, 1 SC = MV/100.000). Exklusive Spieler = exklusive Cards (gewollt). **Kanonische Formel + Einheiten → [treasury.md](../domain/treasury.md)** (D83/D100, hier nicht dupliziert).

---

## 3. Credits-Klassifizierung — KEIN E-Geld (Argumentation)

**E-Geld-Definition** (EU-RL 2009/110/EG, ZAG §1 Abs. 2, SPK): elektronisch gespeicherter monetärer Wert, **gegen Zahlung eines Geldbetrags** ausgegeben, von **anderen als dem Emittenten** als Zahlungsmittel akzeptiert.

| Kriterium | Credits | E-Geld |
|---|---|---|
| Gegen Geldzahlung ausgegeben | **Nein** — gratis zugeteilt (Welcome-Bonus, Verdienst) | Ja — 1:1 gegen Geld |
| Externer Akzeptanzkreis | **Nein** — nur auf BeScout verwendbar | Ja — bei Dritten akzeptiert |
| Rücktausch in Geld | **Nein** — kein Cashout (Phase 1) | Ja — Rücktauschrecht |
| Wertaufbewahrung | **Nein** — kein innerer Wert | Ja |

**Vergleichbare unregulierte Modelle:** Spielgeld in Games (FIFA Points, V-Bucks) · Loyalty-Punkte (Payback, Miles & More) · Social-Game-Währungen (Zynga Chips).

**Risiko:** Sobald Credits gegen Echtgeld **kaufbar** werden (Fiat-On-Ramp) oder $SCOUT gegen Fiat tauschbar ist, ändert sich die Bewertung grundlegend → Phase-2-Frage (E-Geld-Lizenz / lizenzierter Zahlungspartner).

---

## 4. Fantasy / Glücksspiel — 3-Elemente-Verteidigung

**Glücksspiel-Test (3 Elemente):** `Einsatz + Zufall + Gewinn`. Fehlt **eines** → kein Glücksspiel.

**Strategie: Element „Einsatz" eliminieren** —
1. **Entry Fee = 0** für alle Events in regulierten Märkten (TR, DE). Technisch: Jurisdiktions-Preset im Club-Dashboard (`AdminSettingsTab.tsx`) sperrt Fees bei TR/DE automatisch; `events.entry_fee_cents` pro Event; aktive Events = 0.
2. **Prämien aus Plattform-/Club-Budget**, NICHT aus einem Teilnehmer-Pot — es gibt keinen aus Einsätzen gespeisten „Pot".
3. **Credits haben keinen Geldwert** — selbst als „Gewinn" betrachtet nicht in Echtgeld wandelbar (vergleichbar Leaderboard-Punkte/Achievements).

**Jurisdiktions-Risiko:**
- **Türkei:** Null-Toleranz gegen illegales Glücksspiel; **MASAK** (Finanzaufsicht) + **BTK** (Telekom-Aufsicht) kooperieren; alles außerhalb staatlicher İddaa/Spor-Toto wird verfolgt. *Schutz:* keine Entry-Fees, kein Echtgeld, Framing als „Club-Challenge".
- **Deutschland:** **GGL** stuft **DFS (Daily Fantasy Sports)** als unerlaubtes Glücksspiel ein; keine Lizenzkategorie existiert. *Schutz:* keine Entry-Fees, kein Echtgeld, Credits = Prestige-Währung.

> **Compliance-Sprache** (Prize→Reward, gewinnen→sammeln, etc.) ist kanonisch in `.claude/rules/business.md` (Glücksspiel-Vokabel-Tabelle). Paid Fantasy Entry mit echtem Einsatz = **Phase 3** (nach MGA).

---

## 5. Community Success Fee (CSF) — Vertrag Club ↔ BeScout

Die CSF ist eine **vertraglich geregelte Umsatzbeteiligung** zwischen Club und BeScout, die an die Holder weitergegeben wird — **kein** Blockchain-Token, **kein** Wertpapier, **kein** Eigentumsanteil am Spieler.

> **Kanonische Berechnung + Einheiten (CSF-Kernformel, 10%-Regel, Snapshot, PBT) → [treasury.md](../domain/treasury.md).** Hier steht nur das **Vertrags-Template** (rechtlich load-bearing) + die rechtliche Einordnung.

### 5.1 Vertrags-Template „VEREINBARUNG ÜBER COMMUNITY SUCCESS FEE"

```
§1 Gegenstand
Der Club verpflichtet sich, bei Verkauf eines auf der BeScout-Plattform
gelisteten Spielers eine Community Success Fee an BeScout zu zahlen.

§2 Berechnung
Fee = min(Transfererlös, Cap) × (verkaufte Cards / 10.000) × 10 %
(Kanonische Berechnung, Einheiten und Pro-Card-Verteilung → treasury.md.)

§3 Zahlung
Die Community Success Fee wird bei Transferabschluss in EINER Summe gezahlt
und unmittelbar nach Zahlungseingang an die Holder (Snapshot zum Zeitpunkt der
Liquidierung) verteilt.
  [Hinweis: Der Original-Entwurf 2026-02 sah 3 Tranchen 40/30/30 über 12 Monate
   vor — überholt durch D83 / CSF-1 „Tranchen raus": einmalige Auszahlung, weil
   der Club aus seinem BeScout-Guthaben (Club-Treasury) zahlt; der einzige
   Tranchen-Grund (Cashflow-Schutz) entfällt damit.]

§4 Cap
Der maximale Referenzwert für die Berechnung beträgt [X] EUR.
Der Cap kann nur nach oben angepasst werden (Fan-Vertrauensschutz).

§5 Verwendung
BeScout schüttet die Fee — abzüglich eines konfigurierbaren Plattform-Anteils
(siehe §5a) — an die Holder des betreffenden Spielers aus, proportional zu ihrem
Besitz zum Zeitpunkt der Liquidierung (Snapshot bei Transfer-Meldung).

§5a Plattform-Anteil   ⚠️ OFFEN — siehe §5.3
BeScout behält [X] % der Community Success Fee als Plattform-Anteil ein.
Konfigurierbar im Admin-Dashboard, transparent auf der Plattform angezeigt.

§6 Transparenz
BeScout stellt dem Club monatlich einen Report bereit:
Anzahl verkaufte Cards · aktuelle Verteilung · berechnete max. Fee-Verpflichtung.
```

### 5.2 Rechtliche Einordnung der CSF

| Aspekt | Bewertung |
|---|---|
| Wertpapier? | **Nein.** Kein Eigentumsanteil am Spieler — vertraglich geregelte Umsatzbeteiligung. |
| Glücksspiel? | **Nein.** Kein Zufallselement — Reward basiert auf realem wirtschaftlichem Ereignis (Transfer). |
| Finanzprodukt? | **Prüfung empfohlen.** Je nach Jurisdiktion könnte die Success Fee als Finanzinstrument gelten. |
| Steuer (User)? | **Prüfung empfohlen.** EUR-Rewards (Phase 2) könnten steuerpflichtiges Einkommen sein. |

> **Empfehlung:** Rechtsgutachten (Finanzrecht + Steuerrecht) vor offiziellem Launch.

### 5.3 ⚠️ OFFENE CEO-Frage — `success_fee_platform_bps` (ADR-019)

Das ursprüngliche Konzept (ADR-019) sah vor, dass **BeScout 0–30 % der CSF als Plattform-Anteil einbehält** (admin-konfigurierbar via `fee_config.success_fee_platform_bps`, transparent angezeigt). Begründung damals: Flexibilität für unterschiedliche Club-Deals (großer Club verhandelt niedrigeren Anteil).

**Status heute:** Die kanonische Money-Heimat [treasury.md](../domain/treasury.md) realisiert **KEINEN** Plattform-CSF-Schnitt — **die CSF geht voll (100 %) an die Holder** (CSF-2/CSF-4, D83). § 5a oben und ADR-019 sind damit **nicht** im Live-System abgebildet.

> **Vor Umsetzung eines Plattform-CSF-Anteils: CEO-Entscheid.** Solange offen: §5a leer lassen / 0 % annehmen; treasury.md ist die Wahrheit.

---

## 6. $SCOUT-Coin (Phase 2) — MiCA & Krypto-Regulierung

> **NICHT im Pilot.** Heute existiert nur ein **Airdrop-Score** (trackt spätere Token-Berechtigung) + öffentliche Leaderboard-Seite. **Kein** Token, **keine** Blockchain, **kein** Smart Contract in Phase 1.

| Eigenschaft | Plan |
|---|---|
| Standard / Chain | ERC-20 auf Polygon PoS (Ethereum L2) |
| Kategorie | Utility Token (MiCA Title II) |
| Utility | Plattform-Zugang, Premium-Features, Governance, Bridge ↔ Credits |
| Distribution | Airdrop nach Pilot-Aktivität (Airdrop-Score) |
| Zeitrahmen | Phase 2, nach gültiger Token-Lizenz (kein Datum garantiert) |

**MiCA Title II — Anforderungen:**
1. **Crypto-Asset White Paper** (Token-Beschreibung, Rechte/Pflichten, Risikofaktoren, technische Beschreibung). Keine Genehmigung, aber Notification.
2. **Notification an NCA** (National Competent Authority), mind. 40 Arbeitstage vor Launch. NCA kann Bedenken äußern, kein Genehmigungsverfahren.
3. **EU-Entity erforderlich** — Emittent muss EU-juristische Person sein. Empfehlung: Irland (DAFM, tech-freundlich) oder Malta (MFSA, Krypto-Hub).
4. **CASP-Lizenz** (Crypto-Asset Service Provider) nur nötig, wenn BeScout **selbst** als Exchange/Custody/Swap agiert. Listing auf bestehenden Börsen → deren CASP-Lizenz reicht.

**Geschätzt:** €15.000–35.000 (White Paper + rechtliche Begleitung), 3–5 Monate.

**Airdrop-Fragen (offen):** steuerliche Behandlung (TR/DE/EU) · **rückwirkende Werthaltigkeit** (haben Pilot-User ohne Token-Versprechen agiert — ändert der Airdrop die rechtliche Bewertung der Pilot-Aktivität?) · Whitelist/KYC ab welchem Wert?

---

## 6.1 Kaskadierende Lizenz-Roadmap (Lizenz-Matrix)

> Prinzip: **„Legal Minimum First — Scale Licenses with Revenue".** Jede Lizenz wird erst beantragt, wenn ein konkretes Feature ODER eine Umsatzschwelle sie triggert + der zugehörige Revenue-Stream sie finanziert. Solange kein Echtgeld gewonnen/verloren wird und kein Cash-out existiert, operiert BeScout als Entertainment-Plattform mit internen Credits. *(Quell-Stand Feb 2026, „VERTRAULICH"; Kosten anwaltlich neu zu verifizieren.)*

| Lizenz | Trigger | Kosten | Schaltet frei | Phase | Art |
|---|---|---|---|---|---|
| **Malta Ltd.** (Company Formation) | Gründungsentscheidung (Tag 1) | €6.900 | Rechtsfähigkeit, Bankkonto, Club-Verträge | Gründung | PFLICHT |
| **AML/KYC** (Compliance Setup) | vor erstem User-Signup | €4.500 | User-Registrierung, Card-Verkauf, Club-Onboarding | Gründung | PFLICHT |
| **KVKK** (TR-Datenschutz) | erster TR-User-Signup | €1.000 | TR-User legal bedienen, konforme Datenspeicherung | Phase 1 | PFLICHT |
| **MiCA €1M Exemption** | erster Credits-Verkauf an Fans | €0 (built-in) | Credits als Platform-Credits, max €1M/12 Mo, kein Cash-out | Phase 1 | TRIGGER |
| **CASP-Lizenz** (MFSA Class 2) | Credits-Sales >€500K ODER $SCOUT-Launch | €181.000 (inkl. €125K Kapital) | $SCOUT-Token, Cash-out, Fiat-On-Ramp, EU-Passporting, Exchange-Listing | Phase 2 | TRIGGER |
| **MGA Gaming** (B2C) | Fantasy mit echt-wertigen Preisen ODER Paid Entry | €50.000–80.000 (Setup+Y1) | Paid Fantasy Leagues, Cash-Value-Card-Trading, Turniere mit Preisen, EU-weites Gaming | Phase 3 | TRIGGER |
| **E-Money / PSP** (Partnership) | Fiat On-/Off-Ramp für $SCOUT | €5.000–15.000 (Integration) | EUR/USD ↔ $SCOUT-Konversion, SEPA-Auszahlungen | Phase 2+ | GEPLANT |

**Phasen-Mapping** (Quell-Doc nutzte 0/1/3/4 → kanonisch D99 1/2/3): *Gründung* = vor Launch · *Phase 1* = Credits-Welt (jetzt) · *Phase 2* = $SCOUT/CASP/Cash-out · *Phase 3* = MGA/Paid Fantasy. Trigger-Reihenfolge ist Revenue-getrieben, nicht zeit-fix.

---

## 7. Jurisdiktions-Matrix (Feature × Land)

> **Kanonische Geofencing-Tiers** (TIER_FULL / TIER_CASP / TIER_FREE / TIER_RESTRICTED / TIER_BLOCKED) → `.claude/rules/business.md`. Diese Tabelle ist die rechtliche Begründung dahinter.

| Feature | 🇹🇷 TR | 🇩🇪 DE | 🇲🇹 MT | Rest-EU |
|---|:--:|:--:|:--:|:--:|
| Scout-Card-Trading (Credits) | ✅ | ✅ | ✅ | ✅ |
| Free Fantasy (Entry = 0) | ✅ | ✅ | ✅ | ✅ |
| Paid Fantasy (Entry > 0) | ❌ | ❌ | ✅* | ✅* |
| Club-Abos (Credits) | ✅ | ✅ | ✅ | ✅ |
| Research-Paywall (Credits) | ✅ | ✅ | ✅ | ✅ |
| $SCOUT-Coin (Phase 2) | ❌** | ✅*** | ✅ | ✅ |
| Fiat Ein-/Auszahlung | ❌ | ❌ | geplant | geplant |

\* nur wenn Club lokale Lizenz hat / Feature nicht als Glücksspiel klassifiziert (Phase 3 / MGA).
\*\* TR hat Krypto-**Zahlungen** verboten (TCMB-Verordnung 2021); Halten/Handeln auf Exchanges weiter erlaubt — Lage unklar.
\*\*\* unter MiCA, NCA = BaFin.

**Technik:** Jurisdiktions-Preset (TR/DE/OTHER) im Club-Dashboard; bei TR/DE Entry-Fees automatisch 0 und nicht änderbar (`AdminSettingsTab.tsx`, DB-gesichert).

---

## 8. Fehlende Legal-Infrastruktur (vor offiziellem Launch)

| Dokument | Priorität | Bemerkung |
|---|---|---|
| **AGB / Terms of Service** | KRITISCH | Nutzervertrag, Haftungsbegrenzung, **Verein als Emittent** (nicht BeScout) |
| **Datenschutzerklärung** | KRITISCH | DSGVO (DE/EU) + KVKK (TR); Supabase EU, PostHog EU |
| **Impressum** | KRITISCH | Pflicht in DE (**TMG §5**), empfohlen in TR |
| **Altersverifikation (18+)** | HOCH | Checkbox ggf. nicht ausreichend; Prüfpflicht klären |
| **Glücksspiel-Disclaimer** | HOCH | präventiv, auch wenn kein Glücksspiel angeboten wird |
| **Risk Disclosure (Trading)** | HOCH | „Scout-Card-Preise können schwanken. Credits haben keinen Geldwert." |
| **Club-Compliance-Template** | MITTEL | Vorlage: Vereins-Pflichten bzgl. lokaler Gesetze |
| **Cookie-Consent** | MITTEL | DSGVO für Analytics (PostHog) + Funktions-Cookies (Locale, Auth) |
| **Lösch-Prozess (DSGVO Art. 17)** | MITTEL | Account-Löschung existiert, aber kein formaler Prozess + Bestätigung |
| **Auftragsverarbeitung (AVV)** | MITTEL | mit Supabase, Sentry, PostHog (alle EU-gehostet) |

### 8.1 Datenverarbeitung / Hosting (für Datenschutzerklärung)

| Dienst | Zweck | Hosting | Datenbasis |
|---|---|---|---|
| Supabase | DB, Auth, Storage | EU (eu-west-1, Irland) | PostgreSQL |
| Sentry | Error-Tracking | EU | Error-Logs, Stack Traces |
| PostHog | Analytics | EU (Frankfurt, eu.posthog.com) | Nutzungsverhalten, Feature Flags |
| GitHub | Code-Hosting, CI/CD | USA | Quellcode (keine Nutzerdaten) |
| Vercel | Hosting | Global CDN (EU-First) | Statische Assets, Server-Functions |

**Erhobene personenbezogene Daten:** E-Mail (Auth) · Display-Name/Handle · Avatar (optional) · Aktivitätsdaten (Trades, Lineups, Posts, Votes) · Credits-Balance + TX-Historie · Geräte-/Browser-Infos (PostHog) · Push-Subscription-Endpoint.

---

## 9. Die 10 konkreten Fragen an den Anwalt

> Der eigentliche Zweck dieses Docs — bei jeder Rechtsberatung mitgeben.

**A. Scout-Card-(DPC)-Klassifizierung**
1. Sind Scout Cards in aktueller Form (Off-Chain, Credits-basiert, Nutzungsrechte, **Club** als Emittent) in TR und/oder DE als Finanzinstrument, Wertpapier oder sonstiges reguliertes Produkt einzuordnen? Wenn ja, welche Konsequenzen?
2. Ändert der Sekundärmarkt-Handel (User tauschen Cards gegen Credits) die Bewertung? Stellt BeScout durch das Orderbuch einen „organisierten Markt" / eine „Handelsplattform" dar?

**B. Credits-Klassifizierung**
3. Ist Credits als geschlossenes Plattform-Guthaben (kein Kauf mit Echtgeld, kein Cashout, kein externer Akzeptanzkreis) unter ZAG (DE), SPK (TR) oder PSD2 (EU) reguliert? Besteht E-Geld-Lizenzpflicht?
4. Wie ändert sich die Bewertung, wenn künftig Credits gegen Echtgeld gekauft werden können (Fiat-On-Ramp, Phase 2)?

**C. Fantasy & Glücksspiel**
5. Sind Fantasy-Turniere **ohne** Entry Fee mit Prämien in Credits (kein Geldwert) in TR und DE als Glücksspiel einzuordnen? Welche Zusatzmaßnahmen (Disclaimer, Altersbeschränkung) werden empfohlen?
6. Wie sollte das Feature in der UI geframed werden, um Risiken zu minimieren? Reicht „Club-Challenge"?

**D. Token & MiCA**
7. Wenn wir einen $SCOUT-Utility-Token (ERC-20, Polygon) als Airdrop verteilen: welche konkreten Schritte (Entity-Gründung, White Paper, NCA-Notification), realistische Kosten/Zeitrahmen?
8. Ändert der geplante $SCOUT-Airdrop die rechtliche Bewertung der **aktuellen** Pilot-Phase (rückwirkende Werthaltigkeitsvermutung für Credits)?

**E. Rechtliche Infrastruktur**
9. Welche Dokumente (AGB, Datenschutz, Disclaimer) sind Minimum vor Launch? Templates bereitstellbar oder individuell?
10. Wie sollte das B2B-Vertragsverhältnis BeScout ↔ Verein gestaltet sein? Insbesondere: wie wird sichergestellt, dass die regulatorische Verantwortung für lokale Gesetze (z. B. Glücksspiel-Compliance) **beim Verein** liegt?

---

*Konsolidiert aus `docs/legal-brief.md` + `docs/CONCEPT-DPC-ECONOMY.md` (Legal-Teil). Money-/Fee-Kanon → treasury.md · Compliance-Wording → business.md · Markt/GTM → gtm-strategy.md · WARUM-Entscheidungen → memory/decisions.md (D83/D99). Keine Rechtsberatung.*
