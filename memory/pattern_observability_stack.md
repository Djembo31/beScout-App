---
name: Observability Stack (Silent-Fails)
description: Wie Silent-Fails in BeScout systematisch sichtbar gemacht werden — 3-Tier Util-Stack + Audit-CI-Gate
type: reference
---

# Observability Stack (Silent-Fails)

Stand: 2026-04-22 · Slices 087-093 (Observability-Serie).

## Was wird observable gemacht?

Drei Klassen von Silent-Fails in der Codebase:

1. **`Promise.all` vs `Promise.allSettled` Entscheidung falsch** — rejected promises silent als `[]`
2. **`.catch(() => fallback)` arrow-catches** — errors komplett verloren
3. **`if (error) console.error; return null`** — React-Query cached null als SUCCESS (Slice 088 Beispiel)

## 3-Tier Util-Stack

Alle in `src/lib/observability/silentRejects.ts`:

### Tier 1: `Promise.all` mit explicit `.error` (Slice 087)
Wenn **alles oder nichts** — eine failing query bedeutet Gesamtoperation sinnlos:
```ts
const [r1, r2] = await Promise.all([q1, q2]);
if (r1.error) throw new Error(`q1 failed: ${r1.error.message}`);
if (r2.error) throw new Error(`q2 failed: ${r2.error.message}`);
```

### Tier 2: `logSilentRejects(label, results)` (Slice 088)
Wenn **graceful degrade** — partial data ist OK, aber Sentry soll wissen:
```ts
const results = await Promise.allSettled([q1, q2, q3]);
logSilentRejects('module.func', results);
const [r1, r2, r3] = results;
```

### Tier 3: `logSilentCatch(label, err, context?)` (Slice 092)
Bei **catch-arrow mit fallback** — explicit caught error in pipeline:
```ts
const data = await fetchX().catch((err) => {
  logSilentCatch('module.fetchX', err, { entityId });
  return null;
});
```

## Util-Signaturen

```ts
export function logSilentRejects(
  label: string,
  results: ReadonlyArray<PromiseSettledResult<unknown>>
): void;

export function logSilentCatch(
  label: string,
  err: unknown,
  context?: Record<string, unknown>
): void;
```

Beide:
- **Dev**: `console.error` mit `[silentReject]`/`[silentCatch]` prefix
- **Prod**: delegieren an `captureError(err, { feature, extra })` aus `src/lib/observability/captureError.ts` (Slice 176). Sentry-Shape:
  - `tags.feature = 'silentReject' | 'silentCatch'` (stabiler Cohort-Tag)
  - `tags.code` aus DomainError (Slice 174) oder `'unexpected'` bei unknown
  - `extra = { label, index?, totalResults?, ...callerCtx }` (label wandert von tags → extra, weil high-cardinality)
- Non-Error reasons via `toDomainError` in DomainError gewrappt
- **Shape-Change-Notice (Slice 176):** vorher `tags: { silentReject: 'true', label: 'x' }`. Sentry-Saved-Searches die auf `silentReject:true` filtern muessen umgestellt werden auf `feature:silentReject`.

## Audit-Tool

`scripts/silent-fail-audit.ts` — 8 Patterns, automatic regression-guard.

| Pattern | Findet | Integrates with |
|---------|--------|-----------------|
| 1 | `.in()` ohne chunking/range | — |
| 2 | `.select()` ohne range/limit | — |
| 3 | silent catch (empty) | — |
| 4 | if(error) ohne throw/return | — |
| 5 | `const {data} = await supabase` ohne error | — |
| 6 | hart-coded script state-checks | — |
| 7 | `Promise.allSettled` ohne `logSilentRejects` | logSilentRejects |
| 8 | `.catch(() => fallback)` ohne `logSilentCatch` | logSilentCatch |

## CI-Gate (Slice 093)

- `.audit-baseline.json` — committed baseline (total/high/medium counts)
- `npm run audit:silent-fail:check` — vergleicht gegen baseline, exit 1 bei HIGH-increase
- GitHub Actions `lint` job integriert den check
- Baseline-Update-Workflow: bei Fix → counts ansehen → baseline runtersetzen → commit

## Baseline-Progression

