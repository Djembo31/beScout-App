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

### Click auf first()-Locator live-re-rendernder Listen (Slice 282a, 2026-06-11)
- `page.locator('a[href*="/player/"]').first()` auf /market (oder anderen Listen mit Realtime-/Preis-Updates): Element ist `isVisible()`-true, wird aber nie click-"stable" — Playwright retried bis Timeout (`2 × waiting for element to be visible, enabled and stable … 14 × retrying click action`). Symptom-Signatur: failt fast-deterministisch (33/36 Daily-Runs), sieht aus wie Cold-Start, ist es nicht.
- Diagnose-Reihenfolge: ERST Warm-Up-/Netzwerk-Logs pruefen (`[warm-up] ✅ 200` = Cold-Start ausgeschlossen), DANN Click-Stability verdaechtigen.
- Fix fuer Render-Coverage-Tests (synthetic/smoke): href extrahieren + `page.goto(href)` statt `click()` — Click-Mechanik gehoert in dedizierte Interaction-Tests, nicht in Page-Render-Walks.
- Anti-Pattern: Timeout hochdrehen — Liste re-rendert weiter, das verschiebt nur den Fail.
- Reference: `e2e/synthetic-users.spec.ts` Profile B (Slice 282a Fix), Master-Tracker #25/#67-Klasse.

### Contract-Level E2E gegen Live-Prod (Slice 293, 2026-06-13)

