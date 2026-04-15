---
name: Missions Architecture
description: Mission-Scoping, Progress-Tracking, Reward-Flow. Inkl. Club-vs-Global + TR-i18n-Schema + Race-Safety.
type: project
created: 2026-04-15
ref: J7-AR-57 (Operation Beta Ready Phase 2)
---

# Missions Architecture

## Tables

### `mission_definitions` (Katalog)
Columns: `id, key, type, title, description, icon, target_value, reward_cents, tracking_type, tracking_config, active, created_at, club_id, title_tr, description_tr`

- **`type`**: `'daily' | 'weekly'` — Perioden-Länge
- **`key`**: stabile Identifier (z.B. `daily_buy_1`, `weekly_fantasy`). Nicht für UI, nur für Tracking-Logik.
- **`club_id`**: `NULL` = globale Mission (alle User), sonst club-specific (nur User die dem Club folgen)
- **`title` / `description`**: Deutsche Haupt-Werte
- **`title_tr` / `description_tr`**: TR-Übersetzungen (AR-54, 2026-04-15). Fallback → `title` (DE) wenn NULL.
- **`tracking_type`**: `'counter' | 'progress'` — Counter = Count-based, Progress = Value-based
- **`tracking_config`**: JSON mit parametrisiertem Tracking (z.B. `{"min_quantity": 2}` für `daily_trade_2`)

### `user_missions` (Instances)
Columns: `id, user_id, mission_id, period_start, period_end, progress, target_value, reward_cents, status, completed_at, claimed_at, created_at`

- **`period_start` / `period_end`**: Bereich der Mission-Instance. Daily = heute UTC, Weekly = Monday-UTC bis Sunday-UTC
- **`progress`**: aktueller Fortschritt. Incremented durch `update_mission_progress(user_id, tracking_type, amount)`
- **`target_value`**: snapshot aus `mission_definitions` (Mission-Config kann sich ändern — Instance bleibt stabil)
- **`reward_cents`**: snapshot
- **`status`**: `'active' | 'claimed' | 'expired'`
- **`completed_at` / `claimed_at`**: optional timestamps

**Kein separates `mission_progress`-Table** — progress lebt direkt auf `user_missions.progress`. Einfacher, weniger Join-Overhead.

## RPCs

### `assign_user_missions(p_user_id uuid) RETURNS SETOF user_missions`
- SECURITY DEFINER + auth.uid-Guard (AR-51 2026-04-15)
- UPSERT: holt aktive Definitions, erzeugt Rows für `period_start`/`period_end` des aktuellen Daily/Weekly-Zyklus
- Club-Scoping via `WHERE club_id IS NULL OR club_id = ANY(follower-club-ids)`
- Returns: alle active + recent-claimed Missions des Users

### `update_mission_progress(p_user_id uuid, p_tracking_type text, p_amount integer)`
- Called via DB-Triggers (z.B. nach Trade → `update_mission_progress(uid, 'daily_trade_2', 1)`)
- Inkrementiert `progress`, setzt `completed_at = now()` wenn `progress >= target_value`
- Idempotent: mehrfach Aufruf innerhalb gleicher Mission keine Probleme (status bleibt `'active'` bis `claim`)

### `claim_mission_reward(p_user_id uuid, p_mission_id uuid)`
- SECURITY DEFINER + auth.uid-Guard
- Race-safe: `FOR UPDATE` auf user_mission-row + Status-Check (`'active'` AND `progress >= target_value` AND `claimed_at IS NULL`)
- Wallet-Credit + transactions-row
- Setzt `status='claimed'`, `claimed_at=now()`

### `record_login_streak(p_user_id uuid)` (verwandt, separate Logik)
- Daily-Login-Streak (nicht daily-mission)
- FOR UPDATE Lock + ON CONFLICT Milestone-Claim-Guard (AR-50 2026-04-15)
- Streak-Milestones 3/7/14/30 Tage → one-time rewards via `streak_milestones_claimed` Tabelle
- Plus: triggered `update_mission_progress(uid, 'daily_login', 1)` um daily_login-Mission zu tracken

## Edge-Cases (aus J7-Audit)

### Late-Follow im Club
**Scenario:** Club-Admin erstellt Daily-Mission am Montag. User folgt dem Club am Mittwoch.

**Actual Behavior:** `assign_user_missions` wird nach Follow getriggert → erstellt Mission-Instance mit Full-Periode (`period_end=Sunday UTC`). User hat noch 4 Tage Zeit die Mission zu completen, NICHT pro-rated.

**Implication:** User ist leicht "privileged" (weniger Zeit aber gleicher Reward). Akzeptabel für Beta — keine Änderung nötig.

### Mission-Config-Change während aktiver Periode
**Scenario:** Admin ändert `reward_cents` oder `target_value` in mission_definitions während einer Mission-Periode.

**Actual Behavior:** Instance bleibt stabil (snapshot beim assign). User-Reward ändert sich erst für die nächste Periode. ✅

### Paralleler Claim (Race)
**Scenario:** User drückt Claim-Button 2x innerhalb ms.

**Safe via:** `claim_mission_reward` hat `FOR UPDATE` + Status-Check. Zweiter Call returnt `{ok: false, error: 'Mission already claimed'}`. ✅

## Streak ↔ Mission Integration
`record_login_streak` triggert `update_mission_progress(uid, 'daily_login', 1)` nach Date-Update. So sind Streak-System + Daily-Login-Mission in derselben Transaction.

## Security (AR-44 Template eingehalten seit 2026-04-15)
Alle 5 RPCs (`assign_user_missions`, `update_mission_progress`, `claim_mission_reward`, `track_my_mission_progress`, `record_login_streak`) haben:
- `REVOKE EXECUTE FROM PUBLIC, anon`
- `GRANT EXECUTE TO authenticated`
- `auth.uid()` Guard im Body

## TR-i18n (AR-54 2026-04-15)
- Frontend-Service: `resolveMissionTitle(def, locale)` → `locale==='tr' ? def.title_tr ?? def.title : def.title`
- Backfill: 25 active Missions haben `title_tr`. Beim Adden neuer Missions: TR pflegen, sonst fallback DE.

## Nicht-Beta-Scope
- **Mission-Progress-History**: Keine Historie pro-period. User sieht nur aktuelle + letzte geclaimte.
- **Mission-Chains** (e.g. "Complete 3 Daily missions → Bonus"): Nicht modelliert.
- **Per-Club-Custom-Missions-Admin-UI**: Post-Beta.
