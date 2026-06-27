# Slice 426 — Orphan-Cleanup: alte Lineup-Builder-UI löschen (S280)

**Slice-Type:** Doc/Refactor (Dead-Code-Removal)
**Größe:** S
**Status:** SPEC
**CEO-Scope:** Nein (Dead-Code-Removal, kein Behavior-/Money-/User-facing-Change). CTO-autonom.

## 1. Problem-Statement (Evidence)

Slice 425 deckte auf: die komplette **alte** Lineup-Builder-UI existiert doppelt. `LineupPanel.tsx` + `useLineupPanelState.ts` (live) ersetzen sie, aber die Alt-Komponenten wurden nie gelöscht (D111-Wurzel #1 „von allem zwei"). Verifiziert **0 Live-Consumer**:

```
<LineupBuilder>     : 0 JSX-Render-Sites (nur Selbst-Import in LineupBuilder.tsx)
<ScoreBreakdown>    : nur in LineupBuilder.tsx:286 (= im toten LineupBuilder)
<SynergyPreview>    : nur in LineupBuilder.tsx:18 (import, kein Live-Render)
<PitchView>         : 0 Consumer außer LineupBuilder
<PlayerPicker>      : 0 Consumer außer LineupBuilder
<FormationSelector> : 0 Consumer außer LineupBuilder
Barrel index.ts     : 0 Importer (alle Consumer nutzen Subpath)
```

**Konkreter Schaden:** der 424-Review nannte `ScoreBreakdown` als Fix-Ziel — falsch, weil tot; Slice 425 musste mid-BUILD auf `LineupPanel` umlenken. Toter Doppel-Code = wiederkehrende „falsche-Surface"-Falle + Bundle-Ballast (S280 transitive Lib-Lock-In).

## 2. Lösungs-Design

Die 6 verwaisten Komponenten + das ungenutzte Barrel löschen. `BenchRow.tsx` bleibt (Live-Consumer `LineupPanel` via Subpath `lineup/BenchRow`).

## 3. Betroffene Files

| File | Aktion |
|------|--------|
| `lineup/LineupBuilder.tsx` | DELETE |
| `lineup/ScoreBreakdown.tsx` | DELETE |
| `lineup/SynergyPreview.tsx` | DELETE |
| `lineup/PitchView.tsx` | DELETE |
| `lineup/PlayerPicker.tsx` | DELETE |
| `lineup/FormationSelector.tsx` | DELETE |
| `lineup/index.ts` (Barrel) | DELETE (0 Importer) |
| `lineup/BenchRow.tsx` | BLEIBT (live via Subpath) |

## 4. Code-Reading-Liste (ERLEDIGT — Cascade-Closure)

1. `grep "<LineupBuilder\|<ScoreBreakdown\|..."` → 0 Live-Render-Sites. ✓
2. Lokale Imports der 6 = nur untereinander + geteilte Infra (FantasyPlayerRow, PickerSortFilter, FDRBadge, constants, queries, helpers, clubs, types) — **alle mit Live-Consumern außerhalb** (LineupPanel/useLineupPanelState/lineupStore/ClubFixturesStrip) → **keine transitive Orphan-Kaskade**. ✓
3. `PickerSortFilter`-Consumer: LineupPanel + useLineupPanelState + lineupStore (live). ✓ bleibt.
4. `FDRBadge`/`getClubAvgL5`-Consumer: ClubFixturesStrip + useLineupPanelState + FantasyPlayerRow (live). ✓ bleibt.
5. Test-Refs: `EventDetailModal.test.tsx:108` mockt `calculateSynergyPreview` (Funktion aus `@/types`, NICHT die Komponente); `synergy-preview.test.ts` importiert `calculateSynergyPreview from @/types`. → **kein Test referenziert die 6 Komponenten** → kein Test-Cleanup. ✓
6. Barrel `index.ts`: 0 Importer (kein `from '.../components/lineup'` ohne Subpath). ✓
7. `useLineupBuilder.ts` (Hook) ≠ `LineupBuilder.tsx` (Komponente) — Hook bleibt (live in EventDetailModal+AufstellenTab). ✓
8. `BenchRow.tsx`: Subpath-Consumer LineupPanel. ✓ bleibt.

## 5. Pattern-References

- **errors-frontend S280** — Dead-Wrapper mit transitiver Lib-Lock-In; Pre-Bundle-Refactor Orphan-grep inkl. `__tests__`; Wrapper+Test+Barrel+`optimizePackageImports` löschen.
- **D111-Wurzel #1** — Teil-Konsolidierung „von allem zwei".
- **S424** (Slice 425) — Surface-Verwechslung durch Orphan-Duplikat.

## 6. Acceptance Criteria

- **AC1:** Die 7 Files (6 Komponenten + Barrel) sind gelöscht; `BenchRow.tsx` existiert weiter. VERIFY: `ls lineup/`.
- **AC2:** `tsc --noEmit` 0 (kein gebrochener Import). VERIFY: `npx tsc --noEmit`.
- **AC3:** `pnpm audit:orphan` meldet keine NEUEN Orphans durch die Löschung (idealerweise 6 weniger). VERIFY: Script-Output.
- **AC4:** Volle vitest grün (keine Test bezog sich auf die 6). VERIFY: `CI=true vitest run`.
- **AC5:** Kein Live-Verhalten geändert — `git diff` zeigt NUR Deletions + Barrel (keine Edits an live Files). VERIFY: `git diff --stat` = nur Deletions.

## 7. Edge Cases

| Fall | Verhalten |
|------|-----------|
| Barrel-Re-Export eines gelöschten Symbols | Barrel ganz gelöscht (0 Importer) → kein dangling export |
| BenchRow nur via Barrel importiert? | Nein, via Subpath → BenchRow + sein File bleiben unberührt |
| Test mockt eine der 6? | Nein (nur `calculateSynergyPreview`-Funktion) → kein Test-Bruch |
| Transitiv-nur-genutzte Sub-Komponente | Keine — alle externen Imports haben Live-Consumer (Closure-Analyse #2) |

## 8. Self-Verification Commands

```bash
ls src/features/fantasy/components/lineup/          # nur BenchRow.tsx übrig
npx tsc --noEmit
pnpm audit:orphan
CI=true npx vitest run
git diff --stat                                     # nur Deletions
```

## 9. Open Questions

- Pflicht-Klärung: keine (reine Dead-Code-Removal, Anil-Wahl „Orphan-Löschung jetzt").
- Autonom-Zone: Barrel ganz löschen vs. auf BenchRow trimmen → Entscheid: **ganz löschen** (0 Importer).

## 10. Proof-Plan

`tsc 0` + `audit:orphan`-Output + volle vitest grün + `git diff --stat` (nur Deletions) → `.txt`.

## 11. Scope-Out

- `BenchRow.tsx` — bleibt (live).
- `useLineupBuilder.ts` / `useLineupSave.ts` — Hooks, live, unberührt.
- Live-Surface `LineupPanel.tsx` / `useLineupPanelState.ts` — unberührt.
- CEO-Forks (Admin-Gameweek-Engine / Ranking / Welle 3) — offen.

## 12. Stage-Chain (geplant)

SPEC ✅ → IMPACT `skipped (Dead-Code-Removal, 0 Consumer)` → BUILD (Delete) → REVIEW `self-review (Ops-Lane: Dead-Code, kein Behavior/Money/User-facing-Change; objektiver Beweis = audit:orphan + tsc + volle vitest)` → PROVE → LOG.

## 13. Pre-Mortem (kurz)

1. **Übersehener Consumer** → tsc fängt gebrochenen Import hart (AC2). Plus grep-Closure (0 Live-Render).
2. **Transitive Orphan-Kaskade** → Closure-Analyse #2 zeigt alle externen Imports haben Live-Consumer; `audit:orphan` post-Delete als Netz.
3. **Barrel-Importer übersehen** → grep 0 Importer (AC5 git-diff zeigt keine Live-Edit).
4. **BenchRow versehentlich mitgelöscht** → explizit BEHALTEN, Subpath-Consumer LineupPanel verifiziert.
