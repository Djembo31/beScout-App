import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockRpc, resetMocks } from '@/test/mocks/supabase';
import { cancelEvent } from '@/features/fantasy/services/events.mutations';

beforeEach(() => { resetMocks(); vi.clearAllMocks(); });

describe('cancelEvent (Slice 335)', () => {
  it('maps eventId to cancel_event RPC + returns refundedCount on success', async () => {
    mockRpc('cancel_event', { success: true, refunded_count: 3 });
    const res = await cancelEvent('ev-1');
    expect(res).toEqual({ success: true, refundedCount: 3 });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('cancel_event', { p_event_id: 'ev-1' });
  });

  it('returns the RPC error key when success=false (discriminated union)', async () => {
    mockRpc('cancel_event', { success: false, error: 'not_cancellable' });
    const res = await cancelEvent('ev-2');
    expect(res).toEqual({ success: false, error: 'not_cancellable' });
  });

  it('surfaces not_authorized without throwing', async () => {
    mockRpc('cancel_event', { success: false, error: 'not_authorized' });
    const res = await cancelEvent('ev-3');
    expect(res.success).toBe(false);
    expect(res.error).toBe('not_authorized');
  });

  it('returns transport error message', async () => {
    mockRpc('cancel_event', null, { message: 'network down' });
    const res = await cancelEvent('ev-4');
    expect(res).toEqual({ success: false, error: 'network down' });
  });

  it('guards null RPC body (data=null, error=null) without throwing (Reviewer #3)', async () => {
    mockRpc('cancel_event', null);
    const res = await cancelEvent('ev-5');
    expect(res).toEqual({ success: false, error: 'cancel_failed' });
  });
});
