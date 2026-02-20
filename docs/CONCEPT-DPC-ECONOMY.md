# DPC-Ökonomie — Konzept-Dokument

> **Version:** 1.0 | **Datum:** 20.02.2026 | **Status:** Entwurf
> **Zweck:** Grundlage für Club-Pitches, technische Implementierung, rechtliche Vertragsgestaltung und UX-Design.

---

## 1. Executive Summary

BeScout ermöglicht Fußball-Fans, **digitale Anteile (DPCs) an echten Spielern** zu erwerben. Wird ein Spieler real transferiert, erhalten DPC-Holder eine **Community Success Fee** — echtes Geld, proportional zu ihrem Anteil.

Das Modell ist **kein Blockchain-Token, kein Wertpapier** — es ist eine vertraglich geregelte Umsatzbeteiligung zwischen Club und BeScout, die an Fans weitergegeben wird.

**Kernformel:**

```
Community Success Fee = (verkaufte DPCs / 10.000 × 10%) × min(Transfererlös, Cap)
```

**Währung:** $SCOUT (ehemals BSD) | **Wechselkurs:** 100 $SCOUT = 1 Cent | 10.000 $SCOUT = 1 EUR

---

## 2. Das Modell

### 2.1 Grundprinzip

```
Club bringt Spieler auf BeScout (IPO)
         ↓
Fans kaufen DPCs (= digitale Anteile)
         ↓
Fan erlebt Manager-Gefühl: Anteil, Fantasy, Community, Trading
         ↓
Spieler wird real transferiert
         ↓
Club zahlt Community Success Fee an BeScout (Vertrag, in Tranchen)
         ↓
BeScout verteilt an DPC-Holder (proportional nach Besitz)
```

### 2.2 Kernparameter

| Parameter | Definition | Wer bestimmt |
|-----------|-----------|-------------|
| **DPC Supply** | Anzahl erstellter DPCs (max 10.000) | Club bei IPO |
| **IPO-Preis** | Preis pro DPC in BSD | Club bei IPO |
| **Cap** | Max. Referenzwert für Fee-Berechnung (EUR) | Club bei IPO |
| **Realer Marktwert** | Marktwert laut Transfermarkt.com bei IPO-Erstellung | Referenzwert |
| **Transfererlös** | Tatsächlicher Verkaufspreis des Spielers | Real-World-Event |
| **Verkaufte DPCs** | DPCs die sich in User-Besitz befinden | Plattform-Daten |

### 2.3 Die 10%-Regel

- **Max 10.000 DPCs** pro Spieler
- 10.000 DPCs = **10% des Transfererlöses** als Community Success Fee
- Anteilig: weniger DPCs verkauft → weniger Fee

```
Community-Anteil = verkaufte DPCs / 10.000 × 10%
```

| Verkaufte DPCs | Community-Anteil |
|---------------|-----------------|
| 10.000 | 10,0% |
| 5.000 | 5,0% |
| 2.000 | 2,0% |
| 500 | 0,5% |

**Nur verkaufte DPCs zählen.** Unverkaufte DPCs (die noch im IPO-Pool liegen) werden nicht berücksichtigt. Der Club zahlt nur für DPCs, die tatsächlich bei Fans liegen.

---

## 3. Rollen

### 3.1 Club (Sakaryaspor)

- **Erstellt IPOs** für seine Spieler (Supply, Preis, Cap)
- **Unterzeichnet Vertrag** mit BeScout: bei realem Transfer → Community Success Fee
- **Zahlt Fee in Tranchen** nach Transferabschluss
- **Setzt Cap** um maximale Zahlungsverpflichtung zu begrenzen
- **Profitiert von:** Fan-Bindung, Reichweite, Trading-Fees (1% Club-Anteil), Abo-Einnahmen

### 3.2 BeScout (Plattform)

- **Vermittler** zwischen Club und Fans
- **Empfängt** Community Success Fee vom Club
- **Verteilt** Fee an DPC-Holder (proportional)
- **Profitiert von:** Trading-Fees (3,5% Plattform-Anteil), PBT (1,5%), Abo-Umsatz, Sponsor-Flächen
- **Garantiert:** Transparenz, faire Verteilung, regelkonforme Abwicklung

### 3.3 Fan / User

