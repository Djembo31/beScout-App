# Implementer Journal: Pricing Architecture Tasks 3-6
## Gestartet: 2026-03-19
## Spec: Inline task description (Tasks 3-6 of Pricing Architecture)

### Verstaendnis
- Was soll gebaut werden: Add new pricing fields (referencePrice, initialListingPrice, offerCount) to Player type, update PLAYER_SELECT_COLS and dbToPlayer mapper, add query keys for offer counts, add offer count/price cap service functions, add frontend price cap validation to placeSellOrder.
- Betroffene Files: src/types/index.ts, src/lib/services/players.ts, src/lib/queries/keys.ts, src/lib/services/trading.ts, src/lib/services/__tests__/players.test.ts
- Risiken/Fallstricke: Null-guard on optional numbers (floor_price ?? 0 pattern), orders.side not orders.type, centsToBsd for price conversions

### Entscheidungen
| # | Entscheidung | Warum | Alternative |
|---|-------------|-------|-------------|
| 1 | Add referencePrice/initialListingPrice with conditional centsToBsd | DB columns may be null, must guard | Always convert (would produce 0 for null) |
| 2 | offerCounts as separate query key | Allows independent cache invalidation | Embed in orders.all (over-invalidates) |
| 3 | Add reference_price/initial_listing_price to DbPlayer type | tsc failed — type is manually defined, not auto-inferred | Could use type assertion (bad practice) |
| 4 | Add null defaults to test mock | Test mock must include all required DbPlayer fields | Skip test updates (would break CI) |

### Fortschritt
- [x] Task 3: Update Player type in types/index.ts
- [x] Task 4: Update PLAYER_SELECT_COLS + dbToPlayer in players.ts
- [x] Task 5: Add query keys + offer count service functions
- [x] Task 6: Add frontend price cap validation to placeSellOrder

### Runden-Log

#### Runde 1 — PARTIAL
- All 4 tasks implemented
- tsc failed: DbPlayer type missing reference_price and initial_listing_price
- Root Cause: DbPlayer is manually defined in types/index.ts, not auto-inferred from Supabase
- Fix: Added both fields as `number | null` to DbPlayer type

#### Runde 2 — PARTIAL
- tsc failed: Test mock missing the two new required fields
- Root Cause: createMockDbPlayer() in players.test.ts didn't have the new fields
- Fix: Added `reference_price: null, initial_listing_price: null` to mock

#### Runde 3 — PASS
- tsc: PASS (0 errors)
- tests: PASS (28/28)

### Ergebnis: PASS
- tsc: PASS
- build: not run (tsc sufficient for type-only changes)
- tests: PASS (28 passed)
- Runden benoetigt: 3

### Learnings
- DbPlayer is manually defined, NOT auto-inferred from Supabase. Any new DB column must be added to both PLAYER_SELECT_COLS AND DbPlayer type.
- Test mocks must be updated when adding required (non-optional) fields to types.

### Geaenderte Files
- src/types/index.ts (geaendert — Player type + DbPlayer type)
- src/lib/services/players.ts (geaendert — PLAYER_SELECT_COLS + dbToPlayer)
- src/lib/queries/keys.ts (geaendert — orders.offerCounts key)
- src/lib/services/trading.ts (geaendert — 3 new functions + price cap validation in placeSellOrder)
- src/lib/services/__tests__/players.test.ts (geaendert — mock updated for new DbPlayer fields)
