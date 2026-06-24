# Review — Slice 368c (Floor-Orderbuch transparent + manipulationssicher)

**Reviewer:** reviewer-Agent (Cold-Context, READ-ONLY) · **Datum:** 2026-06-24 · **Time-spent:** 14 min
**Verdict:** **PASS** — merge-fähig.

## Kern-Checks (Money/Security)
1. **Kein Patch-Verlust** beim `place_sell_order` CREATE OR REPLACE — Idempotency, holding_locks, Abo-Rate-Limit, `recalc_floor_price`, auth-Guard alle erhalten; Floor-Block rein additiv (D87 Live-Baseline eingehalten).
2. **Money-Pfad unberührt** — Proof zeigt `buy_player_touched=false`, `buy_order_touched=false`. Fees/recalc unverändert.
3. **Security (AR-44) korrekt** — `get_price_floor` anon+PUBLIC REVOKEd, `place_sell_order`-ACL erhalten (kein anon-Leak).
4. **Floor-Logik** cap/9 = Anker/3 Band korrekt; Edge floor=0 fail-open ok.
5. **i18n** minPriceExceeded via mapErrorToKey-Pfad (kein Raw-Key-Leak).
6. **business.md** Labels/Tooltips compliance-konform (kein Securities/Rendite-Framing).

## Findings (3 × LOW, nicht-blockierend)
- **#1 LOW — floorSource-Drift (PlayerContent.tsx):** Ableitung `allSellOrders.length>0 → 'order'`. In Praxis korrekt durch DB-COALESCE-Kaskade in `recalc_floor_price` (MIN open sell → ipo → last). Akzeptiert; strikte MIN==floor-Prüfung wäre Over-Engineering bei nicht-expired-gefilterten Orders.
- **#2 LOW — floorPriceTooltip (orphan?):** pre-existing, nicht von 368c verursacht (Tooltip-Text aktualisiert, Nutzung unverändert).
- **#3 LOW — clubSaleFixed „Club Sale":** pre-existing englischer Begriff, nicht 368c-Scope.

## Offen (legitim, post-Deploy)
- AC7 Playwright-Sublabel-Proof gegen bescout.net nach Vercel-Deploy (offene Order → „Günstigstes Angebot" / keine → „Letzter Verkauf").
