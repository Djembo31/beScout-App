# Slice 200b — Wave 4 Polish-Sweep (Frontend-only)

**Status:** active
**Groesse:** S (4 Items, 4 Files)
**Scope:** CTO (Frontend-only, kein Money, kein Schema, kein RPC)
**Estimated:** ~1.5h

## Ziel

4 Frontend-only Polish-Findings aus Phase-A-Audits schliessen — alle ohne Backend-Touch, ohne neue Aggregat-RPCs.

## Items (4)

| # | Domain | Finding | File |
|---|---|---|---|
| FM-10.1 | FM-Mechanics P1 | Airdrop „Brauche X Pkt für nächsten Tier"-CTA fehlt | `src/app/(app)/airdrop/page.tsx` |
| R-03 | Fantasy P1 | Fantasy-only-Leaderboard (Manager-Score isoliert vom Trader-Score) | `src/components/airdrop/AirdropLeaderboard.tsx` oder Page-Filter |
| F-10 | Fantasy P1 | „Salary"-Konzept perfL5-basiert verwirrt User → Tooltip-Klarheit | `src/features/fantasy/components/PlayerPicker.tsx` oder `kaderHelpers` |
| FM-8.3 | FM-Mechanics P3 | MysteryBox History letzte-30d-Filter | `src/components/inventory/MysteryBoxHistorySection.tsx` |

## Acceptance Criteria

1. **FM-10.1:** Airdrop-Page zeigt direkt unter MyScoreCard ein „Brauche X Pkt für `<next-tier>`"-Hint mit Progress-Bar (0% → 100%) wenn User nicht schon `'diamond'` ist. Thresholds: bronze=0, silber=200, gold=500, diamond=1000 (verifiziert in `supabase/migrations/20260417170000_refresh_airdrop_score_trigger_internal.sql:77`).
2. **R-03:** Airdrop-Leaderboard-Tabelle bekommt einen optionalen Toggle/Tab „Manager-Only" der nur Fantasy-relevanten Score (`fantasy_score`) sortiert anzeigt. **Filter-only, kein neues Backend-Field.**
3. **F-10:** Im PlayerPicker/Lineup-Builder wo „Salary" angezeigt wird, ein info-i-Icon mit Tooltip „Salary basiert auf Form der letzten 5 Spiele (perfL5)". i18n DE+TR.
4. **FM-8.3:** MysteryBox-History bekommt Filter-Toggle „Letzte 30 Tage / Alle" (in-session State, kein localStorage). Filter-Logic: `acquired_at >= now - 30 days`.

5. tsc clean.
6. Bestehende Tests gruen.
7. DE+TR-i18n-Keys vollstaendig (audit nach errors-frontend.md "Missing i18n-Key").

## Edge Cases

- **FM-10.1:** User auf `'diamond'` (>=1000 score) → Hint nicht rendern (allTimeMax-State).
- **FM-10.1:** Mobile 393px → Progress-Bar muss in MyScoreCard-Container passen, kein Overflow.
- **R-03:** Filter „Manager-Only" + leeres Result (keine Manager-Spieler) → Empty-State.
- **F-10:** Tooltip auf Mobile → tap-to-show statt hover (nutze existing Tooltip-Pattern).
- **FM-8.3:** User mit 0 Boxes in 30 Tagen → Empty-State-Message anders formuliert ("In den letzten 30 Tagen keine Boxes geöffnet").

## Proof-Plan

| Item | Proof |
|---|---|
| Alle | `npx tsc --noEmit` Output → `worklog/proofs/200b-tsc.txt` |
| FM-10.1 | Code-Diff + Threshold-Konsistenz mit Migration |
| R-03 | Code-Diff + filter-correctness via Tests falls vorhanden |
| F-10 | Code-Diff + i18n-Verify |
| FM-8.3 | Code-Diff + filter-test |

## Scope-Out

- **F-09** BPS-Bonus-System — needs backend (per-fixture-aggregation)
- **K-03** Squad-Tab Fantasy-Pick-Rate — RPC available aus Slice 195e aber UI-Wiring nicht-trivial → Slice 201
- **C-03** Aggregate-Hint — needs RPC
- **M-01** Mission-Hints — needs DB-catalog-changes
- **FM 4.2/4.3** Trending Pills + Holders-Distribution — needs Aggregat-RPC
- **FM 6.x** Transactions-Polish — needs trades-join

## Build-Order

1. FM-10.1 Airdrop Tier-CTA (~25 min)
2. FM-8.3 MysteryBox History 30d-Filter (~15 min)
3. F-10 Salary-UX Tooltip (~25 min)
4. R-03 Fantasy-only-Leaderboard Filter (~35 min)
5. tsc + i18n-audit + Reviewer-Agent

## Punch-Liste-Update nach Slice 200b

67/98 → **71/98 closed (~72%)**

## Decision: Same Single-Track-Pattern wie 200a

Wieder Single-Track-Sequenziell, nicht Multi-Track-Worktrees. Items orthogonal aber klein. Vermeidet Worktree-Awareness-Trap (D45). Inkrementelles tsc + Reviewer-Agent am End.

**Pre-Existing-Code-Grep-Pflicht (gelernt aus 200a UX-2):** Vor jedem Item via grep über consumed-hook-source verifizieren ob es bereits gelöst ist.