- **Kauft DPCs** = erwirbt digitalen Anteil am Spieler
- **Erlebt Manager-Gefühl:** Anteilsbesitz, Performance-Tracking, Fantasy, Community
- **Handelt DPCs** auf dem Sekundärmarkt (floor_price durch Angebot/Nachfrage)
- **Erhält Reward** bei realem Transfer (Community Success Fee, anteilig)
- **Investiert:** BSD (Spielwährung, kein echtes Geld beim Kauf)

---

## 4. IPO-Erstellung (Club-Perspektive)

### 4.1 Parameter die der Club festlegt

| Parameter | Beispiel | Erklärung |
|-----------|---------|-----------|
| Spieler | Hakan Y. | Spieler aus dem Kader |
| Realer Marktwert | 1.000.000 EUR | Referenzwert (Transfermarkt.com) |
| DPC Supply | 5.000 | Wie viele Anteile der Club freigibt (max 10.000) |
| IPO-Preis | 500 BSD | Preis pro DPC für Fans |
| Cap | 8.000.000 EUR | Max. Referenzwert bei Fee-Berechnung |

### 4.2 Was die Parameter bedeuten

**Supply (Anzahl DPCs):**
Bestimmt den Community-Anteil bei vollem Verkauf. Mehr DPCs = höhere potenzielle Fee-Verpflichtung, aber auch mehr Fan-Engagement und höhere IPO-Einnahmen (BSD).

**IPO-Preis:**
Muss für Fans erschwinglich sein (BSD-Spielwährung). Typischer Bereich: 100–5.000 BSD. Niedrigerer Preis = niedrigere Einstiegshürde = mehr Käufer.

**Cap:**
Schutz für den Club. Limitiert die maximale Fee-Zahlung. Ein niedriger Cap signalisiert dem Markt: "Der potenzielle Upside ist begrenzt" → niedrigerer Sekundärmarkt-Preis.

### 4.3 Strategische Entscheidungen für den Club

| Strategie | Supply | Cap | Effekt |
|-----------|--------|-----|--------|
| **Konservativ** | 1.000 | 3 Mio | Geringe Fee-Verpflichtung, weniger Fan-Engagement |
| **Ausgewogen** | 5.000 | 8 Mio | Gutes Verhältnis Risiko/Engagement |
| **Aggressiv** | 10.000 | 20 Mio | Max. Fan-Engagement, höchste Fee-Verpflichtung |

---

## 5. Trading (User-Perspektive)

### 5.1 Primärmarkt (IPO)

- User kauft DPC direkt vom Pool zum festen IPO-Preis
- Erste Käufer sichern sich garantierten Preis
- IPO endet wenn Supply erschöpft

### 5.2 Sekundärmarkt (DPC-Handel)

- User verkaufen DPCs an andere User (Sell-Orders)
- Floor-Preis = niedrigstes Angebot
- **Der Markt preist den realen Wert ein:**
  - Spieler performt gut → Fans erwarten hohen Transfer → DPC-Preis steigt
  - Spieler verletzt / Cap niedrig → DPC-Preis sinkt
  - Starkes Gerücht über Transfer → DPC-Preis explodiert
- Trading-Fees: 6% (3,5% Plattform + 1,5% PBT + 1% Club)

### 5.3 Was der User sieht

Auf dem Player Detail sollte jeder DPC-Holder sofort verstehen:

```
╔══════════════════════════════════════════╗
║  Hakan Y. — ZM — Sakaryaspor            ║
║                                          ║
║  Deine DPCs:      100 / 5.000 (2,0%)    ║
║  Marktwert:       1.000.000 EUR          ║
║  Cap:             8.000.000 EUR          ║
║                                          ║
║  ── Was-wäre-wenn Rechner ──             ║
║  Transfer für 5 Mio:                     ║
║    Community Fee:   200.000 EUR          ║
║    Dein Anteil:     4.000 EUR            ║
║                                          ║
║  Transfer für 10 Mio (Cap: 8 Mio):      ║
║    Community Fee:   320.000 EUR          ║
║    Dein Anteil:     6.400 EUR            ║
╚══════════════════════════════════════════╝
```

---

## 6. Liquidation — Community Success Fee

### 6.1 Auslöser

