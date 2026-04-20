# Slice 114 — Backfill ipo_price Flat-Defaults (Slice 108/111 Follow-up)

## Ziel (1 Satz)
Alle bestehenden Players + aktiven IPOs mit Flat-Default `ipo_price = 10000 cents` auf CEO-Formel `FLOOR(MV_EUR / 10)` umstellen, **inkl. der 3.596 laufenden IPOs** — da der einzige Käufer (Livan Burcu Card) als Early-Bird seine Card behält (Option X3).

## CEO-Approval
- Anil 2026-04-20 "b" (Option B — Backfill laufende IPOs trotz User-Impact)
- Anil 2026-04-20 "x3" (Livan Burcu: User behält Card, ipo_price wird upgedatet, `initial_listing_price` bleibt historisch immutable)

## Root-Cause

Slice 111-Audit zeigte dass 85,5% aller Players auf Flat-Default `ipo_price = 10000` waren. Pre-Check zeigte:
- 3.596 aktive IPOs alle flat-priced
- Nur 1 IPO mit sold>0 (Livan Burcu, Union Berlin, MV 4M€)
- 409 Pre-IPO-Players ohne Trades/Holdings mit Drift
- Gesamtverlust bei 100% sell-out der 3.195 ohne-Käufer IPOs: ~3 Mio € Potential-Pool-Revenue-Underpricing

## 3-Phasen-Fix

| Phase | Scope | Count | Mechanismus |
|-------|-------|-------|-------------|
| 1+2 | Active IPOs flat-priced | 3.195 | `UPDATE ipos.price` → Trigger `sync_player_ipo_price` cascaded → `players.ipo_price` automatisch |
| Post-Sync | floor_price sync | same | Separate UPDATE: `floor_price = ipo_price` für Players ohne aktive sell-orders |
| 3 | Pre-IPO Players | 409 | Direct UPDATE `players.ipo_price + floor_price` (keine IPO → keine Trigger-Cascade) |

## Snapshot-Table (Rollback-Basis)

`_slice114_backfill_snapshot` — permanent, enthält:
- snapshot_id, snapshot_phase ('ipo_flat_priced' | 'player_pre_ipo')
- player_id, ipo_id (NULL bei Phase 3)
- old_ipo_price_cents, old_player_ipo_price_cents, old_player_floor_price_cents
- new_price_cents, mv_eur, sold_at_snapshot

## Safeguards

**Phase 1+2 WHERE:**
- `status IN ('announced', 'early_access', 'open')` — nur aktive Tranchen
- `price = 10000` — nur Flat-Defaults, keine bereits manuell-Preisten
- `p.market_value_eur > 0` — keine Formel-Ableitung bei MV=0
- `p.is_liquidated = false` — liquidated players untouchable

**Phase 3 WHERE:**
- MV > 0
- NOT EXISTS active IPO (sonst Drift zu ipos.price)
- NOT EXISTS trades (Market-Historie → immutable)
- NOT EXISTS holdings with qty > 0 (User-Holdings → immutable)
- `ipo_price != FLOOR(MV/10)` — keine no-op Updates

## Livan Burcu Early-Bird (X3)

Der einzige IPO-Käufer vor dem Backfill:
- User kaufte 1 Card für 10.000 cents (= 100 $SCOUT = 1 €)
- MV des Spielers: 4.000.000 € → Formel: 400.000 cents = 4.000 $SCOUT = 40 €
- X3-Entscheidung: `ipos.price` wird auf 400.000 upgedatet (Trigger sync → `players.ipo_price` = 400.000)
- `initial_listing_price` bleibt 10.000 (IMMUTABLE via `trg_set_initial_listing_price`)
- User behält Card → 40× unrealisierter Gewinn als Early-Bird-Bonus

## Acceptance Criteria

1. Post-Migration: 0 active IPOs mit `price != FLOOR(MV/10)` (MV>0, is_liquidated=false).
2. Post-Migration: 0 Pre-IPO Players mit Drift.
3. `_slice114_backfill_snapshot` enthält alle 3.604 pre-update Werte.
4. Livan Burcu `ipos.sold = 1` unverändert (User behält Card).
5. Livan Burcu `initial_listing_price = 10000` unverändert (historischer Einstieg).
6. Rollback-Query funktioniert (nicht durchgeführt, aber als Proof-Comment dokumentiert).

## Proof-Plan

- `worklog/proofs/114-backfill-verification.txt` — Invariant-Report + Scale-Check + Livan-Detail + Rollback-Query

## Scope-Out

- 604 Players mit MV=0 bleiben auf Flat-Default (Placeholder-Regel bis MV bekannt)
- 191 Players mit Trades/Holdings bleiben unverändert (immutable per Market-History)
- Neu-Imports laufen bereits Formel-konform via Slice 111
