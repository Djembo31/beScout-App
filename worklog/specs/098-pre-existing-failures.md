# Slice 098 — Pre-existing Test-Failures: TURK-03 + useMarketData.floorMap

## Ziel
Die 2 pre-existing Test-Failures aus session-Start schließen. Full-Suite komplett grün.

## Bug 1: TURK-03 NFD-Normalisierung

**Root-Cause:** 5 Player-Rows in players.last_name sind in NFD-form gespeichert:
- `İslamoğlu` ist tatsächlich `I` (U+0049) + combining-dot (U+0307), nicht composed `İ` (U+0130)
- JS `'İslamoğlu'.includes('İ')` returnt false (codepoint mismatch)

**Affected Rows (5):**
- Youssef Enríquez Lekhedim
- Umut İslamoğlu
- Taha Emre İnce
- Orkun Kökçü
- Fırat İnal

**Fix:** NFC-normalize via SQL
```sql
UPDATE players SET last_name = normalize(last_name, NFC)
WHERE normalize(last_name, NFC) != last_name;
```

## Bug 2: useMarketData.floorMap Test Misalignment

**Root-Cause:** Test erwartet "no referencePrice fallback" (Slice-008-intent), aber
`computePlayerFloor` (playerMath.ts:20) hat den fallback noch drin durch Slice-052
DRY-extraction. Test assertion konfliktet mit aktuellem Code + playerMath.test.ts:26-28.

**Fix:** Test auf aktuelle Semantik aligned:
- Test `floorMap.get('p1')` erwartet jetzt `800` (referencePrice) statt `0`
- Comment dokumentiert Slice-052 Re-introduction

## Verification
- TURK-03: 10/10 turkish-handling Tests grün
- useMarketData: 25/25 Tests grün
- Full-Suite: **2617/2618 passed** (1 skipped), 0 failures

Erster Full-Suite-grün-Run seit heute morgen.
