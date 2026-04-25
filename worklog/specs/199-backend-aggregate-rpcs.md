# Slice 199 — Backend-Aggregat-RPC-Wave

**Datum:** 2026-04-25
**Groesse:** L (parallel-dispatch backend + frontend)
**CEO-Approval:** **CTO-scope** — alle RPCs sind read-only Aggregate, KEIN Money-Path-Write, KEINE Schema-Migration, KEIN neuer Cron.
**Trigger:** 4× Skip-Pattern aus 198 + 198b zeigt klares Muster — Backend-Aggregat-RPC fehlt fuer 4 Findings. Gebuendelte RPC-Wave statt 4 Einzel-Slices.

## Ziel

3 SECURITY DEFINER read-only Aggregat-RPCs + 1 frontend-only Filter, plus 4 UI-Consumers schliessen 4 deferred Findings aus 198/198b.

## Scope-In

| Finding | Komponente | RPC/Frontend | Source-Slice |
|---------|------------|--------------|--------------|
| C-05 P2 | Top-Predictor-Leaderboard | `get_top_predictors_leaderboard()` RPC + UI | 198b |
| K-02 P2 | Most-Owned-Players pro Club | `get_most_owned_players_per_club(p_club_id)` RPC + UI | 198b |
| fm 2.4 P2 | Event-Difficulty-Indikator | `get_event_difficulty_score(p_event_id)` RPC + UI | 198b |
| fm 1.3 P2 | In-Lineup-Filter Kader-Toolbar | Frontend-only (existing lineup data) | 198b |

## Scope-Out

- **fm 4.4 Sort-by-Trade-Volume-7d** — DEFERRED zu Slice 200 (braucht `players.trades_volume_7d` Column-Migration + Aggregations-Strategie ohne neuen Cron)
- Money-Path: Es findet KEIN write zu `wallets/transactions/holdings` statt
- KEIN neuer Cron (Vercel-Hobby-Schutz, aktuell 12 Crons)
- KEIN Schema-Change auf existing Tables

## RPC-Specs

### 1. `get_top_predictors_leaderboard(p_limit INT DEFAULT 10)` → JSONB

**Pattern-Vorbild:** Slice 095 `rpc_get_club_recent_trades` (anonymized output, public-safe).

**Return-Shape:**
```jsonb
[
  {
    "user_id": "uuid",
    "handle": "text",
    "display_name": "text|null",
    "tier": "text",
    "predictions_total": 42,
    "predictions_correct": 28,
    "hit_rate_pct": 67,
    "rank": 1
  },
  ...
]
```

**Logik:**
```sql
WITH stats AS (
  SELECT user_id,
    COUNT(*) FILTER (WHERE status IN ('correct','wrong')) AS predictions_total,
    COUNT(*) FILTER (WHERE status='correct') AS predictions_correct
  FROM predictions
  WHERE status IN ('correct','wrong')
  GROUP BY user_id
  HAVING COUNT(*) FILTER (WHERE status IN ('correct','wrong')) >= 5  -- min 5 graded
)
SELECT ... ORDER BY hit_rate_pct DESC, predictions_total DESC LIMIT p_limit;
```

**Security:** SECURITY DEFINER, AR-44 REVOKE/GRANT. Public-safe (no PII beyond handle). Kein auth.uid()-Guard noetig.

### 2. `get_most_owned_players_per_club(p_club_id UUID, p_limit INT DEFAULT 5)` → JSONB

**Return-Shape:**
```jsonb
[
  {
    "player_id": "uuid",
    "first_name": "text",
    "last_name": "text",
    "shirt_number": 7,
    "position": "ATT",
    "image_url": "text|null",
    "holders_count": 42,
    "rank": 1
  },
  ...
]
```

**Logik:**
```sql
WITH club_holdings AS (
  SELECT h.player_id, COUNT(DISTINCT h.user_id) AS holders_count
  FROM holdings h
  JOIN players p ON p.id = h.player_id
  WHERE p.club_id = p_club_id AND h.quantity > 0
  GROUP BY h.player_id
)
SELECT ... ORDER BY holders_count DESC LIMIT p_limit;
```

**Security:** SECURITY DEFINER (RLS auf holdings blockt cross-user reads; aggregate ist anonymized — kein user_id im output).

### 3. `get_event_difficulty_score(p_event_id UUID)` → JSONB

**Return-Shape:**
```jsonb
{
  "event_id": "uuid",
  "difficulty_score": 0.72,
  "difficulty_tier": "medium",
  "avg_ipo_price_cents": 250000,
  "participant_clubs_count": 4
}
```

**Logik:** Aggregate avg `players.ipo_price` aus event-eligible Clubs (via `event.club_id` oder `event.eligible_clubs[]`-Array falls Multi-Club). Skala normalisieren auf 0-1.

**Security:** SECURITY DEFINER. Public-safe.

### 4. fm 1.3 In-Lineup-Filter (Frontend-only)

