# Reward- & Ranking-Ökosystem — Konzept-Landkarte

> **Zweck:** Das gesamte „Aktivität → Messung → Belohnung → Sichtbarkeit"-Geflecht von BeScout auf einer Karte. Steuerungsdokument für die S7-Phase-3-Konsolidierung (D80). Verifiziert gegen Code + Migrationen (2026-06-15, 3 Explore-Agents).
>
> **Strategischer Frame (Anil, 2026-06-15): 50/50 — zwei gleichberechtigte Welten.**
> - **Welt 1 — PLATTFORM belohnt KÖNNEN**, global über alle 7 Ligen.
> - **Welt 2 — VEREIN belohnt TREUE**, club-lokal.
> - Quer darüber liegt die **Gamification-/Minting-Schicht** (Gewohnheit), die $SCOUT ausschüttet, aber keiner der zwei Welten sauber zugeordnet ist.

**Status:** IST-Aufnahme komplett. Zielbild + Slice-Ableitung = Diskussion mit Anil offen.

---

## 0. Das Geflecht in einem Bild

```
                          AKTIVITÄTEN
   Trading · Spieltag/Fantasy · Community/Social · Scouting/Research · Club-Bindung (Follow/Abo)
        │                    │                      │
        ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MESSUNG — 4 (!) parallele Aggregat-Welten, NICHT synchronisiert     │
│                                                                       │
│  WELT 1 (Können, global)        WELT 2 (Treue, club)   QUER           │
│  ├ scout_scores  (Elo, KANON)   fan_rankings           airdrop_scores │
│  └ user_stats    (REDUNDANT)    (5-Dim pro Club)       (3. Aggregat)  │
│       ▲ doppeln sich                                                  │
└─────────────────────────────────────────────────────────────────────┘
        │                              │
        ▼                              ▼
   BELOHNUNG                       BELOHNUNG
   Plattform mintet:              Verein zahlt:
   Monatsliga-$SCOUT (dormant)    CSF-Liquidations-Boost (≈wirkungslos)
   Score-Road, Streaks, Missions  1% Trading-Fee, Abo 100%, IPO 85%
        │                              │
        ▼                              ▼
   SICHTBARKEIT                    SICHTBARKEIT
   /rankings global+friends       Club-Fan-Board (TOT) · Co-Follower-Board (lebt)
```

---

## 1. WELT 1 — Plattform belohnt Können (global)

**Kanonische Quelle:** `scout_scores` — 3-Dim-Elo `trader_score / manager_score / analyst_score` (Start 500, kann fallen, ungecappt). Schreibpfad ausschließlich RPC `award_dimension_score` (REVOKED, nur via 8 DB-Trigger). `supabase/migrations/20260331_baseline_gamification.sql:252-265` + `20260330_gamification_triggers_doc.sql:22-89`. **Live: 128 Rows, 1.758 echte Delta-Logs.**

### Aktivität → Können-Score (verifiziert)
| User-Aktion | Dimension + Delta | Trigger |
|---|---|---|
| Trade kaufen (IPO / Markt) | trader +30 / +5 | `trg_trader_score_on_trade` |
| Trade verkaufen | trader +50…−30 (profit-gestuft), −20 Flip <24h | dito |
| Lineup-Platzierung (Event scored) | manager +50…−25 (Perzentil) | `trg_event_scored_manager` |
| Post / Research erstellen | analyst +3 / +5 | `trg_analyst_score_on_*` |
| Research verkauft / Upvote / neuer Follower | analyst +5 / +1 / +2 | div. Trigger |
| Gold-Abo aktiv | +20 % auf alle positiven Deltas | `award_dimension_score:44` |

**Rang-Badge:** Median der 3 Dimensionen → `getRang` (`lib/gamification.ts:176-186`). Kein gespeicherter Gesamt-Rang.

**Reward:** **Monatsliga** (`close_monthly_liga`) zahlt Top-3 je Dimension: 5.000 / 2.500 / 1.000 $SCOUT × 4 Dimensionen = **max ~34.000 $SCOUT/Monat**. Sieger-Kriterium = Score-**Delta** seit Saisonstart (belohnt Verbesserung, nicht Bestand).

