# Slice 049 — A-07 RPC-Response-Shape-Audit Coverage Expansion

**Groesse:** S
**CEO-Scope:** NEIN (internal audit)
**Variante-2-Position:** #6/10

## Ziel

INV-23 erweitert um 3 RPCs die von Services gecalled werden aber nicht in der Whitelist waren: Coverage steigt von 76 auf 78 RPCs (plus 1 neu in EXCLUDED-Set).

## Hintergrund

INV-23 (Slice 007) scannt pro RPC die top-level JSON-Keys und matcht gegen erwartete Service-Cast-Keys. Mystery-Box-Bug (2026-04-11) war genau dieser Pattern: RPC emittierte camelCase keys, Service casted snake_case → alle Fields undefined.

Audit (2026-04-18):
- 94 Service-called RPCs identifiziert via `grep -r '.rpc(' src/lib/services/`
- 23 davon nicht in INV-23 Whitelist
- Davon 17 returnen keine jsonb/json (boolean/integer/TABLE returns) → out-of-scope fuer jsonb-shape-check
- 3 returnen jsonb/json und brauchen Shape-Registration:
  - `get_club_balance`
  - `rpc_get_player_percentiles`
  - `rpc_get_user_social_stats`

## Findings

1. **`get_club_balance`** (`src/lib/services/club.ts:633`, returns `json`)
   - RPC keys: `available, sub_revenue, total_earned, total_withdrawn, trade_fees`
   - Service cast: `ClubBalance` mit identisch 5 keys (verifiziert in types/index.ts:378)
   - **Status: aligned** → in INV-23 Whitelist aufgenommen

2. **`rpc_get_player_percentiles`** (`src/lib/services/players.ts:67`, returns `jsonb`)
   - RPC keys: 13 keys (`floor_price_pct, holder_count_pct, l5_score_pct, l15_score_pct, pos_*_pct, pos_l5_rank, pos_l5_total, total_trades_pct`)
   - Service cast: `Record<string, number>` (generic, alle keys akzeptiert)
   - **Status: aligned** → in INV-23 Whitelist mit allen 13 keys (Regression-Guard falls RPC keys gedropped werden)

3. **`rpc_get_user_social_stats`** (`src/lib/services/social.ts:16`, returns `json`)
   - RPC body: SELECT + aggregates — kein `jsonb_build_object` / `json_build_object` literal
   - Audit-Helper `get_rpc_jsonb_keys` kann das nicht parsen
   - Service cast: `UserSocialStats` mit 3 keys (`following_ids, follower_count, following_count`)
   - **Status: audit-helper-limitation** → in RPC_SHAPE_EXCLUDED aufgenommen mit Dokumentation

## Files

**MODIFIZIERT:**
- `src/lib/__tests__/db-invariants.test.ts` — INV-23 Whitelist + EXCLUDED erweitert

## Acceptance Criteria

1. INV-23 hat 78 RPCs (statt 76) in RPC_SHAPE_WHITELIST + 3 in EXCLUDED.
2. INV-23 gruen.
3. tsc clean.
4. Kein Regression in anderen INV-Tests.

## Scope-Out

- **17 non-jsonb service-called RPCs** (boolean/int returns) — INV-23 macht jsonb-shape-check, nicht scalar-returns. Out of scope.
- **Audit-Helper-Verbesserung** fuer nicht-literal-jsonb_build Patterns (subquery-based returns) — separater Slice 007b, komplex.
- **Neue Drift-Detection** zwischen Service-Cast und TypeScript-Types — ist ein anderer Layer (Slice 050 B-02).

---

**Ready fuer PROVE/LOG:** JA
