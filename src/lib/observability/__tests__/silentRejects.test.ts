import { describe, it, expect, beforeEach, vi } from 'vitest';

const captureExceptionMock = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}));

import { logSilentRejects } from '../silentRejects';

describe('logSilentRejects', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    captureExceptionMock.mockReset();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('no-ops on empty array', () => {
    logSilentRejects('test.label', []);
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('no-ops when all fulfilled', () => {
    const results: PromiseSettledResult<number>[] = [
      { status: 'fulfilled', value: 1 },
      { status: 'fulfilled', value: 2 },
    ];
    logSilentRejects('test.allOk', results);
    expect(captureExceptionMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('captures one rejected (Error instance) with index + label tag', () => {
    const err = new Error('boom');
    const results: PromiseSettledResult<number>[] = [
      { status: 'fulfilled', value: 1 },
      { status: 'rejected', reason: err },
      { status: 'fulfilled', value: 3 },
    ];
    logSilentRejects('test.oneFail', results);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const [capturedErr, ctx] = captureExceptionMock.mock.calls[0];
    expect(capturedErr).toBe(err);
    expect(ctx).toEqual({
      tags: { silentReject: 'true', label: 'test.oneFail' },
      extra: { index: 1, totalResults: 3 },
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[silentReject] test.oneFail[1]:',
      err,
    );
  });

  it('captures multiple rejected in order with correct indexes', () => {
    const err1 = new Error('fail-0');
    const err2 = new Error('fail-2');
    const results: PromiseSettledResult<string>[] = [
      { status: 'rejected', reason: err1 },
      { status: 'fulfilled', value: 'ok' },
      { status: 'rejected', reason: err2 },
    ];
    logSilentRejects('test.multi', results);
    expect(captureExceptionMock).toHaveBeenCalledTimes(2);
    const call0 = captureExceptionMock.mock.calls[0];
    const call1 = captureExceptionMock.mock.calls[1];
    expect(call0[0]).toBe(err1);
    expect(call0[1].extra.index).toBe(0);
    expect(call1[0]).toBe(err2);
    expect(call1[1].extra.index).toBe(2);
  });

  it('wraps string reason in Error', () => {
    const results: PromiseSettledResult<number>[] = [
      { status: 'rejected', reason: 'plain string failure' },
    ];
    logSilentRejects('test.stringReason', results);
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const [capturedErr] = captureExceptionMock.mock.calls[0];
    expect(capturedErr).toBeInstanceOf(Error);
    expect((capturedErr as Error).message).toBe('plain string failure');
  });
});
