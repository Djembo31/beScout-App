# BeScout Liga — Engineering Specification

**Datum:** 2026-04-10
**Status:** DONE (Wave 0-5 complete)
**Entscheidungen:** Q1=B (Fussball-Saison Aug-Mai), Q3=B (Soft-Reset 80%), Q4=B ($SCOUT + Badge), Q5=A (`/rankings`), Q6=Alle 7

---

## 1.1 Current State — Feature Inventory

Das existierende Gamification-System hat 80% der nötigen Infrastruktur. Hier ist was der User HEUTE sieht und tun kann:

### User-Visible Features

| # | Feature | Wo sichtbar | Komponente |
|---|---------|------------|------------|
| F1 | **Gesamt-Rang** (Median der 3 Dim.) | Profile ScoutCard, SearchOverlay | `RangBadge`, `getGesamtRang()` |
| F2 | **3-Dim Scores** (Trader/Manager/Analyst) | Profile Tabs (Trader/Manager/Analyst) | `ScoreProgress`, `DimensionRangStack` |
| F3 | **Radar Chart** (3-Achsen Visualisierung) | Profile ScoutCard | `RadarChart` |
| F4 | **Score Road** (11 Milestones mit Claim) | Missions Page | `ScoreRoadCard` |
| F5 | **Achievements** (33, 15 featured) | Missions Page | `AchievementsSection` |
| F6 | **Streaks** (Login-Serie) | Home Page | `HomeStoryHeader` |
| F7 | **Fan Ranking** (Club-spezifisch, 5 Dim.) | Club Detail Page | `FanRankOverview`, `FanRankBadge` |
| F8 | **Top Scouts** (Analyst Leaderboard) | Community Sidebar | `CommunitySidebar` |
| F9 | **Score History** (Verlauf pro Dimension) | Profile Tabs | `getScoreHistory()` |
| F10 | **Rang-Notifications** (Up/Down) | Notification Dropdown | `AchievementListener` |

### File Inventory

| File | Lines | Zweck |
|------|-------|-------|
| `src/lib/gamification.ts` | 322 | Core: 12 Tiers, getRang(), Score Road, Manager Points |
| `src/lib/services/scoutScores.ts` | 123 | Service: getScoutScores(), getScoutLeaderboard() |
| `src/lib/services/gamification.ts` | 91 | Service: Score Road Claims, Score History |
| `src/lib/queries/gamification.ts` | 27 | Hooks: useScoutScores(), useScoreRoadClaims() |
| `src/lib/queries/keys.ts` | ~10 | Query Keys: gamification.* |
| `src/components/ui/RangBadge.tsx` | 176 | RangBadge, RangScorePill, RangProgress, DimensionRangRow/Stack |
| `src/components/ui/FanRankBadge.tsx` | 134 | Club Fan Ranking Badge |
| `src/components/profile/ScoreProgress.tsx` | 103 | Per-Dimension Score + Progress Bar |
| `src/components/profile/RadarChart.tsx` | 146 | 3-Axis Polar Chart |
| `src/components/profile/ScoutCard.tsx` | 291 | Profile Header mit Rang + Radar |
| `src/components/gamification/ScoreRoadCard.tsx` | 243 | 11 Milestones Timeline |
| `src/components/gamification/FanRankOverview.tsx` | 147 | Club Fan Ranking Dashboard |
| `src/components/community/CommunitySidebar.tsx` | ~140 | Top Scouts Mini-Leaderboard |

### Data Flow

```
DB Triggers (8) → award_dimension_score() → scout_scores + score_history
                                           → rang-change notification
Client: useScoutScores(uid) → getScoutScores() → supabase.from('scout_scores')
Client: ScoreRoadCard → claimScoreRoad() → RPC claim_score_road
Client: getScoutLeaderboard(dim, limit) → supabase.from('scout_scores').join('profiles')
```

### DB Schema (Gamification)

