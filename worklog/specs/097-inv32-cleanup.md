# Slice 097 — INV-32 Cleanup: remaining qual=true Tables

## Ziel
INV-32 komplett grün durch Whitelist-Update: `league_standings` + `player_transfers` als public-sport-data anerkennen, obsolete `trades`-Eintrag entfernen.

## Analyse

Nach Slice 095 Phase 2 sind 2 Tables mit qual=true übrig:

**league_standings** Columns:
- `id, league_id, club_id, season, rank, played, won/drawn/lost, goals_for/against, points, form, updated_at`
- Pure standings data. **Keine user_ids, keine PII.**

**player_transfers** Columns:
- `id, player_id, transfer_date, transfer_type, team_in/out_id, team_in/out_api_football_id, season`
- Public transfer-history. **Keine user_ids, keine PII.**

Beide sind **reine public-sport-data** — gleicher Scope wie `clubs`/`leagues`/`players`/`fixtures` (die bereits whitelist sind).

## Änderungen

`src/lib/__tests__/db-invariants.test.ts` EXPECTED_PUBLIC:
- **Added**: `league_standings`, `player_transfers`
- **Removed**: `trades` (veraltet — Slice 095 Phase 2 hat RLS tightened auf own-or-platform-admin)

## Verification

- `npx vitest run -t "INV-32"` → PASS
- `npx vitest run src/lib/__tests__/db-invariants.test.ts` → **38/38 grün**

## Impact
- INV-10/32/36/37/38 jetzt alle stable grün
- Kompletter Abschluss der RLS-/Data-Quality-Invariants-Cleanup-Reihe von heute
