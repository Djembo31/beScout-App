# Slice 092 — Silent-Catch Observability (`logSilentCatch` + Audit Pattern 8)

## Ziel (1 Satz)
Util `logSilentCatch(label, err, context?)` + neuer Audit-Pattern 8, angewendet auf 5 residuelle `.catch(() => fallback)` in Production.

## Betroffene Files

| Path | Fix |
|------|-----|
| `src/lib/observability/silentRejects.ts` | Util erweitern um `logSilentCatch` (reuse Sentry-Pattern) |
| `src/lib/observability/__tests__/silentRejects.test.ts` | +3 Unit-Tests für logSilentCatch |
| `src/components/community/hooks/useCommunityData.ts` | 3 Stellen (Line 93, 119, 120) |
| `src/app/api/cron/gameweek-sync/route.ts` | 2 Stellen (Line 777, 783 — lineups/events fetch fallback) |
| `scripts/silent-fail-audit.ts` | Pattern 8 NEU: `.catch(() => null\|[]\|new Set\|new Map)` → HIGH/MEDIUM |
| `.claude/rules/common-errors.md` | §1 um Pattern 8 ergänzen |

## Skip-Liste
- 3× `req.json().catch(() => ({}))` in admin/cron routes → legitimes body-parse-fallback, NICHT observable machen.

## Util-API

```ts
export function logSilentCatch(
  label: string,
  err: unknown,
  context?: Record<string, unknown>
): void {
  const errObj = err instanceof Error ? err : new Error(String(err));
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[silentCatch] ${label}:`, err);
  }
  Sentry.captureException(errObj, {
    tags: { silentCatch: 'true', label },
    extra: context ?? {},
  });
}
```

## Integration-Pattern

```ts
// Vor:
getClubBySlug(cName, userId!).catch(() => null);

// Nach:
getClubBySlug(cName, userId!).catch((err) => {
  logSilentCatch('useCommunityData.getClubBySlug', err);
  return null;
});
```

## Audit Pattern 8

Regex: `\.catch\s*\(\s*\(\)\s*=>\s*(null|\[\]|new Set|new Map)` — fängt arrow-catch mit silent-fallback-Werten.
- Skip: `\.catch\s*\(\s*\(\)\s*=>\s*\(\{.*\}\)\)` (body-parse `({})`-fallbacks).
- Skip: `logSilentCatch` present in catch-body → resolved.
- isMoneyPath → HIGH, sonst MEDIUM.

## Acceptance Criteria

1. `logSilentCatch` exportiert, 3 neue Unit-Tests (Error-instance, string-reason, context-passed).
2. 5 Call-Sites rufen `logSilentCatch` nach Fehler-Arrow.
3. `req.json().catch(() => ({}))` unberührt.
4. Pattern 8 in Audit-Script aktiv; re-run erzeugt 0 findings (nach Integration instrumented).
5. tsc clean, tangierte Tests grün.
6. common-errors.md §1 Pattern-Count auf 8.
