import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { parseBody } from '../parseBody';
import { ValidationError, isDomainError } from '@/lib/errors';

/** Build a minimal NextRequest-compatible stub for tests. */
function mockReq(body: unknown, opts: { invalidJson?: boolean } = {}): NextRequest {
  return {
    json: () =>
      opts.invalidJson
        ? Promise.reject(new SyntaxError('Unexpected token'))
        : Promise.resolve(body),
  } as unknown as NextRequest;
}

const TestSchema = z.object({
  name: z.string().min(2),
  age: z.number().int().nonnegative(),
});

describe('parseBody (slice 177)', () => {
  it('returns parsed data on valid input', async () => {
    const data = await parseBody(mockReq({ name: 'Anil', age: 40 }), TestSchema);
    expect(data).toEqual({ name: 'Anil', age: 40 });
  });

  it('throws ValidationError with code=validation on schema mismatch', async () => {
    await expect(parseBody(mockReq({ name: 'X', age: -1 }), TestSchema))
      .rejects.toThrow(ValidationError);
  });

  it('sets field path on ValidationError from first issue', async () => {
    try {
      await parseBody(mockReq({ name: 'A', age: 0 }), TestSchema);
      throw new Error('should not reach');
    } catch (err) {
      expect(isDomainError(err)).toBe(true);
      if (isDomainError(err)) {
        expect(err.code).toBe('validation');
        // First failing field is "name" (too short)
        expect((err as { field?: string }).field).toBe('name');
      }
    }
  });

  it('throws ValidationError with message=invalid_json on json-parse fail', async () => {
    try {
      await parseBody(mockReq(null, { invalidJson: true }), TestSchema);
      throw new Error('should not reach');
    } catch (err) {
      expect(isDomainError(err)).toBe(true);
      if (isDomainError(err)) {
        expect(err.code).toBe('validation');
        expect(err.message).toBe('invalid_json');
      }
    }
  });

  it('attaches ZodError as cause for debugging', async () => {
    try {
      await parseBody(mockReq({ name: 'A', age: -1 }), TestSchema);
      throw new Error('should not reach');
    } catch (err) {
      if (isDomainError(err)) {
        expect(err.cause).toBeDefined();
      }
    }
  });
});
