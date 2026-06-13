# Slice 303 — Floor-Price Source-of-Truth Consolidation (S7 Phase-2 #1)

**Slice-Type:** Migration + Service + UI (Money-Path)
**Größe:** L
**CEO-Scope:** JA (Money-Display + Money-Daten-Mutation — Anil approved 2026-06-13)
**Datum:** 2026-06-13

---

## 1. Problem-Statement

S7-Registry-Befund #1 (höchster Hebel projektweit): Der Spieler-Floor-Preis wird **5–6 Mal divergierend berechnet**, keine Client-Variante repliziert die DB-Formel `recalc_floor_price`. `resolveBuyPriceCents` treibt die **tatsächlich angezeigte Kaufsumme** im BuyConfirmModal. Trending-Strip vs Markt-Liste zeigen **2 verschiedene Floors für denselben Spieler auf /market**.

Tiefen-Diagnose (Health-Check, evidence):
- **3310/4556 (73 %)** `players.floor_price` divergieren von der Kanon-Formel — ABER der gespeicherte Wert ist der **bessere** (untradet = IPO-Preis; getradet = recalc-gepflegt).
- Root-Cause: **`last_price` ist Seed-Müll** — 3870 Spieler `last_price=10000` (nur 15 mit echten Trades), 496 auf `0`. Die `recalc_floor_price`-`last_price`-Fallback-Branch ist dadurch **vergiftet** → ein naiver Backfill hätte 3310 Floors auf 100 $SCOUT zerschossen.
- `last_price` ist **NOT NULL** (Dry-Run) → De-Poison via `= 0` (existierender „nie getradet"-Sentinel), kein Schema-Change.
- `cancel_order` ruft `recalc_floor_price` **nicht** → Stornieren der billigsten Sell-Order lässt Floor zu niedrig stehen.

## 2. Lösungs-Design — 3 Teile, DB-Fundament zuerst

**Teil A — Daten-Hygiene (DB-Migration):** `UPDATE players SET last_price=0 WHERE <untraded> AND last_price<>0` (~4351 Zeilen, 202 getradete unberührt). De-poisoned die Kanon-Formel → `floor_price` und Formel stimmen überein → künftige Backfills sicher. `centsToBsd(0)=0`, Consumer guarden `>0` → „letzter Trade" wird bei untradeten korrekt versteckt (statt irreführendem 100-$SCOUT-Seed).

**Teil B — `cancel_order` Recalc-Fix (DB-Migration):** `recalc_floor_price(player_id)` am Ende von `cancel_order` aufrufen (+ ggf. `cancel_buy_order` prüfen — buy-Orders beeinflussen Sell-Floor NICHT, also nur `cancel_order`). Schließt die Stale-Low-Lücke.

**Teil C — Code-Konsolidierung (Service+UI):** Alle Floor-Reader lesen `players.floor_price` (via `player.prices.floor`):
- `computePlayerFloor` (`playerMath.ts`): wird zur reinen `prices.floor`-Rückgabe ODER die 6 Konsumenten lesen direkt `prices.floor`.
- `enrichPlayersWithData` (`enriched.ts:62-67`): Floor-Recompute aus orders entfernen, `prices.floor` (= DB-Canon) nutzen.
- `resolveBuyPriceCents` (`marketContent.priceCents.ts`): Floor-Branch auf `prices.floor` (cents) vereinheitlichen, ×100-Mapper-Risiko dokumentieren/kapseln.
- `getFloorPricesForPlayers` (`fixtures.ts:644`): bleibt reiner `players.floor_price`-Read (Canon-Spiegel), Map-Miss → expliziter Fallback statt stiller 0.
- Trending (`trading.ts:404`) + Markt-Liste → **gleiche** Floor-Quelle.

Optimistische Anzeige nach Trade/Order kommt aus der **RPC-Response** (liefert neuen Floor), nicht aus Client-Recompute.

## 3. Betroffene Files

| File | Teil | Änderung |
|------|------|----------|
| `supabase/migrations/<ts>_slice_303_last_price_hygiene.sql` | A | UPDATE untraded last_price=0 |
| `supabase/migrations/<ts>_slice_303_cancel_order_recalc.sql` | B | `recalc_floor_price` in `cancel_order` |
| `src/lib/playerMath.ts` | C | computePlayerFloor → prices.floor |
| `src/lib/queries/enriched.ts` | C | Floor-Recompute raus |
| `src/features/market/components/marketContent.priceCents.ts` | C | resolveBuyPriceCents Floor-Branch |
| `src/features/fantasy/services/fixtures.ts` | C | getFloorPricesForPlayers Map-Miss-Fallback |
| ~15 Konsumenten von `computePlayerFloor`/`prices.floor` | C | auf single source |

## 4. Code-Reading-Liste (Pflicht VOR Implementation)

| # | File | Frage | Status |
|---|------|-------|--------|
| 1 | DB `recalc_floor_price` | exakte Formel | ✅ `LEAST(minSell, ipo)→last_price>0→keep` |
| 2 | DB Caller von recalc | wer ruft es? | ✅ buy_player_sc, buy_from_order, place_sell_order, expire_pending_orders (NICHT cancel_order) |
| 3 | `playerMath.ts:14-21` | computePlayerFloor Logik | listings.min → prices.floor ?? 0 |
| 4 | `enriched.ts:62-84` | Floor-Recompute aus orders | Math.min(orders) → prices.floor → ipo → 0 |
| 5 | `marketContent.priceCents.ts:29-40` | resolveBuyPriceCents (treibt Kaufsumme!) | ipoPriceCents → min(listings)*100 → floorBsd*100 |
| 6 | `players.ts:159-161,189-228` | centsToBsd + dbToPlayer prices | centsToBsd(0)=0; prices.floor=centsToBsd(floor_price) |
| 7 | Consumer von `prices.lastTrade` | null/0-Guards | ✅ BestandRow `>0`, TopMovers floor-first |
| 8 | DB `cancel_order` body | wo recalc einfügen | am Ende nach status-update |

## 5. Pattern-References

- S7-Registry `worklog/audits/2026-06-13/s7-source-of-truth-registry.md` Domäne 1+3.
- errors-db.md „Money-RPC Pricing-Formel Drift (Slice 108)" — Floor-Formel = DB-Body einzige Wahrheit.
- errors-db.md „CREATE OR REPLACE FUNCTION PATCH-AUDIT PFLICHT (Slice 156)" — cancel_order vorher pg_get_functiondef.
- errors-frontend.md „Data-Format vs Component-Expectation Drift" — Component liest eine Quelle.
- AR-44 REVOKE/GRANT bei RPC-CREATE-OR-REPLACE.

## 6. Acceptance Criteria

- **AC-1** [A] Nach Hygiene: 0 untradete Spieler mit `last_price NOT IN (0)`. VERIFY SQL.
- **AC-2** [A] Divergenz floor_price vs Kanon-Formel < 5 % (war 73 %). VERIFY: re-run Health-Check.
- **AC-3** [A] 202 getradete Spieler `last_price` unverändert. VERIFY: vorher/nachher-Snapshot getradeter Subset.
- **AC-4** [B] `cancel_order` Body enthält `recalc_floor_price`. VERIFY: `pg_get_functiondef`.
- **AC-5** [B] Funktional: Sell-Order platzieren (floor sinkt) → stornieren → floor steigt zurück. VERIFY: SQL-Smoke.
- **AC-6** [C] `grep computePlayerFloor src/` → nur noch playerMath-Definition + ggf. 1 zentraler Reader (keine 6 divergierenden). VERIFY grep.
- **AC-7** [C] tsc 0 + alle Market/Player-Domain-Tests grün.
- **AC-8** [C] Trending-Strip + Markt-Liste zeigen identischen Floor pro Spieler. VERIFY: Live/DOM oder Test.
- **AC-9** [C] BuyConfirmModal-Preis = `players.floor_price` (kein listings-Recompute-Divergenz). VERIFY: resolveBuyPriceCents liest prices.floor.

## 7. Edge Cases

| # | Case | Verhalten |
|---|------|-----------|
| 1 | Untradeter Spieler, last_price=10000 Seed | → 0; floor bleibt IPO-Preis; „letzter Trade" versteckt |
| 2 | Getradeter Spieler, last_price=10000 (15 St.) | unberührt (hat Trades) |
| 3 | Spieler mit offener Sell-Order | floor_price = recalc (place_sell_order rief es) — bereits korrekt |
| 4 | Spieler mit aktiver IPO | floor_price = LEAST(minSell, ipo) — korrekt |
| 5 | cancel billigste Sell-Order | nach Fix: floor steigt zurück auf nächst-min/ipo/last |
| 6 | centsToBsd(0) | = 0, Consumer guarden >0 |
| 7 | 3 untradete Nicht-Seed-last_price | → 0 (akzeptiert, kein echter Trade) |
| 8 | Map-Miss in getFloorPricesForPlayers | expliziter Fallback statt 0 |

## 8. Self-Verification Commands

```bash
# A: Hygiene-Verify
# (SQL) untraded last_price != 0 count → 0
# (SQL) divergence re-check → <5%
# C: keine divergierenden Floor-Recomputes mehr
grep -rn "computePlayerFloor\|Math.min.*listings\|Math.min.*orders.*price" src/ --include="*.ts" --include="*.tsx" | grep -v __tests__
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/features/market src/lib/queries/__tests__ src/components/player src/lib/__tests__/playerMath*
```

## 9. Open-Questions

- **[CEO approved]** last_price=0-Hygiene auf Money-Daten — Anil „J" 2026-06-13.
- **[Autonom]** computePlayerFloor löschen vs zu prices.floor-Passthrough machen — CTO wählt: behalten als dünner `(player) => player.prices.floor` Passthrough (minimiert Call-Site-Churn), Doku dass DB-Canon die Wahrheit ist.
- **[Autonom]** ×100-Mapper in resolveBuyPriceCents — kapseln + Test, nicht entfernen (Listing.price ist BSD, floor_price ist cents — Konvertierung bleibt nötig).

## 10. Proof-Plan

`worklog/proofs/303-floor-consolidation.txt`: Hygiene vorher/nachher-Counts · Divergenz vorher 73 % / nachher <5 % · `pg_get_functiondef(cancel_order)` zeigt recalc · cancel-Smoke (floor sinkt→steigt) · grep computePlayerFloor · tsc 0 · vitest grün.

## 11. Scope-Out

- KEINE Konsolidierung anderer Semantiken (L5, rating, 24h-change) — eigene S7-Phase-2-Slices.
- KEINE `last_price`-Schema-Änderung (bleibt NOT NULL, Sentinel 0).
- KEINE neue Floor-Formel — DB `recalc_floor_price` bleibt unverändert die Wahrheit (nur Caller-Erweiterung cancel_order).
- KEIN naiver recalc-Backfill (würde untradete Floors zerschießen — bewusst NICHT).

## 12. Stage-Chain (geplant)

SPEC → IMPACT (in Spec integriert: Call-Site-Karte + recalc-Caller + Consumer-Guards verifiziert) → BUILD (A→B→C, DB zuerst) → REVIEW (reviewer-Agent PFLICHT, Money) → PROVE → LOG.

## 13. Pre-Mortem

1. **Hygiene erwischt getradete Spieler** → mitigiert: WHERE via LEFT JOIN trades, 202 untouched verifiziert.
2. **last_price=0 bricht Consumer** → mitigiert: centsToBsd(0)=0, Guards `>0` verifiziert (§4 #7).
3. **cancel_order CREATE OR REPLACE revertiert Patches** → mitigiert: pg_get_functiondef VOR Edit (Slice-156-Regel), nur recalc-Zeile addieren.
4. **Floor-Konsolidierung ändert sichtbare Preise** → mitigiert: floor_price ist bereits der Wert auf den Clients zurückfallen → display-neutral; AC-8/9 verifizieren.
5. **resolveBuyPriceCents ×100-Drift** → mitigiert: Konvertierung kapseln + Test, nicht entfernen.
6. **recalc in cancel_order doppelt bei buy-order-cancel** → mitigiert: nur `cancel_order` (sell), nicht `cancel_buy_order`.
