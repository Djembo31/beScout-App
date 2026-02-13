/**
 * Supabase Client Mock for unit tests.
 *
 * Usage in tests:
 *   import { mockSupabaseResponse, mockSupabaseRpc } from '@/test/mocks/supabase';
 *
 *   // Before each test, set the mock return value:
 *   mockSupabaseResponse({ id: '1', name: 'Test' }, null);
 *
 *   // Then call the service under test — it will receive the mocked data.
 */
import { vi } from 'vitest';

// ============================================
// Chainable query builder mock
// ============================================

let _mockData: unknown = null;
let _mockError: { message: string; code?: string } | null = null;
let _mockCount: number | null = null;

/** Set the data/error that the next supabase query chain will return */
export function mockSupabaseResponse(
  data: unknown,
  error: { message: string; code?: string } | null = null,
): void {
  _mockData = data;
  _mockError = error;
}

/** Set count for head:true queries */
export function mockSupabaseCount(count: number): void {
  _mockCount = count;
}

/** Set an RPC response */
export function mockSupabaseRpc(
  data: unknown,
  error: { message: string; code?: string } | null = null,
): void {
  _mockData = data;
  _mockError = error;
}

function createResult() {
  return {
    data: _mockData,
    error: _mockError,
    count: _mockCount,
  };
}

/** Builds a chainable mock that mimics the Supabase PostgREST builder */
function createQueryBuilder(): Record<string, unknown> {
  const builder: Record<string, unknown> = {};

  const chainMethods = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'contains',
    'containedBy',
    'range',
    'order',
    'limit',
    'offset',
    'match',
    'not',
    'filter',
    'or',
    'textSearch',
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Terminal methods that return the final result
  builder['single'] = vi.fn().mockImplementation(() => createResult());
  builder['maybeSingle'] = vi.fn().mockImplementation(() => createResult());

  // Make the builder itself thenable so `await supabase.from(...).select(...)` works
  builder['then'] = vi.fn().mockImplementation(
    (resolve: (val: unknown) => void) => resolve(createResult()),
  );

  return builder;
}

// ============================================
// Mock supabase client
// ============================================

export const mockSupabase = {
  from: vi.fn().mockImplementation(() => createQueryBuilder()),
  rpc: vi.fn().mockImplementation(() => createResult()),
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
