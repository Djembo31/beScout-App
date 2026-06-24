# Review — Slice 368b: Scout-Card-Anzeige-Wahrheit (RewardsTab)

**Reviewer:** reviewer-Agent (Cold-Context, READ-ONLY) · **Datum:** 2026-06-24 · **time-spent:** 9 min

## Verdict: PASS

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW (Nit) | `src/lib/services/__tests__/ipo.test.ts` | AC-9/§8 listete `getFirstIpoPrice`-Service-Test, fehlte. 3 Branches (null/cents≤0/throw) ungetestet. Kein Live-Blocker (read-only Anzeige). | Mini-Test ergänzen ODER als Scope-Cut dokumentieren. → **GEFIXT** (4 Tests ergänzt, 40/40 grün). |
| 2 | LOW (Nit) | `RewardsTab.tsx:79` | `entryPrice != null && entryPrice > 0` — `!= null` redundant (`> 0` sortiert null/undefined aus). Harmlos. | Optional kürzen. → **Belassen** (defensiv-explizit, Reviewer: „kein Muss", Über-Edit = Churn). |

## One-Line
Ja — ein Senior würde das mergen: Compliance sauber (DE+TR €-frei, „Kulüp Satışı" korrekt), Silent-Fail-konform (throw-on-error + `.maybeSingle()`), Pattern-treu.

## Belege (Auszug)
- **Money/Compliance:** `growthFormulaTooltip`/`growthMilestonesDesc` (DE+TR) ohne €, Reward in Credits/linear, Ermessen erhalten. Keine verbotenen Begriffe. MV-€-Anzeige bleibt € (Scope-Out §11, app-weit). TR korrekt „Kulüp Satışı" (AR-7).
- **Silent-Fail:** `getFirstIpoPrice` wirft bei error (kein silent null-on-error); `null` nur legitimer „kein IPO"-Fall. `.maybeSingle()` korrekt.
- **Frontend:** `InfoTooltip` = korrektes Education-Tooltip (Slice-225-Pattern, Mobile). Hooks vor early returns. Kein Layout-Shift (Lade/null → „—" im selben Slot).
- **AC-3:** „—"-Fallback nur im Einstieg-Feld; MV-Card + Meilenstein-Block unberührt.
- **Hook/Key-Muster:** spiegelt `useIpoForPlayer` 1:1; staleTime 5min korrekt (historisch-immutabel).
- **Tests grün warum:** `TradingTab.test.tsx:42` mockt `RewardsTab` weg, kein eigener RewardsTab-Test → kein QueryClientProvider nötig. (Echter useQuery-Pfad jetzt zusätzlich durch `getFirstIpoPrice`-Service-Test + Playwright abgedeckt.)

## Post-Review-Aktion
- Finding #1 gefixt (Service-Test). Finding #2 belassen (Nit). Keine REWORK nötig.