**Logik:** KaderToolbar/Tab nutzt existing `useLineupForEvent(p_event_id)` query → Filter-Set von `playerIds` im Lineup. Filter-Pill: `inLineup | notInLineup | all`. Kein neuer RPC noetig.

**Constraint:** KaderToolbar+KaderTab waren in Slice 198/198b "Forbidden-Files" — jetzt erlaubt im neuen Slice 199 (Wave 1+2 abgeschlossen).

## Files (geschaetzt)

**Backend (3 Migrations + Tests):**
- `supabase/migrations/20260425220000_slice_199_top_predictors.sql`
- `supabase/migrations/20260425220100_slice_199_most_owned_per_club.sql`
- `supabase/migrations/20260425220200_slice_199_event_difficulty.sql`
- `src/lib/services/predictions.ts` + `src/lib/services/clubs.ts` + `src/lib/services/events.ts` (service-layer reads)
- `src/lib/queries/keys.ts` (qk neue Keys)
- Tests: `src/lib/services/__tests__/...`

**Frontend (4 UI-Consumers):**
- `src/components/fantasy/PredictionsTab.tsx` — Top-Predictor-Section (C-05)
- `src/app/(app)/club/[slug]/ClubContent.tsx` oder ClubSquadTab — Most-Owned-Card (K-02)
- `src/components/fantasy/EventSelector.tsx` (oder analog) — Difficulty-Pill (fm 2.4)
- `src/features/manager/components/kader/KaderToolbar.tsx` + `KaderTab.tsx` — In-Lineup-Filter (fm 1.3)
- `messages/de.json` + `messages/tr.json` — neue Keys

## Acceptance Criteria

1. tsc clean nach Merge
2. vitest smoke pass (alle modifizierten Bereiche + neue RPC-Tests)
3. Mobile 393px verifiziert (mental)
4. DE+TR i18n PFLICHT — Audit-Pattern aus errors-frontend.md
5. RPC-Security: SECURITY DEFINER + AR-44 REVOKE/GRANT
6. RPC-Return: discriminated-union shape (success: true|false) — analog `errors-db.md` Slice 168
7. KEIN Money-Path-Write
8. KEIN neuer Cron
9. Reviewer-Agent verdict PASS oder REWORK-with-inline-Healing
10. ≥3 Findings closed (Ziel 4)

## Edge Cases

- C-05: User mit <5 graded predictions → exclude (HAVING-clause)
- C-05: tied hit-rate → secondary sort by predictions_total DESC (mehr Volumen = vertrauenswuerdiger)
- K-02: Spieler mit 0 holdings → leeres Array (graceful)
- K-02: Club ohne Spieler → leeres Array
- fm 2.4: Event ohne eligible Clubs → null oder default 0.5
- fm 1.3: Kein Active Event → Filter disabled (kein lineup data)
- RLS: Aggregat-RPCs SECURITY DEFINER, Output anonymized (siehe Pattern Slice 095)

## Proof Plan

| AC | Proof |
|----|-------|
| 1 | tsc --noEmit clean |
| 2 | vitest smoke output (.txt) |
| 3 | mental-check |
| 4 | i18n-Audit (errors-frontend.md Pattern) |
| 5 | `SELECT proname, prosecdef FROM pg_proc WHERE proname LIKE 'get_top_predictors%' OR ...` (.txt) |
| 6 | RPC-Body inspection via `pg_get_functiondef` |
| 7 | grep `\.from\('(wallets|transactions)'` neue Files = leer |
| 8 | grep `vercel.json schedule` keine neue Zeile |
| 9 | worklog/reviews/199-review.md |
| 10 | punch-list-Update |

## Stage-Chain

```
SPEC (this) → IMPACT inline → BUILD (parallel: backend-agent + frontend-agent in Worktrees mit Worktree-Awareness-Briefing) →
REVIEW (reviewer-agent) → REWORK (healer if REWORK) → PROVE → LOG
```

## Worktree-Awareness-Briefing (Mandatory)

Per `memory/patterns.md` #34 + Slice 198b (0% Trap-Rate erreicht):

> **WICHTIG:** Du arbeitest in einem Worktree. Dein CWD ist
> `C:\bescout-app\.claude\worktrees\agent-XXX`. Edits MUESSEN
> Pfade unter diesem Verzeichnis verwenden — relative Pfade
> oder worktree-prefixed absolute. NIEMALS
> `C:\bescout-app\src\...` als absoluter Pfad — das ist
> main-Repo, nicht dein Worktree. Bei Read/Edit/Write IMMER
> relative Pfade.

## Backlog (Post-Slice-199)

- **Slice 200** — fm 4.4 trades_volume_7d Column + Aggregations-Strategie (kein-Cron-Variant: Trigger oder Materialized View mit on-demand-Refresh) + Frontend Sort
- Slice 198/198b Restposten (Brand 6, UX 9, FM 13, Fantasy 10) → Wave 3 wenn Beta-Launch noch wartet
