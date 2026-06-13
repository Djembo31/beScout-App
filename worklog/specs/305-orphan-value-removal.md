# Slice 305 — Orphan Community-Valuation Removal (S7 Phase-2 #3)

**Slice-Type:** UI + Service + Migration (Dead-Feature-Removal, RED/GREEN-Proof)
**Größe:** M
**CEO-Scope:** Nein (orphan Dead-Feature, 5+5 Test-Zeilen, kein Money-Flow; Anil „#3" approved)
**Datum:** 2026-06-13

## 1. Problem-Statement
S7-Registry Trading-Befund #2 (P0 Value-Pfad gebrochen): Das Community-Valuation-Feature ist **vollständig gebaut aber orphan** — `CommunityValuation.tsx` ist `@experimental`, nur Barrel-exportiert (`index.ts:21`), **0 JSX/Import-Konsumenten**. Service `valuations.ts` + RPC `submit_player_valuation` + 2 Tabellen (`player_fair_values`/`player_valuations`, je 5 Pre-Orphan-Testzeilen) hängen ausschließlich daran. „Existenz ≠ Verwendung" (D54-Familie) — toter Value-Pfad als Liability + Registry-Verwirrung.

## 2. Lösungs-Design
S6-Style-Removal mit RED/GREEN-Proof (§11.3 kein Blind-Delete). Komplette self-contained Removal-Chain:
- **Code:** Delete `CommunityValuation.tsx` + `valuations.ts` (Types `PlayerFairValue`/`UserValuation` inline → sterben mit), Barrel-Zeile `index.ts:21` entfernen, `db-invariants.test.ts:1051` RPC-Map-Zeile entfernen.
- **DB-Migration:** `DROP FUNCTION submit_player_valuation` + `DROP TABLE player_valuations, player_fair_values`.

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `src/components/player/detail/CommunityValuation.tsx` | DELETE |
| `src/lib/services/valuations.ts` | DELETE |
| `src/components/player/detail/index.ts` | Barrel-Zeile 21 raus |
| `src/lib/__tests__/db-invariants.test.ts` | RPC-Map-Zeile `submit_player_valuation` raus |
| `supabase/migrations/<ts>_slice_305_drop_orphan_valuations.sql` | NEU: DROP FUNCTION + 2 TABLE |

## 4. Code-Reading (RED-State verifiziert)
- `CommunityValuation`: nur self + `index.ts:21` Barrel — **0 import/JSX**. ✅
- `valuations.ts`: 3 fn (getPlayerFairValue/getUserValuation/submitValuation), nur von CommunityValuation. ✅
- `player_fair_values`/`player_valuations`: nur CommunityValuation.tsx + valuations.ts. ✅
- DB-Deps: 0 incoming-FK, 0 View, 0 Trigger; 1 RPC `submit_player_valuation` (0 Wrapper-Caller). ✅
- Types `PlayerFairValue`/`UserValuation`: inline in valuations.ts, 0 externe Konsumenten. ✅
- `db-invariants.test.ts:1051`: RPC-Return-Shape-Map-Eintrag → mit RPC entfernen. ✅
- Keine Test-Files für CommunityValuation/valuations. ✅

## 5. Pattern-References
- Slice 301 (S6) + errors-frontend.md „Dead-Wrapper-File (Slice 280)" — Removal-Methodik + RED/GREEN.
- Master-Audit §11.3 (kein Blind-Delete, nur RED/GREEN Removal-Proof).
- database.md Migration-Workflow (mcp apply_migration) + AR-43 (kein Stub).

## 6. Acceptance Criteria
- AC-1: `grep -rn "CommunityValuation\|services/valuations\|player_fair_values\|player_valuations\|submit_player_valuation" src/` → 0 (nach Removal). VERIFY.
- AC-2: 2 Files + Barrel-Zeile + Test-Zeile entfernt. VERIFY: `test ! -f`.
- AC-3: DB — `player_fair_values`/`player_valuations`/`submit_player_valuation` existieren nicht mehr. VERIFY: SQL `to_regclass`/`pg_proc`.
- AC-4: tsc 0 + db-invariants-Test + player-detail-Domain-Tests grün. VERIFY.

## 8. Self-Verification
```bash
grep -rn "CommunityValuation\|services/valuations\|player_fair_values\|player_valuations\|submit_player_valuation" src/  # 0
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/lib/__tests__/db-invariants.test.ts src/components/player
# SQL: SELECT to_regclass('public.player_fair_values'), to_regclass('public.player_valuations');  -- beide NULL
```

## 10. Proof-Plan
`worklog/proofs/305-orphan-value-removal.txt`: RED-grep vor (Konsumenten-Karte) · DELETE-Confirms · DB to_regclass NULL + pg_proc 0 · grep 0 nach · tsc 0 · Tests grün.

## 11. Scope-Out
- KEINE Reaktivierung des Features (Anil-Decision falls je gewünscht — dann Neu-Bau).
- KEINE anderen valuation-bezogenen Felder (`players.market_value_eur`/`mv_trend_7d` bleiben — andere Semantik).

## 12. Stage-Chain
SPEC → IMPACT (in-spec: vollständige RED-State-Dependency-Karte Code+DB) → BUILD → REVIEW (reviewer-Agent, DB-Drop-Pflicht) → PROVE → LOG.

## 13. Pre-Mortem
1. Versteckter Konsument → mitigiert: grep + DB-pg_proc/pg_constraint/pg_views vollständig, alle leer außer self-chain.
2. DROP TABLE blockiert durch FK → mitigiert: 0 incoming-FK verifiziert.
3. db-invariants-Test bricht (iteriert RPC-Map) → mitigiert: Map-Zeile mit entfernt.
4. Migration-Registry-Drift → mitigiert: mcp apply_migration (nicht db push).
5. Types brechen (extern genutzt) → mitigiert: PlayerFairValue/UserValuation inline, 0 externe Refs.
