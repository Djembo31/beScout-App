# Active Slice

```
status: in-progress
slice: 368f
title: DROP initial_listing_price (redundant nach D101) — Phase 1 Code-Reader entfernen, Phase 2 DROP COLUMN deploy-gated
stage: BUILD
size: S
slice-type: Service + Type + Migration
spec: inline — S305/324 Column-DROP-Pattern. initial_listing_price ist seit 368e/D101 redundant (= Spiegel von ipo_price, 0 funktionale Reader). 4-Achsen-Check: src (players.ts SELECT_COLS+Mapper, types 2 Felder, players.test Fixture, e2e sql) — KEINE scripts/messages-Treffer.
impact: nur players-Loader (PLAYER_SELECT_COLS). Phase 1 = Code-Reader raus (deploybar, select greift dann nicht mehr auf Spalte zu). Phase 2 = Trigger-Rewrite (Sentinel ilp IS NULL → NOT EXISTS andere ipo) + DROP COLUMN, ERST nach Deploy von Phase 1 (sonst bricht Live-Select).
proof: (Phase 2)
review: self-review (S305/324 Pattern-Wiederholung, display-only, money byte-identisch) — Reviewer falls Phase-2-Trigger heikel.
next: Phase 1 commit+push → Deploy abwarten → Phase 2 Migration + 368e-Playwright.

--- 368e (vorheriger Slice, DONE) ---
prev-slice: 368e
prev-title: ✅ DONE — Markteintritt-Modell (D101) + Daten-Reparatur
prev-stage: LOG complete · commit 7a3b302f
prev-proof: worklog/proofs/368e-markteintritt-model.txt
prev-review: worklog/reviews/368e-review.md (CONCERNS → MEDIUM geheilt)

--- erledigt diese Session ---
368c DONE (committed 1dcff8bd): Floor-Band ÷3..×3 + Floor-Quelle + Label (Teil).
368d DONE: BuyModal „Gesamt"-Wahrheit (Menge/Preis an aktive Order, 3×11=33-Lüge weg). Reviewer PASS. proof/review da.
DATEN-FIX (E2E-entdeckt, Anil-flagged): 19 grobe Preis-Ausreißer → MV/1000 (ipo+ipos+last+floor), Douglas 10→500 live-verifiziert. + 2964 initial_listing_price → MV/1000 (Scope-Overreach, jetzt von 368e koordiniert). → 368e konsolidiert auf 1 Quelle.

--- 368c (vorheriger Slice, DONE) ---
prev-slice: 368c
prev-title: ✅ DONE — Floor-Orderbuch transparent + manipulationssicher (Preis-Band ÷3..×3 + Floor-Quelle + Label-Vereinheitlichung)
prev-stage: LOG complete
size: M
slice-type: Migration (Money-RPC) + Service + UI
spec: worklog/specs/368c-floor-orderbook-transparency.md
impact: worklog/specs/368c-floor-orderbook-transparency.md §3+§4 (place_sell_order Consumer + Floor-Label-Stellen grep-verifiziert)
proof: worklog/proofs/368c-floor-band.txt (Live-Reject/Pass/Boundary-Smoke + AC1 cap/9 + AC9 Money-Pfad unberührt + Grants). Playwright-Sublabel offen post-Deploy (AC7).
review: worklog/reviews/368c-review.md (reviewer PASS, 3 LOW, alle nicht-blockierend)
next: 369 /api/push→500, dann 370 E2E-Sweep ②–⑤
```

## CEO-Entscheid (2026-06-24, Anil)
- Anti-Manipulation = **symmetrisches Preis-Band beim Order-Erstellen**: min = Anker÷3, max = Anker×3 (Cap existiert schon). Faktor **÷3** bestätigt.
- Umsetzung: `get_price_floor = get_price_cap ÷ 9` (kohärent: cap = 3×Referenz → floor = Referenz÷3 = cap÷9). Reuse der reviewten Cap-Logik.
- Sybil (mehrere Accounts im Ring A→B→C→A) = **separater späterer Slice** (braucht Identitäts-/Geräte-Signale, Phase-2-relevant, Credits Phase 1 = wertloses Spielgeld).

## Schon existierender Schutz (Live-verifiziert, NICHT neu bauen)
- Selbst-Handel blockiert (buy_from_order/buy_player_sc/accept_offer: `user_id != buyer` / „Eigene Order").
- Reziprok-Ping-Pong A↔B blockiert (`v_circular_count`, 7 Tage).
- Max 20 Trades/Spieler/24h · Max 10 Orders/Spieler/h · Preis-OBERgrenze 3×Anker · Club-Admin-Handelsverbot.

## Zuletzt
- **Slice 368b** (2026-06-24) — RewardsTab-Anzeige-Wahrheit (M, PASS, live).
- **Slice 368a** (2026-06-24) — Scout-Card-Wertmodell als Kanon (D100, XS, PASS).
