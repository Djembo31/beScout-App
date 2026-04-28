# Slice 239 — Orphan-Cleanup-Wave (8× DELETE + 1× WIRE GameweekScoreBar)

**Größe:** M
**Slice-Type:** UI (multi-file delete + 1 component-wire)
**Datum:** 2026-04-28
**Bezug:** orphan-detector aktuell 9 real-drift. Anil-Decision: 8 löschen, GameweekScoreBar in PerformanceTab wiren.

## 1.1 Problem-Statement

`audit:orphan` zeigt 9 real-drift Components (Slice 228+242). Per-Component verifizierte Replacement-Coverage:

**8 sicher obsolet (DELETE):**
| # | Component | Replacement |
|---|-----------|-------------|
| 1 | `DpcMasteryCard` | `YourPosition` rendert Mastery mit Lv-Badge |
| 3 | `LimitOrderModal` | AR-23 aus Beta entfernt, FEATURE_LIMIT_ORDERS=false |
| 4 | `PlayerImagePlaceholder` | `PlayerPhoto` hat eingebauten fallback |
| 5 | `TradeSuccessEffect` | `feedback_no_confetti.md` Anti-Pattern |
| 6 | `HoldingsSection` | `SellModal` ist aktuelle Sell-UX |
| 7 | `IPOBuySection` | `BuyModal` hat IPO-flow integriert |
| 8 | `TransferBuySection` | `BuyModal` hat Transfer-flow integriert |
| 9 | `BuyOrderModal` (features/market) | AR-11 aus Beta entfernt, FEATURE_BUY_ORDERS=false |

**1 echte Lücke (WIRE):**
| # | Component | Wire-Plan |
|---|-----------|-----------|
| 2 | `GameweekScoreBar` (168L) | UNIQUE Bar-Chart-Visualization (per-GW Scores mit Threshold-Lines 65/100, Click→Detail-Modal). NICHT ersetzt durch MatchTimeline/StatsBreakdown. → Wire in `PerformanceTab.tsx` |

## 1.2 Lösungs-Design

**DELETE-Phase:**
1. `rm src/components/player/detail/DpcMasteryCard.tsx`
2. `rm src/components/player/detail/LimitOrderModal.tsx`
3. `rm src/components/player/detail/PlayerImagePlaceholder.tsx`
4. `rm src/components/player/detail/TradeSuccessEffect.tsx`
5. `rm src/components/player/detail/trading/HoldingsSection.tsx`
6. `rm src/components/player/detail/trading/IPOBuySection.tsx`
7. `rm src/components/player/detail/trading/TransferBuySection.tsx`
8. `rm src/features/market/components/shared/BuyOrderModal.tsx`

**WIRE-Phase:**
- `PerformanceTab.tsx`: import GameweekScoreBar, render in Tab-Body mit `scores={...}`-prop
- Daten-Source: `useScores(playerId)` hook ODER props passing aus PlayerContent

**Cleanup:**
- `scripts/orphan-component-detector.ts` KNOWN_ORPHANS: 4 → 1 (nur CommunityValuation deferred bleibt)
- Falls dead-imports entstehen: TS-Compiler fängt es

## 1.3 Betroffene Files

**Delete (8):**
- `src/components/player/detail/DpcMasteryCard.tsx`
- `src/components/player/detail/LimitOrderModal.tsx`
- `src/components/player/detail/PlayerImagePlaceholder.tsx`
- `src/components/player/detail/TradeSuccessEffect.tsx`
- `src/components/player/detail/trading/HoldingsSection.tsx`
- `src/components/player/detail/trading/IPOBuySection.tsx`
- `src/components/player/detail/trading/TransferBuySection.tsx`
- `src/features/market/components/shared/BuyOrderModal.tsx`

**Edit (2):**
- `src/components/player/detail/PerformanceTab.tsx` — import + render GameweekScoreBar
- `scripts/orphan-component-detector.ts` — KNOWN_ORPHANS reduzieren

**Side-effects (TS-Compiler-driven):**
- `src/components/player/detail/trading/index.ts` (Barrel) wenn vorhanden
- `src/features/market/components/shared/index.ts` (Barrel) wenn vorhanden
- Dead imports in PlayerContent.tsx wenn LimitOrderModal lazy-imported (verifizieren)

## 1.4 Code-Reading-Liste (VOR Implementation)

| File | Zweck | Frage |
|------|-------|-------|
| `src/components/player/detail/PerformanceTab.tsx` | Wire-Target für GameweekScoreBar | Welche props bekommt es? Wo Tab-Body? |
| `src/components/player/detail/GameweekScoreBar.tsx` | Source-Component | Welche props erwartet es (`scores: PlayerGameweekScore[]`)? |
| `src/components/player/detail/trading/index.ts` | Barrel-Export-File | Werden 3 Sections re-exportiert? |
| `src/lib/services/scoring.ts` | Type-Source | `PlayerGameweekScore`-Type definiert? |
| `src/app/(app)/player/[id]/PlayerContent.tsx` | Top-Caller | Holt es Scores? Hat Hook? |

