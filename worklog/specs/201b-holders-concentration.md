# Slice 201b — Holders-Distribution-Mini-Bar (FM-4.3)

**Type:** M | **Owner:** CTO (volle Autonomie 2026-04-26) | **CEO-Scope:** No (anonymized aggregate, kein Money-Path) | **Estimated:** 2h

## Ziel

FM-4.3 Audit-Finding: "Holders-Distribution-Mini-Bar in Row fehlt (z.B. Top-10 owners hold 60%)". Sorare-Standard fuer Liquid/Iliquid-Erkennung. Floor-Price kann taeuschen wenn 1 Holder 80% haelt.

## Architektur (Pattern get_player_holder_count Blueprint)

1. **RPC:** `get_player_holders_concentration(p_player_id UUID)` SECURITY DEFINER STABLE
   - Returnt: `{total_holders, total_supply, top_10_supply, top_10_pct}` als jsonb
   - Anonymized — kein user_id, kein handle
   - Bypass holdings-RLS (analog get_player_holder_count)
   - AR-44 REVOKE/GRANT
2. **Service:** `getPlayerHoldersConcentration(playerId)` in `src/lib/services/wallet.ts`
3. **Hook:** `usePlayerHoldersConcentration(playerId)` in queries — staleTime 5min (holdings-Verteilung aendert sich langsam)
4. **Component:** `ConcentrationBar.tsx` — Mini-SVG-Bar, ~80px breit, zeigt visual den Top-10-pct
5. **Integration:** TransferListSection (PlayerRow) — opt-in via Props, lazy-load per Visibility (kein N+1-Query)

## Items (1)

- **FM 4.3 (P1)** TransferListSection Holders-Distribution-Mini-Bar

## Acceptance Criteria

1. tsc clean
2. Migration applied LIVE via mcp__supabase__apply_migration
3. RPC `get_player_holders_concentration` existiert mit AR-44 REVOKE/GRANT
4. RPC returnt valid jsonb auch bei 0 holders (`total_holders=0, top_10_pct=0`)
5. Service-Funktion + Hook + Component-File existieren
6. Mini-SVG-Bar rendert (visual = horizontal bar mit zwei Segmenten: top-10-share + rest)
7. DE+TR i18n keys ergaenzt (concentrationLabel, topNHoldShare)
8. Reviewer-Verdict != FAIL

## Edge Cases

1. Player ohne Holders: `{total_holders: 0, total_supply: 0, top_10_pct: 0}` — Component rendert nichts (early return)
2. <10 Holders: `top_10_supply = total_supply` → top_10_pct = 100%
3. Genau 10 Holders: same — top_10 sind alle
4. RPC-Failure: Component shows nothing (graceful degrade, kein Toast)
5. RLS-Bypass-Sicherheit: SECURITY DEFINER + auth.uid() IS NOT NULL guard
6. Performance: bei 1000+ player-rows nicht eager fetchen — lazy-load oder nur in Player-Detail

## Proof-Plan

- `worklog/proofs/201b-tsc-mig.txt` — tsc clean + Migration LIVE + RPC-Verify (test mit echten player-IDs aus Bot-Loop)

## Scope-Out

- Top-10-Holder-Liste (User-Namen) — wuerde RLS-Pflicht, eigene Slice
- Animated Bar-Transitions
- Concentration-Heatmap auf /clubs Page (eigene Slice)

## Knowledge-Capture-Kandidaten

- Anonymized-Aggregate-RPC-Pattern (analog get_player_holder_count Reihe) — bereits in patterns.md
