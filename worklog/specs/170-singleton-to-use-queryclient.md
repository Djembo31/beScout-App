# Slice 170 — Singleton→useQueryClient Migration (Konvention-Cleanup)

## Groesse

**XS** — 3 Files + 1 Test-File. Pattern-bekannt aus Slice 163 (CreatePredictionModal).

## Ziel

3 Components/Hook auf `useQueryClient()`-Hook-Variante migrieren — Konvention-Konsistenz mit `memory/patterns.md` #28 ("useQueryClient() Hook > Singleton queryClient").

## Hintergrund

Slice 161 (LeaguesSection, MissionBanner) + 162 (useCommunityActions) haben beim Ferrari-Migrationszug den Singleton-Import `@/lib/queryClient` geerbt. Slice 164 hat die Konvention codifiziert:
> **useQueryClient() Hook > Singleton queryClient.** Grund: Testbarkeit, konsistente Hook-API, React-19-Kompat.

Dieser Slice schliesst den Drift.

## Betroffene Files

| File | Usages | Notes |
|------|--------|-------|
| `src/components/community/hooks/useCommunityActions.ts` | 16 | Hook-Body, 1 x `cancelQueries`, 3 x `setQueryData`, 1 x `getQueryData`, 11 x `invalidateQueries` |
| `src/components/fantasy/LeaguesSection.tsx` | 3 | 3 Components (CreateLeagueModal + JoinLeagueModal + LeagueCard), jede braucht eigenen Hook-Call |
| `src/components/missions/MissionBanner.tsx` | 4 | 1 x `setWalletBalance(queryClient, ...)` + 3 x `invalidateQueries` |
| `src/components/community/hooks/__tests__/useCommunityActions.test.ts` | — | Mock-Pattern muss `useQueryClient` abdecken |

## Acceptance Criteria

1. `import { queryClient } from '@/lib/queryClient';` in allen 3 Production-Files entfernt.
2. `import { useQueryClient } from '@tanstack/react-query';` ergaenzt (wo noetig).
3. `const queryClient = useQueryClient();` am Top jeder Component/Hook, die `queryClient.*` nutzt (3 in LeaguesSection, 1 in MissionBanner, 1 in useCommunityActions).
4. `npx tsc --noEmit` clean.
5. `npx vitest run src/components/community/hooks/__tests__/useCommunityActions.test.ts` gruen (40 Tests).
6. `npx vitest run src/components/fantasy/__tests__/LeaguesSection.test.tsx` gruen.
7. `npx vitest run src/components/missions/__tests__/MissionBanner.test.tsx` gruen.
8. Grep-Verify: `grep -n "from '@/lib/queryClient'" src/components/community/hooks/useCommunityActions.ts src/components/fantasy/LeaguesSection.tsx src/components/missions/MissionBanner.tsx` → 0 Treffer.

## Edge Cases

1. **LeaguesSection 3 Components:** Jede Component die Mutations nutzt braucht eigenen `useQueryClient()`-Call. Call MUSS in Component-Body VOR useSafeMutation stehen (Hooks-Order).
2. **MissionBanner setWalletBalance-Helper:** `setWalletBalance(queryClient, userId, balance)` — Helper akzeptiert QueryClient als Arg. Nur Source der Variable wechselt (Import → Hook), Helper-Signatur unveraendert.
3. **useCommunityActions Hook-in-Hook:** `useQueryClient()` innerhalb von `useCommunityActions()`-Hook-Body ist erlaubt (Standard React-Pattern).
4. **Test useCommunityActions — Mock-Shared-Reference:** Test importiert `queryClient` aus gemocktem `@/lib/queryClient`. Nach Migration ruft Hook `useQueryClient()` auf → muss dieselbe Mock-Instanz liefern. Fix: `useQueryClient` mocken via partial-mock von `@tanstack/react-query` mit Shared-`mockQc`-Object. Siehe Fix-Pattern unten.
5. **Test LeaguesSection + MissionBanner:** Diese Tests asserten NICHT direkt auf `queryClient.*` Methoden. Sie nutzen `renderWithProviders` welches einen echten QueryClient per QueryClientProvider bereitstellt. Nach Migration: `useQueryClient()` liefert echten Test-QC → Tests bestehen weiter. Keine Mock-Aenderung noetig.
6. **LeaguesSection stale `@/lib/queryClient`-Mock:** Mock wird obsolet (Production-Code importiert nicht mehr). Kann drinbleiben (harmlos), optional bereinigen.
7. **Kein Service/RPC-Change:** Identische Runtime-Semantik — `queryClient` aus QueryProvider ist dieselbe Instanz wie das Singleton (app/providers.tsx bereitstellt die Singleton-Instanz im Provider). Zero-Functional-Change.

## Fix-Pattern fuer useCommunityActions.test.ts

```typescript
// Vorher:
vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: vi.fn(() => Promise.resolve()),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(() => undefined),
    cancelQueries: vi.fn(() => Promise.resolve()),
  },
}));

// Nachher:
const mockQc = {
  invalidateQueries: vi.fn(() => Promise.resolve()),
  setQueryData: vi.fn(),
  getQueryData: vi.fn(() => undefined),
  cancelQueries: vi.fn(() => Promise.resolve()),
};
vi.mock('@/lib/queryClient', () => ({ queryClient: mockQc }));
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return { ...actual, useQueryClient: () => mockQc };
});
```

Test-Assertions (`expect(queryClient.invalidateQueries).toHaveBeenCalled()`) bleiben unveraendert, weil beide Imports auf dieselbe Instanz zeigen.

## Proof-Plan

- `npx tsc --noEmit` Output → `worklog/proofs/170-tsc.txt`
- `npx vitest run <3 test files>` Output → `worklog/proofs/170-vitest.txt`
- Grep-Verify (0 Treffer) → `worklog/proofs/170-grep.txt`

## Scope-Out

- Andere Singleton-Usages (`src/components/player/*`, `src/app/*`, `src/lib/hooks/*`) — werden bewusst gelassen. Audit + Migration in separatem Slice 170b (wenn ueberhaupt). Diese Session fokussiert nur die 3 Ferrari-Migrations-Erben.
- Ferrari-Blueprint-Aenderungen (andere Parts von patterns.md #28) — nicht Teil dieses Slices.
- `setWalletBalance`-Helper-Signatur-Refactor — unveraendert, nur Source der Variable.

## Rueckwaerts-Kompatibilitaet

Zero-Impact auf Runtime-Behavior:
- `queryClient` Singleton und `useQueryClient()` in Provider-Kontext liefern identische Instanz (via `app/providers.tsx`).
- Keine DB/Service/RPC-Aenderung. Keine Migration noetig.
- Tests werden angepasst um Mock-Pattern zu spiegeln.