Ein **realer Transfer** des Spielers. Der Club meldet den Transfer an BeScout mit:
- Transfererlös (EUR)
- Käufer-Club
- Vertragsdatum

### 6.2 Berechnung

```
Fee-Basis     = min(Transfererlös, Cap)
Anteil        = verkaufte DPCs / 10.000 × 10%
Success Fee   = Fee-Basis × Anteil
Reward pro DPC = Success Fee / verkaufte DPCs
```

### 6.3 Durchgerechnetes Beispiel

**Setup:**
- Spieler: Hakan Y., Marktwert 1 Mio EUR
- Supply: 5.000 DPCs, davon 4.000 verkauft
- Cap: 8 Mio EUR

**Szenario A: Transfer für 5 Mio EUR (5x)**

```
Fee-Basis:      min(5.000.000, 8.000.000) = 5.000.000 EUR
Anteil:         4.000 / 10.000 × 10% = 4%
Success Fee:    5.000.000 × 4% = 200.000 EUR
Pro DPC:        200.000 / 4.000 = 50 EUR = 500.000 BSD
```

| User | DPCs | Anteil | Reward EUR | Reward BSD |
|------|------|--------|-----------|-----------|
| Mehmet | 100 | 2,5% | 5.000 | 50.000.000 |
| Ayse | 50 | 1,25% | 2.500 | 25.000.000 |
| Alle Holder | 4.000 | 100% | 200.000 | 2.000.000.000 |

**Szenario B: Transfer für 20 Mio EUR (20x) — Cap greift**

```
Fee-Basis:      min(20.000.000, 8.000.000) = 8.000.000 EUR  ← Cap!
Anteil:         4.000 / 10.000 × 10% = 4%
Success Fee:    8.000.000 × 4% = 320.000 EUR  (statt 800.000 ohne Cap)
Pro DPC:        320.000 / 4.000 = 80 EUR = 800.000 BSD
```

| User | DPCs | Anteil | Reward EUR | Reward BSD |
|------|------|--------|-----------|-----------|
| Mehmet | 100 | 2,5% | 8.000 | 80.000.000 |
| Ayse | 50 | 1,25% | 4.000 | 40.000.000 |
| Alle Holder | 4.000 | 100% | 320.000 | 3.200.000.000 |

**Szenario C: Karriereende / Ablösefrei (kein Transfererlös)**

Kein Transfererlös → Keine Community Success Fee. Aber: Der **PBT (Player Backed Treasury)** wird an DPC-Holder ausgeschüttet. PBT = 1,5% jedes Trades, das sich über die gesamte Laufzeit angesammelt hat. DPCs behalten zusätzlich ihren Plattform-Wert (Trading, Fantasy, Score).

### 6.4 Tranchen-Auszahlung

Laut Vertrag zahlt der Club die Fee in Tranchen:

| Tranche | Zeitpunkt | Anteil |
|---------|-----------|--------|
| 1 | Bei Transferabschluss | 40% |
| 2 | Nach 6 Monaten | 30% |
| 3 | Nach 12 Monaten | 30% |

BeScout verteilt jede Tranche sofort nach Eingang an die DPC-Holder.

**Stichtag:** Der Verteilungsschlüssel ist der **DPC-Besitz zum Zeitpunkt der Liquidierung** (= wenn der Transfer gemeldet wird). Ein Snapshot wird erstellt. Alle Tranchen gehen an die Holder laut diesem Snapshot — unabhängig davon, ob sie die DPCs danach verkaufen. Das ist einfach, transparent und incentiviert frühes Kaufen.

---

## 7. Cap-Mechanik

### 7.1 Warum ein Cap?

Der Club muss seine maximale Zahlungsverpflichtung kalkulieren können. Ohne Cap wäre ein 100x-Transfer existenzbedrohend.

### 7.2 Wie der Cap sich im DPC-Preis widerspiegelt

Der Sekundärmarkt preist den Cap ein. Beispiel:

| Spieler | Marktwert | Cap | Max Reward pro DPC (bei 4.000 verkauften) | Marktpreis-Tendenz |
|---------|-----------|-----|------------------------------------------|-------------------|
| Spieler A | 1 Mio | 20 Mio | 200 EUR | Hoch |
| Spieler B | 1 Mio | 5 Mio | 50 EUR | Mittel |
| Spieler C | 1 Mio | 2 Mio | 20 EUR | Niedrig |

