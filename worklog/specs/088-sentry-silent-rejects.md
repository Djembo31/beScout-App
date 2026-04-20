# Slice 088 — Sentry Observability für Promise.allSettled Silent-Rejects

## Ziel (1 Satz)
Residuelle `Promise.allSettled`-Stellen (graceful-degrade-by-design) bekommen Sentry-Observability über einen Utility `logSilentRejects(label, results)` — 3 kritische Stellen als Demo, Rest über Folge-Audit.

## Context
- `@sentry/nextjs@10.38` ist installed, 3 config files vorhanden (client/server/edge, prod-only `enabled`).
- Aktuell NUR 1 Call-Site (`src/app/global-error.tsx` fürs top-level fallback-Error-Boundary).
- 20 `Promise.allSettled`-Stellen in production code. Pattern `result.status === 'fulfilled' ? ... : []` schluckt rejected komplett.
- Slice 086/087 haben 2 Stellen auf `Promise.all` umgebaut (wo graceful-degrade nicht gewollt war). Der Rest ist bewusst `allSettled` — aber unsichtbar wenn was failt.

## Betroffene Files

| Path | Fix |
|------|-----|
| `src/lib/observability/silentRejects.ts` (NEU) | Utility `logSilentRejects(label, results)` + Tests |
| `src/lib/observability/__tests__/silentRejects.test.ts` (NEU) | 5 Unit-Tests (empty, all-fulfilled, 1-rejected, 2-rejected, string-reason) |
| `src/components/providers/AuthProvider.tsx` (Line ~156) | `logSilentRejects('AuthProvider.loadProfile', [p,pRole,cAdmin])` nach allSettled |
| `src/lib/services/platformAdmin.ts` (Line ~39) | `logSilentRejects('platformAdmin.getSystemStats', ...)` nach allSettled |
| `src/features/fantasy/services/scoring.queries.ts` (Line ~354) | `logSilentRejects('scoring.getFullGameweekStatus', ...)` nach allSettled |
| `.claude/rules/common-errors.md` (§1 Silent-Fails) | Pattern dokumentieren |

## Utility-API

```ts
// src/lib/observability/silentRejects.ts
import * as Sentry from "@sentry/nextjs";

export function logSilentRejects<T>(
  label: string,
  results: PromiseSettledResult<T>[]
): void {
  for (let idx = 0; idx < results.length; idx++) {
    const r = results[idx];
    if (r.status !== 'rejected') continue;
    const err = r.reason instanceof Error ? r.reason : new Error(String(r.reason));
    // Dev: console.error. Prod: Sentry (Sentry only enabled in production via config).
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[silentReject] ${label}[${idx}]:`, r.reason);
    }
    Sentry.captureException(err, {
      tags: { silentReject: 'true', label },
      extra: { index: idx, totalResults: results.length },
    });
  }
}
```

## Acceptance Criteria

1. `logSilentRejects` existiert in `src/lib/observability/silentRejects.ts` mit exakt obiger Signature.
2. 5 Unit-Tests passen: empty (0 calls), all-fulfilled (0 calls), 1-rejected (1 captureException + console.error), 2-rejected (2 captureException in richtiger Reihenfolge, korrekte indexes), string-reason wird zu Error gewrappt.
3. 3 Call-Sites rufen `logSilentRejects` mit stabilem Label nach ihrem `Promise.allSettled` auf. Keine Änderung an existing fulfilled/rejected branch-Logik.
4. `npx tsc --noEmit` clean.
5. Existing Tests (AuthProvider, platformAdmin, scoring) nicht gebrochen.
6. common-errors.md §1 hat neuen Punkt "Promise.allSettled + logSilentRejects".

## Edge Cases

- Empty array → no loop iteration → no calls. OK.
- Reason is `undefined` or `null` → `new Error(String(undefined))` = `Error('undefined')`. Acceptable.
- Reason is custom ErrorClass → instanceof Error true → passed-through (stack preserved).
- Sentry.captureException no-ops when `enabled: false` (dev). Safe.
- Label collision across call-sites → tagged same way in Sentry but `extra.index` + stacktrace differ → disambiguable.

## Proof-Plan

- tsc clean
- `npx vitest run src/lib/observability/` → 5/5 pass
- `npx vitest run src/components/providers` AuthProvider tests → unchanged pass
- `npx vitest run src/lib/services/__tests__/platformAdmin.test.ts` (falls existiert) oder scoring — pass
- grep-Verifikation: 3 Call-Sites rufen `logSilentRejects` auf
- Manueller Import-Check: Utility nirgendwo zirkular importiert

## Scope-Out

- Restliche 17 Promise.allSettled-Stellen — via `/silent-fail-audit` Folge-Slice. Keine blind-Migration.
- `.catch(() => null)`-Patterns observable machen — separate Slice.
- Sentry-Breadcrumbs für DB-Queries — separate Slice.
- Sentry-user-context (setUser on login) — separate Slice.
- Sentry-dashboard-config auf sentry.io — out of code-scope.
