---
name: BeScout Liga + Rankings Hub
description: Saison-basiertes Ranking-System + zentrale Rankings-Hub-Page. Rebrand des existierenden 12-Tier-Gamification-Systems, Saison-Layer, Monats-Sieger, Economy-Abstimmung mit CardMastery/PBT/Community-Fee/Club-Levels.
type: project
status: spec-phase
blocked-by: home polish (track A+B+C) must finish first
depends-on: existing gamification.ts 12-tier system
---

# BeScout Liga + Rankings Hub — Spec

## Elevator Pitch
*"BeScout League ist frei. Hier kann sich jeder messen. Ziel: Top-Rangliste erreichen, Prestige aufbauen, mit allen anderen BeScout-Economies verknüpft."*

Eine saisonbasierte Liga à la Brawlstars in der jeder User kostenlos teilnimmt. Ranking-Progression durch Fantasy-Events, andere Platform-Aktivitäten liefern minimalen gecappten Score-Boost. Der Liga-Rang ist ein Prestige-Faktor der sich auf Fees, PBT-Share, Mastery-Multiplier und Club-Mitgliedschafts-Benefits auswirkt.

---

## Schon existierende Assets (80% gebaut)

| Asset | Ort | Status |
|-------|-----|--------|
| 12-Tier Rank System (Bronze I-III → Silber I-III → Gold I-III → Diamant → Mythisch → Legendär) | `src/lib/gamification.ts` | ✅ |
| 3-Dimensionen Elo (Trader/Manager/Analyst) | `src/lib/gamification.ts` + DB | ✅ |
| Gesamt-Rang = Median der 3 Einzel-Ränge | `gamification.ts` | ✅ |
| Manager Points (percentile-basiert per Fantasy Event: Top 1%=+50 .. >90%=-25) | `.claude/rules/gamification.md` | ✅ |
| Score Road mit 11 Milestones | `claim_score_road` RPC | ✅ |
| 33 Achievements, 15 featured + 18 hidden | `src/lib/achievements.ts` | ✅ |
| Missions (assign, progress, complete, claim) | `missions.ts` | ✅ |
| Streaks mit Shields + Milestone Rewards | `streaks.ts` | ✅ |
| Rang-Badge Component auf Profile | `RangBadge` | ✅ |
| DB-Triggers für auto-scoring (Trade → Trader Score, Fantasy-Score → Manager Points) | 13 Triggers | ✅ |

## Was fehlt (20% Delta)

| Gap | Scope | Aufwand |
|-----|-------|---------|
| **Branding**: "BeScout Liga" als UI-Marke (Code-intern bleiben Dimensions-Namen) | Wording in Profile + Home + neue Rankings-Hub | S |
| **Saison-Modell**: Start/End Dates, aktuelle Saison-ID, Season-Delta-Scoring | 1 Migration + `liga_seasons` Tabelle | M |
| **Monats-Sieger**: Leaderboard pro Monat, Winner-Tabelle, Archive | 1 Migration + Cron `close_monthly_liga` | M |
| **Rankings Hub Page**: neue Route `/rankings` oder `/liga` | neue Page + 5-7 Widget Components | L |
| **Home Widget "Dein Liga-Rang + Saison-Platz"** | Widget-Komponente + Query-Hook | S |
| **Liga-Tier Badge auf Touchpoints** (Profile, Community posts, Event detail) | Component-Integration | M |
| **Economy-Verknüpfung** — Fee-Discount, PBT-Share, Mastery-XP, Club-Tier-Boost | siehe Economy-Touchpoints | L |

---

## Design-Entscheidungen

### Beantwortet (Anil, 2026-04-09)

**Q2 — Liga Score-Quelle:**
- ✅ **"BeScout League ist frei"** — Primary-Source sind die freien BeScout Fantasy-Events
- ✅ **"Andere Events bleiben genauso, minimaler begrenzter Effekt auf Score"** — Paid/Club/Arena-Events liefern gecappten Bonus
- → **Implementation**: Freie BeScout-Events scoren voll (Manager Points 1.0x), Paid/Club-Events scoren zB 0.25x, gecappt auf max X% pro Saison

### Noch offen — Klärung in eigener Spec-Session

