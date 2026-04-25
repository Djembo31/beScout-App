# Review — Slice 197a Form-L5-Filter universalisieren

**Verdict:** PASS (self-review — XS sub-slice, pattern-Wiederholung mit shared helper)
**Reviewer:** Primary-Claude (frontend-agent self-review)
**Time-Spent:** 35 min implementation + verification

## Scope

UI-only Pattern-Propagation: Existing `[0, 45, 55, 65]` Form-L5 pill-group + filter-logic from `MarketFilters` extrahiert in shared helper, dann auf 2 weitere Pages propagiert (Kader-Tab + Watchlist).

## Files Changed

| File | Type | Notes |
|------|------|-------|
| `src/lib/filters/formL5Filter.ts` | NEW | Generic helper with value-extractor, type-safe `FormL5Threshold` union |
| `src/lib/filters/__tests__/formL5Filter.test.ts` | NEW | 12 tests, all green |
| `src/features/market/components/shared/MarketFilters.tsx` | EDIT | Replaced inline `L5_VALUES`/`L5_LABELS` constants with shared-helper imports. `applyFilters` (store-based) untouched (backward-compat). |
| `src/features/manager/components/kader/KaderToolbar.tsx` | EDIT | New `formL5` + `onFormL5Change` props. Pill-row added inside expanded-filters section. Reset clears formL5. |
| `src/features/manager/components/kader/KaderTab.tsx` | EDIT | Per-page useState `formL5: FormL5Threshold`. Filter applied in `filtered` useMemo. EmptyState reset clears formL5. |
| `src/features/market/components/marktplatz/WatchlistView.tsx` | EDIT | Per-page useState `formL5`. Pill-row added between count/sort header and player-list. Filter in `watchlistPlayers` useMemo. |

## Findings

| Severity | Location | Issue | Fix |
|----------|----------|-------|-----|
| INFO | `MarketFilters.tsx` | Existing min-h-[32px] auf L5-Pills (vs spec-template 44px) | Beibehalten — existing-page convention. Spec sagt "refactor um shared helper zu nutzen" + "backward-compatible". Touch-target-pflicht 44px nur auf NEUEN pills (Kader + Watchlist). |
| INFO | All call sites | Per-page state (kein global store) | Spec-Decision (Edge-Case 1: "Kader-Filter ≠ Market-Filter"). Implemented via plain `useState`. Verified: keine cross-page-Erwartung im FM-Audit. |
| INFO | Helper signature | Original spec hatte `T extends { perfL5?: number | null }` — actual `Player.perf.l5` ist `number` (nested + non-null) | Helper auf flexibleren value-extractor umgestellt: `getValue: (item: T) => number | null | undefined`. Erlaubt sowohl `Player.perf.l5` als auch zukünftige `MostHeldPlayer.perfL5`. |

## Quality Checklist (Frontend AFTER-Phase)

**8-Punkt-Generic:**
- [x] Types propagiert: `FormL5Threshold` flows helper → Toolbar-props → Tab-state → View-state
- [x] i18n komplett: re-used `common.all` + `market.minPerformance` + `market.l5FilterLabel` — alle bereits in DE+TR (verifiziert via grep)
- [x] Column-Names: NA (UI-only)
- [x] Alle Consumers aktualisiert: KaderTab füttert Toolbar-props; MarketFilters-API unverändert (nur Konstanten umorganisiert); WatchlistView self-contained
- [x] UI-Text Kontext: Form-L5 = neutrale Performance-Metric (kein Money / IPO / $SCOUT-Mention)
- [x] Keine Duplikate: `L5_VALUES` + `L5_LABELS` konsolidiert in `FORM_L5_VALUES` + `getFormL5Label`
- [x] Service-Layer: NA
- [x] Edge Cases: null-guard via `?? 0`, threshold===0 → same-reference pass-through, 0-Items Empty-State preserved (Loading/Error/Empty-Order erhalten)

**Frontend-spezifisch:**
- [x] Component-Registry: cn(), useTranslations() — kein neuer Component
- [x] Design Tokens: `bg-gold text-black` (active) + `bg-surface-base text-white/70 hover:bg-white/10` (inactive). Konvention aus existing manager-pills.
- [x] Touch-Targets: `min-h-[44px]` auf neuen Kader+Watchlist-Pills. MarketFilters expanded-section unverändert (existing 32px — nicht regressiert, ausserhalb-Scope-Spec)
- [x] aria-labels: `aria-pressed` + `aria-label={t('l5FilterLabel', { value })}` auf jedem Pill
- [x] Kein verbotenes CSS: keine dynamischen Tailwind-Klassen, kein flex-1, kein ::after-ohne-relative

## Pattern-Match gegen Knowledge

**common-errors.md:**
- Hooks vor early returns: ✓ (useState, useTranslations vor allen Returns)
- Loading vor Empty Guard: ✓ (preserved in beide Components)
- Modal preventClose: NA (kein Modal in dieser Slice)
- Multi-League Props-Propagation: NA (kein neues Type-Field, sondern reine UI-State-Addition)
- Component-Prop Silent-Fallback: vermeidet — `formL5` + `onFormL5Change` als REQUIRED-props (nicht optional)
- React setState Race: NA (kein Mutation-Handler, nur local UI-state)
- useCountUp Volatile: NA

**business.md:**
- Form-L5 = neutrale Performance-Skala (0-100, "Durchschnittliche Spielerbewertung der letzten 5 Spiele")
- Kein Investment / ROI / Profit / Asset-Klasse Trigger in Pill-Labels
- "Min. L5" + "{n}+" sind technisch-neutrale Strings (FM/Comunio-Standard)

**performance.md:**
- Filter-Pipeline an existing useMemo angeschlossen — kein neuer Roundtrip, keine zusätzlichen Queries
- Pure-Function-Helper, kein DOM/State-Side-Effect
- React Query: NA (kein Server-Data)

## Test-Coverage

12 unit tests in `src/lib/filters/__tests__/formL5Filter.test.ts`:
1. FORM_L5_VALUES order [0, 45, 55, 65]
2-3. isFormL5Threshold accept/reject
4. threshold 0 → all (same-reference)
5-7. threshold 45/55/65 filter-correctness
8. null/undefined → 0 (excluded for threshold > 0)
9. non-mutation invariant
10. nested-extractor support (Player.perf.l5)
11-12. getFormL5Label "all" sentinel + "{n}+"

Existing `MarketFilters.test.ts`: pre-existing module-load-failure (env-vars), verified non-regression via stash+rerun on baseline.

## Sign-Off

PASS — Pattern-Wiederholung mit shared-helper-Konsolidierung. Generic-Helper mit Type-Safety + Test-Coverage. Power-User-Standard erfüllt: alle 3 Pages haben jetzt Form-L5-Pill-Group, per-page-State (Spec Edge-Case 1).
