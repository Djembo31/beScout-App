import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Slice 369 AC2: a malformed VAPID key makes web-push.setVapidDetails THROW.
// The fail-safe must catch it so a fire-and-forget push never bubbles a 500 onto
// the money path — sendPushToUser must RESOLVE (not reject) when the key is bad.
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(() => {
      throw new Error('Vapid private key must be a URL safe Base 64 (without "=")');
    }),
    sendNotification: vi.fn(),
  },
}));
vi.mock('@/lib/observability/captureError', () => ({ captureError: vi.fn() }));

describe('ensureVapid fail-safe (Slice 369)', () => {
  const env = process.env;
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env, NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'BIsqP4U3ZlMt', VAPID_PRIVATE_KEY: '3_qXXZI5wN' };
  });
  afterEach(() => { process.env = env; });

  it('sendPushToUser resolves (no throw) when setVapidDetails throws on a bad key', async () => {
    const { sendPushToUser } = await import('@/lib/services/pushSender');
    await expect(sendPushToUser('user-1', { title: 'Order filled' })).resolves.toBeUndefined();
  });

  it('captures the error exactly once (no per-push spam)', async () => {
    const { captureError } = await import('@/lib/observability/captureError');
    vi.mocked(captureError).mockClear(); // mock fn survives resetModules; scope the count to this test
    const { sendPushToUser } = await import('@/lib/services/pushSender');
    await sendPushToUser('user-1', { title: 'a' });
    await sendPushToUser('user-2', { title: 'b' }); // 2nd call short-circuits on _vapidFailed
    expect(captureError).toHaveBeenCalledTimes(1);
  });
});
