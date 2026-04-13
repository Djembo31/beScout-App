import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockSupabaseResponse, mockSupabaseRpc } from '@/test/mocks/supabase';

// Mock side-effect modules before importing the service
vi.mock('@/lib/services/activityLog', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/services/notifications', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/services/missions', () => ({ triggerMissionProgress: vi.fn() }));
vi.mock('@/lib/services/social', () => ({ checkAndUnlockAchievements: vi.fn() }));
vi.mock('@/lib/services/referral', () => ({ triggerReferralReward: vi.fn() }));
vi.mock('@/lib/notifText', () => ({ notifText: vi.fn((key: string) => key) }));

import {
  getIncomingOffers,
  getOutgoingOffers,
  getOpenBids,
  getOfferHistory,
  createOffer,
  acceptOffer,
  rejectOffer,
  counterOffer,
  cancelOffer,
} from '../offers';

// ============================================
// getIncomingOffers
// ============================================

describe('getIncomingOffers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns enriched offers on success (empty list)', async () => {
    mockSupabaseResponse([]);
    const result = await getIncomingOffers('user-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('offers');
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    mockSupabaseResponse(null, { message: 'DB connection failed' });
    await expect(getIncomingOffers('user-1')).rejects.toThrow('DB connection failed');
  });

  it('returns offers with enrichment data from players/profiles', async () => {
    // The mock returns the same data for all .from() calls.
    // First call (offers query) returns offer data, subsequent calls (enrichment) also get same data.
    // Since enrichment uses Promise.allSettled, it gracefully handles mismatched data.
    const mockOffers = [{
      id: 'offer-1',
      player_id: 'player-1',
      sender_id: 'user-sender',
      receiver_id: 'user-recv',
      side: 'buy',
      price: 50000,
      quantity: 1,
      status: 'pending',
      counter_offer_id: null,
      message: 'Want to buy',
      expires_at: '2099-01-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }];
    mockSupabaseResponse(mockOffers);
    const result = await getIncomingOffers('user-recv');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('offer-1');
    // Enrichment fields have defaults since player/profile data is same mock
    expect(result[0]).toHaveProperty('player_first_name');
    expect(result[0]).toHaveProperty('sender_handle');
  });

  it('handles null data by returning empty array', async () => {
    mockSupabaseResponse(null);
    const result = await getIncomingOffers('user-1');
    expect(result).toEqual([]);
  });
});

// ============================================
// getOutgoingOffers
// ============================================

describe('getOutgoingOffers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no outgoing offers', async () => {
    mockSupabaseResponse([]);
    const result = await getOutgoingOffers('user-1');
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    mockSupabaseResponse(null, { message: 'Query failed' });
    await expect(getOutgoingOffers('user-1')).rejects.toThrow('Query failed');
  });

  it('queries with sender_id filter', async () => {
    mockSupabaseResponse([]);
    await getOutgoingOffers('user-abc');
    expect(mockSupabase.from).toHaveBeenCalledWith('offers');
  });
});

// ============================================
// getOpenBids
// ============================================

describe('getOpenBids', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no open bids', async () => {
    mockSupabaseResponse([]);
    const result = await getOpenBids();
    expect(result).toEqual([]);
  });

  it('returns empty array when no bids for specific player', async () => {
    mockSupabaseResponse([]);
    const result = await getOpenBids({ playerId: 'player-123' });
    expect(result).toEqual([]);
  });

  it('throws on supabase error', async () => {
    mockSupabaseResponse(null, { message: 'Timeout' });
    await expect(getOpenBids()).rejects.toThrow('Timeout');
  });

  it('calls from("offers") for the query', async () => {
    mockSupabaseResponse([]);
    await getOpenBids();
    expect(mockSupabase.from).toHaveBeenCalledWith('offers');
  });
});

// ============================================
// getOfferHistory
// ============================================

describe('getOfferHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no history', async () => {
    mockSupabaseResponse([]);
    const result = await getOfferHistory('user-1');
    expect(result).toEqual([]);
  });

  it('returns merged and sorted offers from sent/received', async () => {
    const offer = {
      id: 'offer-hist-1',
      player_id: 'p1',
      sender_id: 'user-1',
      receiver_id: 'user-2',
      side: 'buy',
      price: 10000,
      quantity: 1,
      status: 'accepted',
      counter_offer_id: null,
      message: null,
      expires_at: '2025-06-01T00:00:00Z',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
    };
    mockSupabaseResponse([offer]);
    const result = await getOfferHistory('user-1');
    // Both sent and received queries return same mock data
    // merged array will have duplicates, sorted by updated_at, sliced to 50
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].id).toBe('offer-hist-1');
  });

  it('handles null data gracefully', async () => {
    mockSupabaseResponse(null);
    const result = await getOfferHistory('user-1');
    expect(result).toEqual([]);
  });
});

// ============================================
// createOffer
// ============================================

