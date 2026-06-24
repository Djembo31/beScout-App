---
title: Treasury & CSF — Money/Reward-Modell (Kanon)
created: 2026-06-15
updated: 2026-06-24
status: active
tags: [treasury, csf, money, ipo, scout-cards, fan-rewards, fee-split]
consult_when: Treasury, CSF, IPO/Erstverkauf, Escrow, Fan-Rewards, Geld-Flows, Credits/cents-Einheit, Fee-Splits-Mechanik, Liquidation, Club-Treasury, Ledger
verified-against: .claude/rules/trading.md @ 2026-06-24
---

# Treasury & CSF — Money/Reward-Modell (Kanon)

> **Kanon (WIE):** das konsolidierte Geld-/Reward-Modell — Scout Card → IPO → CSF → Club-Treasury → Fan-Rewards. **WARUM-Entscheidung:** `memory/decisions.md` **D83**. **Code-Regel (schlank):** `.claude/rules/trading.md`. Diese Datei ist die ausführliche Wahrheit; trading.md hält die knappen Pre-Edit-Regeln + zeigt hierher.
>
> **Quellen:** `docs/CONCEPT-DPC-ECONOMY.md` (v1.0 Original-Konzept), Code-Verifikation (`liquidate_player` Slice 108/178e), `domain/reward-ranking.md`. Strategie-Sessions 2026-06-15/16.

## Bau-Stand (2026-06-17) — RAUS-Kanäle komplett
- **329** Club-Treasury-Fundament (echtes Konto: Saldo + append-only Ledger) ✅
- **330** CSF-Engine ans Treasury (Liquidation zahlt aus Treasury) ✅ · **330b** Saldo-Debit-Reconcile + Kontoauszug ✅
- **331** Events ans Treasury (Prize-Escrow bei Erstellung, nur `type='club'`, 5-Quellen-Modell) ✅
- **332** Club-Bounties ans Treasury (Reward-Escrow bei Erstellung, mirror 331) ✅
- **Damit:** RAUS-Kanäle (CSF · Event-Prizes · Bounties) escrow-gedeckt, trigger-zentrisch, nur Club-Quelle. **Offen:** Polls (REIN-Geldmaschine, `domain/polls.md`, D86) · Fan-Reward-Engine (§9) · Deposit-Pfad (Phase 1) · andere Event-Quellen (bescout/sponsor/special/creator minten bewusst weiter).
- **Money-Slice-Muster (bewährt 329-332):** Live-`pg_get_functiondef` VOR Spec (D87) · trigger-zentrisch (Escrow BEFORE INSERT + Settle BEFORE UPDATE OF status + Resync BEFORE UPDATE OF betrag) · Guard `ledger_net − offene withdrawals` unter `clubs FOR UPDATE` · `pg_get_constraintdef` gegen CHECK-Drift · force-rollback-Smokes.

---

## 1. Strategischer Frame

- **Scout Card = vertragsgekoppelter Anteil am Spieler** (Produkt-Wahrheit, Equity-artig). Legal über das Doppel-Register: nach außen „digitale Sammelkarte mit Utility", nicht „Spieleranteil". Asset-Laufzeit = Spielervertrag.
- **Das Kern-Wertversprechen ist der Scout-Fang:** einen 2-Mio-Spieler früh „catchen", der für 20 Mio transferiert wird → Einsatz ~10×. Wert kommt über **zwei Pfade**: (a) Sekundärmarkt-Handel (floor_price preist erwarteten Transfer + Cap ein) **oder** (b) Halten bis zur Liquidation → CSF-Ausschüttung.
- **Phase 1 = geschlossene Credits-Welt.** Treasury, CSF, Fan-Rewards kreisen intern als Credits (in Pilot/Beta wertloses Spielgeld, kein €-Wert — D99).
- **Cash-out (echtes EUR raus) = Phase 2**, nach gültiger Token-Lizenz. Gilt für Clubs *und* Fans. Echtes EUR-Einzahlen von außen liegt auf derselben Phase-2-Achse. (Phasen-Nummerierung jetzt einheitlich **1/2/3** per D99 — `business.md` ADR-028 entsprechend aktualisiert.)

