# Notes — Slice 291 Unified Trading GeoGate

The decision was to keep Player and Manager content visible, but prevent trading execution for regions/tiers without `dpc_trading`.

Implementation uses the existing `useRegionGuard('dpc_trading')`:
- Player detail wraps hero/mobile/trading-tab action handlers.
- Manager wraps Kader sell/cancel callbacks passed into `KaderTab`.

Future UX polish can replace visible CTAs with disabled explanatory copy, but the P1 compliance/execution gap is closed now.
