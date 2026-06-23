---
title: Reward- & Ranking-Ökosystem — Konzept-Landkarte
created: 2026-06-15
updated: 2026-06-18
status: active
tags: [rewards, ranking, gamification, fan-rank, scout-scores, treasury]
consult_when: Rewards-Strategie, Rankings, Welt1 (Können) vs Welt2 (Treue), Gamification-Landkarte, Monatsliga, fan_rankings, scout_scores, Minting-Inventar
---

# Reward- & Ranking-Ökosystem — Konzept-Landkarte

> **Zweck:** Das gesamte „Aktivität → Messung → Belohnung → Sichtbarkeit"-Geflecht von BeScout auf einer Karte. Steuerungsdokument für die S7-Phase-3-Konsolidierung (D80). Verifiziert gegen Code + Migrationen (2026-06-15, 3 Explore-Agents).
>
> **Strategischer Frame (Anil, 2026-06-15): 50/50 — zwei gleichberechtigte Welten.**
> - **Welt 1 — PLATTFORM belohnt KÖNNEN**, global über alle 7 Ligen.
> - **Welt 2 — VEREIN belohnt TREUE**, club-lokal.
> - Quer darüber liegt die **Gamification-/Minting-Schicht** (Gewohnheit), die $SCOUT ausschüttet, aber keiner der zwei Welten sauber zugeordnet ist.

> ⚠️ **Bau-Stand-Update 2026-06-17:** Seit dieser Kartierung wurde das **Club-Treasury gebaut** (Slices 329-332). Damit sind mehrere unten genannte Schmerzpunkte **teil-adressiert**: W2-E (Buchungslücke) — Treasury-Ledger erfasst jetzt Einnahmen; CSF zahlt seit Slice 330 aus dem Treasury (statt Minting). **Offen bleiben** die Produkt-Entscheidungen §6 (CSF-Wirksamkeit, Follower-Treue, user_stats-Retire, Monatsliga). Kanon-Geldmodell: `docs/knowledge/domain/treasury.md`.

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
- **W1-A — Doppelte Können-Wahrheit:** `user_stats.{trading,manager,scout}_score` ist eine **redundante Parallel-Kopie** mit gleichen Spaltennamen, aber **anderen Formeln** (Aktivitäts-Count, Start 0, cap 1000) und **eigenem Trigger** (`refresh_user_stats`, `20260418180000_...:125-244`). scout_scores (Elo) und user_stats können **per Konstruktion nie übereinstimmen**. **Zwei verschiedene Leaderboards laufen parallel:** `/rankings` nutzt scout_scores; Follow-Listen/Suche/Home/Scouting-Board nutzen user_stats.
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

**Aktualisierung:** Event-Scoring/GW-Cron + seit FRE-2 sofort bei (Un)Follow + seit FRE-5 Recalc-on-Save bei Schwellen-Änderung. Weiterhin kein Trigger auf Holdings/Abo/Post-Aktivität. Bei neuem money-/zugangsrelevantem Gate → Recalc-on-read oder Recalc-on-save prüfen (D92-Familie).

### Wie ein Verein heute Geld bekommt
- Trading 6 % → **Club 1 %** (`trades.club_fee`) · IPO → **85 % Club** · P2P 3 % → **0,5 % Club** · **Abo 100 % Club**.
- **Club-Treasury seit Slice 329 gebaut** (Saldo + Ledger). Auszahlung an sich selbst via `request_club_withdrawal` (Phase 2).

### 🔴 Schmerzpunkte Welt 2 (das eigentliche Ziel ist hier am schwächsten)
- **W2-A — CSF-Multiplier wirkungslos.** Der Multiplier 1.00–1.50 greift **nur** bei `liquidate_player` und wurde dort durch `LEAST(1.15, ...)` hart auf 1,15× gedeckelt → Unterschied Zuschauer vs. Vereinsikone ~15 %. (Stand Treasury-Modell D83: `csf_multiplier` wird ENTFERNT, CSF rein proportional, Treue über Fan-Reward-Engine.) **Update Slice 343:** Fan-Rang hat jetzt einen **zweiten, realen Hebel** — **Poll-Stimmgewicht** (`cast_community_poll_vote`: Ultra/Legende 2×, Ehren/Ikone 3×, `MAX` mit Abo). Erster Effekt des Fan-Rangs unabhängig vom CSF. Querbezug: `domain/polls.md` §6/§8.
- **W2-B — Club-Fan-Treue-Board ist TOT.** `getClubFanLeaderboard` + `useClubFanLeaderboard` gebaut + getestet, **0 UI-Consumer**.
- **W2-C — `club_followers` ist nicht mehr tot:** Seit **FRE-2 / Slice 345** zählt Follow als +5 Einstiegssignal in `calculate_fan_rank` + sofortiger Recalc-Trigger bei (Un)Follow. Offen bleibt: Follow ist ein kleines Signal, kein vollwertiger Perk-/Reward-Pfad.
- **W2-D — Club→Fan-Reward jetzt als Perks/Gating teilgebaut:** FRE-1 Leiter/Perk-Katalog, FRE-3 exklusive Vereins-Beiträge, FRE-5 club-konfigurierbare Schwellen. Direkte $SCOUT-Airdrops sind bewusst auf echte-Coin-/CASP-Phase verschoben; aktuelle Phase = Perks/Gating, nicht Treasury-Airdrop.
- **W2-E — Buchungs-Lücke (teil-behoben Slice 329):** Treasury-Ledger erfasst Einnahmen jetzt zentral.
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
- **Q-B — Dormant gebaut:** bezahlte Mystery Box (Lizenz-gated), **Wildcard-Earn-Quellen** (kein Caller vergibt sie), **club-gebundene Missionen** (Infra fertig, 0 Seeds), **`referral_reward`** (Typ existiert, kein Auszahl-RPC).
- **Q-C — Migration-Drift:** `claim_score_road`, `submit_daily_challenge`, `credit/spend_tickets` existieren nur live, kein Migration-File → Greenfield `db reset` erzeugt sie nicht.