| Tabelle | Zweck |
|---------|-------|
| `scout_scores` | 3D Elo: trader/manager/analyst_score + peaks + season_start_* |
| `score_history` | Immutable Log: dimension, delta, score_before/after, event_type |
| `score_road_claims` | Claimed Milestones |
| `score_road_config` | DB-driven Milestone Config |
| `user_achievements` | Achievement Unlocks |
| `achievement_definitions` | 33 Achievements |
| `user_streaks` | Login Streaks |
| `fan_rankings` | Club-specific Fan Ranking (5 Dim.) |
| `user_stats` | Denormalized Stats (tier, scores) |
| `airdrop_scores` | Weighted Airdrop Ranking |

### Shared State

- Query Keys: `qk.gamification.scoutScores(uid)`, `qk.gamification.scoreRoad(uid)`, `qk.gamification.leaderboardByDim(dim, n)`
- Kein Zustand Store für Gamification (alles React Query)

### Navigation

- **SideNav** (`src/lib/nav.ts`): 8 Main + 3 More + Admin. Kein Rankings-Link.
- **BottomNav** (`src/components/layout/BottomNav.tsx`): 7 Tabs. Kein Rankings-Link.

---

## 1.2 Goals + Non-Goals + Anti-Requirements

### Goals

1. **Neue Page `/rankings`** — zentraler Rankings Hub mit allen 7 Widgets (eigener Rang, Global Top 100, Monats-Sieger, Friends, Club-Leaderboard, letzte Spieltag-Ergebnisse, Spieler-Rankings)
2. **Saison-Modell** — Fussball-Saison (Aug-Mai), mit Soft-Reset (80%) am Saison-Ende und `season_start_*` Tracking
3. **Monats-Sieger** — monatliches Leaderboard-Snapshot mit $SCOUT Rewards + Badge
4. **Branding "BeScout Liga"** — existierendes Elo-System bekommt den Namen "BeScout Liga" in der UI (Code-intern bleibt alles bei `gamification`/`scout_scores`)
5. **Nav-Integration** — `/rankings` in SideNav + BottomNav

### Non-Goals

- Economy-Verknüpfung (Fee-Discounts, PBT-Share, Mastery-XP) — Wave 4+, separater Scope
- CardMastery — eigenes Feature, eigene Spec
- Paid Fantasy Liga — Phase 4 (nach MGA), NICHT BAUEN
- Redesign der existierenden Profile-Tabs oder Score-Anzeigen
- Änderung der Scoring-Trigger oder Manager Points Formel

### Anti-Requirements

- NICHT die existierende `gamification.ts` Rang-Logik ändern (nur erweitern)
- KEINE neuen Komponenten bauen wo `RangBadge`, `ScoreProgress`, `RadarChart` reichen
- NICHT das Fan-Ranking-System (Club-spezifisch) in die Liga integrieren — bleibt separat
- KEIN Umbau der `scout_scores` Tabelle — nur neue Tabellen/Views addieren
- KEINE Fantasy-League-Begriffe wiederverwenden (das ist ein separates System)

---

## 1.3 Feature Migration Map

| # | Feature | Current Location | Target | Action |
|---|---------|-----------------|--------|--------|
| F1 | Gesamt-Rang Badge | Profile ScoutCard | Profile + Rankings Hub | ENHANCE (auch auf /rankings) |
| F2 | 3-Dim Scores | Profile Tabs | Profile (stays) + Rankings Hub (summary) | ENHANCE |
| F3 | Radar Chart | Profile ScoutCard | Profile (stays) + Rankings Hub (self-card) | ENHANCE |
| F4 | Score Road | Missions Page | Missions (stays) | NONE |
| F5 | Achievements | Missions Page | Missions (stays) | NONE |
| F6 | Streaks | Home Page | Home (stays) | NONE |
| F7 | Fan Ranking | Club Detail | Club (stays) | NONE |
| F8 | Top Scouts (Sidebar) | Community Sidebar | Community (stays) + Rankings Hub (full) | ENHANCE |
| F9 | Score History | Profile Tabs | Profile (stays) | NONE |
| F10 | Rang-Notifications | Notification Dropdown | Notification (stays) | NONE |
| **NEW** | Rankings Hub Page | — | `/rankings` | CREATE |
| **NEW** | Saison-Modell | — | DB + Service | CREATE |
| **NEW** | Monats-Sieger | — | DB + Service + Rankings Hub Widget | CREATE |
| **NEW** | Saison-Progress Widget | — | Rankings Hub + Home | CREATE |
| **NEW** | Nav Link Rankings | — | SideNav + BottomNav | CREATE |

