import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { useCachedPlaceholder } from '../useCachedPlaceholder';

// Mock the underlying localStorage reader so we control the cached value.
const { mockReadCached } = vi.hoisted(() => ({ mockReadCached: vi.fn() }));
vi.mock('@/lib/utils/cachedQuery', () => ({ readCached: mockReadCached }));

/**
 * The SSR-safety contract (Slice 474): the hook MUST return `undefined` on the
 * FIRST render (server + client first paint identical) and only return the
 * cached value AFTER mount. A synchronous first-render read would diverge
 * (server has no localStorage → undefined; client → cached value) and cause a
 * React #418/#423 hydration mismatch (the bug this hook fixes).
 */
describe('useCachedPlaceholder — SSR-safe cache read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadCached.mockReturnValue({ balance: 1250147 });
  });

  it('returns undefined on first render, cached value after mount', () => {
    const renders: Array<unknown> = [];
    function Probe() {
      const v = useCachedPlaceholder('bs_wallet', 'user-1');
      renders.push(v);
      return null;
    }
    render(<Probe />);

    // First render (hydration-equivalent) MUST be undefined — matches the server.
    expect(renders[0]).toBeUndefined();
    // After the mount effect, the cached value is applied.
    expect(renders[renders.length - 1]).toEqual({ balance: 1250147 });
  });

  it('returns undefined when uid is undefined (logged-out), never reads cache', () => {
    const renders: Array<unknown> = [];
    function Probe() {
      const v = useCachedPlaceholder('bs_tickets', undefined);
      renders.push(v);
      return null;
    }
    render(<Probe />);

    expect(renders.every((r) => r === undefined)).toBe(true);
    expect(mockReadCached).not.toHaveBeenCalled();
  });
});
