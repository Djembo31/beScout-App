# Slice 201d — Prediction-Consensus-Hint (C-03)

**Type:** M | **Owner:** CTO (volle Autonomie 2026-04-26) | **CEO-Scope:** No (anonymized aggregate, kein Money-Path) | **Estimated:** 1.5h

## Ziel

C-03 Audit-Finding (P1): "Kein Aggregate-Hint 'X% der Community tippte gleich' in CreatePredictionModal". FPL Pollscores nutzen Aggregat. Hilft Vor-Submit-Decision: bin ich differential?

## Architektur (Pattern Slice 199 Anonymized-Aggregate-RPC)

1. **RPC:** `get_prediction_consensus(p_fixture_id UUID, p_condition TEXT, p_player_id UUID DEFAULT NULL)` SECURITY DEFINER STABLE
   - Returnt `{success, total_count, distribution: [{value, count, pct}]}` als jsonb
   - Anonymized — kein user_id
   - Bypass predictions-RLS (nur own pending visible per fantasy.md)
   - AR-44 REVOKE/GRANT
2. **Service:** `getPredictionConsensus(fixtureId, condition, playerId?)` in `src/features/fantasy/services/predictions.ts`
3. **Hook:** `usePredictionConsensus(fixtureId, condition, playerId?, enabled)` — staleTime 60s
4. **Component-Integration:** ConsensusHint in CreatePredictionModal — zeigt Distribution-Bar + Differential-Indikator wenn gewählter Value abweicht

## Items (1)

- **C-03 (P1)** CreatePredictionModal Aggregate-Hint

## Acceptance Criteria

1. tsc clean
2. Migration LIVE applied
3. RPC `get_prediction_consensus` mit AR-44 REVOKE/GRANT
4. Returnt valid jsonb auch bei 0 predictions (`total_count: 0, distribution: []`)
5. Service + Hook + Component-File existieren
6. ConsensusHint rendert Distribution-Bar (Top-3 Values mit pct)
7. DE+TR i18n keys (3 keys: consensusTitle, consensusDifferential, consensusMajority)
8. Reviewer-Verdict != FAIL

## Edge Cases

1. Fixture ohne Predictions: `{total_count: 0, distribution: []}` → Component rendert nothing
2. Sparse Predictions (<5): Hint anzeigen aber Disclaimer "wenig Daten"
3. RLS-Bypass-Sicherheit: SECURITY DEFINER + auth.uid() Guard
4. Anonymisierung: KEIN Leak von user_id — nur counts/pcts
5. D48-Check: kein pre-existing Prediction-Aggregate-RPC

## Proof-Plan

- `worklog/proofs/201d-tsc-mig.txt` — tsc clean + Migration LIVE + RPC-Verify mit echten predictions

## Scope-Out

- Top-Predictor-Leaderboard (C-05 — Slice 199 done)
- Community-Polls-Aggregation (out of scope)
- Per-User-Hit-Rate-Display