## 1.5 Pattern-References

- **Slice 240** — Bulk-Delete + Archive (TM-once-off-scripts triage Pattern)
- **D46** Orphan-Component (Slice 228, 242) — automated detection
- **Slice 228** Erstes orphan-Detector Run identifizierte diese 9
- **D45** Hooks > Text-Regeln — Audit-CI-Gate fängt zukünftige Drifts

## 1.6 Acceptance Criteria

```
AC-01: 8 Component-Files gelöscht (git mv NOT git rm — preserves history)
AC-02: PerformanceTab importiert + rendert GameweekScoreBar mit korrekten props
AC-03: tsc --noEmit clean (keine dead-imports)
AC-04: Vitest run grün (kein Test-File auf gelöschte Components angewiesen)
AC-05: audit:orphan zeigt 0 real-drift (1 known-allowlisted: CommunityValuation)
AC-06: pnpm exec next build grün (Bundle-Budget weiterhin ok)
AC-07: KNOWN_ORPHANS in orphan-detector.ts reduziert auf 1 entry (CommunityValuation)
AC-08: Visual-Sanity check: PerformanceTab rendert GameweekScoreBar (oder Empty-State)
```

## 1.7 Edge Cases

| Case | Verhalten |
|------|-----------|
| Test-File für gelöschte Component existiert | TS-Error oder failed Test → mit löschen |
| Barrel-Export trading/index.ts hat 3 dead Re-Exports | Mit löschen oder filtern |
| LimitOrderModal in PlayerContent comment-out aber lazy-import | dynamic() Aufruf schon NICHT-mehr-aktiv (siehe line 40 + 325 commented) |
| GameweekScoreBar Wire braucht neuen Hook-Call | useScores oder existierende prop-passing |
| audit:orphan-detector erkennt Test-File-Pattern | Test-only-Filter ist schon in Slice 242 enabled |

## 1.8 Self-Verification Commands

```bash
# Pre-Edit Baseline
pnpm run audit:orphan 2>&1 | grep -E "real|known"
# erwartet: real-drift=9, known=4

# Post-Edit Verify
npx tsc --noEmit 2>&1 | tail -5
pnpm run audit:orphan 2>&1 | grep -E "real|known"
# erwartet: real-drift=0, known=1
pnpm exec vitest run --no-coverage 2>&1 | tail -3
# erwartet: alle pass

# Bundle-Budget
pnpm exec next build 2>&1 | tail -10
```

## 1.9 Open-Questions / Autonom-Zone

**Pflicht-Klärung Anil:** keine — Anil-Decision schon: 8d + #2w.

**Autonom-Zone (CTO):**
- GameweekScoreBar Wire-Position in PerformanceTab (oben/unten/zwischen): nach `MatchTimeline` und vor `StatsBreakdown` (chronologische Reihenfolge: Match-history → Score-bars → Stats-aggregate)
- Daten-Source: existing prop wenn PerformanceTab bereits PlayerGameweekScore bekommt, sonst neuer Hook

## 1.10 Proof-Plan

- `worklog/proofs/239-orphan-cleanup.txt` — Pre/Post audit:orphan + tsc + vitest + delete-list

## 1.11 Scope-Out

- **CommunityValuation** (deferred Slice 227 mit @experimental JSDoc) — bleibt KNOWN_ORPHANS
- **Tests für GameweekScoreBar** — wenn pre-existing dann lassen, sonst Backlog
- **Visual-QA gegen bescout.net** — post-deploy in nächster Session

## 1.12 Stage-Chain

SPEC → IMPACT (skipped: keine DB/RPC, multi-file delete + 1 wire) → BUILD → REVIEW (self-review D35: Pattern-Wiederholung Slice 240 + 242) → PROVE → LOG

## 1.13 Pre-Mortem

- **Risiko:** GameweekScoreBar braucht prop die PerformanceTab nicht hat. Mitigation: pre-Edit Code-Reading verifiziert, ggf. neuer Hook-Call.
- **Risiko:** Dead-Imports nach Delete brechen tsc. Mitigation: tsc --noEmit nach jedem Delete-File.
- **Risiko:** Test-Files referenzieren gelöschte Components. Mitigation: vitest run finds it, mit löschen.
- **Risiko:** Slice 247 hat PredictionsTab gefixt, vielleicht hat eine der 8 Components ein analoges Mock-Problem. Mitigation: vitest catches.