| Q | Frage | Optionen |
|---|-------|----------|
| Q1 | **Saison-Modell**: Zeitrahmen | A) 3-Monats-Platform-Saisons, B) Fußball-Saison (Aug-Mai), C) Rolling 30 Tage |
| Q3 | **Saison-Reset**: Was passiert am Saison-Ende mit dem Score? | A) Harter Reset (Bronze I), B) Soft-Reset (80%), C) Kein Reset (Delta-Ranking über Saison) |
| Q4 | **Monats-Sieger Rewards** | A) Nur Display, B) $SCOUT + Badge, C) Cosmetics + Badge |
| Q5 | **Rankings Hub URL** | A) `/rankings`, B) `/liga`, C) Tab in /manager, D) Tab in /profile |
| Q6 | **Rankings Hub Inhalte** | Eigener Rang / Global Top 100 / Monats-Sieger History / Friends / Club-Leaderboard / Letzte Spieltag-Ergebnisse / Spieler-Rankings — welche davon? |

---

## Economy-Touchpoints (Anil's Anforderung: "alles perfekt abgestimmt")

Der Liga-Rang soll sich auf 4 Economy-Systeme auswirken, damit High-Rank-User tangible Benefits bekommen:

### 1. CardMastery ⚠️ **NEUES KONZEPT — UNDEFINIERT**
**Aktueller Stand**: Existiert NICHT im Code. Kein Grep-Hit auf `cardMastery`, `scoutCardMastery`, etc.

**Anil's Vision** (vermutet, MUSS GEKLÄRT WERDEN):
- Pro Scout Card im Portfolio: Mastery-XP die durch Trading/Fantasy-Nutzung der Card steigt?
- Levels die Perks freischalten (Floor-Price-Discount? Extra-Stats?)
- Kompatibel mit Scout Cards als Konzept

**Offene Fragen:**
1. Pro Card oder pro Player (card-unabhängig)?
2. XP-Source: Nutzung in Lineups? Halten über Zeit? Trade-Volume?
3. Welche Perks pro Level?
4. Wie Liga-Rang-Einfluss? (Multiplier auf XP-Gain?)

**Status**: Benötigt eigene Spec-Runde. Bis dahin: **Placeholder im Liga-Spec, nicht bauen**.

### 2. PBT (Platform Burn Treasury)
**Aktueller Stand** (aus `business.md`):
- Trading Fee: 3.5% Platform + 1.5% PBT + 1% Club = 6% total
- P2P: 2% Platform + 0.5% PBT + 0.5% Club = 3% total
- PBT = deflationärer Burn-Mechanismus
- `liquidate_player` RPC: Success Fee Payout aus PBT bei Marktwert-Wachstum

**Liga-Verknüpfung (Vision):**
- Hohe Liga-Ränge = Anteil am PBT-Success-Fee-Pool bei Liquidations?
- Oder: Liga-Rang reduziert Trading-Fee-PBT-Anteil (Rabatt)?
- Oder: Monats-Sieger bekommen X% der PBT-Distribution?

**Offene Fragen:**
1. Soll PBT ein Liga-Reward-Pool werden (vs. reiner Burn)?
2. Wenn ja: welche Distribution (Top 10? Top 100? Tier-basiert?)
3. Frequenz (monatlich? saisonal?)

**Status**: Klärung mit Anil, dann Spec.

### 3. Community Success Fee
**Aktueller Stand** (aus `business.md`):
- Research Post Unlock: 80% Author + 20% Platform
- Bounty Approval: 95% Creator + 5% Platform
- Polls: 70% Creator + 30% Platform

**Liga-Verknüpfung (Vision):**
- Hohe Analyst-Dimension Rank = höherer Author-Share (zB 85% statt 80%)?
- Monats-Sieger (Analyst): Creator-Fee-Boost für den Folgemonat?
- Oder: Low-Liga-User bekommen Discount auf Unlock?

**Offene Fragen:**
1. Benefit für Creator oder Consumer?
2. Wieviel Bonus pro Tier (oder flat für Top-Tier)?
3. Conflict mit bestehender Fee-Split-Logik?

**Status**: Klärung mit Anil, dann Spec.

### 4. Club-Mitgliedschaftslevel (Club Subscriptions)
**Aktueller Stand** (aus `business.md` + `trading.md`):
- Club Sub Tiers: Bronze / Silber / Gold
- Silber+: Early Access zu IPOs
- Gold: Trading-Fee-Discount (Platform-Share reduced, PBT+Club bleiben voll)

**Liga-Verknüpfung (Vision):**
- Liga-Rang stacked mit Club-Sub: Gold-Club-Sub + Gold-Liga-Rang = extra Discount?
- Oder: Liga-Rang unlockt Club-Sub gratis für einen Monat?
- Oder: Club-Sub-Tier bekommt als Liga-Mitglied extra Monats-Rewards?