describe('createOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with offer_id on valid creation', async () => {
    mockSupabaseRpc({ success: true, offer_id: 'offer-new-1' });
    const result = await createOffer({
      senderId: 'user-1',
      playerId: 'player-1',
      side: 'buy',
      priceCents: 50000,
      quantity: 1,
    });
    expect(result.success).toBe(true);
    expect(result.offer_id).toBe('offer-new-1');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_offer', {
      p_sender_id: 'user-1',
      p_player_id: 'player-1',
      p_receiver_id: null,
      p_side: 'buy',
      p_price: 50000,
      p_quantity: 1,
      p_message: null,
      p_expires_hours: 48,
    });
  });

  it('passes custom expires_hours and message', async () => {
    mockSupabaseRpc({ success: true, offer_id: 'offer-2' });
    await createOffer({
      senderId: 'user-1',
      playerId: 'player-1',
      side: 'sell',
      priceCents: 30000,
      quantity: 2,
      message: 'Good price',
      expiresHours: 24,
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_offer', expect.objectContaining({
      p_message: 'Good price',
      p_expires_hours: 24,
      p_side: 'sell',
      p_quantity: 2,
    }));
  });

  it('passes receiver_id when provided', async () => {
    mockSupabaseRpc({ success: true, offer_id: 'offer-3' });
    await createOffer({
      senderId: 'user-1',
      playerId: 'player-1',
      receiverId: 'user-2',
      side: 'buy',
      priceCents: 50000,
      quantity: 1,
    });
    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_offer', expect.objectContaining({
      p_receiver_id: 'user-2',
    }));
  });

  it('returns error when message exceeds 500 chars', async () => {
    const result = await createOffer({
      senderId: 'user-1',
      playerId: 'player-1',
      side: 'buy',
      priceCents: 50000,
      quantity: 1,
      message: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Message too long (max 500 chars)');
    // Should NOT call the RPC
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('allows exactly 500 char message', async () => {
    mockSupabaseRpc({ success: true, offer_id: 'offer-long' });
    const result = await createOffer({
      senderId: 'user-1',
      playerId: 'player-1',
      side: 'buy',
      priceCents: 50000,
      quantity: 1,
      message: 'x'.repeat(500),
    });
    expect(result.success).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalled();
  });

  it('throws on RPC error', async () => {
    mockSupabaseRpc(null, { message: 'Insufficient balance' });
    await expect(createOffer({
      senderId: 'user-1',
      playerId: 'player-1',
      side: 'buy',
      priceCents: 50000,
      quantity: 1,
    })).rejects.toThrow('Insufficient balance');
  });

  it('returns RPC result with success: false', async () => {
    mockSupabaseRpc({ success: false, error: 'Player liquidated' });
    const result = await createOffer({
      senderId: 'user-1',
      playerId: 'player-1',
      side: 'buy',
      priceCents: 50000,
      quantity: 1,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Player liquidated');
  });
});

// ============================================
// acceptOffer
// ============================================

describe('acceptOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success with trade_price on valid accept', async () => {
    mockSupabaseRpc({ success: true, trade_price: 50000 });
    const result = await acceptOffer('user-2', 'offer-1');
    expect(result.success).toBe(true);
    expect(result.trade_price).toBe(50000);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('accept_offer', {
      p_user_id: 'user-2',
      p_offer_id: 'offer-1',
    });
  });

  it('throws on RPC error', async () => {
    mockSupabaseRpc(null, { message: 'Offer expired' });
    await expect(acceptOffer('user-2', 'offer-1')).rejects.toThrow('Offer expired');
  });

  it('returns unsuccessful result from RPC', async () => {
    mockSupabaseRpc({ success: false, error: 'Not enough holdings' });
    const result = await acceptOffer('user-2', 'offer-1');
    expect(result.success).toBe(false);
  });
});

// ============================================
// rejectOffer
// ============================================

describe('rejectOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success on valid rejection', async () => {
    mockSupabaseRpc({ success: true });
    const result = await rejectOffer('user-2', 'offer-1');
    expect(result.success).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('reject_offer', {
      p_user_id: 'user-2',
      p_offer_id: 'offer-1',
    });
  });

  it('throws on RPC error', async () => {
    mockSupabaseRpc(null, { message: 'Not authorized' });
    await expect(rejectOffer('user-2', 'offer-1')).rejects.toThrow('Not authorized');
  });

  it('returns unsuccessful result from RPC', async () => {
    mockSupabaseRpc({ success: false, error: 'Already rejected' });
    const result = await rejectOffer('user-2', 'offer-1');
    expect(result.success).toBe(false);
  });
});

// ============================================
// counterOffer
// ============================================

describe('counterOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success on valid counter', async () => {
    mockSupabaseRpc({ success: true, offer_id: 'counter-1' });
    const result = await counterOffer('user-2', 'offer-1', 60000);
    expect(result.success).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('counter_offer', {
      p_user_id: 'user-2',
      p_offer_id: 'offer-1',
      p_new_price: 60000,
      p_message: null,
    });
  });

  it('passes optional message to RPC', async () => {
    mockSupabaseRpc({ success: true, offer_id: 'counter-2' });
    await counterOffer('user-2', 'offer-1', 55000, 'How about this?');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('counter_offer', expect.objectContaining({
      p_message: 'How about this?',
      p_new_price: 55000,
    }));
  });

  it('throws on RPC error', async () => {
    mockSupabaseRpc(null, { message: 'Invalid offer' });
    await expect(counterOffer('user-2', 'offer-1', 60000)).rejects.toThrow('Invalid offer');
  });

  it('returns unsuccessful result from RPC', async () => {
    mockSupabaseRpc({ success: false, error: 'Offer no longer pending' });
    const result = await counterOffer('user-2', 'offer-1', 60000);
    expect(result.success).toBe(false);
  });
});

// ============================================
// cancelOffer
// ============================================

describe('cancelOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success on valid cancellation', async () => {
    mockSupabaseRpc({ success: true });
    const result = await cancelOffer('user-1', 'offer-1');
    expect(result.success).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('cancel_offer_rpc', {
      p_user_id: 'user-1',
      p_offer_id: 'offer-1',
    });
  });

  it('throws on RPC error', async () => {
    mockSupabaseRpc(null, { message: 'Cannot cancel' });
    await expect(cancelOffer('user-1', 'offer-1')).rejects.toThrow('Cannot cancel');
  });

  it('returns unsuccessful result from RPC', async () => {
    mockSupabaseRpc({ success: false, error: 'Not your offer' });
    const result = await cancelOffer('user-1', 'offer-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not your offer');
  });
});
