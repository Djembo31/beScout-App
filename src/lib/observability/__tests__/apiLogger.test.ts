import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// vi.hoisted: shared mock-instances between vi.mock-factory and test-body.
// Plain `const` is NOT hoisted alongside vi.mock and would fail with
// "Cannot access before initialization". See testing.md §5.
const { loggerChildMock, loggerInfoMock, loggerErrorMock, captureErrorMock } =
  vi.hoisted(() => ({
    loggerChildMock: vi.fn(),
    loggerInfoMock: vi.fn(),
    loggerErrorMock: vi.fn(),
    captureErrorMock: vi.fn(),
  }));

vi.mock('../logger', () => {
  const childLogger = {
    info: loggerInfoMock,
    error: loggerErrorMock,
  };
  return {
    logger: {
      child: (bindings: unknown) => {
        loggerChildMock(bindings);
        return childLogger;
      },
    },
  };
});

vi.mock('../captureError', () => ({
  captureError: (err: unknown, ctx?: unknown) => captureErrorMock(err, ctx),
}));

import { withLogger } from '../apiLogger';

function mockReq(opts: {
  method?: string;
  pathname?: string;
  search?: string;
  headers?: Record<string, string>;
} = {}): NextRequest {
  const headers = new Map(Object.entries(opts.headers ?? {}));
  return {
    method: opts.method ?? 'GET',
    nextUrl: {
      pathname: opts.pathname ?? '/api/test',
      search: opts.search ?? '',
    },
    headers: {
      get: (k: string) => headers.get(k.toLowerCase()) ?? null,
    },
  } as unknown as NextRequest;
}

function mockResponse(status = 200, body?: unknown): Response {
  const headers = new Headers();
  return {
    status,
    headers,
    // Slice 488: withLogger reads clone().json() on 5xx to extract the error message.
    clone() {
      return {
        json: async () => {
          if (body === undefined) throw new Error('no body');
          return body;
        },
      };
    },
  } as unknown as Response;
}

describe('withLogger (slice 175c)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs request.start with url + method via logger.child', async () => {
    const wrapped = withLogger('test.route', async () => mockResponse(200));
    await wrapped(mockReq({ pathname: '/api/foo', search: '?x=1' }));

    expect(loggerChildMock).toHaveBeenCalledTimes(1);
    const bindings = loggerChildMock.mock.calls[0][0] as {
      route: string;
      method: string;
      requestId: string;
    };
    expect(bindings.route).toBe('test.route');
    expect(bindings.method).toBe('GET');
    expect(typeof bindings.requestId).toBe('string');
    expect(bindings.requestId.length).toBeGreaterThan(0);

    // First info-call = request.start
    expect(loggerInfoMock).toHaveBeenCalledWith(
      { url: '/api/foo?x=1' },
      'request.start',
    );
  });

  it('logs request.end with status + latencyMs', async () => {
    const wrapped = withLogger('test.route', async () => mockResponse(201));
    await wrapped(mockReq());

    // Second info-call = request.end
    const endCall = loggerInfoMock.mock.calls.find(
      (call) => call[1] === 'request.end',
    );
    expect(endCall).toBeDefined();
    const payload = endCall![0] as { status: number; latencyMs: number };
    expect(payload.status).toBe(201);
    expect(typeof payload.latencyMs).toBe('number');
    expect(payload.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('propagates x-request-id from request headers', async () => {
    const wrapped = withLogger('test.route', async () => mockResponse(200));
    const incoming = 'req-inbound-abc';
    await wrapped(mockReq({ headers: { 'x-request-id': incoming } }));

    const bindings = loggerChildMock.mock.calls[0][0] as { requestId: string };
    expect(bindings.requestId).toBe(incoming);
  });

  it('generates fresh requestId when absent', async () => {
    const wrapped = withLogger('test.route', async () => mockResponse(200));
    await wrapped(mockReq());

    const bindings = loggerChildMock.mock.calls[0][0] as { requestId: string };
    // Either crypto.randomUUID (36 chars) or fallback `req_<ts>_<rand>`
    expect(bindings.requestId.length).toBeGreaterThanOrEqual(16);
  });

  it('sets x-request-id header on response', async () => {
    const wrapped = withLogger('test.route', async () => mockResponse(200));
    const response = await wrapped(
      mockReq({ headers: { 'x-request-id': 'req-outbound-xyz' } }),
    );

    expect(response.headers.get('x-request-id')).toBe('req-outbound-xyz');
  });

  it('calls captureError and re-throws on handler error', async () => {
    const boom = new Error('handler-boom');
    const wrapped = withLogger('test.error-route', async () => {
      throw boom;
    });

    await expect(wrapped(mockReq())).rejects.toThrow('handler-boom');

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    const [capturedErr, ctx] = captureErrorMock.mock.calls[0];
    // toDomainError wraps non-DomainError in UnexpectedError
    expect((capturedErr as Error).message).toBe('handler-boom');
    expect((ctx as { route: string; requestId: string }).route).toBe(
      'test.error-route',
    );
    expect(typeof (ctx as { requestId: string }).requestId).toBe('string');
  });

  it('logs request.error with code + latencyMs on handler throw', async () => {
    const wrapped = withLogger('test.error-route', async () => {
      throw new Error('fail');
    });
    await expect(wrapped(mockReq())).rejects.toThrow();

    expect(loggerErrorMock).toHaveBeenCalledTimes(1);
    const payload = loggerErrorMock.mock.calls[0][0] as {
      code: string;
      latencyMs: number;
    };
    expect(typeof payload.code).toBe('string');
    expect(typeof payload.latencyMs).toBe('number');
  });

  it('captures a RETURNED 5xx response (S369/488 — not just thrown errors)', async () => {
    const wrapped = withLogger('test.cron', async () =>
      mockResponse(500, { error: 'permission denied for table wallets' }),
    );
    const response = await wrapped(mockReq());

    // Response is returned normally (not thrown) — caller still gets it.
    expect(response.status).toBe(500);
    // But it IS now captured to Sentry.
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    const [capturedErr, ctx] = captureErrorMock.mock.calls[0];
    expect((capturedErr as Error).message).toBe('permission denied for table wallets');
    const c = ctx as { route: string; requestId: string; extra: { status: number } };
    expect(c.route).toBe('test.cron');
    expect(typeof c.requestId).toBe('string');
    expect(c.extra.status).toBe(500);
  });

  it('captures a 5xx with no/non-JSON body via http_<status> fallback', async () => {
    const wrapped = withLogger('test.cron', async () => mockResponse(503));
    await wrapped(mockReq());

    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    const [capturedErr] = captureErrorMock.mock.calls[0];
    expect((capturedErr as Error).message).toBe('http_503');
  });

  it('does NOT capture 2xx / 4xx returned responses (no Sentry noise)', async () => {
    for (const status of [200, 201, 400, 401, 404]) {
      vi.clearAllMocks();
      const wrapped = withLogger('test.route', async () =>
        mockResponse(status, { error: 'client error' }),
      );
      await wrapped(mockReq());
      expect(captureErrorMock).not.toHaveBeenCalled();
    }
  });

  it('passes params through to handler for dynamic routes', async () => {
    let capturedCtx: { params?: { id: string } } | null = null;
    const wrapped = withLogger<{ id: string }>('test.dyn', async (_req, ctx) => {
      capturedCtx = ctx as { params?: { id: string } };
      return mockResponse(200);
    });
    await wrapped(mockReq(), { params: { id: 'abc-123' } });

    expect(capturedCtx).not.toBeNull();
    expect(capturedCtx!.params).toEqual({ id: 'abc-123' });
  });
});