**Sichtbarkeit:** `/rankings` → GlobalLeaderboard (Tabs overall/trader/manager/analyst) + FriendsLeaderboard + MonthlyWinners.

### 🔴 Schmerzpunkte Welt 1
- **W1-A — Doppelte Können-Wahrheit:** `user_stats.{trading,manager,scout}_score` ist eine **redundante Parallel-Kopie** mit gleichen Spaltennamen, aber **anderen Formeln** (Aktivitäts-Count, Start 0, cap 1000) und **eigenem Trigger** (`refresh_user_stats`, `20260418180000_...:125-244`). scout_scores (Elo) und user_stats können **per Konstruktion nie übereinstimmen**. Falsch-Freund: `user_stats.scout_score` ≠ `scout_scores.analyst_score`. **Zwei verschiedene Leaderboards laufen parallel:** `/rankings` nutzt scout_scores; Follow-Listen/Suche/Home/Scouting-Board nutzen user_stats.
- **W1-B — Monatsliga komplett dormant:** RPC payout-fähig, aber 0 Auszahlungen + **kein Cron** ruft `close_monthly_liga`. Aktivierung würde sofort bis 34.000 $SCOUT/Monat minten.
- **W1-C — Rang-Schwellen 3-fach divergent:** `rang_thresholds` (DB) ↔ `lib/gamification.ts:getRang` (stimmen überein) ↔ `rules/gamification.md` (stale: Diamant 4000 statt 3000, Legendär 7000 statt 5000).

---

## 2. WELT 2 — Verein belohnt Treue (club-lokal)

**Kanonische Quelle:** `fan_rankings` — pro `(user_id, club_id)`. 5 gewichtete Dimensionen via RPC `calculate_fan_rank` (`20260330_streak_benefits_rpcs.sql:312-535`):

| Dim | Gewicht | Quelle |
|---|---|---|
| event_score | 30 % | Fantasy-Lineups in **Club-Events** (Perzentil) |
| dpc_score | 25 % | Holdings von **Club-Spielern** (Menge + Haltedauer) |
| abo_score | 20 % | Aktives Club-Abo (gold 100 / silber 75 / bronze 50) |
| community_score | 15 % | Posts/Research/Votes im Club (90-Tage-Fenster) |
| streak_score | 10 % | Serie an Club-Event-Teilnahmen |

→ 6 Tiers **Zuschauer → Vereinsikone** mit `csf_multiplier` 1.00 → 1.50 (`src/lib/fanRanking.ts:24-31`).

**Aktualisierung:** nur nach Event-Scoring (`batchRecalculateFanRanks`) oder GW-Cron — **kein Trigger** auf holdings/abo/posts. → Latenz: heute Gold-Abo gekauft, Rang-Effekt erst nach nächstem Event.

### Wie ein Verein heute Geld bekommt
- Trading 6 % → **Club 1 %** (`trades.club_fee`) · IPO → **85 % Club** · P2P 3 % → **0,5 % Club** · **Abo 100 % Club**.
- **Kein persistentes Club-Treasury** — Saldo on-the-fly via `get_club_balance`. Auszahlung an sich selbst via `request_club_withdrawal`.

