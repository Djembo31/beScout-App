/**
 * Domain Error hierarchy for BeScout services.
 *
 * Slice 174 — Tier A3 Foundation.
 *
 * Services THROW typed errors. UI type-checks via `instanceof` or type-guards
 * and renders error-class-specific CTAs (Top-Up on InsufficientFunds, Retry-Timer
 * on RateLimit, etc).
 *
 * NEVER throw raw `new Error('string')` in services migrated to this foundation.
 * Raw strings hide semantic info and force consumers into string-matching.
 */

export type ErrorCode =
  | 'validation'
  | 'permission'
  | 'rate_limit'
  | 'insufficient_funds'
  | 'not_found'
  | 'conflict'
  | 'unexpected';

/**
 * Abstract base class. Do not instantiate directly — use a subclass.
 * Services that throw DomainError must pick the most specific subclass.
 */
export abstract class DomainError extends Error {
  public abstract readonly code: ErrorCode;
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.cause = cause;
    // Ensure correct prototype chain after transpile
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * ValidationError — client-side input invalid.
 * Caller SHOULD show the `field` near the offending input.
 */
export class ValidationError extends DomainError {
  public readonly code = 'validation' as const;
  constructor(
    message: string,
    public readonly field?: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

/**
 * PermissionError — user not authorized for this operation.
 * UI SHOULD show login-prompt or "not allowed" message.
 */
export class PermissionError extends DomainError {
  public readonly code = 'permission' as const;
}

/**
 * RateLimitError — too many requests in time window.
 * UI SHOULD show retry-timer using `retryAfterMs`.
 */
export class RateLimitError extends DomainError {
  public readonly code = 'rate_limit' as const;
  constructor(
    message: string,
    public readonly retryAfterMs: number,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

/**
 * InsufficientFundsError — wallet/balance below required amount.
 * UI SHOULD show Top-Up-CTA with delta (requiredCents - availableCents).
 */
export class InsufficientFundsError extends DomainError {
  public readonly code = 'insufficient_funds' as const;
  constructor(
    message: string,
    public readonly requiredCents: number,
    public readonly availableCents: number,
    cause?: unknown,
  ) {
    super(message, cause);
  }

  public get deltaCents(): number {
    return Math.max(0, this.requiredCents - this.availableCents);
  }
}

/**
 * NotFoundError — entity does not exist or is not visible to caller.
 */
export class NotFoundError extends DomainError {
  public readonly code = 'not_found' as const;
  constructor(
    message: string,
    public readonly entity?: string,
    public readonly id?: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

/**
 * ConflictError — concurrent modification or duplicate-key violation.
 * UI SHOULD refetch and retry once, then show generic error.
 */
export class ConflictError extends DomainError {
  public readonly code = 'conflict' as const;
  constructor(
    message: string,
    public readonly entity?: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

/**
 * UnexpectedError — catch-all for unknown errors normalized via `toDomainError`.
 * Consumers should log to Sentry and show generic error toast.
 */
export class UnexpectedError extends DomainError {
  public readonly code = 'unexpected' as const;
}

// ────────────────────────────────────────────────────────────────────────────
// Type-Guards
// ────────────────────────────────────────────────────────────────────────────

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}

export function isValidationError(err: unknown): err is ValidationError {
  return err instanceof ValidationError;
}

export function isPermissionError(err: unknown): err is PermissionError {
  return err instanceof PermissionError;
}

export function isRateLimitError(err: unknown): err is RateLimitError {
  return err instanceof RateLimitError;
}

export function isInsufficientFundsError(err: unknown): err is InsufficientFundsError {
  return err instanceof InsufficientFundsError;
}

export function isNotFoundError(err: unknown): err is NotFoundError {
  return err instanceof NotFoundError;
}

export function isConflictError(err: unknown): err is ConflictError {
  return err instanceof ConflictError;
}

// ────────────────────────────────────────────────────────────────────────────
// Normalizer
// ────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes any thrown value into a DomainError subclass.
 *
 * Recognizes:
 * - Existing DomainError → passthrough
 * - Supabase PostgresError by `code` prefix (23xxx = integrity, 42xxx = syntax)
 * - Supabase AuthError by `status` (401/403)
 * - Postgres custom RAISE EXCEPTION messages (heuristic on known substrings)
 * - Unknown → UnexpectedError
 *
 * Used at service-boundaries to guarantee downstream consumers see typed errors.
 */
export function toDomainError(err: unknown): DomainError {
  if (err instanceof DomainError) return err;

  if (err instanceof Error) {
    const message = err.message;
    const maybeCode = (err as { code?: unknown }).code;
    const codeStr = typeof maybeCode === 'string' ? maybeCode : undefined;
    const maybeStatus = (err as { status?: unknown }).status;
    const statusNum = typeof maybeStatus === 'number' ? maybeStatus : undefined;

    // Postgres unique-violation + FK-violation → Conflict
    if (codeStr === '23505' || codeStr === '23503') {
      return new ConflictError(message, undefined, err);
    }

    // Postgres check-constraint / not-null → Validation
    if (codeStr === '23514' || codeStr === '23502') {
      return new ValidationError(message, undefined, err);
    }

    // Postgres no-data-found
    if (codeStr === 'PGRST116' || codeStr === '02000') {
      return new NotFoundError(message, undefined, undefined, err);
    }

    // HTTP-style status
    if (statusNum === 401 || statusNum === 403) {
      return new PermissionError(message, err);
    }
    if (statusNum === 404) {
      return new NotFoundError(message, undefined, undefined, err);
    }
    if (statusNum === 409) {
      return new ConflictError(message, undefined, err);
    }
    if (statusNum === 429) {
      return new RateLimitError(message, 60_000, err);
    }

    // Heuristic: RAISE EXCEPTION from our SECURITY DEFINER RPCs
    if (/auth_uid_mismatch|nicht berechtigt|forbidden/i.test(message)) {
      return new PermissionError(message, err);
    }
    if (/nicht genug|insufficient.*funds|balance/i.test(message)) {
      return new InsufficientFundsError(message, 0, 0, err);
    }
    if (/rate.?limit|too many requests/i.test(message)) {
      return new RateLimitError(message, 60_000, err);
    }
    if (/not.?found|does not exist/i.test(message)) {
      return new NotFoundError(message, undefined, undefined, err);
    }

    return new UnexpectedError(message, err);
  }

  if (typeof err === 'string') {
    return new UnexpectedError(err);
  }

  return new UnexpectedError('Unknown error', err);
}
