/**
 * Unified Sentry-capture wrapper.
 *
 * Slice 176 — Tier D2 (Sorare/Socios Standard).
 *
 * Automatically tags DomainError codes from Slice 174.
 * Normalizes unknown errors via `toDomainError` so every Sentry event has a
 * consistent shape (code, message, cause).
 *
 * Usage:
 *   captureError(err, { feature: 'trade', userId });
 *   captureError(err); // minimal — just the error
 *   captureMessage('wallet-cache-miss', 'warning', { userId });
 *
 * Replaces direct `Sentry.captureException(err, { tags: {...} })` callsites.
 */

import * as Sentry from '@sentry/nextjs';
import { isDomainError, toDomainError, type ErrorCode } from '@/lib/errors';

export type CaptureContext = {
  /** Stable feature identifier — `trade`, `fantasy`, `onboarding`, ... */
  feature?: string;
  /** User performing the action — never logs PII, just UUID */
  userId?: string;
  /** Route/path in the app (UI) or API */
  route?: string;
  /** Request ID for distributed tracing (matches `x-request-id` header) */
  requestId?: string;
  /** Slice-ID for cohort-tracking */
  slice?: string;
  /** Arbitrary extra context — serialised via Sentry `extra` */
  extra?: Record<string, unknown>;
  /** Override level — defaults to `error` */
  level?: Sentry.SeverityLevel;
};

/**
 * Capture an error to Sentry with automatic DomainError-code tagging.
 *
 * - If `err` is a DomainError, `tags.code` is set from `err.code`
 * - If `err` is unknown, normalized via `toDomainError` first
 * - Tags merged from `ctx` (feature, userId, route, requestId, slice)
 * - Extra context attached via `ctx.extra`
 */
export function captureError(err: unknown, ctx: CaptureContext = {}): void {
  const domainErr = toDomainError(err);
  const code: ErrorCode = domainErr.code;

  const tags: Record<string, string> = { code };
  if (ctx.feature) tags.feature = ctx.feature;
  if (ctx.route) tags.route = ctx.route;
  if (ctx.slice) tags.slice = ctx.slice;
  if (ctx.requestId) tags.requestId = ctx.requestId;

  Sentry.captureException(domainErr, {
    level: ctx.level ?? 'error',
    tags,
    user: ctx.userId ? { id: ctx.userId } : undefined,
    extra: {
      ...(ctx.extra ?? {}),
      ...(isDomainError(err) ? extractDomainContext(err) : {}),
    },
  });
}

/**
 * Capture a non-error Sentry event (breadcrumb-like message).
 * Use for operational events that aren't errors but merit visibility.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  ctx: CaptureContext = {},
): void {
  const tags: Record<string, string> = {};
  if (ctx.feature) tags.feature = ctx.feature;
  if (ctx.route) tags.route = ctx.route;
  if (ctx.slice) tags.slice = ctx.slice;
  if (ctx.requestId) tags.requestId = ctx.requestId;

  Sentry.captureMessage(message, {
    level,
    tags,
    user: ctx.userId ? { id: ctx.userId } : undefined,
    extra: ctx.extra,
  });
}

/**
 * Extract per-class fields from DomainError subclasses as extra-context.
 * Without this, Sentry would only see `name + message + stack`.
 */
function extractDomainContext(err: unknown): Record<string, unknown> {
  if (!isDomainError(err)) return {};

  const out: Record<string, unknown> = {};
  const rec = err as unknown as Record<string, unknown>;

  // Common structured fields across subclasses:
  if (typeof rec.field === 'string') out.field = rec.field;
  if (typeof rec.entity === 'string') out.entity = rec.entity;
  if (typeof rec.id === 'string') out.id = rec.id;
  if (typeof rec.retryAfterMs === 'number') out.retryAfterMs = rec.retryAfterMs;
  if (typeof rec.requiredCents === 'number') out.requiredCents = rec.requiredCents;
  if (typeof rec.availableCents === 'number') out.availableCents = rec.availableCents;
  if (typeof rec.deltaCents === 'number') out.deltaCents = rec.deltaCents;

  return out;
}