Smart Fans berechnen: "Was ist das Maximum das ich pro DPC bekommen kann?" → und handeln entsprechend. Das erzeugt natürliche Preisfindung.

### 7.3 Cap-Anpassung

- Der Cap wird bei IPO-Erstellung festgelegt
- **Kann der Club den Cap nachträglich ändern?** → Empfehlung: Nur nach oben (nie nach unten), um Fan-Vertrauen zu schützen
- Cap-Änderung nach oben = positives Signal → DPC-Preis steigt

---

## 8. Vertragliche Struktur

### 8.1 Vertrag Club ↔ BeScout

```
VEREINBARUNG ÜBER COMMUNITY SUCCESS FEE

§1 Gegenstand
Der Club verpflichtet sich, bei Verkauf eines auf der BeScout-Plattform
gelisteten Spielers eine Community Success Fee an BeScout zu zahlen.

§2 Berechnung
Fee = min(Transfererlös, Cap) × (verkaufte DPCs / 10.000) × 10%

§3 Zahlung
Die Fee wird in [3] Tranchen gezahlt:
- 40% bei Transferabschluss
- 30% nach 6 Monaten
- 30% nach 12 Monaten

§4 Cap
Der maximale Referenzwert für die Berechnung beträgt [X] EUR.
Der Cap kann nur nach oben angepasst werden.

§5 Verwendung
BeScout verpflichtet sich, die Fee abzüglich eines konfigurierbaren
Plattform-Anteils (siehe §5a) an die DPC-Holder des betreffenden
Spielers auszuschütten, proportional zu ihrem Besitz zum Zeitpunkt
der Liquidierung (Snapshot bei Transfer-Meldung).

§5a Plattform-Anteil
BeScout behält [X]% der Community Success Fee als Plattform-Anteil ein.
Dieser Prozentsatz ist im Admin-Dashboard konfigurierbar und wird den
Usern transparent auf der Plattform angezeigt.

§6 Transparenz
BeScout stellt dem Club monatlich einen Report über:
- Anzahl verkaufte DPCs
- Aktuelle Verteilung der DPCs
- Berechnete maximale Fee-Verpflichtung
```

### 8.2 Rechtliche Einordnung

| Aspekt | Bewertung |
|--------|----------|
| Wertpapier? | **Nein.** Kein Eigentumsanteil am Spieler. Vertraglich geregelte Umsatzbeteiligung. |
| Glücksspiel? | **Nein.** Kein Zufallselement. Reward basiert auf realem wirtschaftlichem Ereignis. |
| Finanzprodukt? | **Prüfung empfohlen.** Je nach Jurisdiktion könnte die Success Fee als Finanzinstrument gelten. |
| Steuer (User)? | **Prüfung empfohlen.** EUR-Rewards könnten steuerpflichtiges Einkommen sein. |

> **Empfehlung:** Rechtsgutachten vor offiziellem Launch einholen (Finanzrecht + Steuerrecht).

---

## 9. Wirtschaftliche Parameter

### 9.1 Wechselkurs

| BSD | EUR |
|-----|-----|
| 100 | 0,01 (1 Cent) |
| 10.000 | 1,00 |
| 1.000.000 | 100,00 |
| 100.000.000 | 10.000,00 |

### 9.2 Revenue Streams BeScout

| Stream | Quelle | Anteil |
|--------|--------|--------|
| Trading-Fee | Jeder DPC-Trade | 3,5% |
| PBT | Jeder DPC-Trade | 1,5% (Player Backed Treasury) |
| Club-Fee | Jeder DPC-Trade | 1,0% (an Club) |
| Club-Abos | Fan-Abonnements | Bronze/Silber/Gold (BSD) |
| Sponsor-Flächen | Werbepartner | 21 Placements |
| Bounty-Fee | Club-Aufträge | 5% Platform-Fee |

**Community Success Fee:** BeScout behält einen konfigurierbaren Plattform-Anteil (Admin-einstellbar, z.B. 10-20%). Rest geht an DPC-Holder. Der Anteil wird transparent auf der Plattform angezeigt.

### 9.3 Beispiel-Kalkulation: Sakaryaspor (28 Spieler)

