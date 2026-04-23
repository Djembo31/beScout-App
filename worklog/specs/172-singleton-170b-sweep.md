# Slice 172 — Singleton 170b Sweep (11 Component-Files)

## Groesse

**S** (~1.5h) — 11 Component/Hook-Files. Pattern-bekannt aus Slice 170. Reiner Konvention-Refactor ohne Runtime-Change.

## Ziel

11 weitere Singleton-Imports auf `useQueryClient()`-Hook migrieren. Schliesst die Scope-Gap die Slice 170 Reviewer als "Slice 170b Kandidat" markiert hat.

## Betroffene Files (11)

| File | queryClient Usages | Call-Site-Typ | Notes |
|------|--------------------|---------------|-------|
| `src/components/club/sections/MembershipSection.tsx` | 2 | in useCallback-Handler | Slice 151c D18 Pilot |
| `src/features/market/hooks/useWatchlistActions.ts` | 3 | in Handler-Callbacks (Hook) | Custom-Hook |
| `src/features/market/components/marktplatz/WatchlistView.tsx` | 4 | in Handler-Callbacks | Component |
| `src/features/market/components/MarketContent.tsx` | 1 | ErrorState onRetry | Component |
| `src/features/fantasy/hooks/useGameweek.ts` | 1 | in Handler | Custom-Hook |
| `src/app/(app)/hooks/useHomeData.ts` | 6 | in Handler (Hook) | Custom-Hook |
| `src/app/(app)/club/[slug]/ClubContent.tsx` | 3 | in useEffect + onClick | Component |
| `src/app/(app)/community/page.tsx` | 1 | ErrorState onRetry | Component |
| `src/app/(app)/founding/page.tsx` | 2 | in Handler | Component |
| `src/app/(app)/missions/page.tsx` | 7 | in Handlers | Component |
| `src/app/(app)/page.tsx` | 1 | ErrorState onRetry | Component |

**Total:** 31 queryClient-Usages across 11 Files.

## Acceptance Criteria

1. Alle 11 Files: `import { queryClient } from '@/lib/queryClient';` entfernt.
2. Alle 11 Files: `import { useQueryClient } from '@tanstack/react-query';` ergaenzt.
3. Jede Component/Hook-Funktion mit queryClient-Nutzung bekommt `const queryClient = useQueryClient();` am Top des Function-Bodies.
4. **Exhaustive-Deps-Konsistenz** (common-errors.md §5 Slice 170-Learning): Jede useCallback/useMemo/useEffect die `queryClient.*` im Body liest bekommt `queryClient` in deps-array.
5. `npx tsc --noEmit` clean.
6. Betroffene Test-Suites laufen gruen (insb. wenn Test-File auf `@/lib/queryClient` mockt).
7. Grep-Verify: 0 Singleton-Imports in allen 11 Zielfiles.

## Edge Cases

1. **Utility-Hooks mit Module-Level-Export (useWatchlistActions, useGameweek, useHomeData)** — sind Custom-Hooks. `useQueryClient()`-Call gehoert in den Hook-Body (Z.top). useCallback-deps aktualisieren.
2. **Inline ErrorState onRetry (MarketContent, community/page, (app)/page)** — `queryClient.refetchQueries(...)`-Call direkt im JSX. Das reicht **nicht** fuer useCallback-Fix weil Inline-Arrow-Function neu-erzeugt wird. Hook-Call `const queryClient = useQueryClient();` in Component-Body, Inline-Arrow nutzt dann die lokale Referenz. Kein deps-Update noetig da Inline-Arrow.
3. **missions/page.tsx** hat 7 queryClient-Usages — wahrscheinlich mehrere Handler. Hook-Call im Component-Body, deps pro useCallback verifizieren.
4. **ClubContent.tsx** hat `queryClient.invalidateQueries` in useEffect (Z.162) + in onClick (Z.369). Beide brauchen Behandlung.
5. **Test-Files:** Mock-Pattern per File pruefen. Wenn ein Test-File `@/lib/queryClient` mockt, muss ggf. `vi.hoisted`-Pattern wie Slice 170 testing.md §5.

## Proof-Plan

- `npx tsc --noEmit` Output → `worklog/proofs/172-tsc.txt`
- Relevante Test-Suites Output → `worklog/proofs/172-vitest.txt`
- Grep-verify → `worklog/proofs/172-grep.txt`
- Reviewer-Agent Output → `worklog/reviews/172-review.md`

## Scope-Out

- **Legitim Singleton-behalten (nicht migrierbar):** 
  - `src/components/providers/QueryProvider.tsx` + `AuthProvider.tsx` — initialisieren Singleton
  - `src/lib/queries/invalidation.ts` + `homeDashboard.ts` + `marketDashboard.ts` — Utility-Module
  - `src/features/fantasy/queries/invalidation.ts` — Utility-Module
- Pre-existing `tErrors`-warns in useCommunityActions (aus Slice 170 Backlog) — nicht in 172-Scope.
