# CTO Review: Slice 308 — IPO-Preis strikt aus ipo_price (S7 Trading-#4)

**Verdict: PASS** · reviewer-Agent (cold-context) · time-spent: ~9 min · 2026-06-14

## Spec-Coverage
- [x] AC-1: `ipo_price>0` → `centsToBsd(ipo_price)` (Tests)
- [x] AC-2: `ipo_price=0`/`null` → `undefined` (NICHT floor) (Tests Z.140-152)
- [x] AC-3: kein `?? floor_price`-Fallback mehr (players.ts)
- [x] AC-4: Typ-Safety — alle 5 Consumer geguardet

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | INFO | `enriched.ts:81` | `floor: p.prices.floor ?? p.prices.ipoPrice ?? 0` — von Spec §4 übersehener Consumer. **Benign**: `p.prices.floor`=`centsToBsd(db.floor_price)` ist NOT-NULL → `?? ipoPrice`-Branch ist dead, identisches Verhalten vor/nach 308. | Kein Fix (dead branch). Notiert. |
| 2 | NITPICK | `players.test.ts:255` | Stale Test-Name `'uses ipo_price as fallback...'` (Pre-308-Wortlaut). | ✅ **in-slice gefixt** (umbenannt + redundanten Zusatz-Test entfernt). |

## Detail-Verifikation
- **Typ sicher:** `prices.ipoPrice?: number` bereits optional → `undefined` matcht, tsc-Impact 0.
- **Consumer-Guards (5):** RewardsTab `?? 0`+`>0` · TradingTab `? Math.round : undefined` ·2 · BestandView `?? null` · enriched.ts dead-branch. **Kein ungeguardeter Math/Format-Consumer.**
- **Verwechslung:** KaderTab (`activeIpo.price`) + SearchOverlay (DbSearchResult.ipoPrice) sind andere Pfade — unbetroffen.
- **`> 0`-Guard:** fängt null/undefined/0/negativ als „kein IPO" — defensiv korrekt.
- **Compliance:** IPO-Wording unberührt; Fix verbessert Compliance (Floor wird nicht mehr fälschlich als IPO-/Erstverkaufs-Preis dargestellt).

## Positive
- Mustergültiger S-Slice: 1-Zeilen-Mapper + gezielte Regression-Tests (0/null→undefined, nicht floor) mit Pre-308-Kommentar.
- Inline-Kommentar erklärt WARUM + Consumer-Guard-Contract.
- Konsistent mit Nachbarfeldern (`initialListingPrice: ... ? : undefined`).

## Learnings
- **Process (Spec-Code-Reading):** Bei Mapper-Field-Änderungen IMMER auch `grep src/lib/queries/` (Enrichment-Layer) — leicht übersehener Consumer-Tier. enriched.ts war übersehen (hier benign, hätte aber bei nullable floor brechen können).
- errors-frontend.md „Data-Format vs Component-Expectation Drift" — positives Referenz-Beispiel: Mapper erzwingt Contract (`undefined`=kein IPO), statt mit `?? floor` zu raten.

## Summary
Sauberer, eng-skopierter Money-Display-Semantik-Fix. Typ-Wechsel sicher, alle Consumer geguardet, Compliance verbessert. 1 INFO (benigner übersehener dead-branch-Consumer) + 1 NITPICK (stale Test-Name, in-slice gefixt). PASS.
