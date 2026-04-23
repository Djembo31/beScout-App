---
description: Test-Konventionen fuer vitest Unit Tests und Playwright E2E
globs: ["src/**/*.test.ts", "src/**/*.test.tsx", "tests/**/*"]
---

## Unit Tests (vitest)
- Test-Dateien neben Source: `Component.test.tsx` neben `Component.tsx`
- Oder in `__tests__/` Ordner im gleichen Verzeichnis
- Naming: `describe('[Component/Service]')` → `it('should [verhalten]')`
- KEIN Snapshot-Testing (zu fragil, zu wenig Aussagekraft)

## Was testen
- Services: Jede exportierte Funktion, Happy Path + Error Case
- Hooks: Return-Werte, Loading States, Error States
- Utils: Reine Funktionen, Edge Cases (null, 0, leerer String)
- NICHT testen: Tailwind Classes, Layout, rein visuelle Aenderungen

## Test-Writer Agent
- Sieht NIEMALS Implementation — nur Spec/Interface
- Schreibt Tests VOR Implementation (TDD)
- Tests muessen ERST FEHLSCHLAGEN, dann Implementation

## DB/RPC Tests
- IMMER gegen echte Daten testen (keine Mocks fuer DB)
- Nach neuer Tabelle: Smoke Test mit `SELECT COUNT(*)`
- RLS: `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'X'`

## Ausfuehren
- `npx vitest run` — alle Tests
- `npx vitest run src/lib/services/` — nur Services
- `npx vitest --watch` — Watch Mode fuer Development
- `npx tsc --noEmit` — IMMER zusammen mit Tests ausfuehren

## Visual QA / Playwright
- Bei Multi-Page-Refactors: starte QA mit der Page die am MEISTEN Aenderungen erwartet — die faellt am schnellsten um und zeigt Integration-Gaps
- Default-Tab Pages (z.B. `/profile` zeigt standardmaessig einen Tab): explizit durch alle Tabs klicken, `fullPage` Screenshot deckt nur den Default ab
- Deep-Link Tab-Params NIE raten — immer Component-Source pruefen fuer den echten URL-Param-Namen
- qa-visual Agent hat KEINE Playwright MCP Tools — nutze `npx tsx e2e/qa-*.ts` mit `@playwright/test` chromium API. Template: `e2e/screenshot-home.ts`
- jarvis-qa Password: `e2e/mystery-box-qa.spec.ts:5` (nicht in .env.local)

## useSafeMutation Test-Patterns (codifiziert Slice 164, aus 159/161/162/163)

Wenn Component/Hook auf `useSafeMutation` migriert wird, erfordert das **Test-Mock-Expansion** (transitive Imports) + **Handler-Testing-Pattern** (Observer ist async).

### 1. Mock-Expansion-Template

`useSafeMutation` importiert `@/components/providers/ToastProvider` (fuer `logSilentCatch` + Toast-Breadcrumb). ToastProvider zieht lucide-react Icons (`AlertCircle`, `CheckCircle2`, `Info`, `X`) — diese muessen im Test-Mock stehen **oder** ToastProvider selbst gestubbt werden.

Template fuer Component-Tests:
```typescript
// lucide-react: Alle im Component + AlertCircle/CheckCircle2/Info/X fuer transitive ToastProvider.
vi.mock('lucide-react', () => {
  const S = () => null;
  return {
    // ...component-specific icons
    Target: S, ChevronDown: S, Loader2: S,
    // Required for useSafeMutation → ToastProvider transitive import:
    AlertCircle: S, CheckCircle2: S, Info: S, X: S,
  };
});

// ToastProvider-Stub: Minimal-noop um Module-Load-Cascade abzubrechen.
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));
```

### 2. Handler-Testing-Pattern (act + waitFor)

Nach Ferrari-Migration ist der Handler **synchron**. Die Mutation laeuft **async im MutationObserver**. `await handleX(...)` wartet auf `undefined`, nicht auf Mutation-Completion.

Anti-Pattern (broken):
```typescript
await act(async () => {
  await result.current.handleVotePost(POST_ID, 1);  // returns void, no Mutation-await
});
expect(votePost).toHaveBeenCalledWith(...);  // FAILS — mutation noch nicht gefeuert
```

