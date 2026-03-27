import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { DbEvent } from '@/types';
import type { AdminEvent, EventFormState } from '../types';
import { INITIAL_FORM_STATE } from '../types';

// ============================================
// Mocks -- services
// ============================================

const mockCreateEvent = vi.fn();
const mockUpdateEvent = vi.fn();
const mockBulkUpdateStatus = vi.fn();

vi.mock('@/lib/services/events', () => ({
  createEvent: (...args: unknown[]) => mockCreateEvent(...args),
  updateEvent: (...args: unknown[]) => mockUpdateEvent(...args),
  bulkUpdateStatus: (...args: unknown[]) => mockBulkUpdateStatus(...args),
}));

// ============================================
// Mocks -- toast
// ============================================

const mockAddToast = vi.fn();

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

// ============================================
// Mocks -- next-intl
// ============================================

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// ============================================
// Import AFTER mocks
// ============================================

import { useAdminEventsActions } from '../useAdminEventsActions';

// ============================================
// Fixtures + helpers
// ============================================

function makeAdminEvent(overrides: Partial<DbEvent> = {}): AdminEvent {
  return {
    id: 'ev-1',
    name: 'Test Event',
    type: 'club',
    status: 'upcoming',
    format: '7er',
    gameweek: 5,
    entry_fee: 500000,
    prize_pool: 1000000,
    max_entries: 30,
    current_entries: 12,
    starts_at: '2026-04-01T10:00:00Z',
    locks_at: '2026-04-01T12:00:00Z',
    ends_at: '2026-04-02T18:00:00Z',
    scored_at: null,
    created_by: 'admin-1',
    club_id: 'club-1',
    sponsor_name: null,
    sponsor_logo: null,
    event_tier: 'club',
    tier_bonuses: null,
    min_tier: null,
    min_subscription_tier: null,
    salary_cap: null,
    reward_structure: null,
    scope: 'club',
    lineup_size: 7,
    currency: 'tickets',
    ticket_cost: 100,
    min_sc_per_slot: 1,
    wildcards_allowed: false,
    max_wildcards_per_lineup: 0,
    created_at: '2026-03-15T08:00:00Z',
    clubs: { name: 'Test Club', slug: 'test-club' },
    ...overrides,
  } as AdminEvent;
}

/**
 * Create a minimal mock form object matching useEventForm return type.
 * We mock the form object since this hook receives it as a dependency.
 */
function createMockForm(overrides?: Partial<EventFormState>) {
  // Form state must have name + startsAt + locksAt + endsAt to pass the guard
  const form: EventFormState = {
    ...INITIAL_FORM_STATE,
    name: 'New Event',
    startsAt: '2026-04-01T10:00',
    locksAt: '2026-04-01T12:00',
    endsAt: '2026-04-02T18:00',
    ...overrides,
  };

  return {
    form,
    dispatch: vi.fn(),
    setField: vi.fn(),
    reset: vi.fn(),
    populate: vi.fn(),
    clone: vi.fn(),
    isFieldDisabled: vi.fn().mockReturnValue(false),
    isRewardEditorDisabled: vi.fn().mockReturnValue(false),
    buildCreatePayload: vi.fn().mockReturnValue({
      name: 'New Event',
      type: 'club',
      format: '7er',
      gameweek: 1,
      entryFeeCents: 0,
      prizePoolCents: 100000,
      maxEntries: 20,
      startsAt: '2026-04-01T10:00:00.000Z',
      locksAt: '2026-04-01T12:00:00.000Z',
      endsAt: '2026-04-02T18:00:00.000Z',
      createdBy: 'admin-1',
      eventTier: 'club',
      currency: 'tickets',
    }),
    buildUpdatePayload: vi.fn().mockReturnValue({ name: 'Updated Event' }),
  };
}

