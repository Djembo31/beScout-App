# Slice 295 — `/clubs` Discovery Page Contract Test (S3 F-2)

**Slice-Type:** Tool (vitest page-test)
**Größe:** S
**Status:** SPEC

## 1. Problem-Statement

S3 Page Contract Audit (Slice 292) F-2 (P1): `/clubs` (`ClubsDiscoveryPage`) hat **kein** dediziertes Page-Contract-Test. Discovery → Follow → Activate ist demo-path-wichtig und vollständig page-local (State + Optimistic-Bump in `page.tsx`). Es gibt keinen Regressions-Schutz für loading / error / empty / follow / activate.

Evidence: `worklog/audits/2026-06-13/page-contract-fantasy-club.md` F-2; `src/app/(app)/clubs/__tests__/` existiert nicht (verifiziert).

## 2. Lösungs-Design

Neues jsdom-vitest-File `src/app/(app)/clubs/__tests__/ClubsDiscoveryPage.test.tsx`. Rendert die echte Page mit gemockten Daten-Quellen (Services + Hooks + LeagueScopeHeader-Stub) und lockt die 5 Render-/Interaktions-Contracts. **Kein `src/**`-Runtime-Change** — reiner Test-Add.

Mock-Strategie analog `ClubContent.test.tsx`: `renderWithProviders` (liefert next-intl key-passthrough + next/navigation + next/image), plus gezielte `vi.mock` für die Page-spezifischen Daten-Hooks/Services.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/app/(app)/clubs/__tests__/ClubsDiscoveryPage.test.tsx` | NEU |

Kein anderer File. (Wiring: vitest auto-discovered via `**/__tests__/**` — kein package.json-Eintrag nötig.)

## 4. Code-Reading-Liste (vor Implementation — erledigt)

| File | Zweck | Befund |
|------|-------|--------|
| `src/app/(app)/clubs/page.tsx` | Render-States + Actions | loading→Skeleton; `!loading && dataError`→ErrorState(onRetry); `!loading && !dataError && filtered.length===0`→EmptyState; Follow-Button→`handleToggleFollow`→`toggleAsync`; Activate-Button (nur `following && !isActive`)→`setActiveClub` |
| `src/test/renderWithProviders.tsx` | Harness | mockt next-intl (key-passthrough), next/navigation, next/image, QueryClient |
| `src/app/(app)/club/[slug]/__tests__/ClubContent.test.tsx` | Mock-Konvention | `vi.mock` pro Child + `renderWithProviders` |
| `src/lib/hooks/useToggleFollowClub.ts` | Hook-Shape | `{ toggleAsync: (vars)=>Promise<void>, isPending }` |
| `src/lib/hooks/useFollowedClubs.ts` | Hook-Shape | `{ data: DbClub[] \| undefined }` |
| `src/lib/queries/trades.ts:56` | Batch-Hook | `useMostOwnedPlayersPerClubBatch(ids, limit)` → `{ data?: Map }` |

## 5. Pattern-References

- `testing.md` — „Was testen": Hooks Return-Werte, Loading/Error/Empty States; KEIN Snapshot.
- `testing.md` Anti-Pattern „vi.resetModules() + dynamic-import-pro-Test" (Slice SO-3) → **static imports + `vi.mock` oben**, kein `loadFresh()`.
- `errors-infra.md` jsdom 28 + `.npmrc` `public-hoist-pattern[]=@csstools/*` (Slice 268b) — jsdom-Tests laufen; falls „no tests"+„Cannot find package" → Umgebungs-Bug, nicht Test-Bug.
- `ClubContent.test.tsx` als Mock-Konvention-Vorlage.

## 6. Acceptance Criteria (executable)

| # | Kriterium | VERIFY |
|---|-----------|--------|
| AC-1 | Loading: vor Promise-Resolve rendert Skeleton, kein Club-Grid | `pnpm exec vitest run src/app/(app)/clubs/__tests__/ClubsDiscoveryPage.test.tsx` grün |
| AC-2 | Error: `getClubsWithStats` rejected → `ErrorState` mit Retry-Affordance sichtbar | dito |
| AC-3 | Empty: Services resolved leer → `EmptyState` (`noClubsAvailable`) sichtbar | dito |
| AC-4 | Loaded+Follow: Club gerendert → Klick „Folgen" ruft `toggleAsync({club, follow:true})` | dito |
| AC-5 | Activate: gefolgter, nicht-aktiver Club → „Aktivieren"-Klick ruft `setActiveClub(club)` | dito |
| AC-6 | tsc clean | `pnpm exec tsc --noEmit` EXIT 0 |

## 7. Edge Cases

| Case | Erwartung im Test |
|------|-------------------|
| `user` = null | Follow-Button-Klick triggert `toggleAsync` NICHT (handleToggleFollow `if (!user) return`) → separater Test |
| Activate-Button-Sichtbarkeit | nur wenn `following && !isActive`; bei nicht-gefolgtem Club nicht im DOM |
| Search-Empty vs No-Clubs-Empty | AC-3 deckt `noClubsAvailable` (kein searchQuery); Search-Variante out-of-scope (V1) |
| `useMostOwnedPlayersPerClubBatch` undefined data | Page rendert ohne Hint — Mock liefert `{ data: undefined }` |
| async state update | `findBy*` / `waitFor` für Post-Promise-Render, kein sync `getBy` direkt nach render |
| follow toggle async | `waitFor(() => expect(toggleAsync).toHaveBeenCalledWith(...))` (useSafeMutation-Pattern, testing.md §2) |

## 8. Self-Verification Commands

```bash
pnpm exec vitest run "src/app/(app)/clubs/__tests__/ClubsDiscoveryPage.test.tsx"
pnpm exec tsc --noEmit
```

## 9. Open-Questions

- **Pflicht-Klärung:** keine — Test-only, kein Money/Wording/Security.
- **Autonom-Zone (CTO):** Mock-Granularität, Anzahl Tests (Ziel ≥5, 1 pro AC + 1 unauth-edge), Test-IDs vs. Rollen-Queries.

## 10. Proof-Plan

`worklog/proofs/295-clubs-discovery-test.txt` — vitest-Output (N passed) + tsc EXIT 0.

## 11. Scope-Out

- Kein Runtime-Change an `page.tsx`.
- Kein E2E (das wäre Demo-Step-8 via Slice-293-Blueprint, separater Slice).
- Search-Filter-Empty-Variante, Liga-Scope-Filter-Logik, Most-Owned-Hint-Rendering: nicht getestet (V1).
- `/clubs/loading.tsx` + `error.tsx` (Next.js route-level boundaries): out-of-scope, Page-local States reichen für Contract.

## 12. Stage-Chain (geplant)

SPEC → IMPACT (skipped — test-only, kein Service/RPC/Schema/Query-Key) → BUILD → REVIEW (reviewer-Agent) → PROVE → LOG.

## 13. Pre-Mortem (S — kurz)

1. jsdom-Pool-Init-Fail („no tests") → `.npmrc`-Fix ist live (Slice 268b), sollte greifen.
2. `useLeagueScope` Zustand-Store ohne Reset → Test-Isolation: Store mocken oder `LeagueScopeHeader` stubben + `useLeagueScope`-Selectors mocken (Default: kein Filter).
3. Optimistic-Bump in `handleToggleFollow` setzt page-state → Test assertet `toggleAsync`-Call, nicht Count-DOM (deterministisch).
4. `getLeaguesByCountry` Module-Cache (Slice 286 Cold-Race) → Mock `@/lib/leagues` Subscribe/Version + `getLeaguesByCountry`→[].
5. Async-Render-Race → konsequent `findBy`/`waitFor`, nie sync `getBy` direkt nach render.
