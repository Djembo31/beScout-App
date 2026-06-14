# Slice 308 — IPO-Preis strikt aus ipo_price (S7 Trading-#4)

**Slice-Type:** Service (Money-Display)
**Größe:** S
**CEO-Scope:** Money-angrenzend (Display-Semantik, kein Fee/Preis-Logik-Change) — Anil-Batch-Auswahl 2026-06-14

---

## 1. Problem-Statement

S7-Registry Trading-#4 (P1, §3.7): `dbToPlayer` mappt `prices.ipoPrice = centsToBsd(db.ipo_price ?? db.floor_price)` (`players.ts:228`). Der `?? floor_price`-Fallback **vermischt Semantik**: ein Spieler OHNE echten IPO zeigt seinen Floor-Preis als „IPO-Preis". Registry-Ziel: IPO-Preis strikt aus IPO-Quelle, `null/undefined` wenn kein IPO.

## 2. Lösungs-Design

`players.ts:228`: `ipoPrice: centsToBsd(db.ipo_price ?? db.floor_price)` → `ipoPrice: db.ipo_price && db.ipo_price > 0 ? centsToBsd(db.ipo_price) : undefined`.

- `> 0`-Guard fängt sowohl `null` als auch `0` (kein IPO) → `undefined`.
- Typ `prices.ipoPrice?: number` (`types/index.ts:67`) ist bereits optional → kein Typ-Change, `undefined` matcht.
- Alle Consumer bereits null/0-guarded (verifiziert §4): RewardsTab `?? 0`+`>0`, TradingTab `? : undefined`, BestandView `?? null`, KaderTab nutzt `activeIpo.price` direkt (nicht prices.ipoPrice).

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/lib/services/players.ts` | Z.228 ipoPrice-Mapper: floor-Fallback raus |
| `src/lib/services/__tests__/players.test.ts` | +Test ipoPrice-Mapping (ipo>0→bsd, 0/null→undefined, kein floor) |

## 4. Code-Reading-Liste (✅ erledigt)

| File | Erkenntnis |
|------|-----------|
| `players.ts:228` | `ipo_price ?? floor_price` — Fallback nur bei NULL ipo_price; bei ipo_price=0 → centsToBsd(0)=0 |
| `types/index.ts:63-70` | `ipoPrice?: number` bereits optional → undefined ok |
| `RewardsTab.tsx:39,70` | `?? 0` dann `> 0`-Guard ✓ |
| `TradingTab.tsx:95,121` | `ipoPrice ? Math.round(*100) : undefined` ✓ |
| `BestandView.tsx:381` | `?? null` ✓ |
| `KaderTab.tsx:198` | nutzt `activeIpo.price` direkt, NICHT prices.ipoPrice → unbetroffen |
| `SearchOverlay.tsx:364` | `r.ipoPrice` = DbSearchResult-Shape (anderer Pfad), NICHT player.prices → unbetroffen |

## 5. Pattern-References

- S7-Registry §3.7 + Trading-Befund #4.
- errors-frontend.md „Data-Format vs Component-Expectation Drift" — Mapper erzwingt sauberen Contract (kein Raten/Fallback).
- Slice 303 (Floor-Konsolidierung) — Schwester-Befund: floor_price ist eigene Semantik, nicht IPO.

## 6. Acceptance Criteria

- **AC-1** `dbToPlayer` mit `ipo_price>0` → `prices.ipoPrice = centsToBsd(ipo_price)`. VERIFY: vitest.
- **AC-2** `ipo_price=0` ODER `null` → `prices.ipoPrice === undefined` (NICHT floor_price). VERIFY: vitest.
- **AC-3** Kein `?? floor_price`-Fallback mehr für ipoPrice. VERIFY: `grep "ipo_price ?? .*floor" players.ts` → 0.
- **AC-4** tsc clean + players/market/player-Domain-Tests grün (Consumer brechen nicht bei undefined).

## 7. Edge Cases

| Case | Verhalten |
|------|-----------|
| ipo_price > 0 | ipoPrice = centsToBsd(ipo_price) |
| ipo_price = 0 | undefined (kein IPO) |
| ipo_price = null | undefined |
| Consumer RewardsTab | `?? 0` → 0 → „kein IPO"-Branch |
| Consumer TradingTab PriceChart | undefined → kein IPO-Referenzlinie |

## 8. Self-Verification Commands

```bash
grep -n "ipo_price ?? \|?? db.floor_price\|?? floor" src/lib/services/players.ts
pnpm exec tsc --noEmit
CI=true pnpm exec vitest run src/lib/services/__tests__/players.test.ts src/components/player src/features/market
```

## 9. Open-Questions

- **[Autonom]** `undefined` statt `null` (matcht `ipoPrice?: number` ohne Typ-Change).
- **Scope-Note:** players.ipo_price ist der dokumentierte Mirror von ipos.price (§3.7). Dieser Slice entfernt nur den floor-Fallback; die Mirror↔Canon-Sync (ipo_price vs ipos.price) ist ein separater, tieferer Befund (nicht hier).

## 10. Proof-Plan

`worklog/proofs/308-ipo-price-strict.txt`: grep (kein floor-Fallback) · vitest (neue ipoPrice-Tests + Consumer-Domains grün) · tsc 0.

## 11. Scope-Out

- KEINE ipo_price↔ipos.price Mirror-Sync (separater Befund).
- KEINE Änderung an floor_price oder Fee-Logik.
- KEINE Admin-IPO-Erstellungs-Logik (AdminPlayersTab unberührt).

## 12. Stage-Chain (geplant)

SPEC → IMPACT skipped (1-Zeilen-Mapper, Consumer verifiziert guarded) → BUILD → REVIEW (Pflicht, money-adjacent) → PROVE → LOG.

## 13. Pre-Mortem

1. **Consumer bricht bei undefined** → mitigiert: alle 4 player.prices.ipoPrice-Consumer guarden (§4); undefined statt vorher number.
2. **Versteckter Math-Consumer** → mitigiert: grep zeigt nur geguardte Zugriffe; SearchOverlay/KaderTab nutzen andere Quelle.
3. **ipo_price=0 war vorher 0, jetzt undefined** → semantisch korrekt (0 = kein IPO), Consumer `?? 0`/`>0` identisches Ergebnis.
