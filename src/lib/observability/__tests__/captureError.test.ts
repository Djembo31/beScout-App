import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import {
  ValidationError,
  InsufficientFundsError,
  RateLimitError,
  NotFoundError,
  ConflictError,
} from '@/lib/errors';
import { captureError, captureMessage } from '../captureError';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

type CapturedExceptionOpts = {
  level?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id: string };
};

function lastExceptionCall(): [unknown, CapturedExceptionOpts] {
  const call = vi.mocked(Sentry.captureException).mock.calls[0] as unknown as [
    unknown,
    CapturedExceptionOpts,
  ];
  return call;
}

describe('captureError (slice 176)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts domain-error code into tags', () => {
    const err = new ValidationError('bad email', 'email');
    captureError(err);

    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    const [captured, options] = lastExceptionCall();
    expect(captured).toBe(err);
    expect(options.tags).toMatchObject({ code: 'validation' });
    expect(options.extra).toMatchObject({ field: 'email' });
  });

  it('merges context tags (feature, route, slice, requestId)', () => {
    const err = new RateLimitError('slow', 30_000);
    captureError(err, {
      feature: 'trade',
      route: '/api/buy',
      slice: '178',
      requestId: 'req-abc',
    });

    const [, options] = lastExceptionCall();
    expect(options.tags).toMatchObject({
      code: 'rate_limit',
      feature: 'trade',
      route: '/api/buy',
      slice: '178',
      requestId: 'req-abc',
    });
    expect(options.extra).toMatchObject({ retryAfterMs: 30_000 });
  });

  it('sets userId as Sentry user.id tag', () => {
    captureError(new NotFoundError('gone'), { userId: 'user-xyz' });
    const [, options] = lastExceptionCall();
    expect(options.user).toEqual({ id: 'user-xyz' });
  });

  it('normalizes unknown (string) error via toDomainError', () => {
    captureError('boom');
    const [captured, options] = lastExceptionCall();
    expect((captured as Error).message).toBe('boom');
    expect(options.tags).toMatchObject({ code: 'unexpected' });
  });

  it('normalizes Postgres-code errors to typed DomainError', () => {
    const pgErr = Object.assign(new Error('dup'), { code: '23505' });
    captureError(pgErr);
    const [, options] = lastExceptionCall();
    expect(options.tags).toMatchObject({ code: 'conflict' });
  });

  it('extracts InsufficientFunds delta + required + available', () => {
    const err = new InsufficientFundsError('no money', 100, 30);
    captureError(err, { feature: 'buy' });
    const [, options] = lastExceptionCall();
    expect(options.extra).toMatchObject({
      requiredCents: 100,
      availableCents: 30,
      deltaCents: 70,
    });
  });

  it('passes explicit level when provided', () => {
    captureError(new ValidationError('x'), { level: 'warning' });
    const [, options] = lastExceptionCall();
    expect(options.level).toBe('warning');
  });

  it('defaults level to "error"', () => {
    captureError(new ValidationError('x'));
    const [, options] = lastExceptionCall();
    expect(options.level).toBe('error');
  });

  it('extracts cause from wrapped Postgres-error (slice 176b)', () => {
    const pgErr = Object.assign(new Error('duplicate key value'), {
      code: '23505',
      detail: 'Key (slug)=(x) already exists.',
      constraint: 'clubs_slug_key',
    });
    const err = new ConflictError('dup club', 'club', pgErr);
    captureError(err);

    const [, options] = lastExceptionCall();
    expect(options.tags).toMatchObject({ code: 'conflict' });
    expect(options.extra).toMatchObject({
      entity: 'club',
      cause: {
        name: 'Error',
        message: 'duplicate key value',
        code: '23505',
        detail: 'Key (slug)=(x) already exists.',
        constraint: 'clubs_slug_key',
      },
    });
  });

  it('omits cause when DomainError has none (slice 176b)', () => {
    captureError(new ValidationError('bad', 'email'));
    const [, options] = lastExceptionCall();
    expect(options.extra).not.toHaveProperty('cause');
  });

  it('serialises string cause (slice 176b)', () => {
    const err = new ConflictError('dup', 'user', 'raw string reason');
    captureError(err);
    const [, options] = lastExceptionCall();
    expect(options.extra).toMatchObject({
      cause: { message: 'raw string reason' },
    });
  });

  it('redacts PII value in Postgres detail for sensitive column (slice 176c)', () => {
    const pgErr = Object.assign(new Error('duplicate key'), {
      code: '23505',
      detail: 'Key (email)=(user@example.com) already exists.',
      constraint: 'users_email_key',
    });
    captureError(new ConflictError('dup email', 'user', pgErr));
    const [, options] = lastExceptionCall();
    const cause = (options.extra as { cause?: { detail?: string } }).cause;
    expect(cause?.detail).toBe('Key (email)=([REDACTED]) already exists.');
  });

  it('preserves detail value for non-sensitive column (slice 176c)', () => {
    const pgErr = Object.assign(new Error('duplicate key'), {
      code: '23505',
      detail: 'Key (slug)=(fc-bayern) already exists.',
      constraint: 'clubs_slug_key',
    });
    captureError(new ConflictError('dup slug', 'club', pgErr));
    const [, options] = lastExceptionCall();
    const cause = (options.extra as { cause?: { detail?: string } }).cause;
    expect(cause?.detail).toBe('Key (slug)=(fc-bayern) already exists.');
  });

  it('redacts case-insensitively (slice 176c)', () => {
    const pgErr = Object.assign(new Error('dup'), {
      code: '23505',
      detail: 'Key (EMAIL)=(user@x.com) already exists.',
    });
    captureError(new ConflictError('dup', 'user', pgErr));
    const [, options] = lastExceptionCall();
    const cause = (options.extra as { cause?: { detail?: string } }).cause;
    expect(cause?.detail).toBe('Key (EMAIL)=([REDACTED]) already exists.');
  });

  it('redacts multiple sensitive columns in same detail (slice 176c)', () => {
    const pgErr = Object.assign(new Error('multi-unique'), {
      code: '23505',
      detail: 'Key (email)=(a@b.com), Key (phone)=(+49123).',
    });
    captureError(new ConflictError('multi', 'user', pgErr));
    const [, options] = lastExceptionCall();
    const cause = (options.extra as { cause?: { detail?: string } }).cause;
    expect(cause?.detail).toBe(
      'Key (email)=([REDACTED]), Key (phone)=([REDACTED]).',
    );
  });

  it('redacts referral_code (user-bound secret, slice 176c Finding #1)', () => {
    const pgErr = Object.assign(new Error('dup'), {
      code: '23505',
      detail: 'Key (referral_code)=(ABC123XYZ) already exists.',
    });
    captureError(new ConflictError('dup referral', 'profile', pgErr));
    const [, options] = lastExceptionCall();
    const cause = (options.extra as { cause?: { detail?: string } }).cause;
    expect(cause?.detail).toBe(
      'Key (referral_code)=([REDACTED]) already exists.',
    );
  });

  it('keeps non-sensitive when mixed with sensitive (slice 176c)', () => {
    const pgErr = Object.assign(new Error('mixed'), {
      code: '23505',
      detail: 'Key (slug)=(fc-bayern), Key (email)=(a@b.com).',
    });
    captureError(new ConflictError('mixed', 'x', pgErr));
    const [, options] = lastExceptionCall();
    const cause = (options.extra as { cause?: { detail?: string } }).cause;
    expect(cause?.detail).toBe(
      'Key (slug)=(fc-bayern), Key (email)=([REDACTED]).',
    );
  });

  it('leaves free-text detail untouched (slice 176c)', () => {
    const pgErr = Object.assign(new Error('gen'), {
      code: '42P01',
      detail: 'relation "foo" does not exist',
    });
    captureError(new ConflictError('missing', 'table', pgErr));
    const [, options] = lastExceptionCall();
    const cause = (options.extra as { cause?: { detail?: string } }).cause;
    expect(cause?.detail).toBe('relation "foo" does not exist');
  });
});

describe('captureMessage (slice 176)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls Sentry.captureMessage with level + tags + user', () => {
    captureMessage('wallet-cache-miss', 'warning', {
      feature: 'trade',
      userId: 'user-1',
    });

    const call = vi.mocked(Sentry.captureMessage).mock.calls[0] as unknown as [
      string,
      { level?: string; tags?: Record<string, string>; user?: { id: string } },
    ];
    expect(call[0]).toBe('wallet-cache-miss');
    expect(call[1]?.level).toBe('warning');
    expect(call[1]?.tags).toMatchObject({ feature: 'trade' });
    expect(call[1]?.user).toEqual({ id: 'user-1' });
  });

  it('defaults level to "info"', () => {
    captureMessage('hello');
    const call = vi.mocked(Sentry.captureMessage).mock.calls[0] as unknown as [
      string,
      { level?: string },
    ];
    expect(call[1]?.level).toBe('info');
  });
});
