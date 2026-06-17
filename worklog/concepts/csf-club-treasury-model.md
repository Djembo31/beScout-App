# CSF & Club-Treasury — Zielbild

> **Zweck:** Das konsolidierte Ziel-Modell für die Community Success Fee (CSF) + das Club-Treasury, aus dem die CSF und gezielte Fan-Belohnungen gespeist werden. Entstanden aus der Strategie-Session 2026-06-15 (Anil-Entscheidungen). Basis für die anschließende Neu-Spezifikation + Slices.
>
> **Quellen:** `docs/CONCEPT-DPC-ECONOMY.md` (v1.0 — das durchgerechnete Original-Konzept), Code-Verifikation (`liquidate_player` Slice 108/178e), Kartierung `worklog/concepts/reward-ranking-ecosystem.md`.
>
> **Status:** Zielbild — teils entschieden, teils offen (siehe §5). Noch kein Slice.

---

## 1. Strategischer Frame

- **Scout Card = vertragsgekoppelter Anteil am Spieler** (Produkt-Wahrheit, Equity-artig). Legal über das Doppel-Register: nach außen „digitale Sammelkarte mit Utility", nicht „Spieleranteil". Asset-Laufzeit = Spielervertrag.
- **Das Kern-Wertversprechen ist der Scout-Fang:** einen 2-Mio-Spieler früh „catchen", der für 20 Mio transferiert wird → Einsatz ~10×. Wert kommt über **zwei Pfade**: (a) Sekundärmarkt-Handel (floor_price preist erwarteten Transfer + Cap ein) **oder** (b) Halten bis zur Liquidation → CSF-Ausschüttung.
- **Phase 1 = geschlossene $SCOUT-Welt.** Treasury, CSF, Fan-Rewards kreisen intern als Credits.
- **Cash-out (echtes EUR raus) = Phase 2**, lizenz-gegated. Gilt für Clubs *und* Fans. Echtes EUR-Einzahlen von außen liegt auf derselben Phase-2-Achse. (Abgleich mit Licensing-Phasen `business.md` ADR-028 nötig — Nummerierung dort 1/3/4.)

---

## 2. Entscheidungen dieser Session (2026-06-15, Anil)

| # | Entscheidung | Konsequenz |
|---|---|---|
| **CSF-1** | **Tranchen raus** — CSF wird bei Liquidation **in einer Summe** ausgezahlt (nicht 40/30/30 über 12 Monate). | Snapshot-über-Monate + 3 Auszahl-Zyklen entfallen. Code macht das heute schon so → nur Konzept-Doc angleichen. Begründung: der einzige Tranchen-Grund (Club-Cashflow-Schutz) entfällt, weil der Club aus seinem BeScout-Guthaben zahlt. |
| **CSF-2** | **Club-Treasury ist die CSF-Quelle** — verdientes Club-Geld (Trading 1 %, Abos 100 %, IPO 85 %, PBT) kreist intern und finanziert die CSF. | Wertschöpfung bleibt im geschlossenen System, kein externer EUR-Transfer für CSF nötig. |
| **CSF-3** | **Club-Treasury ist bidirektional + Fan-Reward-Engine** — der Verein kann Budget gezielt einsetzen, um Fans zu belohnen, Aktivität zu fördern und neue Fans zu gewinnen. | Beantwortet die offene #1-Frage („wie belohnt ein Verein aktive Fans?"). |
| **CSF-4** | **Phase 1 intern $SCOUT, Cash-out Phase 2.** | EUR-Ein-/Auszahlung (Club + Fan) ist Phase-2-Scope. Phase-1-Marketing-Budget = verdientes Club-$SCOUT. |

---

## 3. Das Zielbild-Modell

### 3.1 Club-Treasury (bidirektionales B2B-Konto)

```
        REIN                          CLUB-TREASURY                    RAUS
  Trading 1 % ─────┐                  ($SCOUT-Konto,            ┌──── CSF an Holder (Liquidation)
  Abos 100 % ──────┤                   echtes Guthaben          ├──── gezielte Fan-Rewards
  IPO 85 % ────────┤                   statt on-the-fly)        │      (Missions, Airdrops an
  PBT ─────────────┤  ───────────────────────────────────────► │       treue Fans, exkl. Drops)
  Club-Deposit ────┘                                            └──── Club-Withdrawal (EUR) = PHASE 2
  (Phase 1: intern; EUR-Deposit Phase 2)
```

