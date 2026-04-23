/**
 * API-Route Logger Wrapper.
 *
 * Slice 175 — Tier D1.
 *
 * Usage:
 *   export const GET = withLogger('cron.sync-injuries', async (req, { log }) => {
 *     log.info('starting sync');
 *     // ... work ...
 *     return NextResponse.json({ ok: true });
 *   });
 *
 * Guarantees:
 * - RequestID auto-generated (crypto.randomUUID)
 * - Start-log with route + method + url
 * - End-log with latencyMs + status
 * - Unhandled errors captured to logger + Sentry + re-thrown (Next.js renders 500)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger, type Logger } from './logger';
import { captureError } from './captureError';
import { toDomainError } from '@/lib/errors';

export type LoggerContext = {
  log: Logger;
  requestId: string;
};

type RouteHandler<TParams = unknown> = (
  req: NextRequest,
  ctx: LoggerContext & { params?: TParams },
) => Promise<Response> | Response;

export function withLogger<TParams = unknown>(
  route: string,
  handler: RouteHandler<TParams>,
) {
  return async (
    req: NextRequest,
    routeCtx?: { params?: TParams },
  ): Promise<Response> => {
    const requestId =
      req.headers.get('x-request-id') ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);

    const log = logger.child({
      requestId,
      route,
      method: req.method,
    });

    const startedAt = Date.now();
    log.info(
      { url: req.nextUrl.pathname + req.nextUrl.search },
      'request.start',
    );

    try {
      const response = await handler(req, {
        log,
        requestId,
        params: routeCtx?.params,
      });

      const latencyMs = Date.now() - startedAt;
      log.info(
        { status: response.status, latencyMs },
        'request.end',
      );

      // Propagate RequestID to caller for distributed tracing.
      try {
        response.headers.set('x-request-id', requestId);
      } catch {
        // Headers may be immutable on some response types — non-fatal.
      }

      return response;
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      const domainErr = toDomainError(err);

      log.error(
        {
          err: domainErr,
          code: domainErr.code,
          latencyMs,
        },
        'request.error',
      );

      captureError(domainErr, { route, requestId });

      // Re-throw so Next.js produces 500. Consumer can choose to return 4xx via
      // normal returns — only unhandled exceptions land here.
      throw err;
    }
  };
}

/**
 * Helper: build a NextResponse.json with RequestID header.
 * Use inside handlers for consistent tracing headers.
 */
export function jsonResponse<T>(
  data: T,
  init?: ResponseInit & { requestId?: string },
): NextResponse<T> {
  const headers = new Headers(init?.headers);
  if (init?.requestId) headers.set('x-request-id', init.requestId);
  return NextResponse.json(data, { ...init, headers });
}
