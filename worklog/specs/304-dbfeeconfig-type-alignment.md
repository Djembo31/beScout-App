# Slice 304 — DbFeeConfig Type-Schema Alignment (S7 Phase-2 #2)

**Slice-Type:** Type (Money-adjacent)
**Größe:** XS
**CEO-Scope:** Nein (reine TS-Typ-Vervollständigung gegen verifiziertes Live-Schema; kein Runtime/Logic/Fee-Wert-Change)
**Datum:** 2026-06-13

## 1. Problem-Statement
S7-Registry Trading-Befund #2 (P0 latent): `DbFeeConfig` (TS) fehlten 6 Spalten die live in `fee_config` existieren UND in RPCs `accept_offer`/`buy_player_sc` genutzt werden — `offer_platform/pbt/club_bps` + `abo_discount_bronze/silber/gold_bps`. Klasse „Schema≠TS-Typ"-Drift (errors-frontend Slice 200 Familie). Risiko: jeder Client-Code der P2P-Offer-Fees oder Abo-Discounts aus `getFeeConfig` ableiten will, sieht die Felder nicht → latentes Money-Typ-Loch.

## 3. Betroffene Files
| File | Änderung |
|------|----------|
| `src/types/index.ts` (DbFeeConfig) | +6 non-optional `number`-Felder (NOT NULL in DB) |

## 4. Code-Reading (verifiziert)
- Live `fee_config`-Schema (information_schema): 18 Spalten, 6 fehlten im Typ — alle NOT NULL → non-optional. ✅
- Consumer `pbt.ts:getFeeConfig` + `getAllFeeConfigs`: `data as DbFeeConfig` (DB-Read-Cast) → Feld-Zuwachs unkritisch. ✅
- `AdminFeesTab.tsx`: feste `FeeKey`-Union (trade/ipo) + `Partial<DbFeeConfig>` → rendert neue Felder nicht, kein Zwang. ✅
- Test-Mocks (`pbt.test.ts`/`smallServices.test.ts`): untypisierte Objekt-Literale via `mockSupabaseResponse` → `as DbFeeConfig`-Cast im Service → kein tsc-Bruch. ✅

## 5. Pattern-References
- errors-frontend.md „PLAYER_SELECT_COLS Sync mit DbPlayer-Type (Slice 200)" — Schema≠Typ-Drift-Familie.
- errors-db.md „Money-RPC Pricing-Formel Drift (Slice 108)" — Fee-bps = DB-Wahrheit, Typ muss matchen.
- S7-Registry Domäne 3 §3.10 (Fee-Config P0 Typ-Drift).

## 6. Acceptance Criteria
- AC-1: DbFeeConfig enthält offer_platform/pbt/club_bps + abo_discount_bronze/silber/gold_bps (alle `number`). VERIFY: grep.
- AC-2: Typ matcht Live-Schema 1:1 (18 Spalten - meta = alle bps-Felder). VERIFY: information_schema-Abgleich.
- AC-3: tsc 0, pbt-Tests grün (54/54). VERIFY.

## 8. Self-Verification
```bash
grep -c "offer_platform_bps\|offer_pbt_bps\|offer_club_bps\|abo_discount_bronze_bps\|abo_discount_silber_bps\|abo_discount_gold_bps" src/types/index.ts  # 6
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/lib/services/__tests__/pbt.test.ts src/lib/services/__tests__/smallServices.test.ts
```

## 10. Proof-Plan
`worklog/proofs/304-feeconfig-type.txt`: Live-Schema-Spaltenliste · grep 6 neue Felder · tsc 0 · 54 Tests grün.

## 11. Scope-Out
- KEINE Admin-UI-Erweiterung (offer/abo-Fees editierbar machen) = separater CEO-Feature-Slice.
- KEINE Fee-Wert/Logic-Änderung — RPCs nutzen die Spalten bereits korrekt.

## 12. Stage-Chain
SPEC → IMPACT skipped (reine Typ-Addition, kein Runtime/Service/RPC/Schema-Change) → BUILD → REVIEW (self-review, XS pure-type-completeness gegen verifiziertes Live-Schema) → PROVE → LOG.