| Annahme | Wert |
|---------|------|
| Spieler gelistet | 28 |
| Ø Supply pro Spieler | 3.000 DPCs |
| Ø verkauft | 2.000 DPCs |
| Ø IPO-Preis | 300 BSD |
| Transfers pro Saison | 3 Spieler |
| Ø Transfererlös | 2.000.000 EUR |
| Ø Cap | 5.000.000 EUR |

**IPO-Einnahmen (BSD):**
28 Spieler × 2.000 DPCs × 300 BSD = 16.800.000 BSD (= 1.680 EUR)

**Trading-Einnahmen (BSD, jährlich geschätzt):**
Bei 5x Umschlag pro DPC: 28 × 2.000 × 5 × 300 × 6% = 5.040.000 BSD (= 504 EUR)

**Community Success Fee (EUR, jährlich):**
3 Transfers × 2.000.000 EUR × (2.000/10.000 × 10%) = 3 × 40.000 = 120.000 EUR
→ Vollständig an DPC-Holder

---

## 10. Getroffene Entscheidungen (ADR)

### ADR-018: Stichtag = Liquidierung

**Entscheidung:** Snapshot bei Liquidierung (Transfer-Meldung). Alle Tranchen werden nach diesem Snapshot verteilt.

**Begründung:** Einfachste Variante. User weiß: "Wer bei Liquidierung hält, bekommt den Reward." Kein Nachhalten über Monate nötig. DPCs können nach Liquidierung weiter gehandelt werden (PBT, Fantasy etc.).

### ADR-019: BeScout-Anteil Admin-einstellbar

**Entscheidung:** Der Plattform-Anteil an der Community Success Fee ist im Admin-Dashboard konfigurierbar (z.B. 0-30%). Wird transparent auf der Plattform angezeigt.

**Begründung:** Flexibilität für verschiedene Club-Deals. Ein großer Club könnte einen niedrigeren BeScout-Anteil verhandeln, ein kleiner Club akzeptiert höheren. Der Wert wird in `fee_config` gespeichert und ist für User sichtbar.

### ADR-020: Währungs-Migration BSD → $SCOUT

**Entscheidung:** Die Plattform-Währung wird von BSD zu **$SCOUT** migriert. $SCOUT ist die einheitliche Währung für Trading, Rewards, Airdrop und Success Fee.

**Begründung:** $SCOUT schafft eine kohärente Token-Identität. Der Airdrop-Score existiert bereits. $SCOUT vereinheitlicht: Airdrop-Rewards, Trading-Währung, Success Fee Auszahlung, Club-Abos.

**Risikobewertung:**

| Risiko | Einschätzung | Mitigation |
|--------|-------------|------------|
| $SCOUT wird als Krypto-Token wahrgenommen | **Hoch** | Klare Kommunikation: Kein Blockchain, keine dezentrale Börse, zentrale DB |
| Regulatorische Einstufung als E-Geld | **Mittel** | Rechtsgutachten, ggf. E-Geld-Lizenz oder Partnerschaft mit lizenziertem Zahlungsdienstleister |
| Steuerliche Behandlung für User | **Mittel** | AGB: User ist selbst verantwortlich. Transparente Transaktionshistorie für Steuererklärung |
| Verwechslung mit Krypto-Scam | **Mittel** | Seriöses Branding, echte Club-Partnerschaften, kein "Pump&Dump"-Narrativ |

**Wechselkurs:** 100 $SCOUT = 1 Cent EUR | 10.000 $SCOUT = 1 EUR

**Migrations-Scope:** Rein kosmetisch in Phase 1 (Umbenennung BSD → $SCOUT in UI + Docs). Kein technischer Umbau der Wallet/DB nötig — intern bleibt alles in Cents (BIGINT).

### ADR-021: Keine Mindesthaltedauer — Gamification stattdessen

**Entscheidung:** Keine Mindesthaltedauer für Success Fee Berechtigung. Stattdessen wird **langfristiges Halten über Gamification belohnt:**

