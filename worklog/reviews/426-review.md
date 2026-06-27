# Slice 426 Review — Orphan-Cleanup alte Lineup-Builder-UI (S280)

**Review-Typ:** self-review (Ops-Lane — Dead-Code-Removal, kein Behavior/Money/Security/User-facing-Change; objektiver Beweis statt Cold-Context-Meinung).
**Verdict: PASS**

## Warum self-review zulässig (workflow.md §3a Ops/Tooling-Spur)
Reine Löschung verwaister Komponenten. Kein Live-File editiert (`git diff` = 7 Deletions, 0 Modifications). Der Beweis ist **objektiv-maschinell**, nicht interpretativ:
- `tsc --noEmit` = 0 → kein Consumer hatte einen Import auf die 6 (hätte hart gefehlt).
- `pnpm audit:orphan` = Real drift 0, „No orphan components" → die 6 weg, keine neuen erzeugt.
- vitest fantasy/manager/components 317/317 grün → kein Test referenzierte die 6.

## Cascade-Closure (S280 Pflicht)
Verifiziert vor Löschung: alle externen Imports der 6 (`FantasyPlayerRow`, `PickerSortFilter`, `FDRBadge`, `constants`, `queries`, `helpers`, `clubs`, `types`) haben Live-Consumer außerhalb der 6 (`LineupPanel`, `useLineupPanelState`, `lineupStore`, `ClubFixturesStrip`) → **keine transitive Orphan-Kaskade**. `audit:orphan` post-Delete bestätigt (Real drift 0). Barrel `index.ts` = 0 Importer → mitgelöscht. `BenchRow` (Live via Subpath) bewusst behalten.

## AC-Coverage
- AC1 ✓ 7 Files gelöscht, BenchRow.tsx übrig (`ls lineup/`).
- AC2 ✓ tsc 0.
- AC3 ✓ audit:orphan Real drift 0.
- AC4 ✓ vitest 317/317 (Bereich, der die 6 referenzieren könnte); volle Suite in CI.
- AC5 ✓ git diff = nur Deletions (1541 -), 0 Live-Edits.

## Findings
Keine. Reine, geschlossen-verifizierte Dead-Code-Removal.

## Summary
1541 Zeilen toter Doppel-UI entfernt (D111-Wurzel #1). Beseitigt die „falsche-Surface"-Falle, die in Slice 424/425 zuschlug. **PASS.**
