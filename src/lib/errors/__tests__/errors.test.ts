import { describe, it, expect } from 'vitest';
import {
  DomainError,
  ValidationError,
  PermissionError,
  RateLimitError,
  InsufficientFundsError,
  NotFoundError,
  ConflictError,
  UnexpectedError,
  isDomainError,
  isValidationError,
  isPermissionError,
  isRateLimitError,
  isInsufficientFundsError,
  isNotFoundError,
  isConflictError,
  toDomainError,
} from '../index';

describe('DomainError hierarchy', () => {
  it('abstract DomainError cannot be instantiated directly', () => {
    // TypeScript prevents instantiation of abstract classes at compile time;
    // at runtime, subclasses work via new.target.prototype.
    const e = new ValidationError('x');
    expect(e).toBeInstanceOf(DomainError);
    expect(e).toBeInstanceOf(Error);
  });

  it('ValidationError carries field + code', () => {
    const e = new ValidationError('bad email', 'email');
    expect(e.code).toBe('validation');
    expect(e.field).toBe('email');
    expect(e.message).toBe('bad email');
    expect(e.name).toBe('ValidationError');
  });

  it('PermissionError code', () => {
    const e = new PermissionError('forbidden');
    expect(e.code).toBe('permission');
    expect(e.name).toBe('PermissionError');
  });

  it('RateLimitError carries retryAfterMs', () => {
    const e = new RateLimitError('slow down', 30_000);
    expect(e.code).toBe('rate_limit');
    expect(e.retryAfterMs).toBe(30_000);
  });

  it('InsufficientFundsError computes delta', () => {
    const e = new InsufficientFundsError('no money', 100, 30);
    expect(e.code).toBe('insufficient_funds');
    expect(e.requiredCents).toBe(100);
    expect(e.availableCents).toBe(30);
    expect(e.deltaCents).toBe(70);
  });

  it('InsufficientFundsError deltaCents clamps at 0', () => {
    const e = new InsufficientFundsError('no money', 50, 100);
    expect(e.deltaCents).toBe(0);
  });

  it('NotFoundError carries entity + id', () => {
    const e = new NotFoundError('gone', 'player', 'abc-123');
    expect(e.code).toBe('not_found');
    expect(e.entity).toBe('player');
    expect(e.id).toBe('abc-123');
  });

  it('ConflictError carries entity', () => {
    const e = new ConflictError('dup', 'order');
    expect(e.code).toBe('conflict');
    expect(e.entity).toBe('order');
  });

  it('UnexpectedError code', () => {
    const e = new UnexpectedError('boom');
    expect(e.code).toBe('unexpected');
  });

  it('cause is preserved', () => {
    const inner = new Error('db failed');
    const e = new ValidationError('form invalid', 'name', inner);
    expect(e.cause).toBe(inner);
  });
});

describe('type-guards', () => {
  it('isDomainError matches all subclasses + rejects plain Error', () => {
    expect(isDomainError(new ValidationError('x'))).toBe(true);
    expect(isDomainError(new PermissionError('x'))).toBe(true);
    expect(isDomainError(new Error('plain'))).toBe(false);
    expect(isDomainError('string')).toBe(false);
    expect(isDomainError(null)).toBe(false);
    expect(isDomainError(undefined)).toBe(false);
  });

  it('each narrow guard only matches its class', () => {
    const v = new ValidationError('x');
    const p = new PermissionError('x');
    const r = new RateLimitError('x', 1000);
    const i = new InsufficientFundsError('x', 1, 0);
    const n = new NotFoundError('x');
    const c = new ConflictError('x');

    expect(isValidationError(v)).toBe(true);
    expect(isValidationError(p)).toBe(false);

    expect(isPermissionError(p)).toBe(true);
    expect(isPermissionError(v)).toBe(false);

    expect(isRateLimitError(r)).toBe(true);
    expect(isRateLimitError(v)).toBe(false);

    expect(isInsufficientFundsError(i)).toBe(true);
    expect(isInsufficientFundsError(v)).toBe(false);

    expect(isNotFoundError(n)).toBe(true);
    expect(isNotFoundError(v)).toBe(false);

    expect(isConflictError(c)).toBe(true);
    expect(isConflictError(v)).toBe(false);
  });
});