| Mechanismus | Effekt |
|------------|--------|
| **DPC Mastery Level** (existiert) | Höheres Level pro Spieler = mehr XP → höherer Rang |
| **"Diamond Hands" Achievement** | Neues Achievement: DPC >90 Tage gehalten |
| **Haltedauer-Boost auf Score** | Länger halten = mehr BeScout Score Punkte (Analyst-Dimension) |
| **PBT-Bonus** | PBT-Ausschüttung gewichtet nach Haltedauer (wer länger hält → überproportionaler PBT-Anteil) |
| **Airdrop Score** | Haltedauer fließt in Airdrop-Berechnung ein (bestehend) |

**Begründung:** Kein harter Lock-in (schreckt User ab), sondern weiche Anreize. Der Markt regelt den Rest: Wer kurz vor Transfer kauft, zahlt hohen Marktpreis — das ist die natürliche "Mindesthaltedauer-Strafe".

### ADR-022: Karriereende / Ablösefrei → PBT-Auszahlung

**Entscheidung:** Bei Karriereende oder ablösefreiem Wechsel gibt es **keine Community Success Fee** (Transfererlös = 0). Stattdessen wird der **PBT (Player Backed Treasury)** an DPC-Holder ausgeschüttet.

**Mechanik:**

```
Spieler beendet Karriere / wechselt ablösefrei
         ↓
Success Fee = 0 (kein Transfererlös)
         ↓
PBT-Treasury wird liquidiert
(= alles was über 1,5% der Trades angesammelt wurde)
         ↓
PBT wird an DPC-Holder verteilt
(proportional nach Besitz, gewichtet nach Haltedauer)
```

**Begründung:** DPC-Holder gehen nicht komplett leer aus. PBT ist die "Mindest-Rendite" — auch wenn kein Transfer stattfindet, haben die Holder durch ihr Trading-Engagement den PBT aufgebaut. Das macht DPCs auch für Spieler attraktiv, die wahrscheinlich nicht transferiert werden (z.B. ältere Spieler, Vereinsikonen).

**Beispiel:**
- Spieler Z, 5 Jahre auf der Plattform, Karriereende
- 3.000 DPCs im Umlauf, Ø Trading-Volumen 50.000 $SCOUT/Monat
- PBT über 5 Jahre: ~45.000 $SCOUT (1,5% von ~3 Mio Handelsvolumen)
- Wird an 3.000 DPC-Holder verteilt: ~15 $SCOUT pro DPC
- Nicht viel, aber: "Dein Anteil hat dir über 5 Jahre PBT eingebracht"

---

## 11. Technische Anforderungen (Delta zum aktuellen System)

### 11.1 Datenbank-Änderungen

```
players (erweitern):
  + real_market_value_eur   BIGINT       -- Realer Marktwert in EUR-Cent
  + success_fee_cap_eur     BIGINT       -- Cap in EUR-Cent
  + dpc_max_supply          INT          -- Max DPCs (default 10.000)
  + dpc_sold_count          INT          -- Aktuell verkaufte DPCs (computed/trigger)

fee_config (erweitern):
  + success_fee_platform_bps INT        -- BeScout-Anteil an Success Fee (Basis Points, Admin-einstellbar)

liquidation_events (erweitern):
  + transfer_amount_eur     BIGINT       -- Realer Transfererlös in EUR-Cent
  + fee_basis_eur           BIGINT       -- min(transfer, cap) in EUR-Cent
  + community_fee_eur       BIGINT       -- Berechnete Fee in EUR-Cent
  + platform_fee_eur        BIGINT       -- BeScout-Anteil in EUR-Cent
  + holder_pool_eur         BIGINT       -- An Holder in EUR-Cent
  + buyer_club              TEXT         -- Käufer-Club Name
  + holder_snapshot         JSONB        -- [{user_id, dpc_count, share_pct}] zum Zeitpunkt der Liquidierung

liquidation_tranches (neue Tabelle):
  id                        UUID PK
  liquidation_event_id      UUID FK → liquidation_events
  tranche_number            INT
  amount_eur                BIGINT       -- Tranche-Betrag in EUR-Cent
  amount_scout              BIGINT       -- Konvertiert in $SCOUT (×10.000)
  due_date                  TIMESTAMPTZ
  paid_at                   TIMESTAMPTZ  -- NULL = noch nicht gezahlt
  distributed_at            TIMESTAMPTZ  -- NULL = noch nicht an Holder verteilt

liquidation_payouts (erweitern):
  + tranche_id              UUID FK → liquidation_tranches
  + amount_eur              BIGINT       -- Anteil in EUR-Cent
```

