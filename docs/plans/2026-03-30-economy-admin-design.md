# Economy Admin — Design Doc

> Erstellt: 2026-03-30 (Session 268)
> Approved by: Anil
> Approach: B — Separate Tabellen, volle Typensicherheit, alles dynamisch

## Problem

Alle Economy-Werte (Elo-Punkte, Rang-Thresholds, Score Road, Manager Points, Streak Benefits, Missions) sind hardcoded in Frontend-Konstanten und DB-Trigger-Funktionen. Aenderungen erfordern Code-Deploy oder manuelle SQL. Der Founder muss die Balance der Platform-Economy live tunen koennen ohne Developer-Intervention.

## Loesung

5 neue DB-Tabellen mit strikter Typisierung + Admin-Tab "Economy" im bescout-admin + Umstellung aller Lese-Pfade (Frontend + DB-Triggers) auf DB-Reads.

---

## 1. DB-Tabellen (5 neue + 1 bestehend)

### 1.1 `elo_config` — Punkte pro Dimension + Event-Typ

```sql
CREATE TABLE elo_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dimension TEXT NOT NULL CHECK (dimension IN ('trader','manager','analyst')),
  event_type TEXT NOT NULL,
  delta INT NOT NULL,
  condition JSONB DEFAULT '{}',
  description TEXT,
  active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dimension, event_type, condition)
);
```

Initialwerte (17 Rows):

| dimension | event_type | delta | condition | description |
|-----------|-----------|-------|-----------|-------------|
| trader | trade_buy | 5 | {} | Basis-Punkte fuer Kauf |
| trader | ipo_buy | 30 | {} | IPO Scout Bonus |
| trader | trade_profit | 50 | {"profit_pct_min": 50} | Profit >= 50% |
| trader | trade_profit | 30 | {"profit_pct_min": 20} | Profit >= 20% |
| trader | trade_profit | 10 | {"profit_pct_min": 5} | Profit >= 5% |
| trader | trade_loss | -10 | {"profit_pct_max": -5} | Loss >= -20% |
| trader | trade_loss | -30 | {"profit_pct_max": -20} | Loss > -20% |
| trader | panic_sell_penalty | -20 | {"hold_hours_max": 24} | Verkauf < 24h bei Verlust |
| analyst | post_create | 3 | {} | Post erstellt |
| analyst | research_create | 3 | {} | Research ohne Evaluation |
| analyst | research_create_eval | 5 | {} | Research mit Evaluation |
| analyst | research_sold | 5 | {} | Research freigeschaltet |
| analyst | post_upvote | 1 | {} | Upvote erhalten |
| analyst | post_excessive_downvotes | -2 | {"downvote_count_min": 3} | >3 Downvotes |
| analyst | new_follower | 2 | {} | Neuer Follower |
| manager | absent_penalty | -8 | {} | Event verpasst |
| manager | captains_call | 15 | {} | Captain ist Top-Scorer |

### 1.2 `rang_thresholds` — 12 Raenge

```sql
CREATE TABLE rang_thresholds (
  id SERIAL PRIMARY KEY,
  rang_key TEXT NOT NULL UNIQUE,
  rang_name TEXT NOT NULL,
  rang_i18n_key TEXT NOT NULL,
  tier_number INT NOT NULL UNIQUE,
  min_score INT NOT NULL,
  max_score INT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Initialwerte (12 Rows):

| rang_key | rang_name | tier_number | min_score | max_score |
|----------|-----------|-------------|-----------|-----------|
| bronze_1 | Bronze I | 1 | 0 | 349 |
| bronze_2 | Bronze II | 2 | 350 | 699 |
| bronze_3 | Bronze III | 3 | 700 | 999 |
| silber_1 | Silber I | 4 | 1000 | 1299 |
| silber_2 | Silber II | 5 | 1300 | 1599 |
| silber_3 | Silber III | 6 | 1600 | 1899 |
| gold_1 | Gold I | 7 | 1900 | 2199 |
| gold_2 | Gold II | 8 | 2200 | 2599 |
| gold_3 | Gold III | 9 | 2600 | 2999 |
| diamant | Diamant | 10 | 3000 | 3499 |
| mythisch | Mythisch | 11 | 3500 | 4999 |
| legendaer | Legendaer | 12 | 5000 | NULL |

### 1.3 `score_road_config` — 11 Milestones

```sql
CREATE TABLE score_road_config (
  id SERIAL PRIMARY KEY,
  score_threshold INT NOT NULL UNIQUE,
  rang_name TEXT NOT NULL,
  rang_i18n_key TEXT NOT NULL,
  reward_cents BIGINT NOT NULL DEFAULT 0,
  reward_label TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('bsd','cosmetic','both')),
  sort_order INT NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Initialwerte (11 Rows):

