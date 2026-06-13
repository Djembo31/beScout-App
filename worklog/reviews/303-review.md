# CTO Review: Slice 303 — Floor-Price Source-of-Truth Consolidation (MONEY-PATH)

## Verdict: PASS

Gut ausgeführte Money-Path-Konsolidierung. Der Headline-Risiko (naiver `recalc`-Backfill zeroing 3310 Floors auf den 100-$SCOUT-Seed) wurde korrekt als Root-Cause erkannt und vermieden — der `last_price`-Hygiene-Ansatz ist der richtige Move. DB-Canon ist jetzt single source of truth über alle 6 ehemals divergierenden Reader. Keine CRITICAL/REWORK-Findings. 3 MINOR Cleanliness/Doc-Drift + 1 pre-existing-Edge (AC-9 leicht über-claimt).

## Spec-Coverage
- [x] Teil A Hygiene-Migration — untraded last_price=0, 202 traded untouched (AC-1/2/3 proven)
- [x] Teil B cancel_order → PERFORM recalc_floor_price (AC-4, PATCH-AUDIT clean)
- [x] Teil C computePlayerFloor → prices.floor (AC-6 grep clean)
- [x] Teil C enrichPlayersWithData — floor-recompute removed (AC-6)
- [x] Teil C resolveBuyPriceCents — listings-branch removed, ×100 mapper kept + tested (AC-9 mostly)
- [x] Teil C trading.md single-source rewrite
- [x] Teil C 5 Tests angepasst — echte Verhaltens-Assertions, nicht "grün gemacht"
- [~] getFloorPricesForPlayers Map-Miss (EC-8): NICHT geändert — liest bereits Canon-Spalte direkt; korrekt belassen.

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW (pre-existing) | marketContent.priceCents.ts / buy_player_sc | Display-Floor = MIN(sell) inkl. eigener Orders; buy_player_sc bucht günstigste Order **anderer** User (`user_id != p_user_id`). Wenn Käufer selbst günstigster Lister → Modal zeigt evtl. niedrigeren Preis als gebucht. **Pre-existing** (alte Math.min(listings) hatte denselben Gap, schlimmer). 303 macht Display *näher* an Charge. | trading.md-Doc-Note; optional future: eigene Orders aus Display-Floor excludieren. Kein 303-Blocker. |
| 2 | MINOR | KaderTab.tsx:191-194 | `hasListings` jetzt dead (nur alte Floor-Chain nutzte es); Kommentar beschreibt alte listings-min-Chain | dead var entfernen, Kommentar auf „303: kanonische prices.floor" |
| 3 | MINOR | trading.md Post-Trade-Refresh | Residual `enrichPlayers(...)` „Floor client-seitig neu berechnen"-Snippet würde neuer Single-Source-Regel widersprechen | greppen + angleichen |
| 4 | NIT | MarketContent.tsx:281 | `listings` @deprecated im Interface, aber Call-Site übergibt es noch (harmlos, ignoriert) | Call-Site-Arg droppen |

## Journal-Review
- Entscheidungen sinnvoll: JA. (a) computePlayerFloor als thin prices.floor-Passthrough minimiert Call-Site-Churn über 6 Consumer; (b) ×100-Mapper in resolveBuyPriceCents behalten (8 Tests) preserved Slice-033-Money-Display-Lock. Root-Cause (last_price-Seed-Poisoning) war die harte Erkenntnis, korrekt genagelt.
- Gescheiterte Ansätze sauber verlassen: JA. Naiver recalc-Backfill explizit rejected (Scope-Out §11, Pre-Mortem #1), nie gebaut.
- PATCH-AUDIT (Slice 156): korrekt. cancel_order-Body aus live pg_get_functiondef erhalten (auth-guard, FOR UPDATE, alle Guards intakt); nur Inline-Floor-UPDATE → PERFORM recalc_floor_price. AR-44 REVOKE/GRANT re-asserted. Single signature (uuid,uuid).

## Positive
- Root-cause-first (feedback_root_cause_eifer.md). Der Health-Check (last_price=10000 seed-müll, 3855× ohne Trades) machte die Konsolidierung *sicher* — ein lesser impl hätte recalc über alle laufen lassen und 3310 Floors zeroed (Yamal 200.000 → 100). Money saved.
- Hygiene NULL-trap-safe: `NOT IN (SELECT player_id FROM trades WHERE player_id IS NOT NULL)`. AC-3 (traded sum 8.347.832 identisch pre/post) = korrekte Invariante.
- Konsolidierung schließt Home↔Manager Portfolio-Wert-Divergenz (Slice 289 F-1 / 290) by construction.
- Canon-Formel gegen live DB-Body verifiziert — kein Doc-vs-DB-Drift.
- Tests ehrlich (assertieren floor_price gewinnt über min(listings)).
- AC-8 source-verifiziert: Trending (row.floor_price) + Market-Liste (centsToBsd(floor_price)) = identische Spalte → „2 Floors für 1 Spieler" weg.

## Learnings für Knowledge Capture
- errors-db.md-Kandidat „Seed-Wert-Poisoning in Fallback-Formel-Branch": NOT-NULL-Sentinel-Spalte mit plausiblem Seed (10000) vergiftet jede Canon-Formel die ihn als Fallback nutzt. Detection `GROUP BY col HAVING COUNT(*)>N`. Fix: untraded → Sentinel (0) *vor* Formel-Vertrauen. Pattern-Familie Slice 081 Scraper-Default-Poisoning.
- Pattern (money-display) „Display-Floor vs Charge-Price asymmetry from own-order inclusion": Display-Konsolidierung auf DB-Spalte garantiert NICHT display==charge wenn Charge-RPC anderes WHERE hat (`user_id != p_user_id`). Bei „displayed==charged"-Claim immer Buy-RPC-WHERE verifizieren. (F-1.)

## time-spent
~34 min