Kein Feature wird ENTFERNT oder VERSCHOBEN. Alles bleibt wo es ist + Rankings Hub als neuer Consumer.

---

## 1.4 Blast Radius Map

### Neue Route `/rankings`

- **Neue Datei:** `src/app/(app)/rankings/page.tsx`
- **Layout:** Nutzt bestehendes `(app)/layout.tsx` (SideNav + TopBar + BottomNav)
- **Impact:** Kein Einfluss auf bestehende Pages

### Nav-Änderung (SideNav + BottomNav)

- `src/lib/nav.ts` — neuen NAV_MAIN Eintrag `{ label: 'rankings', href: '/rankings', icon: Trophy }` (oder BarChart3)
- `src/components/layout/BottomNav.tsx` — neuen Tab hinzufügen (aktuell 7, wird 8 — prüfen ob 8 Tabs auf Mobile passen, ggf. BottomNav scrollen)
- `src/components/layout/SideNav.tsx` — konsumiert `NAV_MAIN` automatisch
- **Blast Radius:** BottomNav.test.tsx erwartet "7 navigation links" → muss auf 8 aktualisiert werden
- i18n: `messages/de.json` + `messages/tr.json` brauchen `nav.rankings` + `common.navRankings`

### DB-Änderungen

- **Neue Tabelle `liga_seasons`:** season_id, name, start_date, end_date, is_active
- **Neue Tabelle `monthly_liga_snapshots`:** month (DATE), user_id, dimension, score, rank
- **Neue Tabelle `monthly_liga_winners`:** month, dimension, user_id, reward_cents, badge_key
- **Impact auf `scout_scores`:** `season_start_*` Spalten existieren BEREITS → Soft-Reset-RPC schreibt diese um
- **Kein Impact auf existierende Trigger** — Scoring bleibt identisch

### Service-Erweiterungen

- `src/lib/services/scoutScores.ts` — neue Funktionen: `getCurrentSeason()`, `getSeasonLeaderboard()`, `getMonthlyWinners()`, `getFriendsLeaderboard()`
- **Impact:** Re-export aus `gamification.ts` muss erweitert werden
- `src/lib/queries/gamification.ts` — neue Hooks: `useCurrentSeason()`, `useSeasonLeaderboard()`, `useMonthlyWinners()`, `useFriendsLeaderboard()`
- `src/lib/queries/keys.ts` — neue Keys unter `qk.gamification.*`

### i18n

- `messages/de.json` — neuer Namespace `rankings.*` (~30-40 Keys)
- `messages/tr.json` — gleiche Keys (TR-Strings: Anil vor Commit zeigen)

---

## 1.5 Pre-Mortem

| # | Failure Scenario | Mitigation |
|---|-----------------|------------|
| 1 | **BottomNav overflow auf iPhone** — 8 Tabs passen nicht mehr | BottomNav hat already `overflow-x-auto` + `scrollbar-hide`. Testen mit 8 Items auf 390px. Alternativ: Rankings als SideNav-only + kein BottomNav-Eintrag |
| 2 | **Leaderboard Performance** — Top 100 Global Query zu langsam | `getScoutLeaderboard()` nutzt already `.limit()`. Für Saison-Delta: materialized View oder indexed Column |
| 3 | **Soft-Reset am falschen Zeitpunkt** — laufende Saison wird unterbrochen | Reset nur via manuellen RPC-Aufruf (kein automatischer Cron in Phase 1). Admin-Trigger wenn bereit |
| 4 | **Monats-Sieger Rewards ohne Budget-Cap** — Treasury Drain | Max Rewards festlegen: Top 3 pro Dimension = 9 Rewards max. Feste Beträge, kein %-Pool |
| 5 | **Fantasy-League vs. BeScout-Liga Verwechslung** — User verwirrt | Klare Namenstrennung: "BeScout Liga" (Rang-System) vs. "Liga" in Fantasy (User-Ligen). i18n-Keys getrennt |