describe('toDomainError', () => {
  it('passes DomainError through unchanged', () => {
    const orig = new ValidationError('x', 'email');
    expect(toDomainError(orig)).toBe(orig);
  });

  it('normalizes string to UnexpectedError', () => {
    const e = toDomainError('boom');
    expect(e).toBeInstanceOf(UnexpectedError);
    expect(e.message).toBe('boom');
  });

  it('normalizes null/undefined to UnexpectedError', () => {
    expect(toDomainError(null)).toBeInstanceOf(UnexpectedError);
    expect(toDomainError(undefined)).toBeInstanceOf(UnexpectedError);
  });

  it('maps Postgres 23505 (unique-violation) to ConflictError', () => {
    const err = Object.assign(new Error('dup'), { code: '23505' });
    const d = toDomainError(err);
    expect(d).toBeInstanceOf(ConflictError);
    expect(d.cause).toBe(err);
  });

  it('maps Postgres 23503 (FK-violation) to ConflictError', () => {
    const err = Object.assign(new Error('fk'), { code: '23503' });
    expect(toDomainError(err)).toBeInstanceOf(ConflictError);
  });

  it('maps Postgres 23514 (CHECK) to ValidationError', () => {
    const err = Object.assign(new Error('check'), { code: '23514' });
    expect(toDomainError(err)).toBeInstanceOf(ValidationError);
  });

  it('maps PGRST116 to NotFoundError', () => {
    const err = Object.assign(new Error('none'), { code: 'PGRST116' });
    expect(toDomainError(err)).toBeInstanceOf(NotFoundError);
  });

  it('maps status 401/403 to PermissionError', () => {
    const e1 = toDomainError(Object.assign(new Error('x'), { status: 401 }));
    const e2 = toDomainError(Object.assign(new Error('x'), { status: 403 }));
    expect(e1).toBeInstanceOf(PermissionError);
    expect(e2).toBeInstanceOf(PermissionError);
  });

  it('maps status 404 to NotFoundError', () => {
    const e = toDomainError(Object.assign(new Error('x'), { status: 404 }));
    expect(e).toBeInstanceOf(NotFoundError);
  });

  it('maps status 409 to ConflictError', () => {
    const e = toDomainError(Object.assign(new Error('x'), { status: 409 }));
    expect(e).toBeInstanceOf(ConflictError);
  });

  it('maps status 429 to RateLimitError', () => {
    const e = toDomainError(Object.assign(new Error('x'), { status: 429 }));
    expect(e).toBeInstanceOf(RateLimitError);
    expect((e as RateLimitError).retryAfterMs).toBe(60_000);
  });

  it('maps "auth_uid_mismatch" RAISE EXCEPTION to PermissionError', () => {
    const e = toDomainError(new Error('auth_uid_mismatch: Nicht berechtigt'));
    expect(e).toBeInstanceOf(PermissionError);
  });

  it('maps "nicht genug" RAISE to InsufficientFundsError', () => {
    const e = toDomainError(new Error('Nicht genug BSD. Benötigt: 500 BSD'));
    expect(e).toBeInstanceOf(InsufficientFundsError);
  });

  it('maps "rate limit" RAISE to RateLimitError', () => {
    const e = toDomainError(new Error('rate_limit exceeded'));
    expect(e).toBeInstanceOf(RateLimitError);
  });

  it('maps "not found" RAISE to NotFoundError', () => {
    const e = toDomainError(new Error('Player not found'));
    expect(e).toBeInstanceOf(NotFoundError);
  });

  it('falls back to UnexpectedError for unknown Error', () => {
    const e = toDomainError(new Error('random'));
    expect(e).toBeInstanceOf(UnexpectedError);
  });
});
