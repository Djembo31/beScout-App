import type { NextRequest } from 'next/server';
import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@/lib/errors';

/**
 * Slice 177 — Tier B1 Foundation.
 *
 * Parse + validate a Next.js request body against a Zod schema.
 *
 * Error-paths:
 *   - Invalid JSON → `ValidationError('invalid_json')`
 *   - Schema mismatch → `ValidationError(<first-issue-message>, <field-path>, zodError)`
 *
 * ValidationError is the Slice-174 DomainError class. Caller can:
 *   - `try { await parseBody(req, Schema) } catch (err) { ... captureError(err) ... }`
 *   - OR let withLogger (Slice 175) auto-catch and render 500 (not ideal — returns 400 explicit in handler preferred)
 *
 * Returns parsed + typed data. Input type is `unknown`-safe: JSON parse is
 * wrapped in try/catch; Zod.parse throws its own ZodError re-wrapped below.
 */
export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch (err) {
    throw new ValidationError('invalid_json', undefined, err);
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = firstIssue(result.error);
    throw new ValidationError(first.message, first.fieldPath, result.error);
  }
  return result.data;
}

/**
 * Extract a human-readable field-path + message from a ZodError.
 * We don't expose the full Zod issue-array to the API consumer; callers
 * that need fine-grained details can inspect `cause` on the thrown
 * ValidationError.
 */
function firstIssue(err: ZodError): { fieldPath: string | undefined; message: string } {
  const issue = err.issues[0];
  if (!issue) return { fieldPath: undefined, message: 'validation_failed' };
  const fieldPath = issue.path.length > 0 ? issue.path.join('.') : undefined;
  return { fieldPath, message: issue.message };
}