Der Verein behandelt BeScout wie ein **Fan-Engagement-Werbekonto**: er verdient an Fan-Aktivität, belohnt damit gezielt seine aktivsten/treusten Fans (bindet + gewinnt), und zieht Erträge ab (Phase 2).

### 3.2 CSF-Auszahlung (bei realem Transfer)

- **Auslöser:** realer Spieler-Transfer (Vertragsende). Admin meldet Transfererlös.
- **Berechnung** (Original-Konzept, *Formel-Entscheidung offen — siehe §5*):
  `CSF = (verkaufte Cards / 10.000 × 10 %) × min(Transfererlös, Cap)`, dann **proportional nach Besitz**.
- **Auszahlung:** einmalig (CSF-1), aus dem Club-Treasury, als $SCOUT in die Holder-Wallets.
- **Snapshot:** Besitz zum Zeitpunkt der Liquidierung bestimmt die Verteilung.
- **Karriereende/ablösefrei:** kein Transfererlös → keine CSF, stattdessen PBT-Ausschüttung (ADR-022).

### 3.3 Gezielte Fan-Rewards (Club → aktive/treue Fans)

Der Verein setzt Treasury-Budget ein, um Engagement zu fördern — die konkreten Kanäle (zu spezifizieren):
- Airdrops an Top-fan_ranking-Fans (Vereinsikonen/Legenden)
- club-gebundene Missionen (Infra existiert, `mission_definitions.club_id` — heute 0 Seeds)
- exklusive Drops / Perks / Welcome-Boni für neue Club-Fans

### 3.4 IPO-Preisbildung (Einstieg) — Vereins-Entscheidung mit MV-Anker (Anil 2026-06-16)

Der IPO-Preis ist **kein starrer `MV/1000`-Automatismus**, sondern eine **Vereins-Entscheidung mit dem Marktwert als Anker**: der Verein kennt seinen Spieler besser als Transfermarkt + hält den Einstieg erschwinglich (günstiger = mehr Fans). MV = Vorschlag, Verein = finale Entscheidung.

**Zwei getrennte Preise — die Differenz ist der Scout-Fang:**
| | wer setzt | gekoppelt an |
|---|---|---|
| IPO-Preis (Einstieg) | **Verein** | MV-Anker + Einschätzung |
| Liquidations-Wert (Ausgang) | Realität | tatsächlicher Transfererlös × 10 %-Regel, Cap |

**Tokenisierung (Beispiel Osimhen, MV 75 Mio):** 100.000 SC = 100 %, max 10.000 SC = 10 %. 1 SC = MV/100.000 = **750 € = 75.000 $SCOUT**. Exklusive Spieler = exklusive Cards (gewollt — nicht jeder Verein kann sich Osimhen leisten).

**Code-Stand:** Mechanik existiert — `create_ipo(p_price)` / `createPlayer(ipoPrice)` respektieren expliziten Preis; `MV/10`-cents nur als Default-Fallback. **UI-Gap (`AdminPlayersTab`):** Preis-Input vorhanden, aber kein MV-abgeleiteter Vorschlag (Default willkürlich `5.00`) + keine EUR-Orientierung. → UI-Slice: MV-Vorschlag als anpassbaren Default einsetzen + „≈ X €/Card" anzeigen.

---

## 4. Konzept-vs-Code-Gap (verifiziert 2026-06-15)

**Tokenisierung (Anil 2026-06-15 bestätigt):** 100.000 SC = 100 % des Spielerwerts → 1 SC = MV/100.000. Verein erstellt max **10.000 SC = 10 %**. Bei IPO-Vollverkauf nimmt der Club ~10 % des MV ein. Liquidiert werden **nur die im Umlauf befindlichen** SC (Holdings), nicht der unverkaufte Pool.

