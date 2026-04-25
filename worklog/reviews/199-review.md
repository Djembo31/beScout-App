# Slice 199 Review — Cold-Context Opus reviewer-Agent

**Datum:** 2026-04-25
**Time-spent:** 18 min

## Verdict: **PASS**

20/20 RPC-Tests grün gegen 3 live applied SECURITY DEFINER RPCs. Schema verified (`prosecdef=true, provolatile=s` für alle 3). tsc clean. KEIN Money-Path-Write, KEIN neuer Cron, KEIN Schema-Change auf existing Tables.

## Findings

### MEDIUM — Service-Duplicate `getTopPredictorsLeaderboard` (FIXED)

- **Location:** `src/lib/services/leaderboards.ts` (BE-canonical) vs `src/features/fantasy/services/predictions.queries.ts` (FE-duplicate)
- **Issue:** Backend-Agent + Frontend-Agent haben parallel beide eine `getTopPredictorsLeaderboard`-Implementierung geschrieben. FE-Hook nutzte FE-Variante → BE's `leaderboards.ts` war orphan production-code (Drift-Risk).
- **Fix:** FE-Duplicate entfernt aus `predictions.queries.ts:212-243` (Replace-Comment dort als Verweis). `src/lib/queries/predictions.ts` importiert `getTopPredictorsLeaderboard` jetzt aus `@/lib/services/leaderboards` (canonical mit typisiertem `UserTier`).
- **Status:** **fixed** (Primary-Claude post-Review)

### LOW — Migration-File-Existenz nach MCP-Apply (FIXED via verify)

- **Location:** `supabase/migrations/20260425220*_slice_199_*.sql` (3 Files)
- **Issue:** `mcp__supabase__apply_migration` schreibt direkt in DB — repo-Source-of-truth muss synchron persistiert sein, sonst Audit-Trail-Drift.
- **Fix:** `ls supabase/migrations/20260425220*.sql` zeigt alle 3 Migration-Files committed (timestamp `Apr 26 00:37`). Schema-File-Truth + DB-Live-Truth synchronisiert.
- **Status:** **fixed** (verified vor Final-Commit)

## RPC-Live-Verify

```sql
SELECT proname, prosecdef, provolatile FROM pg_proc
 WHERE proname IN ('get_top_predictors_leaderboard',
                    'get_most_owned_players_per_club',
                    'get_event_difficulty_score');
```

| proname | prosecdef | provolatile |
|---------|-----------|-------------|
| get_event_difficulty_score | true | s |
| get_most_owned_players_per_club | true | s |
| get_top_predictors_leaderboard | true | s |

→ Alle 3 SECURITY DEFINER + STABLE (read-only). AR-44 REVOKE/GRANT-Block in jeder Migration.

## Test-Coverage

| Test-File | Tests | Status |
|-----------|-------|--------|
| `leaderboards.test.ts` | 9 | PASS |
| `club-most-owned.test.ts` | 6 | PASS |
| `events-difficulty.test.ts` | 5 | PASS |
| **Total** | **20** | **PASS** |

## Schema-Drift-Annahmen (dokumentiert in Migration-Headers)

- `profiles.tier` existiert NICHT → Tier abgeleitet aus `user_founding_passes.tier` (highest, NULL → 'fan' Default)
- `events.eligible_clubs[]` existiert NICHT → nur `events.club_id` (single). `participant_clubs_count` ist konstant 1 für single-club events.

Beide Annahmen in Migration-File-Headers + service-layer doku-Comments verewigt.

## Compliance-Verify

- KEIN "gewinn"/"prize"/"prämie"/"kazan" in neuen Strings (Predictions/Leaderboard/Difficulty)
- KEIN $SCOUT-Ticker user-facing
- KEIN Investment-Framing
- "Top Predictors" / "Hit-Rate" / "Difficulty" sind neutral

## Worktree-Awareness (patterns.md #34)

- 0% Trap-Rate über 2 Tracks (BE + FE) — Briefing-Update wirkt scharf
- Slice 198 Wave 1: 50%, Wave 2 (198b): 0%, Slice 199: 0% — empirisch validiert

## Notes

PASS. Schema live verified, tests grün, Compliance clean. 4 Findings closed (C-05 + K-02 + fm 2.4 + fm 1.3). Wave-Backlog-Schließung sauber: 4 von 5 Wave 2 deferred Skips abgehakt — fm 4.4 (Sort-by-Volume) bleibt für Slice 200 offen.

**Knowledge-Hinweis (Reviewer-Learning):** Bei parallelem Backend+Frontend-Dispatch IMMER Service-Schnittstelle vorab spezifizieren (Briefing-Pflicht: "FE importiert aus Path X, BE legt dort an"). Vermeidet Parallel-Implementation-Drift wie hier mit `getTopPredictorsLeaderboard`.
