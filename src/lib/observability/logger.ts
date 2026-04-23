/**
 * Structured JSON logger based on pino.
 *
 * Slice 175 — Tier D1 (Sorare/Socios Standard).
 *
 * Dev: `pino-pretty` formatted, human-readable.
 * Prod: raw JSON lines, ingested by Vercel → Datadog/Axiom queryable.
 *
 * Usage:
 *   import { logger } from '@/lib/observability/logger';
 *   logger.info({ userId, action: 'buyPlayer' }, 'trade executed');
 *
 *   // Child logger bound to request context:
 *   const log = logger.child({ requestId, route: '/api/cron/sync' });
 *   log.info('phase A start');
 *   log.error({ err, phase: 'B' }, 'phase B failed');
 *
 * Sensitive-Field Redaction: `password`, `token`, `authorization`, `apiKey`,
 * `serviceRoleKey`, `bearer` and nested `headers.authorization` are redacted to
 * `[REDACTED]` automatically — never logged in plaintext.
 */

import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug');

// Pino-Pretty only in dev. Prod = raw JSON for log-ingestion.
const transport = isProd
  ? undefined
  : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    };

export const logger = pino({
  level: logLevel,
  transport,
  base: {
    app: 'bescout',
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local',
  },
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'apiKey',
      'api_key',
      'serviceRoleKey',
      'service_role_key',
      'bearer',
      '*.password',
      '*.token',
      '*.authorization',
      '*.apiKey',
      'headers.authorization',
      'headers.cookie',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  // Avoid leaking full Error prototype chain into logs; keep message + stack.
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
});

/**
 * Creates a child logger bound to stable context fields.
 * Use for per-request / per-job logs where the same fields appear on every line.
 */
export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

export type Logger = typeof logger;