---

## 2. Entscheidungen (2026-06-15, Anil)

| # | Entscheidung | Konsequenz |
|---|---|---|
| **CSF-1** | **Tranchen raus** — CSF wird bei Liquidation **in einer Summe** ausgezahlt (nicht 40/30/30 über 12 Monate). | Snapshot-über-Monate + 3 Auszahl-Zyklen entfallen. Code macht das heute schon so. Begründung: der einzige Tranchen-Grund (Club-Cashflow-Schutz) entfällt, weil der Club aus seinem BeScout-Guthaben zahlt. |
| **CSF-2** | **Club-Treasury ist die CSF-Quelle** — verdientes Club-Geld (Trading 1 %, Abos 100 %, IPO 85 %, PBT) kreist intern und finanziert die CSF. | Wertschöpfung bleibt im geschlossenen System, kein externer EUR-Transfer für CSF nötig. |
| **CSF-3** | **Club-Treasury ist bidirektional + Fan-Reward-Engine** — der Verein kann Budget gezielt einsetzen, um Fans zu belohnen, Aktivität zu fördern und neue Fans zu gewinnen. | Beantwortet die offene Frage („wie belohnt ein Verein aktive Fans?"). |
| **CSF-4** | **Phase 1 intern Credits, Cash-out Phase 2.** | EUR-Ein-/Auszahlung (Club + Fan) ist Phase-2-Scope. Phase-1-Marketing-Budget = verdiente Club-Credits. |

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
- **Berechnung:** `CSF = (verkaufte Cards / 10.000 × 10 %) × min(Transfererlös, Cap)`, dann **proportional nach Besitz**. (Code: lineare Pro-Card-Form `fee_per_dpc = transfer/10`; liquidiert `SUM(holdings)` = im Umlauf.)
- **Auszahlung:** einmalig (CSF-1), **aus dem Club-Treasury** (Slice 330), als Credits in die Holder-Wallets.
- **Snapshot:** Besitz zum Zeitpunkt der Liquidierung bestimmt die Verteilung.
- **Karriereende/ablösefrei:** kein Transfererlös → keine CSF, stattdessen PBT-Ausschüttung (ADR-022).

### 3.3 Gezielte Fan-Rewards (Club → aktive/treue Fans)

Der Verein setzt Treasury-Budget ein, um Engagement zu fördern — konkrete Kanäle (zu spezifizieren, §9):
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

**Tokenisierung (Beispiel Osimhen, MV 75 Mio):** 100.000 SC = 100 %, max 10.000 SC = 10 %. 1 SC = MV/100.000 = **750 € (ICO-Peg) = 75.000 Credits**. Exklusive Spieler = exklusive Cards (gewollt). Code-Stand: `create_ipo(p_price)` respektiert expliziten Preis; MV-Anker-IPO-UI = Slice 328 DONE.

---

## 4. Tokenisierung + Wechselkurs (verifiziert)

**Tokenisierung (Anil 2026-06-15):** 100.000 SC = 100 % des Spielerwerts → 1 SC = MV/100.000. Verein erstellt max **10.000 SC = 10 %**. Bei IPO-Vollverkauf nimmt der Club ~10 % des MV ein. Liquidiert werden **nur die im Umlauf befindlichen** SC (Holdings), nicht der unverkaufte Pool.

**Einheit + ICO-Peg (D99-kanonisch, code-verifiziert):** Zwei „Cent" sauber trennen — **DB-Speicher = „cents" (BIGINT)**, **Anzeige = „Credits" = cents/100 → 1 Credit = 100 DB-cents**; der **ICO-Wert** (Phase 2, **nicht heute**, user-facing nie €) ist **1 Credit = 0,01 € (= 1 Euro-Cent)**. Bestätigt durch `trading.md` + Live-Code (`MV/10` cents → `centsToBsd` → `MV/1000 Credits`; Osimhen 75.000 Credits = 750 €) + ICO-Seed-Preis (€0,01). In Pilot/Beta sind Credits **wertloses Spielgeld** (D99) — Phase 1 Closed Economy rechnet nirgends Credits→EUR. (`CONCEPT-DPC-ECONOMY.md` alter „10.000 BSD = 1 EUR"-Faktor wird im E4-Glattzug geheilt.)