### 🔴 Schmerzpunkte Welt 2 (das eigentliche Ziel ist hier am schwächsten)
- **W2-A — CSF ist faktisch wirkungslos.** Der Multiplier 1.00–1.50 greift **nur** bei `liquidate_player` und wird dort durch `LEAST(1.15, (1+mastery)×csf_mult)` (`20260424070000_...:132`) **hart auf 1,15× gedeckelt** → Unterschied Zuschauer vs. Vereinsikone schrumpft auf ~15 %. Im normalen Trading/Checkout greift CSF **nirgends**. Die 6-Tier-Spreizung ist visuell (Badge) viel stärker als ökonomisch.
- **W2-B — Club-Fan-Treue-Board ist TOT.** `getClubFanLeaderboard` + `useClubFanLeaderboard` gebaut + getestet, **0 UI-Consumer**. Das Welt-2-Kernstück („wer sind die treuesten Fans dieses Clubs") wird nie angezeigt. (Die LIVE „Club-Rangliste" auf /rankings ist `getClubLeaderboard` = globales Elo der Co-Follower, **kein** Treue-Score.)
- **W2-C — `club_followers` ist totes Treue-Signal.** Die größte, niederschwelligste Fan-Basis zählt **nicht** in fan_ranking und löst keinen Reward aus.
- **W2-D — Kein club-initiierter Fan-Reward.** Es gibt **keinen Pfad**, über den ein Club-Admin gezielt seine treuesten Fans belohnt (Airdrop an Vereinsikonen, Tier-Perks, exklusive Drops). Der einzige automatische Club→Fan-Geldfluss ist die Liquidation (transfer-getrieben, nicht treue-steuerbar). **← Das ist die größte Lücke gegenüber dem Ziel „Verein belohnt aktive Fans".**
- **W2-E — Buchungs-Lücke:** IPO-85 % + P2P-0,5 %-Club fließen **nicht** in `get_club_balance` (nur `trades.club_fee` + Abo). Withdrawal-fähiges Guthaben unvollständig.
- **W2-F — Gold-Abo „Score Boost" dormant** — Benefit-Label ohne Codepfad.

---

## 3. QUER — Gamification-/Minting-Schicht (Gewohnheit)

Speist **weder** scout_scores **noch** fan_rankings direkt — wirkt parallel, mintet $SCOUT + Tickets.

### $SCOUT-Minting-Inventar (neues Geld ohne Gegenwert)
| Quelle | Betrag | Trigger | Welt |
|---|---|---|---|
| `claim_welcome_bonus` | 1.000 $SCOUT (1×) | Signup | global |
| `claim_mission_reward` | 25–400 $SCOUT/Mission | Mission completed | global (club-fähig, ungenutzt) |
| Login-Streak-Milestone | 100/500/2.000/5.000 $SCOUT | Tag 3/7/14/30 | global |
| Mystery Box (bcredit-Drop) | variabel × 1–15 | Box-Öffnung | global |
| `score_event` Tier-Bonus + Prize-Pool | 100/300/500 + Pool-Anteil | Event-Auswertung | club (Event) |
| `claim_score_road` | 200–20.000 $SCOUT | Median-Score-Milestone | global |

**Nur-Tickets (kein $SCOUT):** Daily Challenge, Achievements (50/25), Mastery-XP.

### 🔴 Schmerzpunkte Quer-Schicht
- **Q-A — `airdrop_scores` ist eine DRITTE parallele Aggregat-Welt** (trading/content/fantasy/social/activity/mastery/scout_rang), separat von scout_scores UND user_stats. Befüllt via `refresh_airdrop_score`.
- **Q-B — Dormant gebaut:** bezahlte Mystery Box (Lizenz-gated), **Wildcard-Earn-Quellen** (CHECK-Liste nennt mission/mystery/milestone, aber **kein Caller** vergibt sie → unverdienbar), **club-gebundene Missionen** (Infra fertig, 0 Seeds), **`referral_reward`** (Typ existiert, kein Auszahl-RPC).
- **Q-C — Migration-Drift:** `claim_score_road`, `submit_daily_challenge`, `credit/spend_tickets` existieren nur live, kein Migration-File → Greenfield `db reset` erzeugt sie nicht.

---

## 4. Kern-Diagnose

1. **Drei parallele „wie gut/aktiv bist du"-Aggregate** (`scout_scores`, `user_stats`, `airdrop_scores`) messen überlappend dasselbe mit verschiedenen Formeln. Niemand ist als Single-Source definiert. **Das ist die Wurzel des „es wird wild"-Gefühls.**
2. **Welt 1 (Können) ist technisch solide, aber unbelohnt** — der einzige große Reward (Monatsliga) ist dormant.
3. **Welt 2 (Treue) ist konzeptionell am wichtigsten für das Geschäftsmodell (B2B-Vereine), aber am schwächsten gebaut** — Board tot, CSF wirkungslos, kein gezielter Club→Fan-Reward, Follower ignoriert.
4. **Die Gamification-Schicht mintet munter $SCOUT**, ist aber von den beiden Status-Welten entkoppelt → Engagement führt nicht sichtbar zu Status.