---

## 1.6 Invarianten + Constraints

### Invarianten (darf sich NICHT ändern)

- Scoring-Trigger bleiben identisch (8 Trigger, `award_dimension_score()`)
- `getRang(score)` Formel bleibt identisch
- `getGesamtRang()` = Median (NICHT Durchschnitt)
- Manager Points Tabelle (percentile-basiert) bleibt
- Score Road Milestones + Claim Logic bleiben
- Alle bestehenden Profile/Community/Missions Pages funktionieren unverändert
- `scout_scores` Tabelle Schema bleibt (nur neue Tabellen addieren)

### Constraints

- Max 10 Files pro Wave
- Move und Change NIE im selben Schritt
- Kein Push ohne Mobile (390px) + Desktop (1280px) Screenshot
- i18n: DE + TR. TR-Strings Anil zeigen vor Commit
- Monats-Sieger Rewards: feste $SCOUT-Beträge, KEIN "ROI"/"Profit"/"Investment" Wording
- BottomNav: wenn 8 Tabs nicht passen → Rankings NICHT in BottomNav (nur SideNav)

---

## 1.7 Akzeptanzkriterien

### AK-1: Rankings Hub Page

```
GIVEN: User ist eingeloggt
WHEN: User navigiert zu /rankings
THEN: Page zeigt 7 Widgets:
  1. Eigener Rang (Gesamt + 3 Dimensionen + Saison-Progress)
  2. Global Top 100 (sortierbar nach Dimension)
  3. Monats-Sieger (aktueller Monat + Historie)
  4. Friends Leaderboard (gefolgte User)
  5. Club Leaderboard (User im gleichen Klub)
  6. Letzte Spieltag-Ergebnisse (letztes Fantasy Event Ranking)
  7. Spieler-Rankings (meistgehandelt, höchster Floor Price)
  AND: Mobile + Desktop responsive
  AND: i18n DE + TR
  AND NOT: Leere Widgets ohne Fallback (jedes Widget hat Empty State)
```

### AK-2: Saison-Modell

```
GIVEN: Es ist Saison 2025/26 (Aug 2025 - Mai 2026)
WHEN: User öffnet /rankings
THEN: "Saison 2025/26" Label sichtbar
  AND: Saison-Progress Bar zeigt aktuellen Monat im Zeitstrahl
  AND: Score-Delta seit Saison-Start angezeigt (current - season_start)
```

### AK-3: Monats-Sieger

```
GIVEN: Monat April ist abgeschlossen (oder Snapshot existiert)
WHEN: User öffnet Monats-Sieger Widget
THEN: Top 3 pro Dimension angezeigt (Trader/Manager/Analyst + Overall)
  AND: Reward-Betrag in $SCOUT sichtbar
  AND: Badge-Icon neben Sieger-Name
  AND NOT: "ROI", "Profit", "Investment" Wording
```

### AK-4: Navigation

```
GIVEN: User ist eingeloggt
WHEN: User ist auf einer beliebigen Page
THEN: SideNav zeigt "Rankings" Link mit Icon
  AND: Link navigiert zu /rankings
  AND: Active State korrekt (gold highlight)
```

### AK-5: Bestehende Features unverändert

```
GIVEN: Alle bestehenden Gamification-Features (F1-F10)
WHEN: User nutzt Profile/Missions/Community wie vorher
THEN: Alles funktioniert identisch
  AND NOT: Regressions in ScoreRoadCard, RangBadge, ScoreProgress
  AND NOT: Geänderte Score-Werte oder Rang-Berechnung
```

---

## SPEC GATE

- [x] Current State komplett (10 Features nummeriert)
- [x] Migration Map für JEDES Feature ausgefüllt
- [x] Blast Radius für jede Änderung gegreppt
- [x] Pre-Mortem mit 5 Szenarien
- [x] Invarianten + Constraints definiert
- [x] Akzeptanzkriterien für jede betroffene User-Flow
- [ ] **Anil hat die Spec reviewed und abgenommen**