**ICO-Plan (Kontext):** Pre-ICO/Seed €0,01 · Main ICO €0,03 · 1 Mrd Supply · Pilot-Credits → Token-Migration. **Offene Phase-3-Frage:** Token-Preis steigt (1→3 Cent→Markt), Card-Preis fix in $SCOUT → EUR-Gegenwert schwankt mit Coin. Card fix-in-$SCOUT (Asset-Verhalten) oder EUR-Anker? — nicht jetzt.

---

## 5. Kern-Aussagen (unveränderlich, als Basis)

1. Scout Card = vertragsgekoppelter Anteil (Produkt-Wahrheit) / Sammelkarte (Wort). 100.000 SC = 100 % Spielerwert, max 10.000 SC = 10 %. 1 SC = MV/100.000.
2. **Einheit:** intern „cents" (BIGINT) · Anzeige **„Credits" = cents/100** (1 Credit = 100 cents). **ICO-Wert (Phase 2, nicht heute): 1 Credit = 0,01 € (= 1 Euro-Cent).** Phase 1 = Credits intern (wertloses Spielgeld), Cash-out Phase 2. „$SCOUT" = ICO-Coin-Name. (D99)
3. IPO-Preis = Vereins-Entscheidung mit MV-Anker (Einstieg). Liquidations-Wert = realer Transfer × 10 %-Regel, Cap (Ausgang). Differenz = Scout-Fang.
4. CSF = einmalig (keine Tranchen), aus Club-Treasury, rein proportional nach Besitz (kein `csf_multiplier` — entfernt; Treue läuft über Fan-Reward-Engine). Nur SC im Umlauf.
5. Club-Treasury = echtes bidirektionales Konto (Einnahmen + Deposit / CSF + Fan-Rewards + Event-Prizes + Poll-Revenue[REIN] + Bounties + Withdrawal[Ph2]).

**Fee-Splits (SSOT `business.md`):** Trading 3,5 % Platform + 1,5 % PBT + 1 % Club · IPO 10 % Plat + 5 % PBT + 85 % Club · Research 20/80 · Bounty 5/95 · Polls 20/80 · P2P 2 % + 0,5 % PBT + 0,5 % Club · Club-Abos 100 % Club.

---

## 6. Betroffene Komponenten (Basis-Register)