| score_threshold | rang_name | reward_cents | reward_label | reward_type |
|----------------|-----------|-------------|-------------|-------------|
| 350 | Bronze II | 20000 | 200 CR | bsd |
| 700 | Bronze III | 0 | Bronze-Rahmen | cosmetic |
| 1000 | Silber I | 50000 | 500 CR | bsd |
| 1300 | Silber II | 0 | "Scout" Titel | cosmetic |
| 1600 | Silber III | 100000 | 1.000 CR | bsd |
| 1900 | Gold I | 0 | Gold-Rahmen | cosmetic |
| 2200 | Gold II | 200000 | 2.000 CR | bsd |
| 2600 | Gold III | 0 | "Stratege" Titel | cosmetic |
| 3000 | Diamant | 500000 | Diamant-Rahmen + 5.000 CR | both |
| 3500 | Mythisch | 750000 | Mythisch-Avatar + 7.500 CR | both |
| 5000 | Legendaer | 2000000 | Legendaer-Set + 20.000 CR | both |

### 1.4 `manager_points_config` — Fantasy-Punkte

```sql
CREATE TABLE manager_points_config (
  id SERIAL PRIMARY KEY,
  max_percentile INT NOT NULL,
  points INT NOT NULL,
  label TEXT NOT NULL,
  small_event BOOLEAN NOT NULL DEFAULT false,
  max_rank INT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(max_percentile, small_event)
);
```

Initialwerte (15 Rows — 8 Normal + 7 Small Event):

Normal (>= 20 Teilnehmer):

| max_percentile | points | label |
|---------------|--------|-------|
| 1 | 50 | Top 1% |
| 5 | 40 | Top 5% |
| 10 | 30 | Top 10% |
| 25 | 20 | Top 25% |
| 50 | 10 | Top 50% |
| 75 | 0 | Top 75% |
| 90 | -10 | 75-90% |
| 100 | -25 | Bottom 10% |

Small Event (< 20 Teilnehmer):

| max_rank | points | label |
|----------|--------|-------|
| 1 | 50 | Platz 1 |
| 2 | 40 | Platz 2 |
| 3 | 30 | Platz 3 |
| 5 | 20 | Top 5 |
| 10 | 10 | Top 10 |
| 15 | 0 | Top 15 |
| 20 | 0 | Top 20 |

### 1.5 `streak_config` — Streak-Benefit-Tiers

