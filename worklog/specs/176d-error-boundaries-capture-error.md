# Slice 176d — Error-Boundaries Batch-Migration auf captureError

**Typ:** S-Slice (15 Files, 1-Line-Change je File). Money-Path: Nein. Follow-up aus `worklog/reviews/176-review.md` Candidate #4.
**Impact:** skipped (UI-Error-Boundaries, kein Backend-Consumer).

---

## Ziel

Alle 15 Next.js Route-level Error-Boundaries (`src/app/**/error.tsx`) nutzen aktuell `console.error('<Section> error:', error)` im `useEffect` — **ohne Sentry-Call**. React-Render-Errors in Sub-Routes gehen silent an Sentry vorbei.

Fix: Migration auf `captureError(error, { feature: '<section>-error-boundary', route: '<path>', extra: digest })`. Konsistent mit Slice 176b (`global-error.tsx` bereits migriert).

---

## Betroffene Files (15)

| # | File | feature-Tag |
|---|------|-------------|
| 1 | `src/app/(app)/error.tsx` | `app-error-boundary` |
| 2 | `src/app/(auth)/error.tsx` | `auth-error-boundary` |
| 3 | `src/app/(app)/bescout-admin/error.tsx` | `admin-error-boundary` |
| 4 | `src/app/(app)/club/[slug]/error.tsx` | `club-error-boundary` |
| 5 | `src/app/(app)/club/[slug]/admin/error.tsx` | `club-admin-error-boundary` |
| 6 | `src/app/(app)/clubs/error.tsx` | `clubs-error-boundary` |
| 7 | `src/app/(app)/community/error.tsx` | `community-error-boundary` |
| 8 | `src/app/(app)/compare/error.tsx` | `compare-error-boundary` |
| 9 | `src/app/(app)/fantasy/error.tsx` | `fantasy-error-boundary` |
| 10 | `src/app/(app)/market/error.tsx` | `market-error-boundary` |
| 11 | `src/app/(app)/missions/error.tsx` | `missions-error-boundary` |
| 12 | `src/app/(app)/player/[id]/error.tsx` | `player-error-boundary` |
| 13 | `src/app/(app)/profile/error.tsx` | `profile-error-boundary` |
| 14 | `src/app/(app)/profile/[handle]/error.tsx` | `public-profile-error-boundary` |
| 15 | `src/app/(app)/profile/settings/error.tsx` | `profile-settings-error-boundary` |

---

## Aenderung je File

**Vorher:**
```tsx
import { useEffect } from 'react';
// ...
useEffect(() => {
  console.error('<Section> error:', error);
}, [error]);
```

**Nachher:**
```tsx
import { useEffect } from 'react';
import { captureError } from '@/lib/observability/captureError';
// ...
useEffect(() => {
  captureError(error, {
    feature: '<section>-error-boundary',
    extra: error.digest ? { digest: error.digest } : undefined,
  });
}, [error]);
```

**Ausnahme:** `src/app/(app)/error.tsx` behaelt die `attemptStaleCodeRecovery()`-Logik und den TypeError-Branch — `captureError`-Call ERSETZT nur den `console.error` Call.

---

## Acceptance Criteria

1. **A1** — Jede der 15 Files importiert `captureError` aus `@/lib/observability/captureError`
2. **A2** — `console.error` durch `captureError(error, { feature: '<slug>-error-boundary', extra: ... })` ersetzt
3. **A3** — `feature`-Tag eindeutig pro Boundary (kein Duplikat)
4. **A4** — `error.digest` (Next.js-Feature) wird in `extra` durchgereicht
5. **A5** — `src/app/(app)/error.tsx` behaelt Stale-Code-Recovery-Logik intakt (TypeError-Branch + attemptStaleCodeRecovery)
6. **A6** — Kein verbleibendes `console.error` in den 15 Files (Sentry ist jetzt primary channel)
7. **A7** — tsc clean

---

## Proof-Plan

`worklog/proofs/176d-boundaries.txt` — tsc clean + `grep -c 'captureError' src/app/**/error.tsx` Count (15 Files) + `grep console.error src/app/**/error.tsx` soll leer sein.

---

## Scope-Out

- Keine neuen Tests — UI-Boundaries sind Integration-Pfade, getestet via 176/176b Wrapper-Tests + Playwright-E2E nach Deploy
- Keine UI-Aenderungen (Styling/i18n/Layout bleibt)
- Keine Migration von `error` Prop-Typ
- `global-error.tsx` ist bereits in Slice 176b migriert

---

## Time-Estimate

~15 min (repetitives 1-Line-Change-Pattern).