### 11.2 Neue RPCs

```sql
-- Admin: Spieler-Transfer melden → Snapshot erstellen → Tranchen anlegen
create_liquidation_event(
  p_player_id UUID,
  p_transfer_amount_eur BIGINT,  -- in EUR-Cent
  p_buyer_club TEXT,
  p_tranche_count INT DEFAULT 3
) → liquidation_event_id
-- Logik:
--   1. Lese real_market_value_eur, success_fee_cap_eur, dpc_sold_count
--   2. fee_basis = min(p_transfer_amount_eur, cap)
--   3. anteil = dpc_sold_count / 10000 * 0.10
--   4. community_fee = fee_basis * anteil
--   5. platform_fee = community_fee * success_fee_platform_bps / 10000
--   6. holder_pool = community_fee - platform_fee
--   7. Snapshot: SELECT user_id, SUM(quantity) FROM holdings WHERE player_id = ...
--   8. Erstelle N Tranchen (gleichmäßig oder 40/30/30)
--   9. Markiere Spieler als liquidated

-- Admin: Tranche als bezahlt markieren + an Holder verteilen
process_liquidation_tranche(
  p_tranche_id UUID
) → {distributed_count, total_scout}
-- Logik:
--   1. Lese holder_snapshot aus liquidation_event
--   2. Für jeden Holder: payout = tranche_amount * holder.share_pct
--   3. Credit Wallet + Erstelle liquidation_payout Record
--   4. Sende Notification an jeden Holder

-- Admin: PBT-Liquidation (Karriereende / ablösefrei)
liquidate_player_pbt(
  p_player_id UUID
) → {distributed_count, total_scout}
-- Logik:
--   1. Lese PBT-Balance des Spielers
--   2. Snapshot Holder (wie oben)
--   3. Verteile PBT gewichtet nach Haltedauer + Besitz
--   4. Credit Wallets + Notifications

-- Public: Was-wäre-wenn Rechner
calculate_success_fee(
  p_player_id UUID,
  p_transfer_amount_eur BIGINT
) → {fee_eur, holder_pool_eur, reward_per_dpc_eur, reward_per_dpc_scout}
```

### 11.3 UI-Änderungen

| Bereich | Änderung |
|---------|---------|
| **Player Detail** | Anteils-Anzeige ("Du besitzt X/Y DPCs = Z%"), Marktwert, Cap, Was-wäre-wenn Rechner, PBT-Stand |
| **IPO-Erstellung (Admin)** | Supply, Preis, Cap, Marktwert Felder |
| **Admin Dashboard** | Transfer melden, Tranchen verwalten, Fee-Übersicht, PBT-Liquidation |
| **BeScout Admin** | `success_fee_platform_bps` konfigurierbar (Einstellung) |
| **Portfolio / Holdings** | EUR-Reward-Potenzial pro Holding + PBT-Anteil anzeigen |
| **Liquidation Notification** | "Spieler X wurde transferiert! Dein Reward: Y EUR (in 3 Tranchen)" |
| **PBT Notification** | "Spieler Z beendet Karriere. PBT-Ausschüttung: X $SCOUT" |
| **Überall** | BSD → $SCOUT Umbenennung (UI + Docs, DB bleibt BIGINT Cents) |

---

## 12. UX — Das Manager-Gefühl

### 12.1 Kernprinzip

Jede Interaktion muss dem User vermitteln: **"Ich besitze einen Anteil an diesem Spieler."**

### 12.2 Touchpoints

**Beim DPC-Kauf:**
> "Du besitzt jetzt 50 Anteile von Hakan Y. (1,0% aller DPCs).
> Wenn er für 5 Mio transferiert wird, ist dein geschätzter Reward: 2.000 EUR."

**Im Portfolio:**
> Jede Holding zeigt: Anzahl DPCs, %-Anteil, geschätzter Reward bei verschiedenen Transfer-Szenarien.

**Bei Transfer-Gerücht:**
> Push-Notification: "Transfer-Gerücht: Galatasaray bietet 8 Mio für Hakan Y.!
> Dein geschätzter Reward: 3.200 EUR. Halte deine 50 DPCs!"

