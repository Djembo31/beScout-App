# Slice 354 — Cold-Context-Review (reviewer-Agent)

**Verdict: PASS** · time-spent: 9 min

## Scope
Live-Verify Slice 349 fand Club-Fan-Board ("Treueste Fans") im Error-State (Prod). Root Cause: `getClubFanLeaderboard` Embed `profiles!inner(...)` ohne FK `fan_rankings→profiles` (FK ging nur auf `auth.users`). Fix = additiver FK `user_id → profiles(id) ON DELETE CASCADE` (kanonisch = `scout_scores`). 0 src/-Änderung.

## Findings (beide INFO, non-actionable)
| # | Severity | Issue | Verdikt |
|---|----------|-------|---------|
| 1 | INFO (theoretisch) | Write-Pfad `calculate_fan_rank` INSERT könnte `23503` werfen, falls user_id ∈ auth.users aber ∉ profiles. | Praktisch unmöglich (profile-on-signup, 0 Orphans). Cron-Loop ist fail-isoliert (kein throw), Service gibt `{ok:false}`. Kein Action-Item. |
| 2 | INFO | `lineups.user_id` (Write-Quelle) hat selbst keinen inline-FK → Orphan-Garantie ruht auf Signup-Invariante, nicht DB-Kette. | Out-of-scope; optionale Post-Beta-Härtung (profiles-FK auf lineups). |

## Reviewer-Bestätigungen
1. **FK korrekt + vollständig.** Kein reales Write-Bruch-Risiko. ✅
2. **Keine PostgREST-Ambiguität** — grep `users!inner`/`auth.users`-Embed auf fan_rankings = 0 Treffer; `profiles!inner` hat genau 1 FK-Pfad = eindeutig. ✅
3. **Kein Money/Tally-Effekt** (D92) — FK berührt weder rank_tier noch total_score noch Gewichtsformel. ✅
4. **AR-44 N/A** korrekt (keine Funktion). ✅
5. Greenfield-Timestamp-Order OK (kein S326-Inversion); AR-43 kein Stub; QA gegen bescout.net (nicht localhost). ✅

## Übernommenes Learning (in errors-db.md S354-Bullet generalisiert)
„Unit-Mock + tsc grün ≠ PostgREST-Relationship-resolvable" — jede neue `*!inner(...)`-Embed-Einführung braucht **1× Live-Render-Verify gegen bescout.net** als Definition-of-Done (analog S333 MISSING_MESSAGE-Scan). Gilt über `profiles` hinaus für alle Embed-Targets.

## Positive
Minimal-invasiv (1 ADD CONSTRAINT, 0 src/), Pre-Add-Orphan-Check (0/37), echter Live-Re-Proof (38 Fans), Prävention verkabelt (Pattern + pre-commit-Reminder + workflow.md). Schließt eine bestehende `database.md`-Verletzung.
