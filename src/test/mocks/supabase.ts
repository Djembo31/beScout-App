/**
 * Supabase Client Mock v2 — Table-Aware + Call-Sequence + RPC-Aware
 *
 * ## New API (v2):
 *   import { mockTable, mockRpc, resetMocks } from '@/test/mocks/supabase';
 *
 *   beforeEach(() => resetMocks());
 *
 *   // Table-specific responses:
 *   mockTable('events', { status: 'registering', max_entries: 30 });
 *   mockTable('lineups', null);  // no existing lineup
 *
 *   // RPC-specific responses:
 *   mockRpc('buy_player_dpc', { success: true, price_per_dpc: 500 });
 *
 *   // Call-sequence (FIFO queue per table):
 *   mockTable('players', { is_liquidated: false });  // 1st call
 *   mockTable('players', { club_id: 'club-1' });     // 2nd call
 *
 * ## Legacy API (v1 — backward compatible):
 *   import { mockSupabaseResponse, mockSupabaseRpc } from '@/test/mocks/supabase';
 *   mockSupabaseResponse({ id: '1' });  // sets fallback for all tables
 */
import { vi } from 'vitest';

// ============================================
// State
// ============================================

type MockResponse = {
  data: unknown;
  error: { message: string; code?: string } | null;
  count?: number | null;
};

/** Per-table response queues (FIFO) */
const _tableQueues = new Map<string, MockResponse[]>();
/** Per-RPC response queues (FIFO) */
const _rpcQueues = new Map<string, MockResponse[]>();
/** Fallback for unregistered tables/RPCs (legacy API) */
let _fallback: MockResponse = { data: null, error: null };

// ============================================
// v2 API
// ============================================

/** Reset all mock state. Call in beforeEach(). */
export function resetMocks(): void {
  _tableQueues.clear();
  _rpcQueues.clear();
  _fallback = { data: null, error: null };
  mockSupabase.from.mockClear();
  mockSupabase.rpc.mockClear();
}

/**
 * Set response for a specific table. Multiple calls queue responses (FIFO).
 * If only one response is queued, it's reused for all calls (sticky).
 */
export function mockTable(
  table: string,
  data: unknown,
  error: { message: string; code?: string } | null = null,
  count?: number | null,
): void {
  const queue = _tableQueues.get(table) ?? [];
  queue.push({ data, error, count: count ?? null });
  _tableQueues.set(table, queue);
}

/**
 * Set response for a specific RPC function. Multiple calls queue responses (FIFO).
 */
export function mockRpc(
  fnName: string,
  data: unknown,
  error: { message: string; code?: string } | null = null,
): void {
  const queue = _rpcQueues.get(fnName) ?? [];
  queue.push({ data, error });
  _rpcQueues.set(fnName, queue);
}

/** Set fallback response for unregistered tables/RPCs */
export function mockFallback(
  data: unknown,
  error: { message: string; code?: string } | null = null,
): void {
  _fallback = { data, error };
}

// ============================================
// Legacy v1 API (backward compatible)
// ============================================

/** @deprecated Use mockTable() or mockFallback() instead */
export function mockSupabaseResponse(
  data: unknown,
  error: { message: string; code?: string } | null = null,
): void {
  _fallback = { data, error };
}

/** @deprecated Use mockTable() with count param instead */
export function mockSupabaseCount(count: number): void {
  _fallback = { ..._fallback, count };
}

/** @deprecated Use mockRpc() instead */
export function mockSupabaseRpc(
  data: unknown,
  error: { message: string; code?: string } | null = null,
): void {
  _fallback = { data, error };
}

// ============================================
// Response resolution
// ============================================

function getResponse(queue: Map<string, MockResponse[]>, key: string): MockResponse {
  const q = queue.get(key);
  if (q && q.length > 0) {
    // Sticky: if only 1 item, reuse it. If multiple, dequeue (FIFO).
    return q.length === 1 ? q[0] : q.shift()!;
  }
  return _fallback;
}

// ============================================
// Chainable query builder
// ============================================

function createQueryBuilder(table: string): Record<string, unknown> {
  const builder: Record<string, unknown> = {};

  const chainMethods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in', 'contains', 'containedBy',
    'range', 'order', 'limit', 'offset', 'match', 'not', 'filter', 'or', 'textSearch',
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  const getResult = () => getResponse(_tableQueues, table);
  builder['single'] = vi.fn().mockImplementation(getResult);
  builder['maybeSingle'] = vi.fn().mockImplementation(getResult);
  builder['then'] = vi.fn().mockImplementation(
    (resolve: (val: unknown) => void) => resolve(getResult()),
  );

  return builder;
}

// ============================================
// Mock supabase client
// ============================================

export const mockSupabase = {
  from: vi.fn().mockImplementation((table: string) => createQueryBuilder(table)),
  rpc: vi.fn().mockImplementation((fnName: string) => getResponse(_rpcQueues, fnName)),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithOtp: vi.fn().mockResolvedValue({ data: null, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.png' } }),
    }),
  },
};

// ============================================
// vi.mock target — mocks @/lib/supabaseClient
// ============================================

vi.mock('@/lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));