**Bei realem Transfer:**
> "TRANSFER BESTÄTIGT: Hakan Y. wechselt zu Galatasaray für 8 Mio EUR!
> Dein Reward: 3.200 EUR (in 3 Tranchen über 12 Monate).
> Erste Tranche: 1.280 EUR — wird nach Zahlungseingang gutgeschrieben."

**Bei Tranche-Auszahlung:**
> "Tranche 1 eingegangen! 12.800.000 $SCOUT (1.280 EUR) wurden deinem Wallet gutgeschrieben."

**Bei PBT-Ausschüttung (Karriereende):**
> "Spieler Z beendet seine Karriere. Der PBT-Pool (45.000 $SCOUT) wird an alle Holder verteilt.
> Dein Anteil: 1.500 $SCOUT (gewichtet nach Haltedauer)."

---

## 13. Risiken & Mitigation

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Club zahlt Fee nicht | Mittel | Hoch | Vertrag mit Eskalationsklausel, Treuhandkonto |
| Spieler wird nie transferiert | Hoch (viele Spieler) | Niedrig | PBT-Ausschüttung als Mindest-Rendite + DPC-Wert durch Trading/Fantasy/Score |
| $SCOUT als Krypto/E-Geld eingestuft | **Mittel** | **Sehr hoch** | Rechtsgutachten vor $SCOUT-Migration, klare Kommunikation "kein Blockchain-Token", ggf. E-Geld-Lizenz |
| $SCOUT-Auszahlung in EUR = Finanzdienstleistung | **Mittel** | **Hoch** | Phase 1: nur $SCOUT-Guthaben (kein EUR-Cashout). Phase 2: lizenzierter Partner für EUR-Auszahlung |
| Manipulation (Insider-Wissen bei Transfer) | Niedrig | Hoch | Trading-Monitoring, Insider-Trading-Regeln im AGB, zeitverzögerte Veröffentlichung |
| Cap zu niedrig gesetzt | Niedrig | Mittel | Cap nur nach oben änderbar, transparente Kommunikation |
| Zu hohe Fee für kleinen Club | Mittel | Hoch | Konservativer Cap, wenig Supply → geringe Verpflichtung |
| Steuerliche Behandlung der Rewards | Mittel | Mittel | AGB: User ist selbst verantwortlich. Transparente TX-Historie als Beleg |

---

## 14. Glossar

| Begriff | Definition |
|---------|-----------|
| **DPC** | Digital Player Card — digitaler Anteil an einem Spieler auf BeScout |
| **$SCOUT** | Plattform-Währung (ehemals BSD). 100 $SCOUT = 1 Cent EUR. Zentrale Datenbank, kein Blockchain-Token |
| **IPO** | Initial Player Offering — Erstausgabe von DPCs eines Spielers |
| **Supply (DPC)** | Anzahl DPCs die der Club für einen Spieler erstellt (max 10.000) |
| **Cap (EUR)** | Maximaler Referenzwert für die Fee-Berechnung. Schützt den Club vor extremen Zahlungen |
| **Community Success Fee** | Vertragliche Zahlung des Clubs an BeScout bei Spieler-Transfer. Anteil = verkaufte DPCs / 10.000 × 10% |
| **Liquidation** | Prozess bei realem Transfer: Fee-Berechnung, Holder-Snapshot, Tranchen-Erstellung, Verteilung |
| **Snapshot** | Festgehaltener DPC-Besitz aller Holder zum Zeitpunkt der Liquidierung. Basis für alle Tranchen |
| **Tranche** | Teilzahlung der Community Success Fee (z.B. 3 Raten über 12 Monate) |
| **PBT** | Player Backed Treasury — 1,5% jedes Trades fließt in Spieler-Kasse. Wird bei Karriereende/Ablösefrei an Holder verteilt |
| **Floor-Preis** | Niedrigstes Verkaufsangebot auf dem Sekundärmarkt. Preist realen Wert + Cap ein |
| **Realer Marktwert** | Marktwert laut Transfermarkt.com bei IPO-Erstellung. Referenzwert, nicht identisch mit IPO-Preis |
| **Plattform-Anteil** | Admin-einstellbarer Prozentsatz den BeScout von der Success Fee einbehält (Rest → Holder) |
| **Diamond Hands** | Gamification-Achievement für langfristiges DPC-Halten (>90 Tage) |