**Problem:** Render-Smoke gegen Live-Prod mit konditionalen Assertions (`if (await X.isVisible())` ohne `else`-Fail) **kann nicht fehlschlagen** — verschwindet ein Tab/Disclaimer/Daten-Pfad, bleibt der Test grün (pre-293 `e2e/fantasy.spec.ts`). Andererseits sind Wert-Assertions („Event X mit Score Y") gegen Live-Prod flaky, weil der Backend-State (Gameweek, Events) sich bewegt.

**Lösung — Contract statt Wert:** Assert die *Struktur* die unabhängig von volatilen Daten immer wahr sein muss:
1. **Auth+Geo erreichbar** — `goto` → `status<500`, pathname strict-equals Ziel (kein client-side Redirect zu /login, Slice 282b), `main` visible.
2. **Compliance** — Pflicht-Disclaimer sichtbar (harter Anker auf i18n-Text).
3. **Daten-Pfad resolved** — Loading-Early-Return cleared via downstream-element-presence (z.B. „Nav-Tabs sichtbar" beweist „Skeleton weg", weil Skeleton ein früherer early-return ist) + Error-Early-Return-Text **absent** (`toHaveCount(0)`). Beweist „Query resolved", NICHT „Daten existieren".
4. **No-crash** — `page.on('pageerror')` sammelt uncaught Exceptions → `toHaveLength(0)`.
5. **No i18n-leak** — sichtbarer Text matcht NICHT `/\b(namespace|…)\.[a-z][a-zA-Z]{2,}\b/`.
6. **Mobile** — `documentElement.scrollWidth - clientWidth ≤ 1` (≤1px Sub-Pixel-Toleranz).

Deterministisch über jeden Backend-State UND brüchig gegen echte Bugs. 0 offene Events / leeres RPC-Array = „resolved" (Skeleton-weg + Error-absent), kein Fehler.

**Run:** Own-login (kein storageState) gegen bescout.net, gespiegelt von beta-smoke. `retries:1` + nightly Warm-Up (SO-4) gegen Cold-Start. Neuer Spec → eigenes playwright-Projekt + `test:<x>` Script + non-blocking nightly-Trigger (`continue-on-error` bis Stabilität bewiesen, dann zum Gate promoten).

**Anti-Pattern:** `getByText('<error-string>')` ohne `{ exact: true }` als Error-**Absence**-Check, wenn der String über i18n-Namespaces dupliziert ist und sich nur in Interpunktion unterscheidet (Slice 293 F-2: `fantasy.dataLoadFailed` ohne Punkt vs `common.errorLoadFailed`/`fantasy.loadError` mit Punkt). Substring-Match fängt die Perioden-Varianten mit → widert die Failure-Surface über die Intention hinaus. Fix: `{ exact: true }`.

**Reference:** `e2e/fantasy-lifecycle.spec.ts` (Slice 293). Blueprint reusable für /club, /clubs Lifecycle-E2Es (Demo-Step 8). Active-Tab-Anker: `toHaveClass(/text-gold/)` auf dem geklickten Nav-Button.

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

## Anti-Pattern: vi.spyOn + mockRestore auf bereits-gemockter vi.fn (Slice 282, 2026-06-11)

`vi.spyOn(supabase, 'from')` auf einem Object dessen `from` BEREITS eine `vi.fn()` aus einem Mock-Module ist (z.B. `@/test/mocks/supabase`) gibt die existierende Mock-Fn zurück — `mockRestore()` löscht dann deren `mockImplementation`. Alle Folge-Queries im selben Test-File laufen auf `undefined` (`Cannot read properties of undefined (reading 'select')`).

Fix-Pattern: Call-Counts direkt über die Mock-Property lesen, kein spy/restore:
```ts
const fromMock = supabase.from as unknown as Mock;
const before = fromMock.mock.calls.length;
await serviceCall();
expect(fromMock.mock.calls.length - before).toBe(2);
```

Reference: `src/lib/services/__tests__/players-byIds-movers.test.ts` (Chunk-Boundary-Test).

## Anti-Pattern: vi.resetModules() + dynamic-import-pro-Test (Slice SO-3 Heal, 2026-05-04)

Wenn ein Test-File für jedes `it(...)` `vi.resetModules()` + `await import()` aufruft (oft genannt `loadHeader()` / `loadFresh()`), **wird der Test-Runner systemisch flaky** auf vollen Test-Suiten (3000+ Tests). Erste Test-Iteration kostet 3-10s JSDOM-Warmup + Module-Re-Transform; bei Pre-Push-Hook-Lauf mit Worker-Memory-Pressure kann der `getByRole(...)`-Lookup im sub-Render-Cycle den 30s-Timeout treffen → `MultipleElementsFoundError` weil das DOM noch nicht stabilisiert ist.

**Symptom:**
- Test passt isoliert (`vitest run path/to/file.test.tsx`)
- Test failt intermittent in `pnpm exec vitest run` Full-Suite-Run
- Erste Test-Iteration dauert 3-10s, Folge-Tests <300ms
- Failure-Output zeigt `getMultipleElementsFoundError` oder `Element not found` obwohl DOM klar gerendert wurde

**Anti-Pattern (verboten ab Slice SO-3):**
```ts
async function loadHeader() {
  vi.resetModules();
  const Header = (await import('@/components/layout/LeagueScopeHeader')).LeagueScopeHeader;
  const store = (await import('../leagueScopeStore')).useLeagueScope;
  return { Header, store };
}

it('renders ...', async () => {
  const { Header } = await loadHeader();  // ← 3-10s erste Iteration
  render(<Header />);
  // ... assertions
});
```

**Fix-Pattern (Slice SO-3):** Static imports + Zustand-Store-Reset:
```ts
// vi.mock-Factories oben (vitest hoisted automatisch)
vi.mock('@/lib/leagues', () => ({...}));
vi.mock('@/lib/queryClient', () => ({...}));

// Static imports NACH den vi.mock-Calls
import { LeagueScopeHeader } from '@/components/layout/LeagueScopeHeader';
import { useLeagueScope } from '../leagueScopeStore';

beforeEach(() => {
  vi.clearAllMocks();
  // Mocks setzen
  mockGetCountries.mockReturnValue(COUNTRIES);
  // Zustand store reset (replaces vi.resetModules)
  useLeagueScope.getState().resetToDefault();
});

it('renders ...', () => {
  render(<LeagueScopeHeader />);  // ← <500ms erste Iteration
  // ...
});
```

**Voraussetzung:** Der Zustand-Store muss eine `resetToDefault()`-Action haben. Falls nicht: per `useStore.setState({ ...initialState })` direkt setzen, oder Action ergänzen.

**Verifikation der Determinismus-Reparatur:**
```bash
for i in 1 2 3 4 5; do
  echo "=== RUN $i ==="
  CI=true pnpm exec vitest run path/to/file.test.tsx --reporter=verbose 2>&1 | grep -E "Duration|passed|failed"
done
# Alle 5 Runs: PASS + Duration <10s + Worst-Test <600ms
```

**Reference:** Slice SO-3 Heal von Sign-Off-Re-Trial #2 RISK-6 — `LeagueScopeHeader.test.tsx` first-iteration 3500ms→280ms, intermittent-fail seit Slice 251 → 5/5 deterministic PASS.

**Beziehung zu Pattern 5 (vi.hoisted für shared mock-reference):** Komplementär. Pattern 5 löst Singleton-Import-Migration, Anti-Pattern-Heal löst Test-Init-Latency-Flakiness. Beide kombinierbar im selben Test-File.