---

## PHASE 2: PLAN

### Wave 0: Saison-Modell (DB + Types)
**Scope:** Neue DB-Tabellen + Types + Service-Funktionen. Kein UI.

**Files (6):**
- CREATE: `supabase/migrations/YYYYMMDDHHMMSS_liga_seasons.sql`
- MODIFY: `src/types/index.ts` (neue Types)
- MODIFY: `src/lib/services/scoutScores.ts` (neue Funktionen)
- MODIFY: `src/lib/services/gamification.ts` (Re-Exports)
- MODIFY: `src/lib/queries/gamification.ts` (neue Hooks)
- MODIFY: `src/lib/queries/keys.ts` (neue Keys)

**Migration erstellt:**
- `liga_seasons` (id, name, start_date, end_date, is_active, created_at)
- `monthly_liga_snapshots` (id, month, user_id, dimension, score_delta, rank, created_at)
- `monthly_liga_winners` (id, month, dimension, user_id, reward_cents, badge_key, created_at)
- Seed: aktuelle Saison 2025/26 (2025-08-01 bis 2026-05-31)
- RPC: `get_current_liga_season()`, `get_monthly_liga_winners(p_month, p_limit)`
- RPC: `close_monthly_liga(p_month)` — snapshots scores, picks top 3 per dimension, awards rewards
- RPC: `soft_reset_season(p_new_season_id)` — sets all scores to 80%, updates season_start_*

**Steps:**
1. Migration schreiben + via MCP applyen
2. Types definieren
3. Service-Funktionen + Query Hooks
4. `tsc --noEmit` clean

**DONE means:**
- [ ] 3 neue Tabellen existieren in DB
- [ ] Seed: Saison 2025/26 aktiv
- [ ] RPCs callable (E2E Test mit echten Daten)
- [ ] Types + Hooks kompilieren
- [ ] tsc 0 errors

---

### Wave 1: Nav + leere Rankings Page
**Scope:** Route + Navigation. Page zeigt Placeholder.

**Files (6):**
- CREATE: `src/app/(app)/rankings/page.tsx`
- MODIFY: `src/lib/nav.ts` (NAV_MAIN + Rankings)
- MODIFY: `src/components/layout/BottomNav.tsx` (neuer Tab, 8-Tab-Test)
- MODIFY: `messages/de.json` (nav + rankings Namespace)
- MODIFY: `messages/tr.json` (nav + rankings Namespace)
- MODIFY: `src/components/layout/__tests__/BottomNav.test.tsx` (7→8 Links)

**Steps:**
1. Page Skeleton erstellen
2. Nav eintragen
3. i18n Keys
4. Test fixen
5. `tsc --noEmit` + `vitest run` clean
6. Mobile Screenshot: BottomNav mit 8 Tabs passt?

**DONE means:**
- [ ] `/rankings` erreichbar
- [ ] SideNav + BottomNav zeigen "Rankings" Link
- [ ] Active State funktioniert
- [ ] BottomNav.test passt
- [ ] Mobile (390px) Screenshot: 8 Tabs passen oder Scroll funktioniert

---

### Wave 2: Self-Rank Widget + Global Leaderboard
**Scope:** Erste 2 Widgets auf /rankings.

**Files (5):**
- CREATE: `src/components/rankings/SelfRankCard.tsx`
- CREATE: `src/components/rankings/GlobalLeaderboard.tsx`
- CREATE: `src/components/rankings/index.ts` (barrel)
- MODIFY: `src/app/(app)/rankings/page.tsx` (Widgets einbauen)
- MODIFY: `messages/de.json` + `messages/tr.json` (rankings.* Keys)

**SelfRankCard:** Wiederverwendet `RangBadge`, `DimensionRangStack`, `RadarChart`. Zeigt Saison-Progress (Monat im Zeitstrahl) + Score-Delta seit Saison-Start.

