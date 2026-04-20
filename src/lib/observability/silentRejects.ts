import * as Sentry from '@sentry/nextjs';

/**
 * Logs rejected entries of a Promise.allSettled result to console (dev) + Sentry (prod).
 *
 * Usage after a Promise.allSettled where graceful-degrade is intended:
 *   const results = await Promise.allSettled([q1, q2, q3]);
 *   logSilentRejects('myModule.myFunction', results);
 *   const [r1, r2, r3] = results;
 *   ...
 *
 * Does NOT change fulfilled/rejected routing — pure observation.
 * Sentry.captureException is no-op in dev (enabled: production only in sentry.*.config.ts).
 */
export function logSilentRejects(
  label: string,
  results: ReadonlyArray<PromiseSettledResult<unknown>>
): void {
  for (let idx = 0; idx < results.length; idx++) {
    const r = results[idx];
    if (r.status !== 'rejected') continue;
    const err = r.reason instanceof Error ? r.reason : new Error(String(r.reason));
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[silentReject] ${label}[${idx}]:`, r.reason);
    }
    Sentry.captureException(err, {
      tags: { silentReject: 'true', label },
      extra: { index: idx, totalResults: results.length },
    });
  }
}

/**
 * Logs a caught error to console (dev) + Sentry (prod) while keeping graceful-degrade
 * behavior intact. Use in `.catch()` handlers where a fallback value is returned.
 *
 * Usage:
 *   getClubBySlug(slug, userId).catch((err) => {
 *     logSilentCatch('useCommunityData.getClubBySlug', err);
 *     return null;
 *   });
 *
 * Pure observation — caller decides fallback value.
 */
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