```sql
CREATE TABLE streak_config (
  id SERIAL PRIMARY KEY,
  min_days INT NOT NULL UNIQUE,
  daily_tickets INT NOT NULL,
  fantasy_bonus_pct NUMERIC(5,4) NOT NULL DEFAULT 0,
  elo_boost_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  free_mystery_boxes_per_week INT NOT NULL DEFAULT 0,
  mystery_box_ticket_discount INT NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Initialwerte (7 Rows):

| min_days | daily_tickets | fantasy_bonus_pct | elo_boost_pct | free_boxes | box_discount |
|----------|--------------|-------------------|---------------|------------|-------------|
| 90 | 40 | 0.15 | 10 | 1 | 1 |
| 60 | 30 | 0.15 | 10 | 1 | 1 |
| 30 | 25 | 0.05 | 10 | 1 | 1 |
| 14 | 20 | 0.05 | 10 | 0 | 1 |
| 7 | 15 | 0.05 | 0 | 0 | 1 |
| 4 | 10 | 0 | 0 | 0 | 1 |
| 0 | 5 | 0 | 0 | 0 | 0 |

### 1.6 `mission_definitions` — bleibt, kriegt Admin CRUD

Bestehende Tabelle, 26 Rows. Keine Schema-Aenderung.

---

## 2. Lese-Layer

### 2.1 Service: `src/lib/services/economyConfig.ts`

```
getEloConfig(): EloConfigRow[]
getRangThresholds(): RangThresholdRow[]
getScoreRoadConfig(): ScoreRoadRow[]
getManagerPointsConfig(): ManagerPointsRow[]
getStreakConfig(): StreakConfigRow[]
updateEloConfig(adminId, id, delta, description?): Result
updateRangThreshold(adminId, id, min_score, max_score): Result
updateScoreRoadConfig(adminId, id, reward_cents, reward_label, reward_type): Result
updateManagerPointsConfig(adminId, id, points): Result
updateStreakConfig(adminId, id, fields): Result
```

Alle Update-Funktionen setzen `updated_by` + `updated_at`.

### 2.2 React Query Hooks: `src/lib/queries/economyConfig.ts`

```
useEloConfig()           — qk.economy.elo
useRangThresholds()      — qk.economy.rang
useScoreRoadConfig()     — qk.economy.scoreRoad
useManagerPointsConfig() — qk.economy.managerPoints
useStreakConfig()         — qk.economy.streak
```

Alle mit `staleTime: 5 * 60 * 1000`.

### 2.3 DB-seitige Helper-Funktionen

```sql
fn_get_elo_delta(p_dimension TEXT, p_event_type TEXT) → INT
fn_get_rang_id(p_score INT) → INT              -- ersetzt get_rang_id()
fn_get_rang_name(p_score INT) → TEXT            -- ersetzt get_rang_name()
fn_get_manager_points(p_rank INT, p_total INT) → INT
fn_get_streak_benefits(p_streak_days INT) → RECORD
```

### 2.4 Trigger-Umstellung

Alle 8 Trigger-Funktionen werden umgeschrieben:
- Statt `PERFORM award_dimension_score(..., 3, ...)` → `SELECT fn_get_elo_delta('analyst','post_create') INTO v_delta`
- `trg_fn_event_scored_manager` liest aus `manager_points_config`
- `score_event` RPC liest Streak-Benefits aus `streak_config`

### 2.5 Frontend-Umstellung

| Alte Konstante | Neu |
|---------------|-----|
| `SCORE_ROAD` (gamification.ts) | `useScoreRoadConfig()` Hook |
| `MANAGER_POINTS` (gamification.ts) | Read-only Display in Admin |
| `ABSENT_MANAGER_PENALTY` | In `elo_config` (manager/absent_penalty) |
| `CAPTAINS_CALL_BONUS` | In `elo_config` (manager/captains_call) |
| Rang-Thresholds (gamification.ts) | `useRangThresholds()` Hook |
| `getStreakBenefits()` (streakBenefits.ts) | `useStreakConfig()` Hook |
| `getRang()`, `getRangName()` | DB-driven via `rang_thresholds` |

---

## 3. Admin-UI

### Neuer Tab: "Economy" im bescout-admin

6 Sub-Sections, alle mit Inline-Edit Pattern (wie AdminFeesTab):

1. **Elo-Punkte** — Gruppiert nach Dimension (Trader/Manager/Analyst), Inline-Edit auf `delta`
2. **Raenge** — 12 Rows, Inline-Edit auf `min_score`/`max_score`
3. **Score Road** — 11 Rows, Inline-Edit auf `reward_cents`/`reward_label`/`reward_type`
4. **Manager Points** — 2 Gruppen (Normal + Small Event), Inline-Edit auf `points`
5. **Streak Benefits** — 7 Rows, Inline-Edit auf alle numerischen Felder
6. **Missions** — 26+ Rows, volles CRUD (Create/Edit/Deactivate)

Berechtigungen: superadmin + admin = Edit, viewer = read-only.

---

## 4. Beruehrungspunkte (VOLLSTAENDIG)

### Frontend-Files die geaendert werden:
- `src/lib/gamification.ts` — SCORE_ROAD, MANAGER_POINTS, Rang-Konstanten entfernen, durch DB-Reads ersetzen
- `src/lib/streakBenefits.ts` — getStreakBenefits() auf DB umstellen
- `src/components/gamification/ScoreRoadCard.tsx` — useScoreRoadConfig() statt SCORE_ROAD
- `src/components/gamification/ScoreRoadStrip.tsx` — useScoreRoadConfig() statt SCORE_ROAD
- `src/app/(app)/bescout-admin/BescoutAdminContent.tsx` — neuer Economy Tab
- `src/lib/queries/keys.ts` — neue qk.economy.* Keys
- `src/types/index.ts` — neue Types fuer alle Config-Tabellen

### Backend-Files die geaendert werden:
- `src/lib/services/economyConfig.ts` — neuer Service (CRUD)
- `src/lib/queries/economyConfig.ts` — neue Query Hooks

### DB (Migrations):
- 5 neue Tabellen mit Initialwerten
- 5 neue Helper-Funktionen
- 8 Trigger-Funktionen umschreiben (lesen aus Config-Tabellen)
- `score_event` RPC umschreiben (Manager Points + Streak aus DB)
- `calculate_fan_rank` RPC umschreiben (Streak aus DB)
- `claim_score_road` RPC umschreiben (Score Road aus DB)
- `get_rang_id()` + `get_rang_name()` umschreiben

### RLS Policies:
- Alle 5 neuen Tabellen: SELECT fuer authenticated, UPDATE nur fuer platform_admins

---

## 5. Nicht im Scope

- History/Audit-Log fuer Config-Aenderungen (Phase 2)
- A/B Testing / Segmented Configs (Phase 3+)
- Achievement-Definitionen in DB migrieren (separates Feature)
- Automatisches Rebalancing / Simulationen