**GlobalLeaderboard:** Wiederverwendet `getScoutLeaderboard()`. Tabs: Overall/Trader/Manager/Analyst. Top 100. `RangScorePill` pro Eintrag.

**DONE means:**
- [ ] Self-Rank Card rendert mit echten Daten (jarvis-qa)
- [ ] Global Leaderboard mit Dimension-Tabs
- [ ] Empty States für beide
- [ ] Mobile + Desktop Screenshot

---

### Wave 3: Friends + Club + Spieltag Leaderboards
**Scope:** Widgets 4, 5, 6 auf /rankings.

**Files (5):**
- CREATE: `src/components/rankings/FriendsLeaderboard.tsx`
- CREATE: `src/components/rankings/ClubLeaderboard.tsx`
- CREATE: `src/components/rankings/LastEventResults.tsx`
- MODIFY: `src/components/rankings/index.ts` (barrel)
- MODIFY: `src/app/(app)/rankings/page.tsx` (Widgets)

**FriendsLeaderboard:** Neue Service-Funktion `getFriendsLeaderboard(userId)` — joins `user_follows` + `scout_scores`.

**ClubLeaderboard:** Neue Service-Funktion `getClubLeaderboard(clubId)` — joins via `dpc_holdings` oder `club_subscriptions`.

**LastEventResults:** Wiederverwendet Fantasy Event Scoring Queries.

**DONE means:**
- [ ] Alle 3 Widgets rendern (mit/ohne Daten)
- [ ] Friends zeigt gefolgte User mit Rang
- [ ] Club zeigt User im gleichen Klub
- [ ] Last Event zeigt letztes Fantasy-Ergebnis
- [ ] Mobile + Desktop Screenshot

---

### Wave 4: Monats-Sieger + Spieler-Rankings
**Scope:** Widgets 3, 7 auf /rankings. Page vollständig.

**Files (5):**
- CREATE: `src/components/rankings/MonthlyWinners.tsx`
- CREATE: `src/components/rankings/PlayerRankings.tsx`
- MODIFY: `src/components/rankings/index.ts` (barrel)
- MODIFY: `src/app/(app)/rankings/page.tsx` (alle Widgets)
- MODIFY: `messages/de.json` + `messages/tr.json` (restliche Keys)

**MonthlyWinners:** Top 3 per Dimension + Overall. Badge + $SCOUT Reward. Historie (klappbar).

**PlayerRankings:** Meistgehandelt, höchster Floor Price, größter Mover. Wiederverwendet bestehende Market-Queries.

**DONE means:**
- [ ] Alle 7 Widgets auf /rankings
- [ ] MonthlyWinners mit Empty State ("Erster Monat noch nicht abgeschlossen")
- [ ] PlayerRankings mit echten Daten
- [ ] Full-Page Mobile + Desktop Screenshot
- [ ] tsc + vitest clean

---

### Wave 5: Branding + Polish
**Scope:** "BeScout Liga" Branding auf Touchpoints. Cleanup.

**Files (max 6):**
- MODIFY: `src/components/profile/ScoutCard.tsx` (optional: Liga-Rang Label)
- MODIFY: `src/components/community/CommunitySidebar.tsx` (Link zu /rankings)
- MODIFY: `src/app/(app)/page.tsx` (optional: Liga-Rang Mini-Widget auf Home)
- MODIFY: `messages/de.json` + `messages/tr.json` (Branding Keys)
- Optional: `src/components/home/LigaRankWidget.tsx` (Mini-Widget für Home)

**DONE means:**
- [ ] "BeScout Liga" Wording an relevanten Stellen
- [ ] Community Sidebar verlinkt auf /rankings
- [ ] Home zeigt Liga-Rang (optional, nach Anil-Feedback)
- [ ] Compliance: Kein "ROI", "Profit", "Investment"
- [ ] Final Screenshots: Home, Rankings, Profile, Community

---

## PLAN GATE

- [ ] Jede Wave eigenständig shippbar
- [ ] Max 10 Files pro Wave
- [ ] Move und Change in getrennten Waves
- [ ] Jeder Task hat "DONE means" Checkliste
- [ ] Anil hat den Plan reviewed