Pattern (korrekt):
```typescript
act(() => {
  result.current.handleVotePost(POST_ID, 1);  // sync fire-and-forget
});
await waitFor(() =>
  expect(votePost).toHaveBeenCalledWith(...)  // wartet auf Observer-Completion
);
```

### 3. queryClient Mock-Expansion fuer Optimistic-Mutations

Optimistic-Mutations rufen `cancelQueries` + `getQueryData` im `onMutate` (Blueprint-Pflicht, Race-Gap). Test-Mock muss diese Methods enthalten:

```typescript
vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: vi.fn(() => Promise.resolve()),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(() => undefined),       // fuer Snapshot-Rollback
    cancelQueries: vi.fn(() => Promise.resolve()),  // fuer Blueprint onMutate
  },
}));
```

### 4. Service-Mock-Pattern

Bei Hook-Entfernung (wie Slice 163 `useCreatePrediction`): Component importiert Service direkt. Test-Mock muss `@/lib/services/X` mocken (nicht mehr `@/lib/queries/X`):

```typescript
// Vorher (Hook-basiert):
vi.mock('@/lib/queries/predictions', () => ({
  useCreatePrediction: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Nachher (Service-direkt):
vi.mock('@/lib/services/predictions', () => ({
  createPrediction: vi.fn(() => Promise.resolve({ ok: true, id: 'pred-1' })),
  getPlayersForFixture: vi.fn(() => Promise.resolve([])),
}));
```

### 5. vi.hoisted für shared-mock-reference zwischen zwei Mocks (Slice 170)

Wenn Production-Code `useQueryClient()` aus `@tanstack/react-query` aufruft, aber Tests weiterhin `import { queryClient } from '@/lib/queryClient'` fuer Assertions nutzen, muessen **beide Import-Pfade dieselbe Mock-Instance** liefern. Plain `const mockQc = {...}` scheitert mit:

```
ReferenceError: Cannot access 'mockQc' before initialization
```

**Grund:** `vi.mock`-Factories werden an den Anfang der Datei hoisted, plain `const` nicht. Factory kann Variable nicht lesen.

**Fix-Pattern:**

```typescript
// vi.hoisted hoisted das Object zusammen mit vi.mock an den Anfang:
const { mockQc } = vi.hoisted(() => ({
  mockQc: {
    invalidateQueries: vi.fn(() => Promise.resolve()),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(() => undefined),
    cancelQueries: vi.fn(() => Promise.resolve()),
  },
}));

// Singleton-Import-Pfad (Test-Assertions-Backward-Compat):
vi.mock('@/lib/queryClient', () => ({ queryClient: mockQc }));

// Hook-Pfad (Runtime-Call aus useQueryClient()):
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return { ...actual, useQueryClient: () => mockQc };
});

// Tests können unveraendert bleiben:
expect(queryClient.invalidateQueries).toHaveBeenCalled();
// Funktional identisch zu:
expect(mockQc.invalidateQueries).toHaveBeenCalled();
```

**Anwendbar auf:** Tests wo Production-Code von Singleton-Import auf `useQueryClient()`-Hook migriert wurde (Slice 170). Erhaelt Assertions ohne Umbau-Aufwand.

**Alternative (sauberer, mehr Aufwand):** Entferne `@/lib/queryClient`-Mock, nutze `mockQc` direkt in Tests. Bei grossen Test-Files mit vielen Assertions ist die `vi.hoisted`-Variante pragmatischer.

### Referenzen
- `src/components/missions/__tests__/MissionBanner.test.tsx` (Slice 161) — erstes Mock-Expansion-Beispiel
- `src/components/fantasy/__tests__/EventCommunityTab.test.tsx` (Slice 162) — Vote-Handler Test-Migration
- `src/components/community/hooks/__tests__/useCommunityActions.test.ts` (Slice 162) — act+waitFor Pattern auf 7 Tests angewandt + queryClient mock expanded
- `src/components/fantasy/__tests__/CreatePredictionModal.test.tsx` (Slice 163) — Service-direkt-Mock-Pattern
- `src/components/community/hooks/__tests__/useCommunityActions.test.ts` (Slice 170) — vi.hoisted-Pattern fuer shared mock-reference (Pattern 5)