| Baustein | Konzept | Code heute | Aktion |
|---|---|---|---|
| Tranchen | 40/30/30 | ✅ schon einmalig | Konzept-Doc angleichen (CSF-1) |
| CSF-Formel | `Cards/10.000 × 10 % × min(Transfer, Cap)` | ✅ **lineare Formel = Pro-Card-Form davon** (`fee_per_dpc = transfer/10`, „≈10 % bei 10k" Code-Kommentar Z.135); liquidiert `SUM(holdings)` = im Umlauf | Grundstruktur OK |
| Cap-Semantik | EUR-Transferwert-Referenz `min(Transfer,Cap)` | ⚠️ Cap **pro Card** (`success_fee_cap_cents`) | angleichen/sauber definieren |
| **Wechselkurs-Skala** | `CONCEPT`: 100 $SCOUT = 1 Cent | ⚠️ `trading.md`: 1 $SCOUT = 1 Cent — **Faktor-100-Drift** | **🔴 MONEY-KRITISCH verifizieren vor CSF-Bau** |
| `csf_multiplier` + Mastery (Z.139-164) | nicht im Konzept | ⚠️ im Code, verwässert „proportional", 1,15×-Deckel | **RAUS** (Anil 2026-06-15) — CSF rein proportional, Treue über Fan-Reward-Engine |
| Was-wäre-wenn-Rechner | `calculate_success_fee` | ❌ fehlt | bauen (UX-Herz) |
| Club-Treasury | implizit | ❌ nur on-the-fly `get_club_balance`, **IPO/P2P-Anteile fehlen in der Rechnung** | echtes Treasury-Konto bauen |
| Club-Deposit (intern) | — | ❌ | bauen (Phase 1) |
| Club-Withdrawal | — | ⚠️ `request_club_withdrawal` angelegt | für Phase 2 vorhalten |

---

## 5. Entscheidungen (2026-06-15 geklärt) + verbleibende Prüfpunkte

**Geklärt:**
1. **CSF-Formel = 10 %-Regel.** 100.000 SC = 100 %, max 10.000 SC = 10 %. Die lineare Code-Formel ist die korrekte Pro-Card-Form davon (Grundstruktur OK, kein Neubau von Null).
2. **`csf_multiplier` raus** — CSF rein proportional nach Besitz; Treue separat über Fan-Reward-Engine (§3.3).
3. **Treasury zuerst**, aber **noch nicht bauen** (Anil) — bleiben in Konzeption.

**Wechselkurs aufgelöst (2026-06-16):** **1 $SCOUT = 1 Cent = 0,01 € (100 $SCOUT/€).** Bestätigt durch `trading.md` + Live-Code (`MV/10` cents → `centsToBsd` → `MV/1000 $SCOUT`; Osimhen 75.000 $SCOUT = 750 €) + ICO-Seed-Preis (€0,01, `pilot-founding-strategy-design.md`). `CLAUDE.md` „100 cents = 1 $SCOUT" = nur DB-Speicher-Präzision, kein Peg. 🟡 `CONCEPT-DPC-ECONOMY.md` „10.000 $SCOUT = 1 EUR" ist **falsch (Faktor 100)** → Doc korrigieren. **Kein Live-Bug:** Phase 1 Closed Economy rechnet nirgends $SCOUT→EUR.

**ICO-Plan (Kontext):** Pre-ICO/Seed €0,01 (= 1 Cent, deckt sich mit Card-Math) · Main ICO €0,03 · 1 Mrd Supply · Pilot-Credits → Token-Migration. **Offene Phase-3-Frage:** Token-Preis steigt (1→3 Cent→Markt), Card-Preis fix in $SCOUT → EUR-Gegenwert schwankt mit Coin. Card fix-in-$SCOUT (Asset-Verhalten) oder EUR-Anker? — nicht jetzt.

**Verbleibende Prüfpunkte vor CSF-Bau:**
- Cap-Semantik (pro Card vs. Transfer-Referenz) sauber definieren.
- Club-Treasury: echtes Konto + Buchungslücke (IPO-85 % + P2P-Club) schließen.

---

## 6. Abgeleitete Slice-Sequenz (Vorschlag, nach §5-Entscheidungen)

1. **Club-Treasury-Fundament** — echtes Konto, alle Einnahmen verbucht (Buchungslücke zu), Deposit (intern) + Saldo-SSOT. *Voraussetzung für alles Weitere.*
2. **CSF-Engine neu** — Formel nach §5.1, einmalige Auszahlung aus Treasury, Snapshot, Was-wäre-wenn-Rechner, `csf_multiplier`-Entscheidung §5.2.
3. **Fan-Reward-Engine** — Club → gezielte Fan-Belohnung aus Treasury (Airdrops/club-Missionen/Drops).
4. **Phase-2-Vorhalt** — EUR Cash-out/Deposit (lizenz-gegated, nicht jetzt bauen).

---

## 7. Betroffene Komponenten & Themen (Basis-Register)

> Alles, was am Scout-Card-Money-Modell hängt. Referenz für jede künftige Spec, damit kein Pfad übersehen wird (D43/D54-Familie: „Existenz ≠ vollständige Erfassung").

**Kern-Aussagen (unveränderlich, als Basis):**
1. Scout Card = vertragsgekoppelter Anteil (Produkt-Wahrheit) / Sammelkarte (Wort). 100.000 SC = 100 % Spielerwert, max 10.000 SC = 10 %. 1 SC = MV/100.000.
2. **1 $SCOUT = 1 Cent = 0,01 €** (100 $SCOUT/€). Phase 1 = bCredits intern, Cash-out Phase 2.
3. IPO-Preis = Vereins-Entscheidung mit MV-Anker (Einstieg). Liquidations-Wert = realer Transfer × 10 %-Regel, Cap (Ausgang). Differenz = Scout-Fang.
4. CSF = einmalig (keine Tranchen), aus Club-Treasury, rein proportional nach Besitz (kein csf_multiplier). Nur SC im Umlauf.
5. Club-Treasury = echtes bidirektionales Konto (Einnahmen + Deposit / CSF + Fan-Rewards + Withdrawal[Ph2]).

**Tabellen:** `players` (ipo_price, floor_price, market_value_eur, success_fee_cap_cents, is_liquidated) · `ipos` · `holdings` · `liquidation_events` · `pbt_treasury` · `fan_rankings` (csf_multiplier → entfernen) · `club_subscriptions` · `club_followers` · `club_withdrawals` · `trades` (club_fee) · `transactions` · `wallets` · `fee_config`.

**RPCs:** `liquidate_player` (Formel/Treue raus/Cap) · `create_ipo` · `buy_from_ipo` · `buy_player_sc` · `buy_from_order` · `get_club_balance` (Buchungslücke IPO/P2P) · `request_club_withdrawal` · `calculate_success_fee` (NEU, fehlt) · Treasury-Deposit (NEU).

**Services:** `players.ts` (createPlayer, PLAYER_SELECT_COLS) · `ipo.ts` · `trading*` · `wallet*` · `club.ts` (getClubBalance) · `clubSubscriptions.ts` · `fanRanking.ts`.

**Components:** `AdminPlayersTab` + `useAdminPlayersState` (IPO-Erstellung — **Slice A**) · `AdminTreasuryTab` (Treasury) · `PlayerHero` / `TradingTab` / `BuyModal` / `RewardsTab` (Card-Preis-Display) · Player-Detail (Was-wäre-wenn-Rechner, NEU).

**Docs:** `CONCEPT-DPC-ECONOMY.md` (🟡 Wechselkurs + Tranchen korrigieren) · `trading.md` · `pilot-founding-strategy-design.md` (ICO) · `business.md` (Wording, Licensing-Phasen) · `decision_pricing_asset_model.md` (Pfad-Drift: in trading.md referenziert, existiert nicht).

**Themen:** Wechselkurs (✅ geklärt) · IPO-Preisbildung · CSF/Liquidation · Club-Treasury · Fan-Reward-Engine · Phase-1-bCredits→Phase-3-Token.

---

## 8. Treasury-Fundament — IST-Stand + Zielbild (Konzeption 2026-06-16)

> Verifiziert via Explore-Agent gegen `src/` + `supabase/migrations/`. Das Club-Treasury ist die **zentrale Engagement-Investitions-Kasse** des Vereins: verdientes Geld wird in Fan-Aktivierung reinvestiert (→ SC-Nachfrage).

### IST-Stand (überraschend)
- **Kein echtes Konto.** Zwei parallele Saldo-Systeme, eines tot:
  1. `clubs.treasury_balance_cents` — persistente Spalte, bei jedem Trade/IPO inkrementiert, aber **nirgends gelesen** (Dead-Write-Counter).
  2. `get_club_balance` (RPC) — **on-the-fly** `SUM(trades.club_fee) + SUM(aktive Abos) − Withdrawals`; speist die UI, ignoriert die Spalte.
- **IPO-85 % ist NICHT die vermutete Lücke** — landet korrekt im Saldo (via `trades.club_fee`).
- **PBT** = komplett separater Topf (per Spieler, 1,5 %, → Holder bei Liquidation). Keine Überlappung.
- 🐛 **Abo-Bug:** nur `status='active'` zählt → läuft ein Abo aus, schrumpft `total_earned` **rückwirkend** (verdientes Geld verschwindet). Mit echtem Konto unvereinbar.
- **Kein Deposit-Pfad, keine atomare RAUS-Seite.** Heute kann der Club nur ansammeln, nicht gezielt ausgeben.
- **Source-Schuld:** `request_club_withdrawal` + `accept_offer` (P2P) Bodies nur in Remote-DB, nicht in Migrations (AR-43-Verstoß, Greenfield-Risiko).

### Zielbild: echtes Konto = Saldo + append-only Kontoauszug (Ledger)
Jede Bewegung (rein wie raus) = **eine Ledger-Zeile**; Saldo = Summe daraus (analog User-`wallets` + `transactions` append-only). Löst den Abo-Bug (verdient = bleibt gebucht) + liefert die fehlende RAUS-Seite.

```
   REIN (verdient, Phase 1)        CLUB-KONTO            RAUS (intern $SCOUT, Phase 1)
 Trading 1% · IPO 85% ──┐      ┌─ Saldo (1 Wahrheit) ┐   ├─ CSF an Holder (Liquidation)
 P2P 0,5% · Abo 100% ───┼─────►│  + Ledger           │──►├─ Fan-Rewards (gezielt)
 (EUR-Deposit = Ph2) ───┘      └─ (append-only)      ┘   ├─ Event-Belohnungen (Prize-Pools)
                                                          ├─ Umfrage-Belohnungen (Polls)
                                                          ├─ Aufträge/Bounties (vergütet)
                                                          └─ (Withdrawal EUR = Phase 2)
```

**Phase 1 = rein intern $SCOUT:** REIN = verdiente Einnahmen, RAUS = alle Engagement-Belohnungen. Echtes EUR rein/raus (Deposit + Cash-out) = Phase 2.

### Anschluss-Punkt: heutige Finanzierung der RAUS-Kanäle (verifiziert 2026-06-16)

| Kanal | finanziert heute | Quelle | Club-Konto belastet? |
|---|---|---|---|
| Event-Prizes | Teilnehmer-Entry-Fees → `prize_pool` (zero-sum) | `events.prize_pool` aus `event_entries.fee_split` | nein (Club kriegt „beneficiary"-Anteil) |
| Polls | Teilnehmer zahlt `cost_bsd` zum Voten | 70 % → Creator/Club **verdient** (`cast_community_poll_vote`) | nein — Club verdient hier sogar |
| Bounties | Ersteller-Wallet Escrow (`locked_balance`) | `create_user_bounty`; Club-Bounty (`club_id`) → Admin-User-Wallet | nein (kein Club-Wallet) |
| CSF | PBT[player] + Success-Fee-Pool (`liquidate_player`) | PBT-Treasury | nein |
| Fan-Rewards (gezielt) | **existiert nicht** | — | n.a. |

**Strategischer Kern-Befund — extractive → investive:** Heute ist das Modell *extractive* (Fan zahlt für Engagement, Plattform/Club verdient). KEIN Pfad lässt den Verein Engagement aus eigenem Geld *sponsern*. Anils Vision dreht das auf *investive*: Verein reinvestiert verdientes $SCOUT in Fan-Aktivierung. Treasury ist das Werkzeug. Pro Kanal:
- **Events:** Verein stockt `prize_pool` aus Treasury auf (auch Gratis-Events) → SC-Nachfrage-Hebel.
- **Polls:** *neue* Mechanik — Verein belohnt Teilnahme (Umkehrung des heutigen „Fan zahlt").
- **Bounties:** Club-Bounties aus Treasury statt Admin-Privat-Wallet.

### Event-Prize-Finanzierung — KORREKTUR + 5-Quellen-Modell (verifiziert Slice 331, 2026-06-17)

**Korrektur zur Tabelle oben:** „Event-Prizes finanziert Entry-Fees (zero-sum)" ist **falsch**. Verifiziert via `score_event` (Live-functiondef) + `20260321_unified_event_payment.sql` + UI:
- Entry-Fees sind **Tickets** (`user_tickets`, Live-Modus) — eine **andere Währung** als der `$SCOUT`-`prize_pool`. ($SCOUT-Entry = `scout`-Currency, Feature-Flag `scout_events_enabled=false`.)
- `score_event` schreibt den deklarierten `prize_pool` **direkt in die Gewinner-Wallets, ohne Konto-Belastung** → **Minting** (gleiche Klasse wie Pre-330-CSF). Tickets decken den Prize nicht.

**Die Geldquelle eines Events ist `events.type`** (= Kategorie UND Finanzierung), bestätigt via `EventFormModal` (Erstellung) + `EventBrowser` (Teilnahme-Kategorien). 5 Quellen:

| `events.type` | Wer zahlt den Prize | Quelle existiert? | Reconcile-Slice |
|---|---|---|---|
| **club** | Vereins-Treasury | ✅ (329/330b) | **Slice 331** (escrow bei Insert via Trigger, nur type='club') |
| **bescout** | Plattform (BeScout) | ❌ Plattform-Topf (ADR-026) noch nicht gebaut | später |
| **special** | vermutl. Plattform | ❌ | später (wie bescout) |
| **sponsor** | Sponsor (sponsor_name gesetzt) | ❌ Sponsor-Deposit-Mechanik fehlt | später |
| **creator** | User-Wallet | ❌ live aus (`PAID_FANTASY_ENABLED`=false, Phase 4) | später |

**Scope-Regel (D-…):** Jeder Prize braucht eine Quelle. Reconcile (Minting → echte Quelle) erfolgt **eine Quelle pro Slice**. Slice 331 = nur `type='club'` (Vereins-Treasury, einzige existierende Quelle). `bescout`/`special`/`sponsor`/`creator` **minten bewusst weiter**, bis ihr jeweiliger Quellen-Slice gebaut ist. Der Escrow-Trigger keyt auf `type='club'` (NICHT auf „wer hat angelegt" — ein Club-Admin kann auch andere Typen anlegen, die dann nicht die Vereins-Treasury belasten). **Offene Permissions-Frage (separat):** soll ein Club-Admin überhaupt non-club-Typen anlegen dürfen?

**Geld-Modell:** alles **Transfer, kein Minting** — Treasury gibt verdientes $SCOUT aus, Geld zirkuliert. Closed Economy bleibt deflationär-neutral, keine Inflation.

### Gap-Liste (Bau, nach Konzeption)
1. Saldo-SSOT: Ledger-Tabelle (`club_treasury_ledger`, append-only) + Saldo-Feld; `get_club_balance` darauf umstellen; Doppel-Buchung (Spalte + SUM) auflösen.
2. Alle Einnahmen ledger-basiert verbuchen (einmal beim Verdienen) → Abo-Bug weg.
3. P2P `accept_offer` verifizieren + einbinden.
4. Atomare RAUS-RPCs (FOR UPDATE + Dekrement) für CSF · Fan-Rewards · Event-Prizes · Polls · Bounties.
5. Deposit-Pfad (Phase 1 intern) — existiert nicht.
6. Source-Schuld: `request_club_withdrawal` + `accept_offer` in Migrations zurückholen.
7. UI: `AdminTreasuryTab` zeigt Club-Fee fälschlich als „Outflow/burn"; per-Club-Breakdown + `sub_revenue` ergänzen.

---

## 9. Fan-Reward-Engine — paralleles Membership-Perks-System (Konzeption 2026-06-16)

> **Zweck (Anil):** Fans anreizen, dem Club zu **folgen / zu abonnieren**. Primär ein **Perks-/Gating-System** (Conversion-Anreiz), NICHT primär ein Treasury-Geldfluss. Direkte $SCOUT-Airdrops = optionale zweite Ebene.

### Zwei parallele Status-Schienen (Anil-Decision: „parallel")
Ein Fan erreicht Perks auf zwei unabhängigen Wegen — beide treiben Follow/Abo, ohne sich zu entwerten:

| Schiene | Natur | Stufen | Perks |
|---|---|---|---|
| **Abo** (Geld — Club *verdient*) | bezahlt | Bronze / Silber / Gold | Fee-Rabatt (0,5/1/1,5 %) · Early IPO Access (Silber+) · Premium Fantasy (Gold) · Premium-Polls/Votes |
| **Fan-Rank** (Treue — Club *belohnt*) | verdient durch Aktivität | Zuschauer→Vereinsikone (6) | exklusiver Community-Zugang (Treue-Polls/Votes/Bereiche) · Status-Badges · optional Treasury-Airdrop an Top-Tiers |
| **Follow** (Einstieg) | gratis | — | Basis-Community-Zugang (heute bringt Folgen NICHTS → erster Anreiz) |

### Bestehende Basis (nicht von Null)
Viele Perks existieren bereits als `club_subscriptions`-Benefits (heute nur Abo-gekoppelt): Fee-Discount, IPO Early Access, 2× Vote-Gewicht, exklusive Bounties, Premium Fantasy. Tier-Gating existiert (`events.min_subscription_tier`). **Neu:** (1) Follow-Einstiegsstufe, (2) Fan-Rank als zweite Perk-Achse (heute nur toter csf_multiplier), (3) Votes/Polls-Gating ausbauen, (4) **Club-Konfigurierbarkeit** (heute plattform-fix → Club entscheidet welche Perks an welche Stufe).

### Treasury-Verhältnis
Perks-Gating kostet das Treasury **nichts direkt** (außer Fee-Rabatt = entgangene Einnahme). Nur die optionale **Airdrop-Ebene** (direkte $SCOUT/Drops an Fan-Rank-Tiers) ist echter Treasury-Outflow → dann via Club-Airdrop-Mechanik (§8 RAUS). Die Fan-Reward-Engine ist daher **leichter** als das Treasury und nicht zwingend von ihm abhängig.

### Offen (bei Spec): exklusive Votes/Polls — Abo-Schiene (Premium) vs. Fan-Rank-Schiene (Treue) vs. beide. Club-konfigurierbar lösen.

---

## 10. Money/Reward-Modell — Konzeptions-Stand (2026-06-16)

| Baustein | Konzept | Bau |
|---|---|---|
| Pricing / IPO-Preis (MV-Anker) | ✅ §3.4 | ✅ Slice 328 DONE |
| Wechselkurs (1 $SCOUT = 1 Cent) | ✅ §5 | — (Doc-Fix CONCEPT-DPC offen) |
| CSF / Liquidation (10 %-Regel, proportional, Tranchen raus, csf_mult raus) | ✅ §3.2 + §4 | offen |
| Club-Treasury-Fundament (Saldo + Ledger, REIN/RAUS) | ✅ §8 | offen (nächster großer Slice) |
| Fan-Reward-Engine (2 Schienen parallel) | ✅ §9 | offen |

**Bau-Sequenz (Vorschlag):** 1) Treasury-Fundament (Saldo + Ledger + Einnahmen-Verbuchung, Abo-Bug-Fix) → 2) CSF-Engine an Treasury → 3) RAUS-Kanäle ans Treasury (Events/Polls/Bounties-Aufstockung) → 4) Fan-Reward-Engine (Perks-Schienen + optional Airdrop). Alle Money-kritisch → CEO-Scope, sorgfältige Specs.

---

*Strategie-Session 2026-06-15/16. Slice A (MV-Anker-IPO-UI) DONE. Money/Reward-Modell konzeptionell komplett. Nächster echter Bau-Slice: Treasury-Fundament.*
