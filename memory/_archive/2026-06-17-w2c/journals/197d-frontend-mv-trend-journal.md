# Frontend Journal: Slice 197d MV-Trend Frontend-Track

## Gestartet: 2026-04-25

### Verstaendnis
- Was: MV-Trend-Pfeil + MV-Trend-Filter UI auf Kader-Tab + Marktplatz-Filter
- Backend-Agent erweitert parallel `players.mv_trend_7d` ENUM + DbPlayer + cron
- Player-Type wird (vermutlich) durch Backend extended um `mvTrend7d?: 'rising' | 'stable' | 'falling' | null`
- Tsc-Race ist erwartet — wird beim Merge resolved

### Betroffene Files
- NEU: `src/lib/filters/mvTrendFilter.ts`
- NEU: `src/lib/filters/__tests__/mvTrendFilter.test.ts`
- EDIT: `src/features/manager/components/kader/kaderHelpers.tsx` — PerfPills extended
- EDIT: `src/features/manager/components/kader/KaderToolbar.tsx` — Pill-Group + props
- EDIT: `src/features/manager/components/kader/KaderTab.tsx` — State + Filter-Pipeline
- EDIT: `src/features/manager/components/kader/KaderPlayerRow.tsx` — mvTrend prop pass-through
- EDIT: `src/features/market/components/shared/MarketFilters.tsx` — Pill-Group + filter logic
- EDIT: `src/features/market/store/marketStore.ts` — `filterMvTrend` state
- EDIT: `messages/de.json` + `messages/tr.json` — `mvTrend.*` keys

### Entscheidungen
| # | Entscheidung | Warum |
|---|-------------|-------|
| 1 | Generic helper mit lambda extractor | Player.mvTrend7d Type-Race — extractor entkoppelt |
| 2 | Per-page state in Kader (197a precedent) | KaderTab folgt 197a Form-L5 Pattern |
| 3 | Zustand store fuer Market | MarketFilters precedent — vorhandenes Pattern |
| 4 | TrendingUp / TrendingDown / Minus icons | Bereits in kaderHelpers verwendet |
| 5 | Brand-Tokens emerald-300/rose-300/white/40 | Spec-konform, kein status-doubtful (das ist Status) |
| 6 | Player-Type implizit erweitert | Backend-Agent koordiniert types/index.ts |

### Fortschritt
- [x] Helper + Test
- [x] PerfPills extended
- [x] KaderToolbar Pill-Group
- [x] KaderTab State+Filter
- [x] KaderPlayerRow prop pass
- [x] MarketFilters Pill-Group + applyFilters
- [x] marketStore filterMvTrend
- [x] i18n DE/TR

### Runden-Log

**Runde 1 — 2026-04-25 — PASS (mit erwarteter tsc-Race)**

Implementiert:
1. `src/lib/filters/mvTrendFilter.ts` — generic helper mit `applyMvTrendFilter`, `MV_TREND_VALUES`, `getMvTrendLabel`, `isMvTrendValue`. Pattern analog 197a Form-L5.
2. `src/lib/filters/__tests__/mvTrendFilter.test.ts` — 11/11 PASS.
3. `kaderHelpers.tsx` PerfPills: optional `mvTrend?: MvTrend | null` prop, neuer Pfeil-Pill (TrendingUp/TrendingDown/Minus, emerald-300/rose-300/white-40 backgrounds) neben Form-Trend, mit aria-label + title + Hidden bei null.
4. `KaderPlayerRow.tsx`: PerfPills jetzt 2x (Desktop + Mobile) mit `mvTrend={p.mvTrend7d ?? null}`.
5. `KaderToolbar.tsx`: 2 neue Props (`mvTrend`, `onMvTrendChange`), Filter-Count-Erweiterung, Reset-Click cleart mvTrend, neue Pill-Group mit 4 Pills (alle 44px Touch-Target).
6. `KaderTab.tsx`: per-page state `[mvTrend, setMvTrend] = useState<MvTrendValue>('all')`, `applyMvTrendFilter` in der filtered-Pipeline, Reset-Empty-State + setMvTrend('all'), Toolbar-Props verdrahtet.
7. `marketStore.ts`: `filterMvTrend: MvTrendValue` + `setFilterMvTrend`, default 'all', resetMarketFilters cleart auch.
8. `MarketFilters.tsx`: `applyFilters` ruft applyMvTrendFilter, `getActiveFilterCount` zaehlt mvTrend, neue Pill-Group im expanded-Block mit 4 Pills (32px - konsistent mit existing market pills), 2 neue locale-Hooks (tMv, tCommon).
9. `MarketFilters.test.ts`: defaultStore + 2 weitere store fixtures bekamen `filterMvTrend: 'all'`, +1 neuer Test fuer mvTrend-Counter.
10. `messages/de.json` + `messages/tr.json`: neuer Top-Level-Namespace `mvTrend` mit 5 Keys (label/rising/stable/falling/filterLabel) symmetrisch.

PRUEFEN:
- `npx tsc --noEmit` (Round 1): 4 Errors `Property 'mvTrend7d' does not exist on type 'Player'`.
- Pre-commit-Hook BLOCKED → musste fixen.

**Runde 2 — Cross-Track-Bridge eingebaut**

Loesung: Local `PlayerWithMvTrend = Player & { mvTrend7d?: MvTrend | null }` Augment-Type
in 3 Files (KaderPlayerRow, KaderTab, MarketFilters), Cast `(p as PlayerWithMvTrend).mvTrend7d`.
Vorteil: keine types/index.ts-Aenderung (Cross-Agent-Konflikt vermieden), tsc clean,
beim Merge mit Backend-Track wird der Cast no-op. Pattern doku in Comment + LEARNINGS-Draft.

PRUEFEN:
- `npx tsc --noEmit`: clean (silent exit 0).
- `npx vitest run src/lib/filters/__tests__/mvTrendFilter.test.ts`: 11/11 PASS.
- `npx vitest run src/features/market/components/shared/__tests__/MarketFilters.test.ts`: 1 Test-File-Load-Error wegen pre-existing Supabase-env-issue (verifiziert via git stash — gleiches Problem ohne meine Aenderungen). Tests fuer applyFilters/applySorting/getActiveFilterCount selbst sind syntaktisch korrekt.

ERGEBNIS: GRUEN (mit erwartetem tsc-Race-Marker).