---

## 5. Zielbild-Skizze (zur Diskussion — NICHT beschlossen)

**Welt 1 — eine Können-Wahrheit:**
- `scout_scores` (Elo) = kanonisch. `user_stats`-Score-Spalten werden **abgeleiteter Cache** ODER retired; alle user_stats-Leser (Follow-Listen, Suche, Home, Scouting-Board) auf scout_scores umrouten. `airdrop_scores` als eigene, klar benannte Airdrop-Achse behalten ODER auf scout_scores ableiten.
- Monatsliga **aktivieren** (Cron + erster Abschluss) — der fehlende Können-Reward.

**Welt 2 — Treue sichtbar + wirksam machen:**
- Club-Fan-Treue-Board **mounten** (es ist fertig). 
- CSF **entweder echt machen** (Deckel lockern / im Trading wirksam) **oder** durch einen **expliziten Club→Fan-Reward-Mechanismus ersetzen** (Club-Admin belohnt Top-Tiers gezielt — Airdrop/Perks/Drops). ← Kern-Produktentscheidung.
- `club_followers` als Treue-Signal **einbinden** (Basis-Engagement zählt).
- Buchungs-Lücke (IPO/P2P-Club) schließen.

**Quer:** Gamification-Engagement an die Status-Welten **koppeln** (sichtbarer Statusgewinn), Dormant-Features aktivieren oder löschen (D80).

---

## 6. Offene Produkt-Entscheidungen für Anil

1. **CSF-Zukunft:** Soll die Community Success Fee *echt wirksam* werden (Deckel lockern, im Trading anwenden), oder ist der richtige Verein→Fan-Hebel ein **neuer expliziter Reward-Mechanismus** (Club belohnt seine Top-Fans gezielt)?
2. **Follower vs. Abonnenten:** Sollen **Follower** (gratis) überhaupt fan_ranking-Score bekommen, oder bleibt Treue bewusst an **Abo + Aktivität** gekoppelt (Follower = nur Reichweite)?
3. **user_stats:** ableiten/cachen oder ganz retiren? (betrifft Follow-Listen, Suche, Home, Scouting-Board, Platform-Admin)
4. **Monatsliga aktivieren?** 34.000 $SCOUT/Monat Minting — passt das zur Treasury-Planung, jetzt im kostenlosen Sommer-Modus?

---

## 7. Ableitbare Slices (nach Anil-Entscheidung zu priorisieren)

| Slice-Kandidat | Welt | Typ | Risiko |
|---|---|---|---|
| user_stats-Leser → scout_scores umrouten, Redundanz entfernen | W1 | Service+Migration | mittel (Money-nah? trading_score prüfen) |
| Monatsliga-Cron aktivieren + erster Abschluss | W1 | GHA/Cron | mittel (Minting) |
| Rang-Schwellen DB↔TS↔Doc angleichen | W1 | Doc+Config | niedrig |
| Club-Fan-Treue-Board mounten | W2 | UI | niedrig |
| Club→Fan-Reward-Mechanismus (neu) | W2 | Feature | hoch (Konzept+Build) |
| CSF echt machen / Deckel | W2 | Migration (Money) | hoch (CEO) |
| club_followers in fan_ranking | W2 | Migration | mittel |
| IPO/P2P-Club-Buchungslücke | W2 | Migration (Money) | mittel (CEO) |
| Dormant-Hygiene: Wildcard-Earn / club-Missionen / referral | Quer | div. | niedrig–mittel |

---

*Quellen: 3 Explore-Agent-Kartierungen 2026-06-15, verifiziert gegen `src/` + `supabase/migrations/`. Querverweis: `worklog/audits/2026-06-13/s7-source-of-truth-registry.md` (Domänen 6/7/9).*