function createDefaultParams(overrides: Partial<{
  adminId: string;
  form: ReturnType<typeof createMockForm>;
  selected: Set<string>;
  bulkStatus: string;
  clearSelection: () => void;
  refreshAll: () => Promise<void>;
}> = {}) {
  return {
    adminId: 'admin-1',
    form: createMockForm(),
    selected: new Set<string>(),
    bulkStatus: '',
    clearSelection: vi.fn(),
    refreshAll: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('useAdminEventsActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────

  it('1. initial: modalOpen=false, editingEvent=null, saving=false', () => {
    const params = createDefaultParams();
    const { result } = renderHook(() => useAdminEventsActions(params));

    expect(result.current.modalOpen).toBe(false);
    expect(result.current.editingEvent).toBeNull();
    expect(result.current.saving).toBe(false);
    expect(result.current.bulkLoading).toBe(false);
  });

  // ── Modal operations ───────────────────────────────────────────────────

  it('2. openCreateModal: resets form, sets modalOpen=true, editingEvent=null', () => {
    const params = createDefaultParams();
    const { result } = renderHook(() => useAdminEventsActions(params));

    act(() => {
      result.current.openCreateModal();
    });

    expect(result.current.modalOpen).toBe(true);
    expect(result.current.editingEvent).toBeNull();
    expect(params.form.reset).toHaveBeenCalled();
  });

  it('3. openEditModal: populates form, sets editingEvent, opens modal', () => {
    const params = createDefaultParams();
    const { result } = renderHook(() => useAdminEventsActions(params));
    const event = makeAdminEvent({ id: 'ev-edit', name: 'Edit Me' });

    act(() => {
      result.current.openEditModal(event);
    });

    expect(result.current.modalOpen).toBe(true);
    expect(result.current.editingEvent).toBe(event);
    expect(params.form.populate).toHaveBeenCalledWith(event);
  });

  it('4. closeModal: sets modalOpen=false, resets form', () => {
    const params = createDefaultParams();
    const { result } = renderHook(() => useAdminEventsActions(params));

    // Open first
    act(() => {
      result.current.openCreateModal();
    });
    expect(result.current.modalOpen).toBe(true);

    act(() => {
      result.current.closeModal();
    });

    expect(result.current.modalOpen).toBe(false);
  });

  // ── handleSubmit (create) ──────────────────────────────────────────────

  it('5. handleSubmit create: calls createEvent, shows success toast, refreshes, closes modal', async () => {
    const params = createDefaultParams();
    mockCreateEvent.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAdminEventsActions(params));

    // Open create modal
    act(() => {
      result.current.openCreateModal();
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateEvent).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith(expect.any(String), 'success');
    expect(params.refreshAll).toHaveBeenCalled();
    expect(result.current.modalOpen).toBe(false);
  });

  it('6. handleSubmit create error: shows error toast, does NOT close modal', async () => {
    const params = createDefaultParams();
    params.form.form.name = 'New Event';
    mockCreateEvent.mockRejectedValue(new Error('DB error'));

    const { result } = renderHook(() => useAdminEventsActions(params));

    act(() => {
      result.current.openCreateModal();
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('DB error'), 'error');
    // Modal should remain open on error
    expect(result.current.modalOpen).toBe(true);
  });

  it('7. handleSubmit edit: calls updateEvent, shows success toast', async () => {
    const params = createDefaultParams();
    const event = makeAdminEvent({ id: 'ev-edit' });
    mockUpdateEvent.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useAdminEventsActions(params));

    // Open edit modal
    act(() => {
      result.current.openEditModal(event);
    });

    params.form.form.name = 'Updated Event';

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockUpdateEvent).toHaveBeenCalledWith('ev-edit', expect.any(Object));
    expect(mockAddToast).toHaveBeenCalledWith(expect.any(String), 'success');
  });

  it('8. handleSubmit skips if name empty', async () => {
    const params = createDefaultParams();
    params.form.form.name = '';

    const { result } = renderHook(() => useAdminEventsActions(params));

    act(() => {
      result.current.openCreateModal();
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockCreateEvent).not.toHaveBeenCalled();
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it('9. saving=true during submit, false after', async () => {
    const params = createDefaultParams();
    params.form.form.name = 'Event';

    let resolveFn: (() => void) | null = null;
    mockCreateEvent.mockImplementation(() => new Promise<void>(r => { resolveFn = r; }));

    const { result } = renderHook(() => useAdminEventsActions(params));

    act(() => {
      result.current.openCreateModal();
    });

    // Start submit (don't await)
    let submitPromise: Promise<void>;
    act(() => {
      submitPromise = result.current.handleSubmit();
    });

    // saving should be true while pending
    expect(result.current.saving).toBe(true);

    // Resolve
    await act(async () => {
      resolveFn!();
      await submitPromise!;
    });

    expect(result.current.saving).toBe(false);
  });

  // ── handleBulk ─────────────────────────────────────────────────────────

  it('10. handleBulk: calls bulkUpdateStatus, clears selection, refreshes', async () => {
    const selected = new Set(['ev-1', 'ev-2']);
    const params = createDefaultParams({ selected, bulkStatus: 'running' });
    mockBulkUpdateStatus.mockResolvedValue({ results: [{ ok: true }, { ok: true }] });

    const { result } = renderHook(() => useAdminEventsActions(params));

    await act(async () => {
      await result.current.handleBulk();
    });

    expect(mockBulkUpdateStatus).toHaveBeenCalledWith(
      expect.arrayContaining(['ev-1', 'ev-2']),
      'running',
    );
    expect(params.clearSelection).toHaveBeenCalled();
    expect(params.refreshAll).toHaveBeenCalled();
  });

  it('11. handleBulk with errors: shows error toast with counts', async () => {
    const selected = new Set(['ev-1', 'ev-2']);
    const params = createDefaultParams({ selected, bulkStatus: 'running' });
    mockBulkUpdateStatus.mockRejectedValue(new Error('Partial failure'));

    const { result } = renderHook(() => useAdminEventsActions(params));

    await act(async () => {
      await result.current.handleBulk();
    });

    expect(mockAddToast).toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('12. handleBulk skips if no selection', async () => {
    const params = createDefaultParams({ selected: new Set(), bulkStatus: 'running' });

    const { result } = renderHook(() => useAdminEventsActions(params));

    await act(async () => {
      await result.current.handleBulk();
    });

    expect(mockBulkUpdateStatus).not.toHaveBeenCalled();
  });

  it('13. bulkLoading=true during bulk, false after', async () => {
    const selected = new Set(['ev-1']);
    const params = createDefaultParams({ selected, bulkStatus: 'running' });

    let resolveFn: (() => void) | null = null;
    mockBulkUpdateStatus.mockImplementation(
      () => new Promise<void>(r => { resolveFn = r; }),
    );

    const { result } = renderHook(() => useAdminEventsActions(params));

    let bulkPromise: Promise<void>;
    act(() => {
      bulkPromise = result.current.handleBulk();
    });

    expect(result.current.bulkLoading).toBe(true);

    await act(async () => {
      resolveFn!();
      await bulkPromise!;
    });

    expect(result.current.bulkLoading).toBe(false);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it('handleBulk skips if bulkStatus is empty', async () => {
    const selected = new Set(['ev-1']);
    const params = createDefaultParams({ selected, bulkStatus: '' });

    const { result } = renderHook(() => useAdminEventsActions(params));

    await act(async () => {
      await result.current.handleBulk();
    });

    expect(mockBulkUpdateStatus).not.toHaveBeenCalled();
  });

  it('setModalOpen directly controls modal state', () => {
    const params = createDefaultParams();
    const { result } = renderHook(() => useAdminEventsActions(params));

    act(() => {
      result.current.setModalOpen(true);
    });

    expect(result.current.modalOpen).toBe(true);

    act(() => {
      result.current.setModalOpen(false);
    });

    expect(result.current.modalOpen).toBe(false);
  });
});