| Slice | Event | Total | HIGH | MEDIUM | Sentry Call-Sites |
|-------|-------|-------|------|--------|-------------------|
| Pre-088 | — | 256 | 30 | 226 | 1 (global-error) |
| 085 | /optimize iter 1-3 (precision) | 213 | 113 | 100 | 1 |
| 088 | logSilentRejects + 3 integrations | 213 | 113 | 100 | 4 |
| 089 | allSettled sweep (16 stellen) | 211 | 111 | 100 | 20 |
| 090 | Audit Precision v2 (Pattern 7 + multi-line) | 195 | 98 | 97 | 20 |
| 091 | DB-Invariants fix | 195 | 98 | 97 | 20 |
| 092 | logSilentCatch + Pattern 8 | 193 | 98 | 95 | 25 |
| 093 | CI-Gate aktiv | 193 | 98 | 95 | 25 |

## Wann welchen Tier nehmen?

```
Query scheitert → soll Operation scheitern?
  ├── ja (alles oder nichts)     → Promise.all + explicit .error (Tier 1)
  └── nein (graceful degrade OK) → ist das ein allSettled oder catch-arrow?
      ├── Promise.allSettled  → logSilentRejects (Tier 2)
      └── .catch(() => ...)   → logSilentCatch (Tier 3)
```

## Tier 4: `captureMessage` am erschöpften Recovery-Pfad (Slice 394)

Ein **graceful-degrade-Fallback** (Retry + Cache), dessen finaler „alle Versuche gescheitert"-Zweig nur `console.error` ist, ist ein **Observability-Blindspot**: Sentry sieht 0 Instanzen, die echte Nutzer-Frequenz ist unmessbar — man kann nicht entscheiden, ob ein tieferer Fix nötig ist. Regel: den **erschöpften** Recovery-Pfad (nach Retry, nicht jeden Zwischen-Fehler) mit `captureMessage(name, 'error', { feature, slice, userId, extra })` (`@/lib/observability/captureError`) instrumentieren. `console.error` bleibt für Dev. No-op in dev (Sentry production-only). Bei money-/auth-nahem Pfad: **erst messbar machen, NICHT die Race/RLS-Logik anfassen** (§1 caution over speed) — tieferer Fix erst nach Daten. Kontext-Booleans (`hadCachedProfile`, `isRefresh`) statt PII. Live: `AuthProvider.tsx` `auth.profileLoadFailedAfterRetry` (JWT-Hydration-Race, Cookie-Resume).

## Integration-Sites (nach 093)

**Promise.all (Tier 1) — 1 Stelle** (zusätzlich Slice 087)
- `footballData.ts:getMappingStatus`

**logSilentRejects (Tier 2) — 19 Stellen** in 14 Files
- AuthProvider, platformAdmin, scoring.queries
- useLineupSave, offers × 2, AdminGameweeksTab
- useProfileData, FollowListModal, club.ts
- social.ts × 2, scouting.ts × 4, search.ts, research.ts, pushSender.ts

**logSilentCatch (Tier 3) — 5 Stellen** in 2 Files
- useCommunityData × 3 (getClubBySlug, getUserVotedIds, getUserPollVotedIds)
- gameweek-sync × 2 (fetchLineups, fetchEvents)

## Scope-Out (offen)

- Pattern 9 Kandidat: `if (error) console.error; return null;` in services → `logSilentReturn` util
- Sentry.setUser beim Login — GDPR-scope (CEO)
- Sentry Breadcrumbs für Supabase-Queries — speculative ohne Prod-Zugang
- Husky Pre-commit Hook — nicht installed
- Slack-Notify bei HIGH-increase — integration-scope

## Links

- [common-errors.md §1](/.claude/rules/common-errors.md)
- [Slice 087](worklog/specs/087-upstream-silent-fail-followups.md)
- [Slice 088](worklog/specs/088-sentry-silent-rejects.md)
- [Slice 089](worklog/specs/089-allsettled-sweep.md)
- [Slice 090](worklog/specs/090-audit-precision-v2.md)
- [Slice 091](worklog/specs/091-db-invariants-fix.md)
- [Slice 092](worklog/specs/092-silent-catch-observability.md)
- [Slice 093](worklog/specs/093-audit-baseline-ci-gate.md)
- [/optimize Loop doc](worklog/optimize/silent-fail-precision.md)