> Alles, was am Scout-Card-Money-Modell hängt — Referenz für jede künftige Spec (D43/D54-Familie „Existenz ≠ vollständige Erfassung").

**Tabellen:** `players` (ipo_price, floor_price, market_value_eur, success_fee_cap_cents, is_liquidated) · `ipos` · `holdings` · `liquidation_events` · `pbt_treasury` · `club_treasury_ledger` (Slice 329, append-only) · `fan_rankings` · `club_subscriptions` · `club_followers` · `club_withdrawals` · `trades` (club_fee) · `transactions` · `wallets` · `fee_config`.

**RPCs:** `liquidate_player` (CSF aus Treasury, Slice 330) · `create_ipo` · `buy_from_ipo` · `buy_player_sc` · `buy_from_order` · `get_club_balance` (Ledger-basiert, 329/330b) · `request_club_withdrawal` · Event-Prize-Escrow-Trigger (331) · Bounty-Escrow-Trigger (332) · `calculate_success_fee` (Was-wäre-wenn, offen).

**Services:** `players.ts` · `ipo.ts` · `trading*` · `wallet*` · `club.ts` (getClubBalance) · `clubSubscriptions.ts` · `fanRanking.ts`.

**Components:** `AdminPlayersTab` · `AdminTreasuryTab` (Saldo + Kontoauszug) · `PlayerHero`/`TradingTab`/`BuyModal`/`RewardsTab` · Player-Detail (Was-wäre-wenn-Rechner, offen).

---

## 7. Club-Treasury — Modell (Saldo + append-only Ledger)

Echtes Konto = **Saldo + append-only Kontoauszug**. Jede Bewegung (rein wie raus) = **eine Ledger-Zeile**; Saldo = Summe daraus (analog User-`wallets` + `transactions`). Löst den früheren Abo-Bug (verdient = bleibt gebucht) + liefert die RAUS-Seite.

```
   REIN (verdient, Phase 1)        CLUB-KONTO            RAUS (intern $SCOUT, Phase 1)
 Trading 1% · IPO 85% ──┐      ┌─ Saldo (1 Wahrheit) ┐   ├─ CSF an Holder (Liquidation)   ✅330
 P2P 0,5% · Abo 100% ───┼─────►│  + Ledger           │──►├─ Event-Belohnungen (Prize-Pools) ✅331
 Poll-Revenue (REIN) ───┤      │  (append-only)      │   ├─ Aufträge/Bounties (vergütet)    ✅332
 (EUR-Deposit = Ph2) ───┘      └─                    ┘   ├─ Fan-Rewards (gezielt)           ⬜
                                                          └─ (Withdrawal EUR = Phase 2)
```

**Phase 1 = rein intern Credits:** REIN = verdiente Einnahmen, RAUS = alle Engagement-Belohnungen. Echtes EUR rein/raus (Deposit + Cash-out) = Phase 2. **Geld-Modell:** alles **Transfer, kein Minting** — Treasury gibt verdiente Credits aus, Geld zirkuliert (deflationär-neutral).

### Event-Prize-Finanzierung — 5-Quellen-Modell (verifiziert Slice 331)
Die Geldquelle eines Events ist **`events.type`** (= Kategorie UND Finanzierung):

| `events.type` | Wer zahlt den Prize | Quelle gebaut? |
|---|---|---|
| **club** | Vereins-Treasury | ✅ Slice 331 (Escrow bei Insert via Trigger) |
| **bescout** | Plattform (BeScout) | ❌ Plattform-Topf (ADR-026) noch nicht — mintet bewusst weiter |
| **special** | vermutl. Plattform | ❌ später |
| **sponsor** | Sponsor (sponsor_name) | ❌ Sponsor-Deposit fehlt |
| **creator** | User-Wallet | ❌ (`PAID_FANTASY_ENABLED`=false, Phase 4) |

**Scope-Regel:** Reconcile (Minting → echte Quelle) erfolgt **eine Quelle pro Slice**. Escrow-Trigger keyt auf `type='club'` (NICHT auf „wer hat angelegt"). Offene Permissions-Frage (separat): darf ein Club-Admin überhaupt non-club-Typen anlegen?

---

## 8. Fan-Reward-Engine — paralleles Membership-Perks-System (aktuelle Phase gebaut)

> **Zweck (Anil):** Fans anreizen, dem Club zu **folgen / zu abonnieren**. Primär ein **Perks-/Gating-System** (Conversion-Anreiz), NICHT primär ein Treasury-Geldfluss. Direkte $SCOUT-Airdrops = echte-Coin-/CASP-Phase, aktuell **nicht bauen**.

### Zwei parallele Status-Schienen (Anil: „parallel")
| Schiene | Natur | Stufen | Perks | Bau-Stand |
|---|---|---|---|---|
| **Abo** (Geld — Club *verdient*) | bezahlt | Bronze / Silber / Gold | Fee-Rabatt · Early IPO Access · Premium Fantasy · Premium-Polls/Votes | Abo-2× bei Paid-Polls live; Early-Access offen |
| **Fan-Rank** (Treue — Club *belohnt*) | verdient durch Aktivität | Zuschauer→Vereinsikone (6) | exklusiver Community-Zugang · Status-Badges · Poll-Gewicht · club-konfigurierbare Schwellen | **FRE-1/2/3/5 live** |
| **Follow** (Einstieg) | gratis | — | Basis-Community-Zugang + Einstiegssignal | **Follow +5 live (FRE-2)** |

**Bau-Stand 2026-06-19:** FRE-1 Leiter/Perk-Katalog ✅ · FRE-2 Follow zählt ✅ · FRE-3 exklusive Vereins-Beiträge mit 🔒-Vorschau ✅ · FRE-5 club-konfigurierbare Fan-Rang-Schwellen ✅. **FRE-4 Airdrop ist bewusst verschoben** auf echte-Coin-/CASP-Phase; Verein zahlt aktuell keine $SCOUT-Airdrops aus Treasury.

**Offen in aktueller Phase:** Polls-Reste (exklusive Treue-Umfragen, Abo-Early-Access). `csf_multiplier`-Removal ist erledigt (Slice 348 — Spalte + RPC-Variable + Return-Feld + TS raus). Fan-Reward-Engine selbst ist für diese Phase produktfähig genug; nächster Fokus = Pro-Stand-Roadmap `worklog/notes/348-pro-stand-roadmap.md`.

---

## 9. Bau-Sequenz (Stand 2026-06-19)

1. ~~Club-Treasury-Fundament~~ ✅ Slice 329 (Saldo + Ledger + Einnahmen-Verbuchung).
2. ~~CSF-Engine an Treasury~~ ✅ Slice 330 + 330b.
3. RAUS/REIN-Kanäle: ~~Events~~ ✅331 · ~~Bounties~~ ✅332 · ~~Polls-REIN~~ ✅333-337+343 · andere Event-Quellen offen.
4. ~~Fan-Reward-Engine aktuelle Phase~~ ✅ FRE-1/2/3/5 (344-347). **Airdrop/FRE-4 deferred** bis echte-Coin-/CASP-Phase.
5. ~~`csf_multiplier` raus~~ ✅ Slice 348. **Nächste Pro-Stand-Arbeit:** Polls-Reste (exklusive Treue-Umfragen, Abo-Early-Access) · E2/S7-Aufräumen (Leaderboard, Dormant, Bridges).
6. **Phase-2/3-Vorhalt** — EUR Cash-out/Deposit/Coin/Airdrops (lizenz-/CASP-gated, nicht jetzt).

Alle Money-kritisch → CEO-Scope, sorgfältige Specs (D87-Muster).

---

## 10. Plattform-Treasury (BeScout-Topf) — geplant, D96 (2026-06-23)

> **Befund (Live-verifiziert, alle 6 Fee-RPCs via `pg_get_functiondef`, D87):** Der **Plattform-Anteil JEDER Fee-Quelle wird verbrannt** — dem Zahler abgezogen, auf KEIN Konto gebucht, weg aus dem Umlauf. PBT- + Club-Anteile landen auf echten Konten, nur der **Plattform-Anteil** verbrennt überall → BeScout fängt heute technisch **0 €** seiner eigenen Fees auf. Es existiert **kein Plattform-Konto** (live nur `club_treasury_ledger` per-Club + `pbt_treasury`).

| Quelle | Plattform-% | RPC | heute |
|---|---|---|---|
| Trading | 3,5 % | `buy_player_sc`+`buy_from_order` | ✅ REIN 'trading' (Slice 358) |
| IPO | 10 % | `buy_from_ipo` | ✅ REIN 'ipo' (Slice 360) |
| Polls | 20 % | `cast_community_poll_vote` | ✅ REIN 'poll' (Slice 363, beide source-Branches) |
| Research | 20 % | `unlock_research` | ✅ REIN 'research' (Slice 364) |
| Bounty | 5 % | `approve_bounty_submission` | ✅ REIN 'bounty' (Slice 365, EINE Buchung deckt alle 3 Zahlungspfade) |
| P2P | 2 % | `accept_offer` | ✅ REIN 'p2p' (Slice 358) |

**Fees-REIN KOMPLETT (5/5 Quellen, Slice 365):** Trading 358 · IPO 360 · Polls 363 · Research 364 · Bounty 365 (+ P2P 358). Alle Plattform-Fee-Ströme fließen real in den BeScout-Topf (voller Auffang 100 %, D98). Nächster E3-Track = Slice 3 Monats-Liga e2e (RAUS-Kanal).

**Entscheidung (D96):** Plattform-Treasury als echtes Konto bauen (Saldo + append-only Ledger, Mirror Club-Treasury 329). **REIN** = die 6 verbrannten Plattform-Fee-Ströme. **RAUS** = plattformweite Rewards (**Monats-Liga**, **BeScout-Events** `type='bescout'`). Modell-Shift **deflationär → zirkulär** (bewusst, Anil). Selbst-finanzierend, kein Netto-Minting für Plattform-Rewards.

**Bau-Sequenz:** **1 Topf-Fundament ✅ Slice 357** (`platform_treasury` Singleton-Lock-Anker + `platform_treasury_ledger` append-only + `book_platform_treasury()`/`get_platform_balance()`/`get_platform_treasury_ledger()` + AdminTreasuryTab „Plattform-Topf"-Card; Single-Pot, Saldo=SUM unter Singleton-Row-Lock = **Variante A** [Revisit B = gecachter Saldo bei Millionen-Zeilen], **kein Backfill** → Topf live bei 0, `source`-CHECK hält alle 8 Epic-Werte) → **2 Fees REIN (inline `book_platform_treasury`, voller Auffang 100 % D98): ✅ Trading 358** (`buy_player_sc`+`buy_from_order`→'trading', `accept_offer`→'p2p') **· ✅ IPO 360** ('ipo') **· ✅ Polls 363** ('poll', beide source-Branches) **· ✅ Research 364** ('research', Single-Path) **· Bounty 365 offen** → 3 Monats-Liga e2e aus Topf (Live-Standing-UI + Cron voll-auto + `overall`=Median-Fix) → 4 BeScout-Events aus Topf (löst §7 „bescout mintet weiter" ab) → 5 Events als „BeScout Liga"-Wettkampf (Saison/Monat) + Ranking-Konsolidierung (7 Boards → klar).

> **Platform-Pot = Club-Treasury-329-Mirror minus tenant-id** (`type`→`source`, `clubs FOR UPDATE`→Singleton-`platform_treasury FOR UPDATE`, gleicher SUM/append-only-Trigger/RLS-0-Policy-Stack). Slice 357 live-verifiziert (proofs/357-money-smoke.txt: Kette 1000/1500/1200, append/delete/bad-source/noauth geblockt).

**Monats-Liga Ist-Stand (Slice-3-Vorarbeit):** `close_monthly_liga(date)` lebt, idempotent (Snapshot-Existenz-Guard), `liga_reward` im `transactions`-CHECK ✅, mintet heute **34.000 $SCOUT/Monat** (5.000/2.500/1.000 × 4 Dim). **0 Snapshots/0 Winners live** (nie gefeuert → Sieger-Box `/rankings` leer). `getMonthlyLeaderboard` liest Snapshots = **abgeschlossene** Monate (NICHT laufend) → echtes Live-Standing braucht neue Read-Query (Delta `scout_scores.x − season_start_x`). Detail-Plan: `worklog/notes/358-platform-treasury-epic.md` (+ Ursprung `357-preflight-monthly-leaderboard.md`).

---

*Kanon-Doc (WIE). Entscheidung (WARUM) = D83 + **D96** (Plattform-Treasury). Code-Regel = `.claude/rules/trading.md`. Polls = `domain/polls.md` (D86). Reward-/Ranking-Landkarte = `domain/reward-ranking.md`.*