---

## 4. Kern-Diagnose

1. **Drei parallele „wie gut/aktiv bist du"-Aggregate** (`scout_scores`, `user_stats`, `airdrop_scores`) messen überlappend dasselbe mit verschiedenen Formeln. Niemand ist als Single-Source definiert. **Das ist die Wurzel des „es wird wild"-Gefühls.**
2. **Welt 1 (Können) ist technisch solide, aber unbelohnt** — der einzige große Reward (Monatsliga) ist dormant.
3. **Welt 2 (Treue) ist konzeptionell am wichtigsten für das Geschäftsmodell (B2B-Vereine), aber am schwächsten gebaut** — Board tot, CSF wirkungslos, kein gezielter Club→Fan-Reward, Follower ignoriert.
4. **Die Gamification-Schicht mintet munter $SCOUT**, ist aber von den beiden Status-Welten entkoppelt → Engagement führt nicht sichtbar zu Status.

---

## 5. Zielbild-Skizze (zur Diskussion — NICHT beschlossen)

**Welt 1 — eine Können-Wahrheit:** `scout_scores` (Elo) = kanonisch. `user_stats`-Score-Spalten → abgeleiteter Cache ODER retired; alle Leser auf scout_scores umrouten. Monatsliga **aktivieren** (Cron + erster Abschluss).

**Welt 2 — Treue sichtbar + wirksam machen:** Club-Fan-Treue-Board **mounten** (fertig, aber 0 UI-Consumer). `club_followers` ist seit FRE-2 eingebunden. Fan-Reward-Engine ist als Perks/Gating für aktuelle Phase gebaut (FRE-1/2/3/5); direkte Airdrops sind Coin-Phase. Nächste Pro-Reste: `csf_multiplier` raus + Polls-Gates (exklusive Treue-Umfragen, Early-Access).

**Quer:** Gamification-Engagement an Status-Welten **koppeln**, Dormant-Features aktivieren oder löschen (D80).

---

## 6. Offene Produkt-Entscheidungen für Anil

1. **CSF-Zukunft:** echt wirksam (Deckel lockern) oder **neuer expliziter Reward-Mechanismus** (Fan-Reward-Engine)? *(Treasury-Modell D83 tendiert zu: csf_multiplier raus, Treue via Fan-Reward-Engine.)*
2. **Follower vs. Abonnenten:** Sollen **Follower** (gratis) fan_ranking-Score bekommen, oder bleibt Treue an **Abo + Aktivität** gekoppelt? *(Teil-Kontext seit Slice 343: Fan-Rang ist jetzt als Poll-Stimmgewicht spürbar — Frage gewinnt an Gewicht, da der Rang reale Wirkung hat.)*
3. **user_stats:** ableiten/cachen oder ganz retiren?
4. **Monatsliga aktivieren?** 34.000 $SCOUT/Monat Minting — passt das zur Treasury-Planung im kostenlosen Sommer-Modus?

---

## 7. Ableitbare Slices (nach Anil-Entscheidung zu priorisieren)

| Slice-Kandidat | Welt | Typ | Risiko |
|---|---|---|---|
| user_stats-Leser → scout_scores umrouten | W1 | Service+Migration | mittel |
| Monatsliga-Cron aktivieren | W1 | GHA/Cron | mittel (Minting) |
| Rang-Schwellen DB↔TS↔Doc angleichen | W1 | Doc+Config | niedrig |
| Club-Fan-Treue-Board mounten | W2 | UI | niedrig |
| Club→Fan-Reward-Mechanismus (Perks/Gating) | W2 | Feature | ✅ FRE-1/2/3/5 gebaut; Airdrop deferred |
| club_followers in fan_ranking | W2 | Migration | mittel |
| Dormant-Hygiene: Wildcard-Earn / club-Missionen / referral | Quer | div. | niedrig–mittel |

---

*Quellen: 3 Explore-Agent-Kartierungen 2026-06-15, verifiziert gegen `src/` + `supabase/migrations/`. Kanon-Geldmodell: `domain/treasury.md`. Querverweis: `worklog/audits/2026-06-13/s7-source-of-truth-registry.md`.*
