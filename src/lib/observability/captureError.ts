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

import { captureException, captureMessage as sentryCaptureMessage } from '@sentry/nextjs';
import type { SeverityLevel } from '@sentry/nextjs';
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
  level?: SeverityLevel;
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

  captureException(domainErr, {
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
  level: SeverityLevel = 'info',
  ctx: CaptureContext = {},
): void {
  const tags: Record<string, string> = {};
  if (ctx.feature) tags.feature = ctx.feature;
  if (ctx.route) tags.route = ctx.route;
  if (ctx.slice) tags.slice = ctx.slice;
  if (ctx.requestId) tags.requestId = ctx.requestId;

  sentryCaptureMessage(message, {
    level,
    tags,
    user: ctx.userId ? { id: ctx.userId } : undefined,
    extra: ctx.extra,
  });
}

/**
 * Extract per-class fields from DomainError subclasses as extra-context.
 * Without this, Sentry would only see `name + message + stack`.
 *
 * Slice 176b: `cause` added — preserves Postgres error-code/diagnostic when a
 * DomainError wraps a native driver error (e.g. ConflictError wrapping a 23505).
 */
function extractDomainContext(err: unknown): Record<string, unknown> {
  if (!isDomainError(err)) return {};

  const out: Record<string, unknown> = {};
  const rec = err as unknown as Record<string, unknown>;

  if (typeof rec.field === 'string') out.field = rec.field;
  if (typeof rec.entity === 'string') out.entity = rec.entity;
  if (typeof rec.id === 'string') out.id = rec.id;
  if (typeof rec.retryAfterMs === 'number') out.retryAfterMs = rec.retryAfterMs;
  if (typeof rec.requiredCents === 'number') out.requiredCents = rec.requiredCents;
  if (typeof rec.availableCents === 'number') out.availableCents = rec.availableCents;
  if (typeof rec.deltaCents === 'number') out.deltaCents = rec.deltaCents;

  if (rec.cause !== undefined && rec.cause !== null) {
    out.cause = serializeCause(rec.cause);
  }

  return out;
}

/**
 * Flatten an arbitrary `cause` value into a serialisable, Sentry-friendly
 * shape. Preserves Postgres driver fields (`code`, `detail`, `constraint`)
 * without leaking stack-traces or cycles.
 *
 * Slice 176c: Postgres `detail` field is redacted for PII-bearing columns
 * (email, phone, handle, ...) — the 23505/23503 format `Key (col)=(val)`
 * would otherwise leak user-entered values into Sentry-extra.
 */
function serializeCause(cause: unknown): Record<string, unknown> {
  if (cause instanceof Error) {
    const rec = cause as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {
      name: cause.name,
      message: cause.message,
    };
    if (typeof rec.code === 'string' || typeof rec.code === 'number') {
      out.code = rec.code;
    }
    if (typeof rec.status === 'number') out.status = rec.status;
    if (typeof rec.detail === 'string') out.detail = redactPgDetail(rec.detail);
    if (typeof rec.constraint === 'string') out.constraint = rec.constraint;
    return out;
  }
  if (typeof cause === 'string') return { message: cause };
  if (typeof cause === 'object') {
    try {
      return JSON.parse(JSON.stringify(cause));
    } catch {
      return { message: '[unserialisable cause]' };
    }
  }
  return { value: String(cause) };
}

/**
 * Columns whose values MUST be redacted in Postgres `detail`-strings.
 * Matched case-insensitively against the column-name captured from
 * `Key (col)=(val)` patterns in 23505 / 23503 errors.
 */
const PII_REDACT_COLUMNS = new Set([
  'email',
  'phone',
  'phone_number',
  'handle',
  'username',
  'first_name',
  'last_name',
  'full_name',
  'password',
  // Invite-tokens & secrets — not RFC-4973-PII but user-bound secrets that
  // must not leak between accounts via Sentry-UI.
  'referral_code',
  'api_key',
  'session_token',
  'device_token',
]);

/**
 * Redact user-entered values from Postgres `detail` strings.
 *
 * Postgres 23505/23503 emit `Key (col)=(val) already exists.` — when the
 * column is PII-bearing (email, phone, handle, ...), `val` is user input
 * and MUST NOT land in Sentry.
 *
 * Non-matching detail-strings pass through untouched.
 */
function redactPgDetail(detail: string): string {
  return detail.replace(
    /Key \(([^)]+)\)=\(([^)]*)\)/g,
    (match, col: string, _val: string) => {
      const normalised = col.trim().toLowerCase();
      if (PII_REDACT_COLUMNS.has(normalised)) {
        return `Key (${col})=([REDACTED])`;
      }
      return match;
    },
  );
}
