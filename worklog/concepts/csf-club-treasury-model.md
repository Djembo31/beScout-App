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

**Verbleibende Prüfpunkte vor jedem CSF-Bau:**
- 🔴 **Wechselkurs-Skala** ($SCOUT↔Cent, Faktor-100-Drift trading.md vs CONCEPT) — money-kritisch verifizieren.
- Cap-Semantik (pro Card vs. Transfer-Referenz) sauber definieren.
- Club-Treasury: echtes Konto + Buchungslücke (IPO-85 % + P2P-Club) schließen.

---

## 6. Abgeleitete Slice-Sequenz (Vorschlag, nach §5-Entscheidungen)

1. **Club-Treasury-Fundament** — echtes Konto, alle Einnahmen verbucht (Buchungslücke zu), Deposit (intern) + Saldo-SSOT. *Voraussetzung für alles Weitere.*
2. **CSF-Engine neu** — Formel nach §5.1, einmalige Auszahlung aus Treasury, Snapshot, Was-wäre-wenn-Rechner, `csf_multiplier`-Entscheidung §5.2.
3. **Fan-Reward-Engine** — Club → gezielte Fan-Belohnung aus Treasury (Airdrops/club-Missionen/Drops).
4. **Phase-2-Vorhalt** — EUR Cash-out/Deposit (lizenz-gegated, nicht jetzt bauen).

---

*Strategie-Session 2026-06-15. Nächster Schritt: §5-Entscheidungen mit Anil, dann Spec für Slice 1 (Club-Treasury-Fundament).*