**Offene Fragen:**
1. Additiv oder Multiplikativ (mit existing Fee-Discount)?
2. Wie unterscheidet sich Liga-Prestige von Club-Sub-Prestige?
3. Welcher hat höhere Priorität wenn beide Benefits claimen?

**Status**: Klärung mit Anil, dann Spec.

---

## Implementation-Wellen (wenn Spec final)

### Wave 0: Branding + Home Widget
- UI-Wording "BeScout Liga" ohne DB-Änderungen
- Home-Widget "Dein Liga-Rang + Saison-Position"
- Liga-Badge neben User-Handle in relevanten Touchpoints
- **Commits**: 2-3, alles frontend

### Wave 1: Saison-Modell (DB + Backend)
- Migration: `liga_seasons` Tabelle
- Migration: `user_liga_season_scores` view oder Tabelle
- RPC: `get_current_liga_season`, `get_user_liga_rank`
- Cron: `close_liga_season` am Saison-Ende
- **Commits**: 1-2, backend-heavy

### Wave 2: Monats-Sieger
- Migration: `monthly_liga_winners` Tabelle
- Cron: `close_monthly_liga` am 1. jedes Monats (00:00 UTC)
- RPC: `get_monthly_liga_winners(p_limit, p_dimension)`
- Rewards-Logic (abhängig von Q4-Antwort)
- **Commits**: 1-2

### Wave 3: Rankings Hub Page
- Neue Route `/rankings` (oder je Q5)
- Components: LeaderboardGlobal, LeaderboardFriends, LeaderboardClub, MonthlyWinnersHistory, LastEventResults, SelfRankCard
- Routing + Nav-Link
- Mobile + Desktop responsive
- i18n DE/TR
- **Commits**: 3-5, frontend-heavy

### Wave 4: Economy-Verknüpfung
- **Conditional auf Economy-Decisions** (siehe Economy-Touchpoints)
- Fee-Discount Formel anpassen
- PBT-Distribution Logic (wenn beschlossen)
- Community Fee Boost
- Club-Sub Stacking
- **Commits**: 2-4, backend + UI
- **HÖCHSTES RISIKO** — Fee-Änderungen brauchen umfangreiche Tests

### Wave 5: CardMastery (Conditional)
- Nur wenn in eigener Spec-Runde definiert
- Wahrscheinlich eigenes Projekt mit eigener Spec
- **Commits**: TBD

---

## Risks & Dependencies

**Risiko 1**: Economy-Changes (Wave 4) könnten bestehende Trading-Balance kaputt machen. **Mitigation**: Feature-Flag + A/B-Test mit kleinem User-Set vor Rollout. Alle Fee-Änderungen müssen sich mit MiCA/CASP Compliance vertragen (keine ROI-Wording!).

**Risiko 2**: CardMastery ist ungeplant — wenn Anil darauf besteht muss ein komplett neues Feature designed werden. **Mitigation**: In eigener Spec-Runde klären bevor Liga-Wave-4 startet.

**Risiko 3**: Saison-Reset (Q3) kann Existing-User frustrieren wenn hart zurückgesetzt. **Mitigation**: Kommunikation + Soft-Reset Option + "Alle-Zeit-Rang" bleibt sichtbar.

**Dependency**: Polish-Sweep Track A/B/C muss ZUERST fertig sein. Liga ist Track D und deferred. Alle weiteren Pages (Market, Fantasy, Player, Profile, Inventory, etc.) müssen auch fertig sein bevor wir Liga bauen — sonst ist die UI noch im Umbruch.

---

## Nächste Schritte (wenn Polish-Sweep fertig)

1. **Spec-Session** mit Anil — alle Q1-Q6 Antworten einholen
2. **CardMastery Klärung** — eigene Spec-Runde wenn das Feature wirklich kommen soll
3. **Economy-Decisions** finalisieren (PBT / Community Fee / Club-Sub Stacking)
4. **Wave 0 beginnen** (Branding + Home Widget, reversibel, kein DB-Umbau)
5. **Wave 1-5 nach Plan**

---

## Session Log

- **2026-04-09** — Spec-File erstellt. Q2 beantwortet. Q1/Q3/Q4/Q5/Q6 offen. CardMastery als unbekanntes Konzept markiert. Polish-Sweep blockt weitere Arbeit.
